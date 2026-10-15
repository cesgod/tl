(async function () {
  loadBrand();
  const form = $('#wizard');
  const steps = $$('.step');
  const DRAFT_KEY = 'tl_portal_draft';
  let current = 0;
  let OPT;

  const ICONS = {
    perder: '<path d="M4 7h16M7 12h10M10 17h4" stroke-linecap="round"/>',
    ganar: '<path d="M6 9v6M18 9v6M3 11v2M21 11v2M6 12h12" stroke-linecap="round"/>',
    recomp: '<path d="M4 16c3-6 5-6 8 0s5 6 8 0" stroke-linecap="round"/><circle cx="12" cy="6" r="2"/>',
    mantener: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/>',
    rendimiento: '<path d="M13 3 5 14h6l-1 7 8-11h-6z" stroke-linejoin="round"/>',
  };
  const GOAL_DESC = {
    perder: 'Reducir grasa cuidando el músculo y la energía.',
    ganar: 'Aumentar masa muscular con un superávit controlado.',
    recomp: 'Perder grasa y ganar músculo al mismo tiempo.',
    mantener: 'Comer mejor, sentirte bien y sostener tu peso.',
    rendimiento: 'Rendir y recuperarte mejor en tu deporte.',
  };
  const OCC_DESC = { sentado: 'Oficina, estudio, computadora', de_pie: 'Comercio, docencia, salud', fisico: 'Obra, reparto, carga' };
  const PACE_HINT = {
    suave: 'Cambios graduales, ideal para empezar sin presión.',
    moderado: 'Un equilibrio entre resultados y sostenibilidad.',
    intenso: 'Resultados más rápidos con mayor exigencia.',
  };
  const STRESS = ['', 'Muy bajo', 'Bajo', 'Moderado', 'Alto', 'Muy alto'];
  const ROLE_GROUP = { protein: 'Proteínas', bprotein: 'Desayunos y lácteos', carb: 'Cereales y tubérculos', bcarb: 'Panificados', fat: 'Grasas', veg: 'Verduras', fruit: 'Frutas' };

  try {
    OPT = await api('/api/options');
  } catch {
    toast('No pudimos cargar el formulario. Recargá la página.');
    return;
  }

  // ---------- Render de opciones
  $('#goalCards').innerHTML = OPT.goals.map((g, i) => `
    <label class="choice"><input type="radio" name="goal" value="${g.id}" ${i === 0 ? 'checked' : ''}>
      <span class="box"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">${ICONS[g.id] || ''}</svg>
      <strong>${escapeHtml(g.label)}</strong><small>${escapeHtml(GOAL_DESC[g.id] || '')}</small></span></label>`).join('');

  $('#occCards').innerHTML = OPT.occupation.map((o, i) => `
    <label class="choice"><input type="radio" name="occupation" value="${o.id}" ${i === 0 ? 'checked' : ''}>
      <span class="box"><strong>${escapeHtml(o.label)}</strong><small>${escapeHtml(OCC_DESC[o.id] || '')}</small></span></label>`).join('');

  const chipList = (list, name, type, checkedFirst) => list.map((o, i) => `
    <label class="chip"><input type="${type}" name="${name}" value="${o.id}" ${checkedFirst && i === 0 ? 'checked' : ''}><span>${escapeHtml(o.label)}</span></label>`).join('');
  $('#stepsChips').innerHTML = chipList(OPT.steps, 'steps', 'radio', true);
  $('#dietChips').innerHTML = chipList(OPT.diets, 'diet', 'radio', true);
  $('#allergyChips').innerHTML = chipList(OPT.allergens, 'allergies', 'checkbox');
  $('#condChips').innerHTML = chipList(OPT.conditions, 'conditions', 'checkbox') +
    '<label class="chip"><input type="checkbox" name="noCond" value="none"><span>Ninguna</span></label>';

  const foodGroups = (name, cls) => {
    const groups = {};
    OPT.foods.forEach((f) => (groups[f.role] = groups[f.role] || []).push(f));
    return Object.keys(ROLE_GROUP).filter((r) => groups[r]).map((r) => `
      <div><h4>${ROLE_GROUP[r]}</h4><div class="chips">${groups[r].map((f) => `
        <label class="chip ${cls}" data-food="${f.id}"><input type="checkbox" name="${name}" value="${f.id}"><span>${escapeHtml(f.name)}</span></label>`).join('')}</div></div>`).join('');
  };
  $('#dislikeGroups').innerHTML = foodGroups('dislikes', 'neg');
  $('#favGroups').innerHTML = foodGroups('favorites', 'fav');

  // Un alimento no puede ser favorito y "no me gusta" a la vez
  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'dislikes' || t.name === 'favorites') {
      const other = t.name === 'dislikes' ? 'favorites' : 'dislikes';
      const twin = form.querySelector(`input[name=${other}][value="${t.value}"]`);
      if (twin) { twin.checked = false; twin.closest('.chip').classList.toggle('disabled', t.checked); }
    }
    if (t.name === 'noCond' && t.checked) $$('input[name=conditions]').forEach((c) => (c.checked = false));
    if (t.name === 'conditions' && t.checked) $('input[name=noCond]').checked = false;
    if (t.name === 'pace') $('#paceHint').textContent = PACE_HINT[t.value];
    saveDraft();
  });

  // ---------- Entrenamientos dinámicos
  function addTraining(t = {}) {
    const row = document.createElement('div');
    row.className = 'train-row';
    row.innerHTML = `
      <div class="field"><label>Actividad</label><select class="input" data-k="type">${OPT.trainings.map((o) => `<option value="${o.id}" ${t.type === o.id ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}</select></div>
      <div class="field"><label>Días/sem</label><select class="input" data-k="days">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<option ${(+t.days || 3) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="field"><label>Minutos</label><select class="input" data-k="minutes">${[20, 30, 45, 60, 75, 90, 120].map((n) => `<option ${(+t.minutes || 60) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="field"><label>Intensidad</label><select class="input" data-k="intensity">${['baja', 'media', 'alta'].map((n) => `<option value="${n}" ${(t.intensity || 'media') === n ? 'selected' : ''}>${n[0].toUpperCase() + n.slice(1)}</option>`).join('')}</select></div>
      <button type="button" class="rm" aria-label="Quitar actividad">×</button>`;
    row.querySelector('.rm').addEventListener('click', () => { row.remove(); syncTrainTime(); saveDraft(); });
    $('#trainings').appendChild(row);
    syncTrainTime();
  }
  function syncTrainTime() {
    const n = $$('.train-row').length;
    $('#trainTimeWrap').hidden = n === 0;
    $('#addTraining').textContent = n ? '+ Agregar otra actividad' : '+ Agregar actividad';
    $('#addTraining').hidden = n >= 6;
  }
  $('#addTraining').addEventListener('click', () => { addTraining(); saveDraft(); });

  // ---------- Sliders
  const sleep = $('#sleep');
  const stress = $('#stress');
  const syncSliders = () => { $('#sleepOut').textContent = String(sleep.value).replace('.', ','); $('#stressOut').textContent = STRESS[stress.value]; };
  sleep.addEventListener('input', syncSliders);
  stress.addEventListener('input', syncSliders);

  // Figura que acompaña el peso (detalle visual, sin mostrar cálculos)
  const updateFigure = () => {
    const w = +$('#weight').value, h = +$('#height').value;
    if (!w || !h) return;
    const s = Math.min(1.45, Math.max(.8, (w / ((h / 100) ** 2)) / 22));
    $('#torso').style.transform = `scaleX(${s})`;
  };
  $('#weight').addEventListener('input', updateFigure);
  $('#height').addEventListener('input', updateFigure);

  // ---------- Recolección de datos
  const val = (sel) => { const el = form.querySelector(sel); return el ? el.value : ''; };
  const checked = (name) => $$(`input[name=${name}]:checked`).map((i) => i.value);
  function collect() {
    return {
      consent: $('#consent').checked,
      personal: {
        name: val('#name'), email: val('#email'), phone: val('#phone'),
        sex: checked('sex')[0] || '', age: val('#age'), weight: val('#weight'), height: val('#height'), waist: val('#waist'),
      },
      goal: { type: checked('goal')[0], pace: checked('pace')[0], targetWeight: val('#targetWeight'), motivation: val('#motivation') },
      movement: {
        occupation: checked('occupation')[0], steps: checked('steps')[0],
        trainings: $$('.train-row').map((r) => Object.fromEntries($$('[data-k]', r).map((s) => [s.dataset.k, s.value]))),
        trainTime: checked('trainTime')[0] || null, sleep: sleep.value, stress: stress.value,
      },
      food: {
        diet: checked('diet')[0], allergies: checked('allergies'), dislikes: checked('dislikes'), favorites: checked('favorites'),
        meals: checked('meals')[0], cooking: checked('cooking')[0],
      },
      health: { conditions: checked('conditions'), medication: val('#medication'), notes: val('#notes') },
    };
  }

  // ---------- Borrador local (comodidad: retomar si se recarga)
  function saveDraft() {
    try { const d = collect(); delete d.consent; localStorage.setItem(DRAFT_KEY, JSON.stringify({ d, step: current })); } catch {}
  }
  function restoreDraft() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return; }
    if (!saved || !saved.d) return;
    const d = saved.d;
    const setRadio = (name, v) => { const el = form.querySelector(`input[name=${name}][value="${v}"]`); if (el) el.checked = true; };
    const setChecks = (name, arr) => (arr || []).forEach((v) => setRadio(name, v));
    const setVal = (sel, v) => { if (v != null && $(sel)) $(sel).value = v; };
    setRadio('goal', d.goal.type); setRadio('pace', d.goal.pace); setVal('#targetWeight', d.goal.targetWeight); setVal('#motivation', d.goal.motivation);
    setRadio('sex', d.personal.sex); ['age', 'weight', 'height', 'waist', 'name', 'email', 'phone'].forEach((k) => setVal('#' + k, d.personal[k]));
    setRadio('occupation', d.movement.occupation); setRadio('steps', d.movement.steps); setRadio('trainTime', d.movement.trainTime);
    (d.movement.trainings || []).forEach(addTraining);
    setVal('#sleep', d.movement.sleep); setVal('#stress', d.movement.stress);
    setRadio('diet', d.food.diet); setChecks('allergies', d.food.allergies); setChecks('dislikes', d.food.dislikes); setChecks('favorites', d.food.favorites);
    setRadio('meals', d.food.meals); setRadio('cooking', d.food.cooking);
    setChecks('conditions', d.health.conditions); setVal('#medication', d.health.medication); setVal('#notes', d.health.notes);
    $$('input[name=dislikes]:checked').forEach((i) => { const f = form.querySelector(`input[name=favorites][value="${i.value}"]`); if (f) f.closest('.chip').classList.add('disabled'); });
    $$('input[name=favorites]:checked').forEach((i) => { const f = form.querySelector(`input[name=dislikes][value="${i.value}"]`); if (f) f.closest('.chip').classList.add('disabled'); });
    $('#paceHint').textContent = PACE_HINT[d.goal.pace] || PACE_HINT.moderado;
    if (saved.step > 0 && saved.step < steps.length) current = saved.step;
    toast('Retomamos donde lo dejaste ✦');
  }

  // ---------- Validación por paso
  function markInvalid(el, msg) {
    el.classList.add('invalid');
    el.addEventListener('input', () => el.classList.remove('invalid'), { once: true });
    el.focus();
    toast(msg);
    return false;
  }
  function validateStep(i) {
    if (i === 1) {
      if (!checked('sex').length) { toast('Elegí el sexo biológico para el cálculo'); $('#sex input').focus(); return false; }
      const age = $('#age'), w = $('#weight'), h = $('#height'), waist = $('#waist');
      if (!(+age.value >= 14 && +age.value <= 99)) return markInvalid(age, 'Ingresá una edad entre 14 y 99 años');
      if (!(+w.value >= 30 && +w.value <= 300)) return markInvalid(w, 'Ingresá tu peso en kg (30–300)');
      if (!(+h.value >= 120 && +h.value <= 230)) return markInvalid(h, 'Ingresá tu altura en cm (120–230)');
      if (waist.value && !(+waist.value >= 40 && +waist.value <= 200)) return markInvalid(waist, 'La cintura debe estar entre 40 y 200 cm');
    }
    if (i === 0) {
      const tw = $('#targetWeight');
      if (tw.value && !(+tw.value >= 30 && +tw.value <= 300)) return markInvalid(tw, 'El peso objetivo debe estar entre 30 y 300 kg');
    }
    if (i === 5) {
      const n = $('#name'), e = $('#email'), p = $('#phone');
      if (n.value.trim().length < 2) return markInvalid(n, 'Ingresá tu nombre');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.value.trim())) return markInvalid(e, 'Revisá tu email');
      if (p.value.replace(/\D/g, '').length < 6) return markInvalid(p, 'Ingresá un WhatsApp válido');
      if (!$('#consent').checked) { toast('Necesito tu consentimiento para preparar el plan'); $('#consent').focus(); return false; }
    }
    return true;
  }

  // ---------- Navegación entre pasos
  let maxReached = 0;
  function show(i) {
    current = i;
    maxReached = Math.max(maxReached, i);
    steps.forEach((s, j) => (s.hidden = j !== i));
    $$('#stepList li').forEach((li, j) => {
      li.classList.toggle('current', j === i);
      li.classList.toggle('done', j < i || (j <= maxReached && j !== i));
    });
    $('#progressBar').style.width = ((i + 1) / steps.length) * 100 + '%';
    $('#prevBtn').classList.toggle('invisible', i === 0);
    $('#nextBtn').innerHTML = i === steps.length - 1 ? 'Generar mi plan <span class="arrow">✦</span>' : 'Continuar <span class="arrow">→</span>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const h = steps[i].querySelector('h1');
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }
  $('#prevBtn').addEventListener('click', () => { if (current > 0) show(current - 1); saveDraft(); });
  $$('#stepList li').forEach((li) => li.addEventListener('click', () => {
    const j = +li.dataset.i;
    if (j <= maxReached && j !== current) show(j);
  }));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(current)) return;
    if (current < steps.length - 1) { show(current + 1); saveDraft(); return; }
    await submit();
  });

  // ---------- Envío
  const PROC = ['Calculando tu metabolismo basal', 'Analizando tu movimiento y entrenamientos', 'Ajustando calorías a tu objetivo', 'Distribuyendo proteínas, hidratos y grasas', 'Armando 7 días de comidas con tus preferencias', 'Preparando tu lista de compras'];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function submit() {
    const btn = $('#nextBtn');
    btn.disabled = true;
    const payload = collect();
    form.hidden = true;
    $('.p-side').hidden = true;
    const proc = $('#processing');
    proc.hidden = false;
    $('#procList').innerHTML = PROC.map((p) => `<li>${p}</li>`).join('');
    const items = $$('#procList li');
    const req = api('/api/plans', { method: 'POST', body: payload }).then((r) => ({ r }), (err) => ({ err }));
    for (let k = 0; k < items.length; k++) {
      items[k].classList.add('on');
      $('#procArc').style.strokeDashoffset = 327 - (327 * (k + 1)) / items.length;
      await wait(650);
      items[k].classList.add('ok');
    }
    const { r, err } = await req;
    if (err) {
      proc.hidden = true;
      form.hidden = false;
      $('.p-side').hidden = false;
      btn.disabled = false;
      toast(err.message || 'No pudimos generar el plan. Probá de nuevo.', 5000);
      return;
    }
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    showDone(r, payload);
  }

  function showDone(r, payload) {
    $('#processing').hidden = true;
    $('#progressBar').style.width = '100%';
    $('#doneCode').textContent = r.code;
    $('#doneName').textContent = r.name;
    $('#done').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const text = `Hola Taís, soy ${payload.personal.name}. Completé el portal y mi código de plan es ${r.code}. Me gustaría coordinar una consulta para recibirlo.`;
    const wa = $('#waBtn');
    loadBrand().then(() => (wa.href = waLink(text)));
    const markContact = async (channel, preferredTime) => {
      try {
        await api(`/api/plans/${r.code}/contact`, { method: 'POST', body: { token: r.token, channel, preferredTime } });
        return true;
      } catch { return false; }
    };
    wa.addEventListener('click', () => { markContact('whatsapp'); $('#doneOk').hidden = false; });
    $('#callbackBtn').addEventListener('click', () => { $('#callbackBox').hidden = false; });
    $('#callbackSend').addEventListener('click', async () => {
      const ok = await markContact('callback', checked('cbTime')[0]);
      if (ok) { $('#callbackBox').hidden = true; $('#callbackBtn').hidden = true; $('#doneOk').hidden = false; }
      else toast('No pudimos registrar la solicitud. Escribime por WhatsApp.');
    });
  }

  // ---------- Inicio
  restoreDraft();
  syncTrainTime();
  syncSliders();
  updateFigure();
  show(current);
})();
