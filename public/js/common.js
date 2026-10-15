// Utilidades compartidas
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg, ms = 3200) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), ms);
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: opts.body && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Error'), { status: res.status, data });
  return data;
}

let BRAND = null;
async function loadBrand() {
  if (BRAND) return BRAND;
  try { BRAND = await api('/api/config'); } catch { BRAND = {}; }
  $$('[data-cfg]').forEach((el) => {
    const v = BRAND[el.dataset.cfg];
    if (!v) return;
    el.textContent = v;
    if (el.dataset.cfgHref === 'wa' && BRAND.whatsappNumber) el.href = `https://wa.me/${BRAND.whatsappNumber}`;
    if (el.dataset.cfgHref === 'mail') el.href = `mailto:${v}`;
  });
  return BRAND;
}

function waLink(text) {
  const n = (BRAND && BRAND.whatsappNumber) || '';
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

// Revelado al hacer scroll
function initReveal() {
  const els = $$('.reveal, .steps, .locked-card');
  if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach((e, i) => { e.style.transitionDelay = (e.classList.contains('reveal') ? (i % 4) * 70 : 0) + 'ms'; io.observe(e); });
}
