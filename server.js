// Servidor sin dependencias: landing, portal de planes y panel de administración.
// Uso: node server.js
// Variables de entorno opcionales:
//   PORT            puerto (default: config.json o 3000)
//   ADMIN_PASSWORD  contraseña del panel (tiene prioridad sobre config.json)
//   DATA_DIR        carpeta donde se guarda plans.json (usar un disco persistente en producción)
//   TRUST_PROXY=1   cuando corre detrás de un proxy/hosting (Render, Railway, Nginx): usa la IP real y cookies seguras
//   NODE_ENV=production  bloquea el panel si la contraseña sigue siendo la de ejemplo

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const engine = require('./lib/engine');
const { DISLIKE_OPTIONS } = require('./lib/foods');
const { planDocument } = require('./lib/render');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const DB_FILE = path.join(DATA_DIR, 'plans.json');
const CONFIG_FILE = path.join(ROOT, 'config.json');

const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
const PORT = Number(process.env.PORT) || config.port || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || config.adminPassword;
const PLACEHOLDER_PASSWORD = 'cambiar-esta-clave';
const IS_PROD = process.env.NODE_ENV === 'production';
const TRUST_PROXY = process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true';
// En producción no se permite entrar con la contraseña de ejemplo
const ADMIN_ENABLED = Boolean(ADMIN_PASSWORD) && !(IS_PROD && ADMIN_PASSWORD === PLACEHOLDER_PASSWORD);

// ---------------------------------------------------------------- Almacenamiento
fs.mkdirSync(DATA_DIR, { recursive: true });
let db = { seq: 0, plans: [] };
if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

function save() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
const findPlan = (code) => db.plans.find((p) => p.code === code);

// ---------------------------------------------------------------- Sesiones admin
const sessions = new Map(); // token -> expiresAt
const SESSION_MS = 1000 * 60 * 60 * 12;

function sha(s) {
  return crypto.createHash('sha256').update(String(s)).digest();
}
function checkPassword(pw) {
  return crypto.timingSafeEqual(sha(pw), sha(ADMIN_PASSWORD));
}
function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map((c) => {
    const i = c.indexOf('=');
    return [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1).trim())];
  }));
}
function isAdmin(req) {
  const t = cookies(req).tl_admin;
  const exp = t && sessions.get(t);
  if (!exp) return false;
  if (exp < Date.now()) { sessions.delete(t); return false; }
  return true;
}

function clientIp(req) {
  if (TRUST_PROXY) {
    const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (fwd) return fwd;
  }
  return req.socket.remoteAddress || '';
}
function isHttps(req) {
  return Boolean(req.socket.encrypted) || (TRUST_PROXY && String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https');
}
function sessionCookie(req, value, maxAge) {
  return `tl_admin=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${isHttps(req) ? '; Secure' : ''}`;
}

// Límite simple de intentos por IP
const hits = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [id, arr] of hits) if (!arr.length || now - arr[arr.length - 1] > 60 * 60 * 1000) hits.delete(id);
  for (const [t, exp] of sessions) if (exp < now) sessions.delete(t);
}, 10 * 60 * 1000).unref();
function rateLimited(req, key, max, windowMs) {
  const id = key + ':' + clientIp(req);
  const now = Date.now();
  const arr = (hits.get(id) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(id, arr);
  return arr.length > max;
}

// ---------------------------------------------------------------- Utilidades HTTP
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json',
};

function send(res, status, body, headers = {}) {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(status, {
    'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(isObj ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 100 * 1024) { reject(new Error('too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(new Error('bad_json')); }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  const routes = { '/': '/index.html', '/portal': '/portal.html', '/admin': '/admin.html' };
  const rel = routes[pathname] || pathname;
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, 'Prohibido');
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'No encontrado');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(buf);
  });
}

function publicConfig() {
  const c = config.brand;
  return { ...c, whatsappNumber: String(c.whatsapp || '').replace(/\D/g, '') };
}

