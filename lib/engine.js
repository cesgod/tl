// Motor de cálculo: requerimientos energéticos, macronutrientes, recomendaciones y plan semanal.
// Todo se calcula en el servidor; el resultado nunca se envía a la persona que completa el formulario.

const { FOODS } = require('./foods');

const DIET_RANK = { vegan: 0, veg: 1, pesc: 2, omni: 3 };

const TRAINING_TYPES = {
  fuerza: { label: 'Fuerza / musculación', met: { baja: 3.5, media: 5, alta: 6 } },
  cardio: { label: 'Correr / cardio continuo', met: { baja: 6, media: 8, alta: 10 } },
  hiit: { label: 'HIIT / funcional / crossfit', met: { baja: 6, media: 8, alta: 9.5 } },
  ciclismo: { label: 'Ciclismo / spinning', met: { baja: 5.5, media: 7.5, alta: 10 } },
  natacion: { label: 'Natación', met: { baja: 6, media: 8, alta: 10 } },
  deporte: { label: 'Deporte de equipo', met: { baja: 5, media: 7, alta: 8.5 } },
  yoga: { label: 'Yoga / pilates / movilidad', met: { baja: 2.5, media: 3, alta: 4 } },
  caminata: { label: 'Caminata activa', met: { baja: 3, media: 3.8, alta: 4.8 } },
  baile: { label: 'Danza / baile', met: { baja: 4.5, media: 6, alta: 7.5 } },
};

const GOALS = {
  perder: { label: 'Bajar grasa corporal', adj: { suave: -0.1, moderado: -0.18, intenso: -0.25 }, protein: 2.0 },
  ganar: { label: 'Ganar masa muscular', adj: { suave: 0.05, moderado: 0.1, intenso: 0.15 }, protein: 1.8 },
  recomp: { label: 'Recomposición corporal', adj: { suave: -0.05, moderado: -0.08, intenso: -0.12 }, protein: 2.2 },
  mantener: { label: 'Mantener peso y mejorar hábitos', adj: { suave: 0, moderado: 0, intenso: 0 }, protein: 1.4 },
  rendimiento: { label: 'Rendimiento deportivo', adj: { suave: 0.03, moderado: 0.06, intenso: 0.1 }, protein: 1.7 },
};

const OCCUPATION = {
  sentado: { label: 'Mayormente sentada/o', factor: 1.2 },
  de_pie: { label: 'De pie o caminando parte del día', factor: 1.35 },
  fisico: { label: 'Trabajo físico intenso', factor: 1.5 },
};

const STEPS = {
  '<5k': { label: 'Menos de 5.000 pasos', add: 0 },
  '5-8k': { label: 'Entre 5.000 y 8.000 pasos', add: 0.05 },
  '8-12k': { label: 'Entre 8.000 y 12.000 pasos', add: 0.1 },
  '>12k': { label: 'Más de 12.000 pasos', add: 0.15 },
};

const CONDITIONS = {
  diabetes: 'Diabetes / resistencia a la insulina',
  hipotiroidismo: 'Hipotiroidismo',
  hipertension: 'Hipertensión',
  colesterol: 'Colesterol / triglicéridos elevados',
  sop: 'Síndrome de ovario poliquístico',
  digestivo: 'Trastornos digestivos (SII, reflujo, etc.)',
  embarazo: 'Embarazo o lactancia',
  renal: 'Enfermedad renal',
  tca: 'Antecedentes de trastornos de la conducta alimentaria',
};

const ALLERGENS = {
  lactosa: 'Lactosa / lácteos',
  gluten: 'Gluten (celiaquía)',
  huevo: 'Huevo',
  frutos_secos: 'Frutos secos',
  mani: 'Maní',
  pescado: 'Pescado',
  mariscos: 'Mariscos',
  soja: 'Soja',
};

const DIETS = {
  omni: 'Omnívora',
  pesc: 'Pescetariana',
  veg: 'Vegetariana (ovo-lácteo)',
  vegan: 'Vegana',
};

