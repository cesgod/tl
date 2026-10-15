// Documento descargable del plan (HTML listo para imprimir / guardar como PDF), con la identidad de marca.

const { labels } = require('./engine');

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (iso) => new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

function planDocument(rec, brand) {
  const d = rec.input;
  const r = rec.result;
  const t = r.targets;

  const trainings = t.trainingDetail.length
    ? t.trainingDetail.map((x) => `<li>${esc(x.label)} · ${x.days}×/sem · ${x.minutes} min · intensidad ${esc(x.intensity)} <span class="muted">(≈ ${x.kcalSession} kcal/sesión)</span></li>`).join('')
    : '<li>Sin entrenamiento estructurado declarado</li>';

  const days = r.week.days.map((day) => `
    <section class="day">
      <h3>${esc(day.day)} <span class="day-tot">${day.totals.kcal} kcal · P ${day.totals.p} g · H ${day.totals.c} g · G ${day.totals.f} g</span></h3>
      ${day.meals.map((m) => `
        <div class="meal">
          <div class="meal-h"><strong>${esc(m.name)}</strong><span>${m.totals.kcal} kcal</span></div>
          <ul>${m.items.map((it) => `<li><span>${esc(it.name)}</span><span>${esc(it.amount)}</span></li>`).join('')}</ul>
        </div>`).join('')}
    </section>`).join('');

  const shopping = r.week.shoppingList.map((g) => `
    <div class="shop-group"><h4>${esc(g.group)}</h4><ul>${g.items.map((i) => `<li><span>${esc(i.name)}</span><span>${i.grams >= 1000 ? (i.grams / 1000).toFixed(1).replace('.', ',') + ' kg' : i.grams + ' g'}</span></li>`).join('')}</ul></div>`).join('');

  const recs = r.recommendations.map((x) => `<li><strong>${esc(x.area)}.</strong> ${esc(x.text)}</li>`).join('');
  const flags = r.flags.length ? `<div class="flags"><h4>Para revisar en consulta</h4><ul>${r.flags.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div>` : '';

  const pref = [
    labels.DIETS[d.food.diet],
    d.food.allergies.length ? 'Sin: ' + d.food.allergies.map((a) => labels.ALLERGENS[a]).join(', ') : null,
    `${d.food.meals} comidas/día`,
    d.food.cooking === 'rapido' ? 'Preparaciones rápidas' : null,
  ].filter(Boolean).join(' · ');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Plan alimentario ${esc(rec.code)} · ${esc(d.personal.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  :root{--verde:#1F3D2E;--dorado:#C9A24B;--champan:#E8D5A3;--salvia:#7A9477;--crema:#F5EFE0;--tinta:#16201B}
  *{box-sizing:border-box}
  body{margin:0;background:var(--crema);color:var(--tinta);font:300 15px/1.5 Jost,Calibri,sans-serif;font-variant-numeric:lining-nums}
  .page{max-width:900px;margin:0 auto;background:#fffdf7;padding:48px 56px}
  .serif{font-family:'Cormorant Garamond',Georgia,serif}
  header.doc{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid var(--dorado);padding-bottom:20px;margin-bottom:28px}
  .logo{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:40px;line-height:.85;letter-spacing:-.015em;color:var(--verde)}
  .logo .o{color:var(--dorado)}
  .desc{font-size:9px;letter-spacing:.6em;margin-top:8px;color:var(--verde)}
  .meta{text-align:right;font-size:12px;color:var(--salvia)}
  h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:44px;line-height:1;margin:0 0 4px;color:var(--verde)}
  h2{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:26px;color:var(--verde);margin:36px 0 12px}
  h3{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:22px;color:var(--verde);margin:0 0 10px;display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}
  h4{font-size:11px;letter-spacing:.25em;text-transform:uppercase;font-weight:500;color:var(--verde);margin:0 0 8px}
  .kicker{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--salvia)}
  .muted{color:#6b7a70}
  .band{background:var(--verde);color:var(--crema);border-radius:18px;padding:24px 28px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:20px 0}
  .band .k{font-size:10px;letter-spacing:.25em;text-transform:uppercase;color:var(--champan)}
  .band .v{font-family:'Cormorant Garamond',Georgia,serif;font-size:34px;line-height:1.1}
  .band .v small{font-size:14px;font-family:Jost,sans-serif;color:var(--champan)}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
  .card{border:1px solid var(--champan);border-radius:14px;padding:16px 18px}
  .kv{display:flex;justify-content:space-between;border-bottom:1px dashed #e4dcc6;padding:4px 0;font-size:14px}
  .kv:last-child{border:0}
  ul{margin:0;padding-left:18px}
  .recs li{margin-bottom:8px}
  .flags{background:#fbf4e2;border-left:3px solid var(--dorado);padding:14px 18px;border-radius:8px;margin-top:16px}
  .day{break-inside:avoid;border-top:1px solid var(--champan);padding-top:18px;margin-top:22px}
  .day-tot{font-family:Jost,sans-serif;font-size:12px;color:var(--salvia);font-weight:400}
  .meal{margin-bottom:12px}
  .meal-h{display:flex;justify-content:space-between;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--verde);border-bottom:1px solid #eee3c8;padding-bottom:3px;margin-bottom:4px}
  .meal-h span{color:var(--dorado)}
  .meal ul,.shop-group ul{list-style:none;padding:0}
  .meal li,.shop-group li{display:flex;justify-content:space-between;gap:12px;font-size:14px;padding:2px 0}
  .meal li span:last-child,.shop-group li span:last-child{color:#5d6b62;white-space:nowrap}
  .shop{columns:2;column-gap:28px}
  .shop-group{break-inside:avoid;margin-bottom:18px}
  footer.doc{margin-top:40px;border-top:1px solid var(--dorado);padding-top:14px;font-size:11px;color:var(--salvia);display:flex;justify-content:space-between;gap:16px}
  .print{position:fixed;right:20px;bottom:20px;background:var(--verde);color:var(--crema);border:0;border-radius:999px;padding:12px 22px;font:500 13px Jost,sans-serif;letter-spacing:.1em;cursor:pointer}
  @media (max-width:700px){.page{padding:28px 18px}.band{grid-template-columns:1fr 1fr}.grid2{grid-template-columns:1fr}.shop{columns:1}}
  @media print{body{background:#fff}.page{padding:0;max-width:none}.print{display:none}.band{-webkit-print-color-adjust:exact;print-color-adjust:exact}h2{break-after:avoid}}
</style>
</head>
<body>
<button class="print" onclick="window.print()">Imprimir / guardar PDF</button>
<div class="page">
  <header class="doc">
    <div><div class="logo">taís<br>l<span class="o">ö</span>we</div><div class="desc">NUTRICIONISTA</div></div>
    <div class="meta">Plan ${esc(rec.code)}<br>${fmtDate(rec.createdAt)}</div>
  </header>

  <div class="kicker">Plan alimentario personalizado</div>
  <h1>${esc(d.personal.name)}</h1>
  <div class="muted">${esc(labels.GOALS[d.goal.type].label)} · ritmo ${esc(d.goal.pace)}${d.goal.targetWeight ? ` · peso objetivo ${d.goal.targetWeight} kg` : ''}</div>

  <div class="band">
    <div><div class="k">Energía</div><div class="v">${t.kcal} <small>kcal</small></div></div>
    <div><div class="k">Proteínas</div><div class="v">${t.protein} <small>g · ${t.macroPct.p}%</small></div></div>
    <div><div class="k">Hidratos</div><div class="v">${t.carbs} <small>g · ${t.macroPct.c}%</small></div></div>
    <div><div class="k">Grasas</div><div class="v">${t.fat} <small>g · ${t.macroPct.f}%</small></div></div>
  </div>

  <div class="grid2">
    <div class="card">
      <h4>Datos de la persona</h4>
      <div class="kv"><span>Sexo · edad</span><span>${d.personal.sex === 'F' ? 'Femenino' : 'Masculino'} · ${d.personal.age} años</span></div>
      <div class="kv"><span>Peso · altura</span><span>${d.personal.weight} kg · ${d.personal.height} cm</span></div>
      ${d.personal.waist ? `<div class="kv"><span>Cintura</span><span>${d.personal.waist} cm</span></div>` : ''}
      <div class="kv"><span>IMC</span><span>${t.bmi} · ${esc(t.bmiLabel)}</span></div>
      ${t.bodyFat ? `<div class="kv"><span>% grasa estimado (RFM)</span><span>${t.bodyFat}%</span></div>` : ''}
      <div class="kv"><span>Contacto</span><span>${esc(d.personal.phone)}</span></div>
      <div class="kv"><span>Email</span><span>${esc(d.personal.email)}</span></div>
    </div>
    <div class="card">
      <h4>Gasto energético</h4>
      <div class="kv"><span>Metabolismo basal</span><span>${t.bmr} kcal</span></div>
      <div class="kv"><span>Factor de actividad diaria</span><span>× ${t.neatFactor}</span></div>
      <div class="kv"><span>Ejercicio (promedio diario)</span><span>+ ${t.eatDay} kcal</span></div>
      <div class="kv"><span>Gasto total estimado</span><span><strong>${t.tdee} kcal</strong></span></div>
      <div class="kv"><span>Ajuste por objetivo</span><span>${t.adjustmentPct > 0 ? '+' : ''}${t.adjustmentPct}%</span></div>
      <div class="kv"><span>Cambio estimado</span><span>${t.weeklyChangeKg > 0 ? '+' : ''}${t.weeklyChangeKg} kg/sem${t.weeksToTarget ? ` · ~${t.weeksToTarget} semanas` : ''}</span></div>
      <div class="kv"><span>Agua · fibra</span><span>${String(t.waterL).replace('.', ',')} L · ${t.fiber} g</span></div>
    </div>
  </div>

  <h2>Movimiento y entrenamiento</h2>
  <div class="grid2">
    <div class="card">
      <h4>Patrón diario</h4>
      <div class="kv"><span>Ocupación</span><span>${esc(labels.OCCUPATION[d.movement.occupation].label)}</span></div>
      <div class="kv"><span>Pasos</span><span>${esc(labels.STEPS[d.movement.steps].label)}</span></div>
      <div class="kv"><span>Sueño</span><span>${d.movement.sleep} h</span></div>
      <div class="kv"><span>Estrés (1–5)</span><span>${d.movement.stress}</span></div>
    </div>
    <div class="card"><h4>Entrenamiento (${t.trainMinutesWeek} min/sem)</h4><ul>${trainings}</ul></div>
  </div>

  <h2>Cómo llegar al objetivo</h2>
  <ul class="recs">${recs}</ul>
  ${flags}
  ${d.goal.motivation ? `<p class="muted"><em>Motivación: “${esc(d.goal.motivation)}”</em></p>` : ''}
  ${d.health.notes ? `<p class="muted"><em>Notas de salud: ${esc(d.health.notes)}</em></p>` : ''}

  <h2>Plan semanal</h2>
  <div class="muted">${esc(pref)} · Promedio real del plan: ${r.week.average.kcal} kcal · P ${r.week.average.p} g · H ${r.week.average.c} g · G ${r.week.average.f} g</div>
  ${days}

  <h2>Lista de compras semanal</h2>
  <div class="shop">${shopping}</div>

  <footer class="doc">
    <span>Lic. Taís Löwe · Nutricionista${brand.whatsapp ? ' · ' + esc(brand.whatsapp) : ''}${brand.instagram ? ' · ' + esc(brand.instagram) : ''}</span>
    <span>Plan orientativo generado a partir de los datos declarados. Debe ser revisado y validado en consulta.</span>
  </footer>
</div>
</body>
</html>`;
}

module.exports = { planDocument, esc };
