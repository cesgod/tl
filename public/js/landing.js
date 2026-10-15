loadBrand();
$('#year').textContent = new Date().getFullYear();

// ---- Navegación
const nav = $('#nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 10), { passive: true });
const menu = $('#menu');
$('#navToggle').addEventListener('click', (e) => {
  const open = menu.classList.toggle('open');
  e.currentTarget.setAttribute('aria-expanded', open);
});
$$('#menu a').forEach((a) => a.addEventListener('click', () => { menu.classList.remove('open'); $('#navToggle').setAttribute('aria-expanded', 'false'); }));

// ---- Servicios (tabs)
const SERVICES = [
  {
    title: 'Consulta nutricional', text: 'Una primera consulta completa para conocerte, evaluar tu estado nutricional y definir objetivos realistas.',
    list: ['Historia clínica y alimentaria', 'Medidas antropométricas', 'Análisis de hábitos y rutina', 'Objetivos a corto y largo plazo'],
    mode: 'Presencial u online', time: '60 minutos',
  },
  {
    title: 'Plan alimentario personalizado', text: 'Un plan semanal pensado para tu objetivo, tus gustos, tus horarios y tu presupuesto. Con porciones claras y opciones de reemplazo.',
    list: ['Calorías y macros a medida', 'Menú de 7 días', 'Lista de compras', 'Recetas simples'],
    mode: 'Se entrega en consulta', time: 'Ajustes cada 3–4 semanas',
  },
  {
    title: 'Nutrición deportiva', text: 'Alimentación para rendir y recuperarte mejor, alineada a tu entrenamiento: fuerza, running, deportes de equipo o funcional.',
    list: ['Periodización según entrenamiento', 'Pre y post entrenamiento', 'Hidratación', 'Suplementación basada en evidencia'],
    mode: 'Presencial u online', time: '60 minutos',
  },
  {
    title: 'Seguimiento', text: 'Controles periódicos para medir la evolución, resolver dudas y ajustar el plan a lo que va pasando en tu vida.',
    list: ['Control de medidas', 'Ajuste del plan', 'Consultas por mensaje', 'Educación alimentaria'],
    mode: 'Presencial u online', time: '30–40 minutos',
  },
];
function showService(i) {
  const s = SERVICES[i];
  $$('.tabs button').forEach((b, j) => { b.setAttribute('aria-selected', i === j); b.tabIndex = i === j ? 0 : -1; });
  $('#svcNum').textContent = String(i + 1).padStart(2, '0');
  $('#svcTitle').textContent = s.title;
  $('#svcText').textContent = s.text;
  $('#svcList').innerHTML = s.list.map((x) => `<li>${escapeHtml(x)}</li>`).join('');
  $('#svcMode').textContent = s.mode;
  $('#svcTime').textContent = s.time;
  const panel = $('#svc-panel');
  panel.classList.remove('svc-anim'); void panel.offsetWidth; panel.classList.add('svc-anim');
}
$$('.tabs button').forEach((b) => {
  b.addEventListener('click', () => showService(+b.dataset.svc));
  b.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const n = (+b.dataset.svc + (e.key === 'ArrowRight' ? 1 : -1) + SERVICES.length) % SERVICES.length;
    showService(n);
    $$('.tabs button')[n].focus();
  });
});
showService(0);

// ---- Plato interactivo
const PLATE = [
  { share: '½ plato', title: 'Verduras', text: 'Aportan fibra, vitaminas y saciedad con muy pocas calorías. Cuantos más colores, mejor: crudas, asadas o salteadas.', foods: ['Hojas verdes', 'Brócoli', 'Tomate', 'Zanahoria', 'Zapallitos', 'Calabaza', 'Morrón'] },
  { share: '¼ plato', title: 'Proteínas', text: 'Sostienen tus músculos y te mantienen con saciedad por más tiempo. Del tamaño y grosor de la palma de tu mano.', foods: ['Pollo', 'Pescado', 'Huevo', 'Carne magra', 'Legumbres', 'Tofu'] },
  { share: '¼ plato', title: 'Cereales y tubérculos', text: 'Tu fuente principal de energía. Elegí versiones integrales y ajustá la cantidad según tu actividad del día.', foods: ['Arroz integral', 'Quinoa', 'Papa', 'Batata', 'Fideos integrales', 'Choclo'] },
];
function showSeg(i) {
  $$('.seg').forEach((s) => s.classList.toggle('active', +s.dataset.seg === i));
  const p = PLATE[i];
  $('#piShare').textContent = p.share;
  $('#piTitle').textContent = p.title;
  $('#piText').textContent = p.text;
  $('#piFoods').innerHTML = p.foods.map((f) => `<span class="chip"><span>${escapeHtml(f)}</span></span>`).join('');
  const info = $('#plateInfo');
  info.classList.remove('svc-anim'); void info.offsetWidth; info.classList.add('svc-anim');
}
$$('.seg').forEach((s) => {
  s.addEventListener('click', () => showSeg(+s.dataset.seg));
  s.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showSeg(+s.dataset.seg); } });
});
showSeg(0);