const MEAL_LAYOUTS = {
  3: [['Desayuno', 'breakfast', 0.25], ['Almuerzo', 'main', 0.4], ['Cena', 'main', 0.35]],
  4: [['Desayuno', 'breakfast', 0.22], ['Almuerzo', 'main', 0.33], ['Merienda', 'breakfast', 0.17], ['Cena', 'main', 0.28]],
  5: [['Desayuno', 'breakfast', 0.2], ['Colación de media mañana', 'snack', 0.1], ['Almuerzo', 'main', 0.3], ['Merienda', 'breakfast', 0.15], ['Cena', 'main', 0.25]],
  6: [['Desayuno', 'breakfast', 0.18], ['Colación de media mañana', 'snack', 0.09], ['Almuerzo', 'main', 0.28], ['Merienda', 'breakfast', 0.15], ['Cena', 'main', 0.22], ['Colación nocturna', 'snack', 0.08]],
};

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const round = (n, step = 1) => Math.round(n / step) * step;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

// ---------------------------------------------------------------- Validación
function num(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}
function str(v, max = 120) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}
function pick(v, allowed, fallback) {
  return Object.prototype.hasOwnProperty.call(allowed, v) ? v : fallback;
}
function list(v, allowed, max = 20) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x) => typeof x === 'string' && allowed.includes(x)))].slice(0, max);
}

function validate(body) {
  const errors = [];
  const b = body && typeof body === 'object' ? body : {};
  const p = b.personal || {};
  const g = b.goal || {};
  const m = b.movement || {};
  const fd = b.food || {};
  const h = b.health || {};

  const personal = {
    name: str(p.name, 80),
    email: str(p.email, 120),
    phone: str(p.phone, 40),
    sex: p.sex === 'M' ? 'M' : p.sex === 'F' ? 'F' : null,
    age: num(p.age, 14, 99),
    weight: num(p.weight, 30, 300),
    height: num(p.height, 120, 230),
    waist: p.waist === '' || p.waist == null ? null : num(p.waist, 40, 200),
  };
  if (personal.name.length < 2) errors.push('Nombre');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email)) errors.push('Email');
  if (personal.phone.replace(/\D/g, '').length < 6) errors.push('Teléfono');
  if (!personal.sex) errors.push('Sexo biológico');
  if (personal.age == null) errors.push('Edad');
  if (personal.weight == null) errors.push('Peso');
  if (personal.height == null) errors.push('Altura');

  const goal = {
    type: pick(g.type, GOALS, 'mantener'),
    pace: ['suave', 'moderado', 'intenso'].includes(g.pace) ? g.pace : 'moderado',
    targetWeight: g.targetWeight === '' || g.targetWeight == null ? null : num(g.targetWeight, 30, 300),
    motivation: str(g.motivation, 400),
  };

  const trainings = Array.isArray(m.trainings) ? m.trainings.slice(0, 6) : [];
  const movement = {
    occupation: pick(m.occupation, OCCUPATION, 'sentado'),
    steps: pick(m.steps, STEPS, '<5k'),
    trainings: trainings
      .map((t) => ({
        type: pick(t && t.type, TRAINING_TYPES, null),
        days: num(t && t.days, 1, 7),
        minutes: num(t && t.minutes, 10, 240),
        intensity: ['baja', 'media', 'alta'].includes(t && t.intensity) ? t.intensity : 'media',
      }))
      .filter((t) => t.type && t.days && t.minutes),
    trainTime: ['manana', 'mediodia', 'tarde', 'noche'].includes(m.trainTime) ? m.trainTime : null,
    sleep: num(m.sleep, 3, 12) || 7,
    stress: num(m.stress, 1, 5) || 3,
  };

  const food = {
    diet: pick(fd.diet, DIETS, 'omni'),
    allergies: list(fd.allergies, Object.keys(ALLERGENS)),
    dislikes: list(fd.dislikes, FOODS.map((f) => f.id), 60),
    favorites: list(fd.favorites, FOODS.map((f) => f.id), 60),
    meals: clamp(Math.round(num(fd.meals, 3, 6) || 4), 3, 6),
    cooking: fd.cooking === 'rapido' ? 'rapido' : 'normal',
  };

  const health = {
    conditions: list(h.conditions, Object.keys(CONDITIONS)),
    medication: str(h.medication, 300),
    notes: str(h.notes, 600),
  };

  if (b.consent !== true) errors.push('Consentimiento');

  return { errors, data: { personal, goal, movement, food, health } };
}

