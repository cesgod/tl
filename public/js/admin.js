(function () {
  const STATUS_LABEL = {
    nuevo: 'Nuevo',
    contacto_solicitado: 'Pidió contacto',
    en_seguimiento: 'En seguimiento',
    entregado: 'Entregado',
    descartado: 'Descartado',
  };
  const DIET = { omni: 'Omnívora', pesc: 'Pescetariana', veg: 'Vegetariana', vegan: 'Vegana' };
  let PLANS = [];
  let refreshTimer;

  const fmtDate = (iso, opts = { day: '2-digit', month: 'short' }) => new Date(iso).toLocaleDateString('es-AR', opts);
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const ICON_EYE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const ICON_DL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/></svg>';

  // ---------- Sesión
  async function boot() {
    try {
      await api('/api/admin/session');
      showApp();
    } catch {
      $('#login').hidden = false;
      $('#pw').focus();
    }
  }
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/api/admin/login', { method: 'POST', body: { password: $('#pw').value } });
      $('#pw').value = '';
      $('#login').hidden = true;
      showApp();
    } catch (err) {
      toast(err.message);
      $('#pw').select();
    }
  });
  $('#logout').addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST' }).catch(() => {});
    clearInterval(refreshTimer);
    $('#app').hidden = true;
    $('#login').hidden = false;
  });

  async function showApp() {
    $('#app').hidden = false;
    const h = new Date().getHours();
    $('#hello').innerHTML = `${h < 12 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches'}, <em class="serif gold">Taís.</em>`;
    await load();
    clearInterval(refreshTimer);
    refreshTimer = setInterval(() => load(true), 30000);
  }

  async function load(silent) {
    try {
      const data = await api('/api/admin/plans');
      PLANS = data.plans;
      if (!$('#fStatus').options[1]) {
        $('#fStatus').insertAdjacentHTML('beforeend', data.statuses.map((s) => `<option value="${s}">${STATUS_LABEL[s]}</option>`).join(''));
      }
      const goals = [...new Map(PLANS.map((p) => [p.goal, p.goalLabel])).entries()];
      const sel = $('#fGoal').value;
      $('#fGoal').innerHTML = '<option value="">Todos los objetivos</option>' + goals.map(([id, l]) => `<option value="${id}">${escapeHtml(l)}</option>`).join('');
      $('#fGoal').value = sel;
      renderKpis();
      renderCharts();
      renderTable();
    } catch (err) {
      if (err.status === 401) { $('#app').hidden = true; $('#login').hidden = false; clearInterval(refreshTimer); }
      else if (!silent) toast('No se pudieron cargar los planes');
    }
  }

  // ---------- KPIs
  function renderKpis() {
    const by = (s) => PLANS.filter((p) => p.status === s).length;
    const weekAgo = Date.now() - 7 * 864e5;
    const week = PLANS.filter((p) => new Date(p.createdAt) >= weekAgo).length;
    const pending = by('contacto_solicitado');
    const k = [
      { cls: 'main', label: 'Planes creados', v: PLANS.length, s: `${week} en los últimos 7 días`, f: '' },
      { cls: pending ? 'alert' : '', label: 'Pidieron contacto', v: pending, s: 'Esperan tu respuesta', f: 'contacto_solicitado' },
      { label: 'Nuevos', v: by('nuevo'), s: 'Aún sin solicitud', f: 'nuevo' },
      { label: 'En seguimiento', v: by('en_seguimiento'), s: 'Consulta coordinada', f: 'en_seguimiento' },
      { label: 'Entregados', v: by('entregado'), s: 'Plan listo y asociado', f: 'entregado' },
    ];
    $('#kpis').innerHTML = k.map((x) => `
      <button type="button" class="kpi ${x.cls || ''}" data-f="${x.f}">
        <span class="label">${x.label}</span><div class="v">${x.v}</div><small>${x.s}</small>
      </button>`).join('');
    $$('.kpi').forEach((b) => b.addEventListener('click', () => { $('#fStatus').value = b.dataset.f; renderTable(); $('.table-panel').scrollIntoView({ behavior: 'smooth' }); }));
  }

  // ---------- Gráficos
  function renderCharts() {
    const days = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      days.push({ d, n: 0 });
    }
    PLANS.forEach((p) => {
      const c = new Date(p.createdAt); c.setHours(0, 0, 0, 0);
      const slot = days.find((x) => x.d.getTime() === c.getTime());
      if (slot) slot.n++;
    });
    const max = Math.max(1, ...days.map((x) => x.n));
    $('#daysChart').innerHTML = days.map((x, i) => `<div class="bar ${x.n ? 'has' : ''} ${i === 29 ? 'today' : ''}" style="height:${(x.n / max) * 100}%" data-tip="${fmtDate(x.d)} · ${x.n} plan${x.n === 1 ? '' : 'es'}"></div>`).join('');
    $('#daysChart').setAttribute('aria-label', `Planes por día en los últimos 30 días: ${days.reduce((s, x) => s + x.n, 0)} en total`);
    if (!$('.bars-axis')) $('#daysChart').insertAdjacentHTML('afterend', '<div class="bars-axis"><span></span><span></span></div>');
    const ax = $$('.bars-axis span');
    ax[0].textContent = fmtDate(days[0].d);
    ax[1].textContent = 'Hoy';

    const goals = {};
    PLANS.forEach((p) => { goals[p.goalLabel] = (goals[p.goalLabel] || 0) + 1; });
    const entries = Object.entries(goals).sort((a, b) => b[1] - a[1]);
    const gmax = Math.max(1, ...entries.map((e) => e[1]));
    $('#goalChart').innerHTML = entries.length
      ? entries.map(([l, n]) => `<div class="hbar-row"><span>${escapeHtml(l)}</span><b>${n}</b><div class="hbar-track"><div class="hbar-fill" style="width:${(n / gmax) * 100}%"></div></div></div>`).join('')
      : '<p class="empty" style="padding:20px 0">Sin datos todavía</p>';
  }

  // ---------- Tabla
  function filtered() {
    const q = $('#q').value.trim().toLowerCase();
    const st = $('#fStatus').value;
    const g = $('#fGoal').value;
    return PLANS.filter((p) =>
      (!st || p.status === st) && (!g || p.goal === g) &&
      (!q || [p.code, p.name, p.email, p.phone].join(' ').toLowerCase().includes(q)));
  }
  function statusSelect(p) {
    return `<select class="status st-${p.status}" data-code="${p.code}" aria-label="Estado de ${escapeHtml(p.name)}">${Object.entries(STATUS_LABEL).map(([k, l]) => `<option value="${k}" ${k === p.status ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  }
  function renderTable() {
    const list = filtered();
    $('#count').textContent = `· ${list.length}${list.length !== PLANS.length ? ' de ' + PLANS.length : ''}`;
    $('#empty').hidden = PLANS.length > 0;
    $('#rows').innerHTML = list.map((p) => `
      <tr data-code="${p.code}">
        <td class="code">${p.code}</td>
        <td>${fmtDate(p.createdAt)}<br><span style="font-size:12px;color:var(--muted)">${fmtTime(p.createdAt)}</span></td>
        <td class="who"><strong>${escapeHtml(p.name)}${p.flags ? `<span class="flag" title="Tiene alertas clínicas">● ${p.flags}</span>` : ''}</strong><span>${escapeHtml(p.email)} · ${escapeHtml(p.phone)}</span></td>
        <td>${escapeHtml(p.goalLabel)}<br><span style="font-size:12px;color:var(--muted)">${DIET[p.diet] || ''}</span></td>
        <td class="num">${p.kcal.toLocaleString('es-AR')}</td>
        <td>${statusSelect(p)}</td>
        <td><div class="acts">
          <button class="icon-btn" data-open="${p.code}" aria-label="Ver detalle de ${p.code}" title="Ver detalle">${ICON_EYE}</button>
          <a class="icon-btn" href="/api/admin/plans/${p.code}/download" aria-label="Descargar plan ${p.code}" title="Descargar plan">${ICON_DL}</a>
        </div></td>
      </tr>`).join('');
    if (PLANS.length && !list.length) $('#rows').innerHTML = '<tr><td colspan="7" class="empty">No hay planes con esos filtros.</td></tr>';
  }
  $('#q').addEventListener('input', renderTable);
  $('#fStatus').addEventListener('change', renderTable);
  $('#fGoal').addEventListener('change', renderTable);

  async function setStatus(code, status) {
    try {
      const r = await api(`/api/admin/plans/${code}`, { method: 'PATCH', body: { status } });
      const i = PLANS.findIndex((p) => p.code === code);
      PLANS[i] = r.summary;
      renderKpis(); renderTable();
      toast(`${code} · ${STATUS_LABEL[status]}`);
    } catch { toast('No se pudo actualizar el estado'); }
  }
  document.addEventListener('change', (e) => {
    if (e.target.matches('select.status')) setStatus(e.target.dataset.code, e.target.value);
  });
  $('#rows').addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]');
    if (b) openDrawer(b.dataset.open);
    else if (e.target.closest('tr[data-code]') && !e.target.closest('select, a, button')) openDrawer(e.target.closest('tr').dataset.code);
  });

  // ---------- Detalle
  let lastFocus;
  async function openDrawer(code) {
    lastFocus = document.activeElement;
    let p;
    try { p = await api(`/api/admin/plans/${code}`); } catch { toast('No se pudo abrir el plan'); return; }
    const d = p.input, t = p.result.targets, s = p.summary;
    const waNum = d.personal.phone.replace(/\D/g, '');
    const waText = `Hola ${d.personal.name.split(' ')[0]}, soy Taís Löwe. Recibí tu solicitud del plan ${p.code}. ¿Coordinamos la consulta?`;
    const day0 = p.result.week.days[0];
    $('#drawerBody').innerHTML = `
      <span class="d-code">${p.code}</span>
      <h2 id="dName">${escapeHtml(d.personal.name)}</h2>
      <p class="d-sub">${escapeHtml(s.goalLabel)} · creado el ${fmtDate(p.createdAt, { day: '2-digit', month: 'long', year: 'numeric' })} ${fmtTime(p.createdAt)}</p>
      <div class="d-band">
        <div><span class="label">kcal</span><div class="v">${t.kcal}</div></div>
        <div><span class="label">Proteína</span><div class="v">${t.protein}<small> g</small></div></div>
        <div><span class="label">Hidratos</span><div class="v">${t.carbs}<small> g</small></div></div>
        <div><span class="label">Grasas</span><div class="v">${t.fat}<small> g</small></div></div>
      </div>
      <div class="field"><span class="label">Estado</span>${statusSelect(s)}</div>
      <div class="d-actions">
        <a class="btn btn-primary btn-sm" href="/api/admin/plans/${p.code}/download">Descargar plan</a>
        <a class="btn btn-ghost btn-sm" href="/api/admin/plans/${p.code}/download?inline=1" target="_blank" rel="noopener">Ver / imprimir</a>
        ${waNum ? `<a class="btn btn-gold btn-sm" href="https://wa.me/${waNum}?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
      </div>
      ${p.result.flags.length ? `<div class="d-sec d-flags"><h4>Alertas para revisar</h4><ul>${p.result.flags.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul></div>` : ''}
      <div class="d-sec"><h4>Contacto</h4>
        <div class="kv"><span>Email</span><span><a href="mailto:${escapeHtml(d.personal.email)}">${escapeHtml(d.personal.email)}</a></span></div>
        <div class="kv"><span>WhatsApp</span><span>${escapeHtml(d.personal.phone)}</span></div>
        <div class="kv"><span>Solicitud</span><span>${p.contact ? `${p.contact.channel === 'callback' ? 'Pidió que la/lo contacten' : 'Escribió por WhatsApp'}${p.contact.preferredTime ? ' · ' + escapeHtml(p.contact.preferredTime) : ''} · ${fmtDate(p.contact.at)}` : 'Sin solicitud aún'}</span></div>
      </div>
      <div class="d-sec"><h4>Datos y cálculo</h4>
        <div class="kv"><span>Sexo · edad</span><span>${d.personal.sex === 'F' ? 'F' : 'M'} · ${d.personal.age} años</span></div>
        <div class="kv"><span>Peso · altura${d.personal.waist ? ' · cintura' : ''}</span><span>${d.personal.weight} kg · ${d.personal.height} cm${d.personal.waist ? ' · ' + d.personal.waist + ' cm' : ''}</span></div>
        <div class="kv"><span>IMC</span><span>${t.bmi} (${t.bmiLabel})${t.bodyFat ? ' · grasa ≈ ' + t.bodyFat + '%' : ''}</span></div>
        <div class="kv"><span>Basal · factor actividad</span><span>${t.bmr} kcal · × ${t.neatFactor}</span></div>
        <div class="kv"><span>Ejercicio</span><span>${t.trainMinutesWeek} min/sem · +${t.eatDay} kcal/día</span></div>
        <div class="kv"><span>Gasto total (TDEE)</span><span>${t.tdee} kcal</span></div>
        <div class="kv"><span>Ajuste · cambio estimado</span><span>${t.adjustmentPct > 0 ? '+' : ''}${t.adjustmentPct}% · ${t.weeklyChangeKg} kg/sem${t.weeksToTarget ? ` · ~${t.weeksToTarget} sem` : ''}</span></div>
        <div class="kv"><span>Preferencias</span><span>${DIET[d.food.diet]} · ${d.food.meals} comidas${d.food.allergies.length ? ' · sin ' + d.food.allergies.join(', ') : ''}</span></div>
      </div>
      <div class="d-sec d-meals"><h4>Vista previa · ${day0.day}</h4>
        ${day0.meals.map((m) => `<div class="m"><b>${escapeHtml(m.name)}</b> · ${m.totals.kcal} kcal<br>${m.items.map((i) => `${escapeHtml(i.name)} ${escapeHtml(i.amount)}`).join(' · ')}</div>`).join('')}
      </div>
      <div class="d-sec d-notes"><h4>Notas privadas</h4>
        <textarea class="input" id="dNotes" maxlength="2000" placeholder="Notas de la consulta, ajustes pendientes…">${escapeHtml(p.notes || '')}</textarea>
        <button class="btn btn-sm btn-primary" id="saveNotes" style="margin-top:10px">Guardar notas</button>
      </div>
      <button class="d-danger" id="delPlan">Eliminar este plan</button>`;

    $('#saveNotes').addEventListener('click', async () => {
      try {
        const r = await api(`/api/admin/plans/${p.code}`, { method: 'PATCH', body: { notes: $('#dNotes').value } });
        PLANS[PLANS.findIndex((x) => x.code === p.code)] = r.summary;
        toast('Notas guardadas');
      } catch { toast('No se pudieron guardar las notas'); }
    });
    $('#delPlan').addEventListener('click', async () => {
      if (!confirm(`¿Eliminar definitivamente el plan ${p.code} de ${d.personal.name}? Esta acción no se puede deshacer.`)) return;
      try {
        await api(`/api/admin/plans/${p.code}`, { method: 'DELETE' });
        closeDrawer();
        toast(`Plan ${p.code} eliminado`);
        load();
      } catch { toast('No se pudo eliminar'); }
    });

    $('#drawerBg').hidden = false;
    const dr = $('#drawer');
    dr.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => dr.classList.add('open'));
    $('#drawerX').focus();
  }
  function closeDrawer() {
    $('#drawer').classList.remove('open');
    $('#drawer').setAttribute('aria-hidden', 'true');
    $('#drawerBg').hidden = true;
    if (lastFocus) lastFocus.focus();
  }
  $('#drawerX').addEventListener('click', closeDrawer);
  $('#drawerBg').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#drawer').classList.contains('open')) closeDrawer(); });

  boot();
})();
