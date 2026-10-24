// Catálogo de platos por comida — capa de dominio PURA (datos estáticos).
//
// Cada plato combina alimentos de FOODS con un ROL y una regla de tamaño:
//  - { by: macro, share?, minG?, maxG? }: se dimensiona para cubrir ese macro
//    (share reparte un macro entre varias fuentes magras).
//  - { by: 'fixed', grams }: porción fija en gramos EN CRUDO.
// El cálculo de gramos vive en plateSizing.ts.
//
// `portable` = listo para comer sin cocinar ni calentar (mesa de trabajo,
// fiambrera). Todo plato portable solo usa alimentos con `portableOk`.
// Los ids son estables: se persisten en Settings.selectedPlates.
//
// Post-entreno (~08:15) es el DESAYUNO, y se espera que sea en el trabajo:
// por eso sus platos portables van primero.

import type { MassMacro, MealPlan } from './nutrition';

export type MealId = MealPlan['id'];
export type PlateRole = 'proteina' | 'carbohidrato' | 'grasa' | 'fruta-verdura' | 'extra';

export type PlateSizing =
  | { by: MassMacro; share?: number; minG?: number; maxG?: number }
  | { by: 'fixed'; grams: number };

export interface PlateComponent {
  foodId: string;
  role: PlateRole;
  sizing: PlateSizing;
}

export interface Plate {
  id: string;
  meal: MealId;
  name: string;
  description: string;
  /** Sin cocinar ni calentar: se puede comer en la mesa o desde una fiambrera. */
  portable: boolean;
  components: PlateComponent[];
  /** Texto libre para elementos sin macros relevantes (p.ej. el café). */
  tip?: string;
}

interface SizeOpts {
  share?: number;
  minG?: number;
  maxG?: number;
}

const P = (foodId: string, o: SizeOpts = {}, role: PlateRole = 'proteina'): PlateComponent => ({
  foodId,
  role,
  sizing: { by: 'proteinG', ...o },
});
const C = (foodId: string, o: SizeOpts = {}, role: PlateRole = 'carbohidrato'): PlateComponent => ({
  foodId,
  role,
  sizing: { by: 'carbsG', ...o },
});
const F = (foodId: string, o: SizeOpts = {}, role: PlateRole = 'grasa'): PlateComponent => ({
  foodId,
  role,
  sizing: { by: 'fatG', ...o },
});
const X = (foodId: string, grams: number, role: PlateRole = 'fruta-verdura'): PlateComponent => ({
  foodId,
  role,
  sizing: { by: 'fixed', grams },
});