// ---------------------------------------------------------------- Cálculos
function computeTargets(d) {
  const { sex, age, weight, height, waist } = d.personal;
  const hM = height / 100;
  const bmi = weight / (hM * hM);

  // Mifflin-St Jeor
  const bmr = 10 * weight + 6.25 * height - 5 * age + (sex === 'M' ? 5 : -161);

  // Grasa corporal estimada (Relative Fat Mass) si hay cintura
  let bodyFat = null;
  let bmrKatch = null;
  if (waist) {
    bodyFat = clamp(64 - 20 * (height / waist) + (sex === 'F' ? 12 : 0), 4, 60);
    const lbm = weight * (1 - bodyFat / 100);
    bmrKatch = 370 + 21.6 * lbm;
  }
  const bmrFinal = bmrKatch ? (bmr + bmrKatch) / 2 : bmr;

  const neatFactor = OCCUPATION[d.movement.occupation].factor + STEPS[d.movement.steps].add;

  // Gasto por ejercicio (MET netos)
  const trainingDetail = d.movement.trainings.map((t) => {
    const met = TRAINING_TYPES[t.type].met[t.intensity];
    const perSession = (met - 1) * weight * (t.minutes / 60);
    return { ...t, label: TRAINING_TYPES[t.type].label, met, kcalSession: Math.round(perSession), kcalWeek: Math.round(perSession * t.days) };
  });
  const eatWeek = trainingDetail.reduce((s, t) => s + t.kcalWeek, 0);
  const eatDay = eatWeek / 7;
  const trainMinutesWeek = d.movement.trainings.reduce((s, t) => s + t.days * t.minutes, 0);
  const strengthDays = d.movement.trainings.filter((t) => t.type === 'fuerza' || t.type === 'hiit').reduce((s, t) => s + t.days, 0);

  const tdee = bmrFinal * neatFactor + eatDay;

  const goal = GOALS[d.goal.type];
  let adj = goal.adj[d.goal.pace];
  const cautious = d.health.conditions.some((c) => ['embarazo', 'tca', 'renal'].includes(c)) || age < 18;
  if (cautious && adj < 0) adj = 0;

  const floor = sex === 'F' ? 1300 : 1600;
  let kcal = Math.max(tdee * (1 + adj), floor, bmrFinal * 1.05);
  kcal = round(kcal, 10);

  // Peso de referencia para proteína (ajustado si hay obesidad)
  const ideal = 24.9 * hM * hM;
  const refWeight = bmi > 30 ? ideal + 0.25 * (weight - ideal) : weight;
  let protKg = goal.protein;
  if (d.goal.type === 'mantener' && trainMinutesWeek >= 120) protKg = 1.6;
  if (age >= 60) protKg = Math.max(protKg, 1.4);
  if (d.health.conditions.includes('renal')) protKg = 0.8;
  const protein = round(protKg * refWeight);

  let fatPct = 0.28;
  if (d.health.conditions.includes('diabetes') || d.health.conditions.includes('sop')) fatPct = 0.32;
  let fat = Math.max(round((kcal * fatPct) / 9), round(0.7 * weight));
  let carbs = round((kcal - protein * 4 - fat * 9) / 4);
  if (carbs < 100) {
    fat = Math.max(round(0.6 * weight), round((kcal * 0.22) / 9));
    carbs = Math.max(80, round((kcal - protein * 4 - fat * 9) / 4));
  }

  const dailyDelta = kcal - tdee;
  const weeklyChangeKg = (dailyDelta * 7) / 7700;
  let weeksToTarget = null;
  if (d.goal.targetWeight && Math.abs(weeklyChangeKg) > 0.02) {
    const diff = d.goal.targetWeight - weight;
    if (Math.sign(diff) === Math.sign(weeklyChangeKg)) weeksToTarget = Math.ceil(Math.abs(diff / weeklyChangeKg));
  }

  const waterL = Math.round(((35 * weight) + (trainMinutesWeek / 7) * 8) / 100) / 10;
  const fiber = round((kcal / 1000) * 14);

  return {
    bmi: Math.round(bmi * 10) / 10,
    bmiLabel: bmi < 18.5 ? 'Bajo peso' : bmi < 25 ? 'Rango saludable' : bmi < 30 ? 'Sobrepeso' : 'Obesidad',
    bodyFat: bodyFat ? Math.round(bodyFat * 10) / 10 : null,
    whtr: waist ? Math.round((waist / height) * 100) / 100 : null,
    bmr: Math.round(bmrFinal),
    bmrMifflin: Math.round(bmr),
    neatFactor: Math.round(neatFactor * 100) / 100,
    eatDay: Math.round(eatDay),
    eatWeek: Math.round(eatWeek),
    trainingDetail,
    trainMinutesWeek,
    strengthDays,
    tdee: Math.round(tdee),
    adjustmentPct: Math.round(adj * 100),
    cautious,
    kcal,
    protein,
    proteinPerKg: Math.round((protein / weight) * 10) / 10,
    fat,
    carbs,
    macroPct: {
      p: Math.round(((protein * 4) / kcal) * 100),
      f: Math.round(((fat * 9) / kcal) * 100),
      c: Math.round(((carbs * 4) / kcal) * 100),
    },
    weeklyChangeKg: Math.round(weeklyChangeKg * 100) / 100,
    weeksToTarget,
    waterL,
    fiber,
    proteinPerMeal: round(protein / d.food.meals),
  };
}