function summary(p) {
  const d = p.input;
  const t = p.result.targets;
  return {
    code: p.code,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    status: p.status,
    contact: p.contact || null,
    name: d.personal.name,
    email: d.personal.email,
    phone: d.personal.phone,
    sex: d.personal.sex,
    age: d.personal.age,
    weight: d.personal.weight,
    height: d.personal.height,
    goal: d.goal.type,
    goalLabel: engine.labels.GOALS[d.goal.type].label,
    diet: d.food.diet,
    kcal: t.kcal,
    protein: t.protein,
    carbs: t.carbs,
    fat: t.fat,
    tdee: t.tdee,
    flags: p.result.flags.length,
    notes: p.notes || '',
  };
}

function csvCell(v) {
  const s = String(v == null ? '' : v);
  const safe = /^[=+\-@]/.test(s) && !/^[+\-][\d\s().-]+$/.test(s) ? "'" + s : s; // evita inyección de fórmulas
  return '"' + safe.replace(/"/g, '""') + '"';
}

const STATUSES = ['nuevo', 'contacto_solicitado', 'en_seguimiento', 'entregado', 'descartado'];

// ---------------------------------------------------------------- API
async function api(req, res, url) {
  const p = url.pathname;
  const m = req.method;

  if (m === 'GET' && p === '/api/config') return send(res, 200, publicConfig());
  if (m === 'GET' && p === '/api/health') return send(res, 200, { ok: true });

  if (m === 'GET' && p === '/api/options') {
    const L = engine.labels;
    const map = (o, f = (v) => v) => Object.entries(o).map(([id, v]) => ({ id, label: f(v) }));
    return send(res, 200, {
      goals: map(L.GOALS, (v) => v.label),
      occupation: map(L.OCCUPATION, (v) => v.label),
      steps: map(L.STEPS, (v) => v.label),
      trainings: map(L.TRAINING_TYPES, (v) => v.label),
      conditions: map(L.CONDITIONS),
      allergens: map(L.ALLERGENS),
      diets: map(L.DIETS),
      foods: DISLIKE_OPTIONS,
    });
  }

  if (m === 'POST' && p === '/api/plans') {
    if (rateLimited(req, 'plan', 10, 60 * 60 * 1000)) return send(res, 429, { error: 'Demasiadas solicitudes. Probá de nuevo más tarde.' });
    const body = await readBody(req);
    const { errors, data } = engine.validate(body);
    if (errors.length) return send(res, 400, { error: 'Revisá estos datos: ' + errors.join(', '), fields: errors });
    db.seq += 1;
    const code = 'TL-' + String(db.seq).padStart(4, '0');
    const token = crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();
    const result = engine.generate(data, crypto.randomInt(1, 2 ** 31));
    db.plans.push({ code, token, createdAt: now, updatedAt: now, status: 'nuevo', input: data, result, notes: '' });
    save();
    // Solo se devuelve el código: el plan queda reservado para la consulta.
    return send(res, 201, { code, token, name: data.personal.name.split(' ')[0] });
  }

  const contactMatch = p.match(/^\/api\/plans\/(TL-\d{4,})\/contact$/);
  if (m === 'POST' && contactMatch) {
    const plan = findPlan(contactMatch[1]);
    const body = await readBody(req);
    if (!plan || typeof body.token !== 'string' || body.token.length !== plan.token.length ||
        !crypto.timingSafeEqual(Buffer.from(body.token), Buffer.from(plan.token))) {
      return send(res, 404, { error: 'Plan no encontrado' });
    }
    plan.contact = {
      channel: body.channel === 'callback' ? 'callback' : 'whatsapp',
      preferredTime: typeof body.preferredTime === 'string' ? body.preferredTime.slice(0, 60) : '',
      at: new Date().toISOString(),
    };
    if (plan.status === 'nuevo') plan.status = 'contacto_solicitado';
    plan.updatedAt = new Date().toISOString();
    save();
    return send(res, 200, { ok: true });
  }

  // ---- Admin
  if (m === 'POST' && p === '/api/admin/login') {
    if (!ADMIN_ENABLED) return send(res, 503, { error: 'Panel deshabilitado: configurá la variable ADMIN_PASSWORD en el hosting.' });
    if (rateLimited(req, 'login', 8, 15 * 60 * 1000)) return send(res, 429, { error: 'Demasiados intentos. Esperá unos minutos.' });
    const body = await readBody(req);
    if (typeof body.password !== 'string' || !checkPassword(body.password)) return send(res, 401, { error: 'Contraseña incorrecta' });
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, Date.now() + SESSION_MS);
    return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, token, SESSION_MS / 1000) });
  }
  if (m === 'POST' && p === '/api/admin/logout') {
    sessions.delete(cookies(req).tl_admin);
    return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
  }

  if (p.startsWith('/api/admin/')) {
    if (!isAdmin(req)) return send(res, 401, { error: 'No autorizado' });

    if (m === 'GET' && p === '/api/admin/session') return send(res, 200, { ok: true });

    if (m === 'GET' && p === '/api/admin/plans') {
      return send(res, 200, { plans: db.plans.map(summary).reverse(), statuses: STATUSES });
    }

    if (m === 'GET' && p === '/api/admin/export.csv') {
      const cols = ['code', 'createdAt', 'status', 'name', 'email', 'phone', 'sex', 'age', 'weight', 'height', 'goalLabel', 'diet', 'tdee', 'kcal', 'protein', 'carbs', 'fat', 'notes'];
      const rows = [cols.join(',')].concat(db.plans.map(summary).map((s) => cols.map((c) => csvCell(s[c])).join(',')));
      return send(res, 200, '﻿' + rows.join('\r\n'), {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="planes-tais-lowe-${new Date().toISOString().slice(0, 10)}.csv"`,
      });
    }

    const one = p.match(/^\/api\/admin\/plans\/(TL-\d{4,})(\/download)?$/);
    if (one) {
      const plan = findPlan(one[1]);
      if (!plan) return send(res, 404, { error: 'Plan no encontrado' });

      if (one[2] && m === 'GET') {
        const html = planDocument(plan, config.brand);
        const inline = url.searchParams.get('inline') === '1';
        const safeName = plan.input.personal.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
        return send(res, 200, html, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="plan-${plan.code}-${safeName}.html"`,
        });
      }
      if (m === 'GET') {
        const { token, ...rest } = plan;
        return send(res, 200, { ...rest, summary: summary(plan) });
      }
      if (m === 'PATCH') {
        const body = await readBody(req);
        if (STATUSES.includes(body.status)) plan.status = body.status;
        if (typeof body.notes === 'string') plan.notes = body.notes.slice(0, 2000);
        plan.updatedAt = new Date().toISOString();
        save();
        return send(res, 200, { ok: true, summary: summary(plan) });
      }
      if (m === 'DELETE') {
        db.plans = db.plans.filter((x) => x.code !== plan.code);
        save();
        return send(res, 200, { ok: true });
      }
    }
  }

  return send(res, 404, { error: 'No encontrado' });
}

// ---------------------------------------------------------------- Servidor
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Método no permitido');
    return serveStatic(req, res, url.pathname);
  } catch (e) {
    if (e.message === 'bad_json' || e.message === 'too_large') return send(res, 400, { error: 'Solicitud inválida' });
    console.error(e);
    return send(res, 500, { error: 'Error interno' });
  }
});

server.listen(PORT, () => {
  console.log(`Taís Löwe · servidor en http://localhost:${PORT}`);
  console.log(`  Landing: /   Portal: /portal   Admin: /admin`);
  console.log(`  Datos en: ${DB_FILE}`);
  if (!ADMIN_ENABLED) console.log('  ⚠ Panel deshabilitado: definí ADMIN_PASSWORD (en producción no se acepta la contraseña de ejemplo)');
  else if (ADMIN_PASSWORD === PLACEHOLDER_PASSWORD) console.log('  ⚠ Cambiá la contraseña de admin en config.json o con ADMIN_PASSWORD');
});

// Cierre ordenado (los hostings envían SIGTERM al redeployar)
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => server.close(() => process.exit(0)));