export const PLATES: Plate[] = [
  // ======================= PRE-ENTRENO (ligero, fácil de digerir) =======================
  {
    id: 'pre_platano_tostada_miel',
    meal: 'pre',
    name: 'Plátano y tostada con miel + skyr',
    description: 'Ligero y de digestión rápida: tostada con miel, un plátano y skyr batido con proteína.',
    portable: true,
    components: [X('platano', 120), C('pan_integral'), X('miel', 10, 'extra'), P('skyr', { share: 0.55 }), P('whey', { share: 0.45 })],
  },
  {
    id: 'pre_tortitas_mermelada_yogur',
    meal: 'pre',
    name: 'Tortitas de arroz con mermelada + yogur',
    description: 'Tortitas de arroz con mermelada y yogur griego 0 %: poca grasa y poca fibra.',
    portable: true,
    components: [C('tortitas_arroz', { minG: 20 }), X('mermelada', 20, 'extra'), P('yogur_griego_0', { share: 0.6 }), P('queso_batido', { share: 0.4 })],
  },
  {
    id: 'pre_avena_fruta',
    meal: 'pre',
    name: 'Avena pequeña con fruta',
    description: 'Copos de avena en remojo con leche desnatada, manzana y un toque de proteína.',
    portable: true,
    components: [C('avena', { minG: 30, maxG: 70 }), X('manzana', 150), X('leche_desnatada', 200, 'extra'), P('whey')],
    tip: 'Déjala en remojo en la leche desde la noche anterior (overnight oats).',
  },
  {
    id: 'pre_datiles_cafe',
    meal: 'pre',
    name: 'Dátiles y café',
    description: 'Dátiles para energía rápida y una medida de proteína en batido.',
    portable: true,
    components: [C('datiles'), P('whey', { share: 0.5 }), P('skyr', { share: 0.5 })],
    tip: 'Café solo o con un chorrito de leche.',
  },
  {
    id: 'pre_skyr_fruta',
    meal: 'pre',
    name: 'Skyr con fruta',
    description: 'Skyr con plátano, mandarina y un hilo de miel.',
    portable: true,
    components: [P('skyr', { share: 0.8 }), P('whey', { share: 0.2 }), X('platano', 120), X('mandarina', 160), C('miel', { maxG: 30 }, 'extra')],
  },
  {
    id: 'pre_barrita_platano_batido',
    meal: 'pre',
    name: 'Barrita de avena, plátano y batido',
    description: 'Barrita de avena, un plátano y un batido de leche desnatada con proteína.',
    portable: true,
    components: [C('barrita_avena'), X('platano', 120), X('leche_desnatada', 250, 'extra'), P('whey')],
  },

  // ======================= POST-ENTRENO = DESAYUNO (portables primero) =======================
  {
    id: 'post_skyr_muesli_frutos_rojos',
    meal: 'post',
    name: 'Skyr con muesli y frutos rojos',
    description: 'Skyr natural con muesli sin azúcar y frutos rojos: sin cocinar, listo en la mesa.',
    portable: true,
    components: [P('skyr'), C('muesli'), X('frutos_rojos', 100)],
  },
  {
    id: 'post_griego_granola_fruta',
    meal: 'post',
    name: 'Yogur griego con granola y fruta',
    description: 'Yogur griego 0 % con granola baja en azúcar, plátano y un poco de miel.',
    portable: true,
    components: [P('yogur_griego_0', { share: 0.7 }), P('whey', { share: 0.3 }), X('granola', 30, 'carbohidrato'), X('platano', 120), C('miel', { maxG: 25 }, 'extra')],
  },
  {
    id: 'post_avena_leche_platano',
    meal: 'post',
    name: 'Copos de avena con leche y plátano',
    description: 'Copos de avena sin cocinar, en remojo con leche desnatada, plátano y proteína.',
    portable: true,
    components: [C('avena'), X('leche_desnatada', 250, 'extra'), X('platano', 120), P('whey')],
    tip: 'Prepáralos la noche anterior en un bote (overnight oats); también vale bebida vegetal sin azúcar.',
  },
  {
    id: 'post_sandwich_pavo_queso',
    meal: 'post',
    name: 'Sándwich integral de pavo y queso fresco',
    description: 'Pan de molde integral con pavo en lonchas y queso fresco batido, más una manzana.',
    portable: true,
    components: [C('pan_molde_integral', { minG: 70 }), P('pavo_lonchas', { share: 0.6 }), P('queso_batido', { share: 0.4 }), X('manzana', 150)],
  },
  {
    id: 'post_wrap_huevo_aguacate',
    meal: 'post',
    name: 'Wrap integral con huevo cocido y aguacate',
    description: 'Wrap integral relleno de huevo cocido, atún de lata y aguacate, con plátano y manzana.',
    portable: true,
    components: [C('wrap_integral', { minG: 50, maxG: 150 }), X('huevo_cocido', 50, 'proteina'), X('aguacate', 15, 'grasa'), P('atun_natural'), X('platano', 120), X('manzana', 150)],
  },
  {
    id: 'post_barrita_proteina_yogur',
    meal: 'post',
    name: 'Barrita de proteína, yogur y fruta',
    description: 'Barrita de proteína con yogur griego 0 %, un plátano y tortitas de arroz.',
    portable: true,
    components: [X('barrita_proteina', 45, 'proteina'), P('yogur_griego_0'), X('platano', 120), C('tortitas_arroz')],
  },
  {
    id: 'post_batido_platano_frutos_secos',
    meal: 'post',
    name: 'Batido de proteína, plátano y frutos secos',
    description: 'Batido de proteína en shaker con leche desnatada, plátano, nueces y tortitas de arroz.',
    portable: true,
    components: [P('whey'), X('leche_desnatada', 300, 'extra'), X('platano', 120), X('nueces', 12, 'grasa'), C('tortitas_arroz')],
  },
  {
    id: 'post_tortitas_cacahuete_platano',
    meal: 'post',
    name: 'Tortitas de arroz con crema de cacahuete y plátano',
    description: 'Tortitas de arroz con crema de cacahuete (monodosis), plátano y skyr.',
    portable: true,
    components: [C('tortitas_arroz'), X('cacahuete_crema', 20, 'grasa'), X('platano', 120), P('skyr')],
  },
  {
    id: 'post_huevo_cocido_pan_fruta',
    meal: 'post',
    name: 'Huevo cocido, jamón y pan integral con fruta',
    description: 'Huevo cocido, jamón cocido y queso fresco, pan integral, manzana y plátano.',
    portable: true,
    components: [X('huevo_cocido', 50, 'proteina'), P('jamon_cocido', { share: 0.5 }), P('queso_batido', { share: 0.5 }), C('pan_integral'), X('manzana', 150), X('platano', 120)],
    tip: 'Cuece los huevos la víspera y llévalos en la fiambrera.',
  },
  {
    id: 'post_tostada_serrano_tomate',
    meal: 'post',
    name: 'Tostada de jamón serrano y tomate',
    description: 'Pan integral con jamón serrano magro, queso fresco batido y tomate, y una mandarina.',
    portable: true,
    components: [C('pan_integral'), P('jamon_serrano', { share: 0.5 }), P('queso_batido', { share: 0.5 }), X('tomate', 100), X('mandarina', 160)],
  },
  {
    id: 'post_requeson_fruta_miel',
    meal: 'post',
    name: 'Requesón con fruta y miel',
    description: 'Requesón bajo en grasa con manzana, plátano y un hilo de miel.',
    portable: true,
    components: [P('requeson', { share: 0.7 }), P('whey', { share: 0.3 }), X('manzana', 150), X('platano', 120), C('miel', { maxG: 30 }, 'extra')],
  },
  {
    id: 'post_tortilla_claras_pan_tomate',
    meal: 'post',
    name: 'Tortilla de huevo y claras con pan integral y tomate',
    description: 'Tortilla de un huevo y claras, pan integral con tomate y una mandarina.',
    portable: false,
    components: [X('huevo', 50, 'proteina'), P('clara_huevo'), C('pan_integral'), X('tomate', 100), X('mandarina', 160)],
  },
  {
    id: 'post_tostada_aguacate_huevo',
    meal: 'post',
    name: 'Tostada con aguacate y huevo',
    description: 'Pan integral tostado con aguacate, huevo y claras a la plancha, pavo, plátano y mandarina.',
    portable: false,
    components: [C('pan_integral'), X('aguacate', 20, 'grasa'), X('huevo', 50, 'proteina'), P('clara_huevo', { share: 0.5 }), P('pavo_lonchas', { share: 0.5 }), X('platano', 120), X('mandarina', 160)],
  },
  {
    id: 'post_porridge_avena_whey_fruta',
    meal: 'post',
    name: 'Porridge de avena con proteína y frutos rojos',
    description: 'Avena cocinada con leche desnatada, proteína whey y frutos rojos.',
    portable: false,
    components: [C('avena'), X('leche_desnatada', 250, 'extra'), P('whey'), X('frutos_rojos', 100)],
  },
  {
    id: 'post_revuelto_salmon_ahumado_pan',
    meal: 'post',
    name: 'Revuelto de huevo con salmón ahumado y pan',
    description: 'Revuelto de huevo y claras con salmón ahumado, pan de centeno y tomate.',
    portable: false,
    components: [X('huevo', 50, 'proteina'), P('clara_huevo', { share: 0.5 }), P('salmon_ahumado', { share: 0.5 }), C('pan_centeno'), X('tomate', 100), X('mandarina', 160)],
  },

  // ======================= ALMUERZO =======================
  {
    id: 'almuerzo_pollo_arroz_verduras',
    meal: 'almuerzo',
    name: 'Pollo con arroz y verduras',
    description: 'Pechuga de pollo a la plancha, arroz blanco y brócoli.',
    portable: false,
    components: [P('pollo_pechuga'), C('arroz_blanco'), X('brocoli', 200), F('aceite_oliva')],
  },
  {
    id: 'almuerzo_ternera_patata_ensalada',
    meal: 'almuerzo',
    name: 'Ternera con patata y ensalada',
    description: 'Ternera magra a la plancha con patata cocida y ensalada mixta.',
    portable: false,
    components: [P('ternera_magra'), C('patata'), X('ensalada_mixta', 150), F('aceite_oliva')],
  },
  {
    id: 'almuerzo_merluza_patata_judias',
    meal: 'almuerzo',
    name: 'Merluza al horno con patata y judías verdes',
    description: 'Merluza al horno, patata cocida y judías verdes.',
    portable: false,
    components: [P('merluza'), C('patata'), X('judias_verdes', 200), F('aceite_oliva')],
  },
  {
    id: 'almuerzo_lentejas_verduras_huevo',
    meal: 'almuerzo',
    name: 'Lentejas con verduras y huevo',
    description: 'Lentejas estofadas con espinacas y un huevo.',
    portable: false,
    components: [C('lentejas'), P('huevo'), X('espinacas', 150), F('aceite_oliva', { maxG: 12 })],
  },
  {
    id: 'almuerzo_pasta_atun_tomate',
    meal: 'almuerzo',
    name: 'Pasta integral con atún y tomate',
    description: 'Pasta integral con atún al natural y tomate.',
    portable: false,
    components: [C('pasta_integral'), P('atun_natural'), X('tomate', 200), F('aceite_oliva')],
  },
  {
    id: 'almuerzo_salmon_quinoa_brocoli',
    meal: 'almuerzo',
    name: 'Salmón con quinoa y brócoli',
    description: 'Salmón al horno, quinoa y brócoli al vapor.',
    portable: false,
    components: [P('salmon'), C('quinoa'), X('brocoli', 200)],
  },
  {
    id: 'almuerzo_arroz_gambas_verduras',
    meal: 'almuerzo',
    name: 'Arroz con gambas y verduras',
    description: 'Arroz integral salteado con gambas, calabacín y champiñones.',
    portable: false,
    components: [P('gambas'), C('arroz_integral'), X('calabacin', 150), X('champinones', 100), F('aceite_oliva')],
  },
  {
    id: 'almuerzo_cerdo_boniato_ensalada',
    meal: 'almuerzo',
    name: 'Cerdo magro con boniato y ensalada',
    description: 'Lomo de cerdo a la plancha con boniato asado y ensalada mixta.',
    portable: false,
    components: [P('cerdo_lomo'), C('boniato'), X('ensalada_mixta', 150), F('aceite_oliva')],
  },
  {
    id: 'almuerzo_garbanzos_espinacas',
    meal: 'almuerzo',
    name: 'Garbanzos con espinacas y huevo',
    description: 'Garbanzos estofados con espinacas y huevo cocido.',
    portable: false,
    components: [P('huevo_cocido'), C('garbanzos'), X('espinacas', 200)],
  },
  {
    id: 'almuerzo_arroz_pollo_tupper',
    meal: 'almuerzo',
    name: 'Arroz con pollo (tupper)',
    description: 'Muslo de pollo sin piel con arroz integral y judías verdes; se prepara el día antes y se recalienta.',
    portable: false,
    components: [P('pollo_muslo'), C('arroz_integral'), X('judias_verdes', 150), F('aceite_oliva')],
  },
  {
    id: 'almuerzo_ensalada_pasta_atun_tupper',
    meal: 'almuerzo',
    name: 'Ensalada de pasta con atún (tupper)',
    description: 'Pasta integral cocida y fría con atún, huevo cocido, tomate y ensalada.',
    portable: false,
    components: [P('atun_natural', { share: 0.7 }), P('huevo_cocido', { share: 0.3 }), C('pasta_integral'), X('tomate', 150), X('ensalada_mixta', 100), F('aceite_oliva')],
  },
  {
    id: 'almuerzo_ensalada_garbanzos_atun',
    meal: 'almuerzo',
    name: 'Ensalada de garbanzos y atún',
    description: 'Garbanzos de bote con atún al natural, tomate y ensalada: sin cocinar, ideal para llevar.',
    portable: true,
    components: [P('atun_natural'), C('garbanzos_bote'), X('tomate', 150), X('ensalada_mixta', 100), F('aceite_oliva')],
  },

  // ======================= CENA (más ligera) =======================
  {
    id: 'cena_tortilla_francesa_ensalada',
    meal: 'cena',
    name: 'Tortilla francesa con ensalada',
    description: 'Tortilla francesa de huevo y claras, ensalada mixta y pan integral.',
    portable: false,
    components: [P('huevo', { share: 0.6 }), P('clara_huevo', { share: 0.4 }), C('pan_integral'), X('ensalada_mixta', 150), F('aceite_oliva', { maxG: 10 })],
  },
  {
    id: 'cena_dorada_verduras',
    meal: 'cena',
    name: 'Dorada o lubina con verduras',
    description: 'Dorada o lubina al horno con patata, calabacín y champiñones.',
    portable: false,
    components: [P('dorada_lubina'), C('patata'), X('calabacin', 150), X('champinones', 100), F('aceite_oliva')],
  },
  {
    id: 'cena_pavo_calabacin_boniato',
    meal: 'cena',
    name: 'Pavo a la plancha con calabacín y boniato',
    description: 'Pechuga de pavo a la plancha, calabacín y boniato asado.',
    portable: false,
    components: [P('pavo_pechuga'), C('boniato'), X('calabacin', 250), F('aceite_oliva')],
  },
  {
    id: 'cena_atun_ensalada_aguacate',
    meal: 'cena',
    name: 'Atún con ensalada y aguacate',
    description: 'Atún al natural con ensalada, tomate, aguacate y pan integral: sin cocinar.',
    portable: true,
    components: [P('atun_natural'), F('aguacate'), X('ensalada_mixta', 200), X('tomate', 100), C('pan_integral')],
  },
  {
    id: 'cena_gambas_verduras',
    meal: 'cena',
    name: 'Gambas salteadas con verduras',
    description: 'Gambas salteadas con champiñones, calabacín y arroz integral.',
    portable: false,
    components: [P('gambas'), C('arroz_integral'), X('champinones', 150), X('calabacin', 150), F('aceite_oliva')],
  },
  {
    id: 'cena_crema_verduras_pollo',
    meal: 'cena',
    name: 'Crema de verduras con pollo',
    description: 'Crema de verduras, pechuga de pollo a la plancha y pan integral.',
    portable: false,
    components: [X('crema_verduras', 300), P('pollo_pechuga'), C('pan_integral'), F('aceite_oliva')],
  },
  {
    id: 'cena_tofu_huevo_verduras',
    meal: 'cena',
    name: 'Tofu salteado con verduras',
    description: 'Tofu y huevo salteados con brócoli, champiñones y arroz integral.',
    portable: false,
    components: [P('tofu', { share: 0.6 }), P('huevo', { share: 0.4 }), C('arroz_integral'), X('brocoli', 150), X('champinones', 100)],
  },
  {
    id: 'cena_hamburguesa_pollo_pavo',
    meal: 'cena',
    name: 'Hamburguesa de pollo y pavo con ensalada',
    description: 'Hamburguesa casera de pollo y pavo en pan integral, con ensalada y aguacate.',
    portable: false,
    components: [P('pollo_muslo', { share: 0.5 }), P('pavo_pechuga', { share: 0.5 }), C('pan_integral'), X('ensalada_mixta', 150), F('aguacate', { share: 0.6, maxG: 100 }), F('aceite_oliva', { share: 0.4 })],
  },
  {
    id: 'cena_revuelto_champinones_huevos',
    meal: 'cena',
    name: 'Revuelto de champiñones y huevos',
    description: 'Revuelto de champiñones con huevo y claras, y pan de centeno.',
    portable: false,
    components: [P('huevo', { share: 0.55 }), P('clara_huevo', { share: 0.45 }), X('champinones', 200), C('pan_centeno'), F('aceite_oliva', { maxG: 10 })],
  },
  {
    id: 'cena_skyr_nueces_fruta',
    meal: 'cena',
    name: 'Skyr con nueces y fruta',
    description: 'Cena fría y rápida: skyr con nueces, frutos rojos y tortitas de arroz.',
    portable: true,
    components: [P('skyr'), F('nueces'), X('frutos_rojos', 100), C('tortitas_arroz')],
  },
];

/** Platos de una comida, en el orden del catálogo (el primero es el predeterminado). */
export function platesForMeal(meal: MealId): Plate[] {
  return PLATES.filter((p) => p.meal === meal);
}

/** Busca un plato por id. */
export function findPlate(id: string): Plate | undefined {
  return PLATES.find((p) => p.id === id);
}

/**
 * Plato efectivo de una comida: el seleccionado si existe y pertenece a esa
 * comida; si no (sin selección, id desconocido u otra comida), el primero.
 */
export function resolvePlate(meal: MealId, selectedId?: string): Plate {
  const list = platesForMeal(meal);
  return list.find((p) => p.id === selectedId) ?? list[0];
}