// ---------------------------------------------------------------- Recomendaciones
function recommendations(d, t) {
  const r = [];
  const add = (area, text) => r.push({ area, text });
  const g = d.goal.type;

  // Entrenamiento
  if ((g === 'perder' || g === 'recomp' || g === 'ganar') && t.strengthDays < 2) {
    add('Entrenamiento', 'Sumar al menos 2–3 sesiones semanales de fuerza (cuerpo completo) para preservar o ganar masa muscular. Es la variable que más cambia la composición corporal.');
  } else if (t.strengthDays >= 2) {
    add('Entrenamiento', `Mantener las ${t.strengthDays} sesiones semanales de fuerza con progresión de cargas; registrar pesos y repeticiones para asegurar progreso.`);
  }
  if (d.movement.steps === '<5k' || d.movement.steps === '5-8k') {
    add('Movimiento diario', 'Llevar los pasos diarios a 8.000–10.000. El movimiento cotidiano (NEAT) suele aportar más gasto que el propio entrenamiento.');
  }
  if (g === 'rendimiento' || t.trainMinutesWeek > 300) {
    add('Rendimiento', 'Priorizar hidratos alrededor de las sesiones (1–1,5 g/kg 2–3 h antes) y reponer con proteína + hidratos dentro de las 2 h posteriores.');
  }
  if (t.trainMinutesWeek === 0) {
    add('Entrenamiento', 'Comenzar con 2 sesiones semanales de 30–40 minutos (fuerza básica + caminata). Sin actividad física, el plan pierde gran parte de su efecto.');
  }

  // Alimentación
  add('Proteína', `Repartir la proteína en ${d.food.meals} tomas de ~${t.proteinPerMeal} g. Una distribución pareja mejora la saciedad y la síntesis muscular.`);
  add('Fibra y vegetales', `Apuntar a ${t.fiber} g de fibra al día: medio plato de vegetales en almuerzo y cena, y 2–3 frutas.`);
  add('Hidratación', `Consumir alrededor de ${t.waterL} L de agua por día (más en días calurosos o de entrenamiento largo).`);
  if (g === 'perder' || g === 'recomp') {
    add('Déficit', `Déficit diario estimado de ${Math.abs(t.kcal - t.tdee)} kcal (≈ ${Math.abs(t.weeklyChangeKg)} kg/semana). Revisar a las 3–4 semanas y ajustar según la evolución real.`);
  }
  if (g === 'ganar') {
    add('Superávit', `Superávit de ${t.kcal - t.tdee} kcal/día (≈ ${t.weeklyChangeKg} kg/semana). Una ganancia mayor suele sumar más grasa que músculo.`);
  }
  if (d.movement.trainTime) {
    const when = { manana: 'a la mañana', mediodia: 'al mediodía', tarde: 'a la tarde', noche: 'a la noche' }[d.movement.trainTime];
    add('Timing', `Como entrena ${when}, ubicar la comida con más hidratos en la toma previa o posterior al entrenamiento.`);
  }

  // Descanso y estrés
  if (d.movement.sleep < 7) {
    add('Descanso', `Duerme ~${d.movement.sleep} h. Dormir menos de 7 h aumenta el apetito y dificulta la pérdida de grasa: trabajar higiene del sueño es prioridad.`);
  }
  if (d.movement.stress >= 4) {
    add('Estrés', 'Nivel de estrés alto: incluir pausas activas, respiración o caminatas, y evitar planes demasiado restrictivos.');
  }

  // Suplementación (a evaluar en consulta)
  const supp = [];
  if (g === 'ganar' || g === 'rendimiento' || g === 'recomp') supp.push('creatina monohidrato 3–5 g/día');
  if (d.food.diet === 'vegan') supp.push('vitamina B12 (indispensable)');
  if (d.food.diet === 'vegan' || d.food.diet === 'veg' || d.food.allergies.includes('pescado')) supp.push('omega-3 (algas o pescado)');
  supp.push('vitamina D según análisis');
  add('Suplementación (a evaluar en consulta)', supp.join(' · '));

  // Alertas clínicas
  const flags = [];
  if (t.cautious) flags.push('Se anuló el déficit calórico por condición clínica o edad: requiere evaluación presencial.');
  d.health.conditions.forEach((c) => flags.push(`Condición declarada: ${CONDITIONS[c]}.`));
  if (d.health.medication) flags.push(`Medicación: ${d.health.medication}`);
  if (t.bmi < 18.5 && g === 'perder') flags.push('IMC bajo con objetivo de bajar peso: revisar el objetivo en consulta.');
  if (t.whtr && t.whtr >= 0.5) flags.push(`Índice cintura/altura ${t.whtr} (≥ 0,5): riesgo cardiometabólico aumentado.`);

  return { items: r, flags };
}