// ---- Mitos y verdades
const MYTHS = [
  { q: 'Comer de noche engorda.', v: 'Mito', a: 'Lo que cuenta es el total del día y la calidad de lo que comés, no el horario. Cenar liviano sí puede ayudarte a dormir mejor.' },
  { q: 'Hay que eliminar las harinas para bajar de peso.', v: 'Mito', a: 'Los cereales integrales aportan energía y fibra. Ajustar porciones funciona mejor que prohibir.' },
  { q: 'La proteína ayuda a sentir más saciedad.', v: 'Verdad', a: 'Es el macronutriente más saciante y además protege tu masa muscular cuando bajás de peso.' },
  { q: 'Los jugos detox limpian el cuerpo.', v: 'Mito', a: 'Tu hígado y tus riñones ya hacen ese trabajo. Mejor fruta entera, agua y vegetales.' },
  { q: 'Dormir poco dificulta bajar de peso.', v: 'Verdad', a: 'Con menos de 7 horas aumentan las hormonas del hambre y bajan la energía y la motivación.' },
  { q: 'La fruta tiene demasiada azúcar.', v: 'Mito', a: 'Su azúcar viene con fibra, agua y vitaminas. 2 a 3 frutas por día son parte de una alimentación saludable.' },
];
$('#mythGrid').innerHTML = MYTHS.map((m, i) => `
  <button type="button" class="myth reveal" aria-pressed="false" aria-label="${escapeHtml(m.q)} Tocá para ver la respuesta">
    <div class="myth-inner">
      <div class="myth-face myth-front"><span class="label">0${i + 1}</span><p>${escapeHtml(m.q)}</p><small>¿Mito o verdad? →</small></div>
      <div class="myth-face myth-back"><span class="verdict">${m.v}</span><p>${escapeHtml(m.a)}</p></div>
    </div>
  </button>`).join('');
$$('.myth').forEach((b) => b.addEventListener('click', () => {
  const f = b.classList.toggle('flipped');
  b.setAttribute('aria-pressed', f);
}));
initReveal();

// ---- Receta con porciones
const INGREDIENTS = [
  [80, 'g', 'lentejas secas'], [150, 'g', 'calabaza'], [0.5, '', 'cebolla'], [0.5, '', 'morrón rojo'],
  [40, 'g', 'hojas verdes'], [1, 'cda.', 'aceite de oliva'], [1, 'cda.', 'semillas'], [0.5, '', 'limón'],
];
let servings = 2;
function fmtQty(q) {
  if (q % 1 === 0) return String(q);
  const whole = Math.floor(q);
  const frac = q - whole;
  const f = Math.abs(frac - 0.5) < 0.01 ? '½' : Math.abs(frac - 0.25) < 0.01 ? '¼' : Math.abs(frac - 0.75) < 0.01 ? '¾' : frac.toFixed(1);
  return (whole ? whole + ' ' : '') + f;
}
function renderIngredients() {
  $('#servOut').textContent = servings;
  const checked = new Set($$('#ingredients input:checked').map((i) => i.value));
  $('#ingredients').innerHTML = INGREDIENTS.map(([q, u, n]) => {
    const qty = fmtQty(Math.round(((q * servings) / 2) * 4) / 4);
    return `<li><label><input type="checkbox" value="${n}" ${checked.has(n) ? 'checked' : ''}><b>${qty}${u ? ' ' + u : ''}</b><span>${n}</span></label></li>`;
  }).join('');
}
$('#servMinus').addEventListener('click', () => { servings = Math.max(1, servings - 1); renderIngredients(); });
$('#servPlus').addEventListener('click', () => { servings = Math.min(8, servings + 1); renderIngredients(); });
renderIngredients();

// ---- Formulario de turnos -> WhatsApp
$('#turnoForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#tName');
  if (name.value.trim().length < 2) { name.classList.add('invalid'); name.focus(); toast('Contame tu nombre para poder responderte'); return; }
  name.classList.remove('invalid');
  await loadBrand();
  const reason = $('input[name=reason]:checked').value;
  const mode = $('input[name=mode]:checked').value;
  const msg = $('#tMsg').value.trim();
  const text = `Hola Taís, soy ${name.value.trim()}. Quisiera agendar un turno (${reason}, modalidad ${mode}).${msg ? '\n' + msg : ''}`;
  window.open(waLink(text), '_blank', 'noopener');
});
