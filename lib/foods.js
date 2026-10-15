// Base de alimentos — valores aproximados por 100 g (o 100 ml) en estado listo para consumir.
// diet: nivel mínimo de dieta compatible -> omni | pesc | veg | vegan
// allergens: lactosa, gluten, huevo, frutos_secos, mani, pescado, mariscos, soja
// unit: [gramos por unidad, nombre de la unidad] para presentar porciones caseras

const FOODS = [
  // ---- Proteínas principales ----
  { id: 'pollo', name: 'Pechuga de pollo', role: 'protein', kcal: 165, p: 31, c: 0, f: 3.6, diet: 'omni', allergens: [], meals: ['main'], quick: true },
  { id: 'carne', name: 'Carne vacuna magra (peceto / lomo)', role: 'protein', kcal: 190, p: 29, c: 0, f: 8, diet: 'omni', allergens: [], meals: ['main'] },
  { id: 'cerdo', name: 'Solomillo de cerdo', role: 'protein', kcal: 143, p: 26, c: 0, f: 3.5, diet: 'omni', allergens: [], meals: ['main'] },
  { id: 'pavo', name: 'Pechuga de pavo', role: 'protein', kcal: 135, p: 29, c: 0, f: 1.5, diet: 'omni', allergens: [], meals: ['main'], quick: true },
  { id: 'merluza', name: 'Merluza', role: 'protein', kcal: 90, p: 19, c: 0, f: 1.3, diet: 'pesc', allergens: ['pescado'], meals: ['main'], quick: true },
  { id: 'salmon', name: 'Salmón', role: 'protein', kcal: 206, p: 22, c: 0, f: 13, diet: 'pesc', allergens: ['pescado'], meals: ['main'] },
  { id: 'atun', name: 'Atún al natural', role: 'protein', kcal: 116, p: 26, c: 0, f: 1, diet: 'pesc', allergens: ['pescado'], meals: ['main'], quick: true },
  { id: 'langostinos', name: 'Langostinos', role: 'protein', kcal: 99, p: 24, c: 0.2, f: 0.3, diet: 'pesc', allergens: ['mariscos'], meals: ['main'], quick: true },
  { id: 'huevo', name: 'Huevo', role: 'protein', kcal: 143, p: 12.6, c: 0.7, f: 9.5, diet: 'veg', allergens: ['huevo'], meals: ['main', 'breakfast'], unit: [50, 'huevo'], quick: true },
  { id: 'tofu', name: 'Tofu firme', role: 'protein', kcal: 144, p: 15.7, c: 2.8, f: 8.7, diet: 'vegan', allergens: ['soja'], meals: ['main'], quick: true },
  { id: 'tempeh', name: 'Tempeh', role: 'protein', kcal: 192, p: 20, c: 7.6, f: 11, diet: 'vegan', allergens: ['soja'], meals: ['main'] },
  { id: 'seitan', name: 'Seitán', role: 'protein', kcal: 120, p: 24, c: 4, f: 2, diet: 'vegan', allergens: ['gluten'], meals: ['main'], quick: true },
  { id: 'lentejas', name: 'Lentejas cocidas', role: 'protein', kcal: 116, p: 9, c: 20, f: 0.4, diet: 'vegan', allergens: [], meals: ['main'], legume: true },
  { id: 'garbanzos', name: 'Garbanzos cocidos', role: 'protein', kcal: 164, p: 8.9, c: 27, f: 2.6, diet: 'vegan', allergens: [], meals: ['main'], legume: true },

  // ---- Proteínas de desayuno / merienda ----
  { id: 'yogur_griego', name: 'Yogur griego natural', role: 'bprotein', kcal: 97, p: 9, c: 3.6, f: 5, diet: 'veg', allergens: ['lactosa'], meals: ['breakfast', 'snack'], quick: true },
  { id: 'ricota', name: 'Ricota descremada', role: 'bprotein', kcal: 98, p: 11, c: 3.4, f: 4.3, diet: 'veg', allergens: ['lactosa'], meals: ['breakfast', 'snack'], quick: true },
  { id: 'queso_untable', name: 'Queso untable light', role: 'bprotein', kcal: 140, p: 13, c: 4, f: 8, diet: 'veg', allergens: ['lactosa'], meals: ['breakfast', 'snack'], quick: true },
  { id: 'huevo_des', name: 'Huevos revueltos', role: 'bprotein', kcal: 143, p: 12.6, c: 0.7, f: 9.5, diet: 'veg', allergens: ['huevo'], meals: ['breakfast'], unit: [50, 'huevo'], quick: true },
  { id: 'yogur_soja', name: 'Yogur de soja natural', role: 'bprotein', kcal: 66, p: 4.6, c: 3.5, f: 3.6, diet: 'vegan', allergens: ['soja'], meals: ['breakfast', 'snack'], quick: true },
  { id: 'tofu_rev', name: 'Tofu revuelto', role: 'bprotein', kcal: 144, p: 15.7, c: 2.8, f: 8.7, diet: 'vegan', allergens: ['soja'], meals: ['breakfast'], quick: true },
  { id: 'pavo_feta', name: 'Fiambre de pavo', role: 'bprotein', kcal: 104, p: 18, c: 2, f: 2.5, diet: 'omni', allergens: [], meals: ['breakfast', 'snack'], quick: true },

  // ---- Hidratos ----
  { id: 'arroz_integral', name: 'Arroz integral cocido', role: 'carb', kcal: 112, p: 2.6, c: 23, f: 0.9, diet: 'vegan', allergens: [], meals: ['main'] },
  { id: 'arroz', name: 'Arroz blanco cocido', role: 'carb', kcal: 130, p: 2.7, c: 28, f: 0.3, diet: 'vegan', allergens: [], meals: ['main'], quick: true },
  { id: 'quinoa', name: 'Quinoa cocida', role: 'carb', kcal: 120, p: 4.4, c: 21, f: 1.9, diet: 'vegan', allergens: [], meals: ['main'], quick: true },
  { id: 'fideos', name: 'Fideos integrales cocidos', role: 'carb', kcal: 124, p: 5.3, c: 26, f: 0.5, diet: 'vegan', allergens: ['gluten'], meals: ['main'], quick: true },
  { id: 'papa', name: 'Papa hervida o al horno', role: 'carb', kcal: 87, p: 1.9, c: 20, f: 0.1, diet: 'vegan', allergens: [], meals: ['main'] },
  { id: 'batata', name: 'Batata al horno', role: 'carb', kcal: 90, p: 2, c: 21, f: 0.1, diet: 'vegan', allergens: [], meals: ['main'] },
  { id: 'choclo', name: 'Choclo en granos', role: 'carb', kcal: 96, p: 3.4, c: 21, f: 1.5, diet: 'vegan', allergens: [], meals: ['main'], quick: true },
  { id: 'avena', name: 'Avena arrollada', role: 'bcarb', kcal: 389, p: 16.9, c: 66, f: 6.9, diet: 'vegan', allergens: ['gluten'], meals: ['breakfast'], quick: true },
  { id: 'pan_integral', name: 'Pan integral', role: 'bcarb', kcal: 247, p: 13, c: 41, f: 3.4, diet: 'vegan', allergens: ['gluten'], meals: ['breakfast', 'snack'], unit: [30, 'rebanada'], quick: true },
  { id: 'galletas_arroz', name: 'Galletas de arroz', role: 'bcarb', kcal: 387, p: 8, c: 81, f: 3, diet: 'vegan', allergens: [], meals: ['breakfast', 'snack'], unit: [9, 'galleta'], quick: true },
  { id: 'granola', name: 'Granola sin azúcar agregada', role: 'bcarb', kcal: 430, p: 10, c: 60, f: 15, diet: 'vegan', allergens: ['gluten', 'frutos_secos'], meals: ['breakfast', 'snack'], quick: true },

  // ---- Grasas ----
  { id: 'oliva', name: 'Aceite de oliva', role: 'fat', kcal: 884, p: 0, c: 0, f: 100, diet: 'vegan', allergens: [], meals: ['main'], ml: true, quick: true },
  { id: 'palta', name: 'Palta', role: 'fat', kcal: 160, p: 2, c: 8.5, f: 14.7, diet: 'vegan', allergens: [], meals: ['main', 'breakfast'], quick: true },
  { id: 'almendras', name: 'Almendras', role: 'fat', kcal: 579, p: 21, c: 22, f: 50, diet: 'vegan', allergens: ['frutos_secos'], meals: ['breakfast', 'snack'], quick: true },
  { id: 'nueces', name: 'Nueces', role: 'fat', kcal: 654, p: 15, c: 14, f: 65, diet: 'vegan', allergens: ['frutos_secos'], meals: ['breakfast', 'snack'], quick: true },
  { id: 'mani', name: 'Pasta de maní', role: 'fat', kcal: 588, p: 25, c: 20, f: 50, diet: 'vegan', allergens: ['mani'], meals: ['breakfast', 'snack'], quick: true },
  { id: 'chia', name: 'Semillas de chía', role: 'fat', kcal: 486, p: 17, c: 42, f: 31, diet: 'vegan', allergens: [], meals: ['breakfast', 'snack'], quick: true },

  // ---- Vegetales ----
  { id: 'hojas', name: 'Mix de hojas verdes', role: 'veg', kcal: 20, p: 1.5, c: 3.5, f: 0.2, diet: 'vegan', allergens: [], meals: ['main'], quick: true },
  { id: 'brocoli', name: 'Brócoli', role: 'veg', kcal: 35, p: 2.4, c: 7, f: 0.4, diet: 'vegan', allergens: [], meals: ['main'] },
  { id: 'zapallito', name: 'Zapallitos', role: 'veg', kcal: 17, p: 1.2, c: 3.1, f: 0.3, diet: 'vegan', allergens: [], meals: ['main'] },
  { id: 'tomate', name: 'Tomate', role: 'veg', kcal: 18, p: 0.9, c: 3.9, f: 0.2, diet: 'vegan', allergens: [], meals: ['main'], quick: true },
  { id: 'zanahoria', name: 'Zanahoria', role: 'veg', kcal: 41, p: 0.9, c: 10, f: 0.2, diet: 'vegan', allergens: [], meals: ['main'], quick: true },
  { id: 'espinaca', name: 'Espinaca', role: 'veg', kcal: 23, p: 2.9, c: 3.6, f: 0.4, diet: 'vegan', allergens: [], meals: ['main'] },
  { id: 'calabaza', name: 'Calabaza asada', role: 'veg', kcal: 26, p: 1, c: 6.5, f: 0.1, diet: 'vegan', allergens: [], meals: ['main'] },
  { id: 'morron', name: 'Morrón asado', role: 'veg', kcal: 31, p: 1, c: 6, f: 0.3, diet: 'vegan', allergens: [], meals: ['main'] },
  { id: 'berenjena', name: 'Berenjena grillada', role: 'veg', kcal: 25, p: 1, c: 6, f: 0.2, diet: 'vegan', allergens: [], meals: ['main'] },

  // ---- Frutas ----
  { id: 'banana', name: 'Banana', role: 'fruit', kcal: 89, p: 1.1, c: 23, f: 0.3, diet: 'vegan', allergens: [], meals: ['breakfast', 'snack'], unit: [120, 'banana'], quick: true },
  { id: 'manzana', name: 'Manzana', role: 'fruit', kcal: 52, p: 0.3, c: 14, f: 0.2, diet: 'vegan', allergens: [], meals: ['breakfast', 'snack'], unit: [150, 'manzana'], quick: true },
  { id: 'frutillas', name: 'Frutillas', role: 'fruit', kcal: 32, p: 0.7, c: 7.7, f: 0.3, diet: 'vegan', allergens: [], meals: ['breakfast', 'snack'], quick: true },
  { id: 'naranja', name: 'Naranja', role: 'fruit', kcal: 47, p: 0.9, c: 12, f: 0.1, diet: 'vegan', allergens: [], meals: ['breakfast', 'snack'], unit: [160, 'naranja'], quick: true },
  { id: 'arandanos', name: 'Arándanos', role: 'fruit', kcal: 57, p: 0.7, c: 14, f: 0.3, diet: 'vegan', allergens: [], meals: ['breakfast', 'snack'], quick: true },
  { id: 'kiwi', name: 'Kiwi', role: 'fruit', kcal: 61, p: 1.1, c: 15, f: 0.5, diet: 'vegan', allergens: [], meals: ['breakfast', 'snack'], unit: [75, 'kiwi'], quick: true },
  { id: 'pera', name: 'Pera', role: 'fruit', kcal: 57, p: 0.4, c: 15, f: 0.1, diet: 'vegan', allergens: [], meals: ['breakfast', 'snack'], unit: [170, 'pera'], quick: true },
];

// Etiquetas visibles en el portal para que la persona marque lo que no le gusta
const DISLIKE_OPTIONS = FOODS
  .filter((f) => !['huevo_des', 'tofu_rev'].includes(f.id))
  .map((f) => ({ id: f.id, name: f.name, role: f.role }));

module.exports = { FOODS, DISLIKE_OPTIONS };