// ---------------------------------------------------------------- Plan de comidas
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function allowedFoods(d) {
  const rank = DIET_RANK[d.food.diet];
  return FOODS.filter(
    (f) =>
      DIET_RANK[f.diet] <= rank &&
      !f.allergens.some((a) => d.food.allergies.includes(a)) &&
      !d.food.dislikes.includes(f.id) &&
      (d.food.cooking === 'normal' || f.quick || f.role === 'veg' || f.role === 'carb')
  );
}

function poolFor(foods, role, slot, favorites) {
  const pool = foods.filter((f) => f.role === role && f.meals.includes(slot));
  // favoritos aparecen el doble de veces
  return pool.flatMap((f) => (favorites.includes(f.id) ? [f, f] : [f]));
}

function pickRotating(pool, rnd, used) {
  if (!pool.length) return null;
  const fresh = pool.filter((f) => !used.has(f.id));
  const src = fresh.length ? fresh : pool;
  const f = src[Math.floor(rnd() * src.length)];
  used.add(f.id);
  return f;
}

function portion(food, grams) {
  const g = Math.max(0, grams);
  return {
    id: food.id,
    name: food.name,
    grams: g,
    kcal: (food.kcal * g) / 100,
    p: (food.p * g) / 100,
    c: (food.c * g) / 100,
    f: (food.f * g) / 100,
  };
}

function describe(food, grams) {
  if (food.ml) {
    const tbsp = grams / 10;
    return `${grams} ml (${tbsp <= 1 ? '1 cda.' : `${Math.round(tbsp * 2) / 2} cdas.`})`;
  }
  if (food.unit) {
    const units = Math.round((grams / food.unit[0]) * 2) / 2;
    if (units >= 0.5) return `${grams} g (≈ ${units} ${food.unit[1]}${units > 1 ? 's' : ''})`;
  }
  return `${grams} g`;
}

function buildMeal(slot, target, foods, rnd, usedByRole, favorites) {
  const items = [];
  const getPool = (role, s = slot) => poolFor(foods, role, s, favorites);
  const pickR = (role, s) => {
    usedByRole[role] = usedByRole[role] || new Set();
    const f = pickRotating(getPool(role, s), rnd, usedByRole[role]);
    if (usedByRole[role].size >= getPool(role, s).length) usedByRole[role].clear();
    return f;
  };
  const totals = () => items.reduce((a, it) => ({ p: a.p + it.p, c: a.c + it.c, f: a.f + it.f }), { p: 0, c: 0, f: 0 });

  if (slot === 'main') {
    const veg1 = pickR('veg');
    const veg2 = pickR('veg');
    if (veg1) items.push(portion(veg1, 150));
    if (veg2 && veg2 !== veg1) items.push(portion(veg2, 100));
    const prot = pickR('protein');
    if (prot && prot.legume) {
      // La legumbre cubre los hidratos; se completa la proteína con una fuente concentrada
      items.push(portion(prot, clamp(round((target.c * 0.75) / (prot.c / 100), 10), 100, 300)));
      const extra = getPool('protein').filter((f) => !f.legume);
      const second = extra.length ? extra[Math.floor(rnd() * extra.length)] : null;
      const need = target.p - totals().p;
      if (second && need > 8) items.push(portion(second, clamp(round(need / (second.p / 100), 10), 50, 250)));
    } else if (prot) {
      const need = target.p - totals().p;
      items.push(portion(prot, clamp(round(need / (prot.p / 100), 10), 80, 300)));
    }
    const carb = pickR('carb');
    if (carb) {
      const need = target.c - totals().c;
      if (need > 8) items.push(portion(carb, clamp(round(need / (carb.c / 100), 10), 60, 400)));
    }
    const fat = pickR('fat', 'main');
    if (fat) {
      const need = target.f - totals().f;
      if (need > 3) items.push(portion(fat, fat.ml ? clamp(round(need, 5), 5, 20) : clamp(round(need / (fat.f / 100), 10), 30, 120)));
    }
  } else if (slot === 'breakfast') {
    const prot = pickR('bprotein', 'breakfast');
    if (prot) {
      const pNeed = target.p * 0.7;
      items.push(portion(prot, clamp(round(pNeed / (prot.p / 100), prot.unit ? prot.unit[0] : 10), 50, 300)));
    }
    const fruit = pickR('fruit', 'breakfast');
    if (fruit) items.push(portion(fruit, fruit.unit ? fruit.unit[0] : 120));
    const carb = pickR('bcarb', 'breakfast');
    if (carb) {
      const need = target.c - totals().c;
      if (need > 8) {
        const step = carb.unit ? carb.unit[0] : 10;
        items.push(portion(carb, clamp(round(need / (carb.c / 100), step), step, 150)));
      }
    }
    const fat = pickR('fat', 'breakfast');
    if (fat) {
      const need = target.f - totals().f;
      if (need > 3) items.push(portion(fat, clamp(round(need / (fat.f / 100), 5), 5, 60)));
    }
  } else {
    // colación
    const fruit = pickR('fruit', 'snack');
    if (fruit) items.push(portion(fruit, fruit.unit ? fruit.unit[0] : 120));
    const prot = pickR('bprotein', 'snack');
    if (prot) {
      const need = target.p - totals().p;
      if (need > 4) items.push(portion(prot, clamp(round(need / (prot.p / 100), 10), 50, 200)));
    }
    const fat = pickR('fat', 'snack');
    if (fat) {
      const need = target.kcal - items.reduce((s, i) => s + i.kcal, 0);
      if (need > 40) items.push(portion(fat, clamp(round(need / (fat.kcal / 100), 5), 5, 30)));
    }
  }

  const foodById = Object.fromEntries(FOODS.map((f) => [f.id, f]));

  // Ajuste fino: escalar hidratos y grasas hasta quedar dentro de ±8% de la energía objetivo
  for (let i = 0; i < 6; i++) {
    const kcalNow = items.reduce((s, it) => s + it.kcal, 0);
    const ratio = target.kcal / kcalNow;
    if (ratio > 0.92 && ratio < 1.08) break;
    const flexible = items.filter((it) => ['carb', 'bcarb', 'fat'].includes(foodById[it.id].role) || foodById[it.id].legume);
    if (!flexible.length) break;
    const flexKcal = flexible.reduce((s, it) => s + it.kcal, 0);
    const factor = clamp((flexKcal + (target.kcal - kcalNow)) / flexKcal, 0.4, 1.8);
    flexible.forEach((it) => {
      const food = foodById[it.id];
      const step = food.ml ? 5 : food.unit ? food.unit[0] / 2 : 10;
      const min = food.ml ? 5 : step;
      const idx = items.indexOf(it);
      items[idx] = portion(food, Math.max(min, round(it.grams * factor, step)));
    });
  }

  const out = items
    .filter((it) => it.grams > 0)
    .map((it) => ({
      id: it.id,
      name: it.name,
      grams: it.grams,
      amount: describe(foodById[it.id], it.grams),
      kcal: Math.round(it.kcal),
      p: Math.round(it.p * 10) / 10,
      c: Math.round(it.c * 10) / 10,
      f: Math.round(it.f * 10) / 10,
    }));
  const sum = out.reduce((a, it) => ({ kcal: a.kcal + it.kcal, p: a.p + it.p, c: a.c + it.c, f: a.f + it.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  return { items: out, totals: { kcal: Math.round(sum.kcal), p: Math.round(sum.p), c: Math.round(sum.c), f: Math.round(sum.f) } };
}

function buildWeek(d, t, seed) {
  const foods = allowedFoods(d);
  const rnd = seededRandom(seed);
  const layout = MEAL_LAYOUTS[d.food.meals];
  const used = {};
  const days = DAYS.map((day) => {
    const meals = layout.map(([name, slot, share]) => {
      const target = { kcal: t.kcal * share, p: t.protein * share, c: t.carbs * share, f: t.fat * share };
      return { name, slot, target: { kcal: Math.round(target.kcal) }, ...buildMeal(slot, target, foods, rnd, used, d.food.favorites) };
    });
    const totals = meals.reduce((a, m) => ({ kcal: a.kcal + m.totals.kcal, p: a.p + m.totals.p, c: a.c + m.totals.c, f: a.f + m.totals.f }), { kcal: 0, p: 0, c: 0, f: 0 });
    return { day, meals, totals };
  });

  // Lista de compras semanal
  const shopping = {};
  days.forEach((dy) => dy.meals.forEach((m) => m.items.forEach((it) => {
    shopping[it.id] = shopping[it.id] || { name: it.name, grams: 0 };
    shopping[it.id].grams += it.grams;
  })));
  const roleOrder = ['protein', 'bprotein', 'carb', 'bcarb', 'veg', 'fruit', 'fat'];
  const roleLabel = { protein: 'Proteínas', bprotein: 'Lácteos y desayunos', carb: 'Cereales y tubérculos', bcarb: 'Panificados y cereales de desayuno', veg: 'Verduras', fruit: 'Frutas', fat: 'Grasas saludables' };
  const byRole = {};
  Object.entries(shopping).forEach(([id, v]) => {
    const role = FOODS.find((f) => f.id === id).role;
    (byRole[role] = byRole[role] || []).push({ name: v.name, grams: round(v.grams, 10) });
  });
  const shoppingList = roleOrder.filter((r) => byRole[r]).map((r) => ({ group: roleLabel[r], items: byRole[r].sort((a, b) => b.grams - a.grams) }));

  const avg = days.reduce((a, dy) => ({ kcal: a.kcal + dy.totals.kcal / 7, p: a.p + dy.totals.p / 7, c: a.c + dy.totals.c / 7, f: a.f + dy.totals.f / 7 }), { kcal: 0, p: 0, c: 0, f: 0 });

  return {
    days,
    shoppingList,
    average: { kcal: Math.round(avg.kcal), p: Math.round(avg.p), c: Math.round(avg.c), f: Math.round(avg.f) },
    foodsAvailable: foods.length,
  };
}

function generate(data, seed = Date.now()) {
  const targets = computeTargets(data);
  const recs = recommendations(data, targets);
  const week = buildWeek(data, targets, seed);
  return { targets, recommendations: recs.items, flags: recs.flags, week };
}

module.exports = {
  validate,
  generate,
  labels: { GOALS, OCCUPATION, STEPS, TRAINING_TYPES, CONDITIONS, ALLERGENS, DIETS },
};
