// Lista de la compra — capa de dominio PURA (sin React ni storage).
//
// Catálogo estático de productos (cada producto aparece EXACTAMENTE UNA VEZ en
// toda la lista, para que una marca «comprado» no sea ambigua), helpers de
// lectura defensiva/saneado de las dos claves opcionales de Settings
// (`shoppingChecked`, `shoppingLastReset`) y el cálculo orientativo de
// cantidades de OFICINA (5 días laborables) a partir del plan y de los platos
// elegidos. No contiene ningún dato personal: las cantidades se calculan en el
// dispositivo con el perfil actual y nunca se escriben en el código.
//
// Reglas del catálogo:
//  - La clave de un producto es el id de foodDb cuando es un alimento conocido
//    (incluida `whey`) y `pantry:<nombre>` para extras de despensa sin macros.
//  - Un alimento usado por algún plato `portable` de Pre/Post-entreno va al
//    bloque de OFICINA, salvo los listados en CASA_OVERRIDES (con motivo).
//    Todo lo demás (platos de almuerzo/cena o desayunos no portables) va a CASA.
//  - Los alimentos de foodDb que NINGÚN plato usa (yogur_griego, almendras,
//    queso_burgos, queso_porciones, leche_semi, bebida_soja, hummus,
//    tortitas_avena, galletas_avena, copos_maiz, calamar) no se listan: no se
//    necesitan para ningún plato y solo alargarían la lista.
//  - SHOPPING_EXCLUDED recoge, con motivo, los alimentos de plato que no se
//    compran. Hoy está vacío: todos son comprables.

import type { Settings } from '../storage';
import { toLocalDayKey } from './attendance';
import { getFood } from './foodDb';
import type { MealId } from './mealPlates';
import type { DailyPlan } from './nutrition';
import { resolveChosenPlate, type SelectedPlates } from './plateSelection';
import { computePlate } from './plateSizing';

// ---------------------------------------------------------------- tipos

export type OfficeSubgroup = 'sin_nevera' | 'con_nevera' | 'opcional';

export type CasaAisle =
  | 'carnes'
  | 'pescado'
  | 'huevos'
  | 'frutas'
  | 'verduras'
  | 'legumbres'
  | 'pan'
  | 'grasas'
  | 'congelados'
  | 'despensa';

export type ShoppingLocation =
  | { place: 'oficina'; subgroup: OfficeSubgroup }
  | { place: 'casa'; aisle: CasaAisle };

export type ShoppingSectionId =
  | 'oficina_sin_nevera'
  | 'oficina_con_nevera'
  | 'oficina_opcional'
  | 'casa_carnes'
  | 'casa_pescado'
  | 'casa_huevos'
  | 'casa_frutas'
  | 'casa_verduras'
  | 'casa_legumbres'
  | 'casa_pan'
  | 'casa_grasas'
  | 'casa_congelados'
  | 'casa_despensa';

/** Cómo se expresa la cantidad calculada de un producto de oficina. */
export type OfficeMeasure = 'g' | 'count' | 'litros';

export interface ShoppingItem {
  /** Estable: id de foodDb o `pantry:<nombre>`. Es la clave que se persiste. */
  key: string;
  /** Id de foodDb (ausente en extras de despensa). */
  foodId?: string;
  name: string;
  /** «Qué mirar en la etiqueta» / consejo de compra. */
  tip: string;
  location: ShoppingLocation;
  /** Solo oficina: unidad en la que se muestra la cantidad calculada. */
  measure?: OfficeMeasure;
  /** Solo oficina: formato de compra (sin cifras) cuando no hay cantidad calculada. */
  format?: string;
}

export interface ShoppingSection {
  id: ShoppingSectionId;
  block: 'oficina' | 'casa';
  title: string;
  items: ShoppingItem[];
}

// ------------------------------------------------------------- catálogo

const office = (
  key: string,
  name: string,
  tip: string,
  subgroup: OfficeSubgroup,
  measure: OfficeMeasure,
  format: string,
): ShoppingItem => ({
  key,
  foodId: key,
  name,
  tip,
  location: { place: 'oficina', subgroup },
  measure,
  format,
});

const casa = (key: string, name: string, tip: string, aisle: CasaAisle): ShoppingItem => ({
  key,
  foodId: key,
  name,
  tip,
  location: { place: 'casa', aisle },
});

const pantry = (slug: string, name: string, tip: string): ShoppingItem => ({
  key: `pantry:${slug}`,
  name,
  tip,
  location: { place: 'casa', aisle: 'despensa' },
});

/** Catálogo completo, en orden de visualización. */
export const SHOPPING_ITEMS: readonly ShoppingItem[] = [
  // ---- Oficina · a) Sin nevera
  office('muesli', 'Muesli sin azúcar añadido', 'Menos de 10 g de azúcar por 100 g; sin chocolate ni siropes', 'sin_nevera', 'g', '1 paquete'),
  office('granola', 'Granola baja en azúcar', 'Menos de 10 g de azúcar por 100 g; la ración es pequeña', 'sin_nevera', 'g', '1 paquete pequeño'),
  office('avena', 'Avena en copos', 'Copos integrales sin aditivos; sirven para dejar en remojo', 'sin_nevera', 'g', '1 paquete'),
  office('barrita_avena', 'Barrita de avena (sin azúcar añadido)', 'Lista corta de ingredientes, sin sirope de glucosa', 'sin_nevera', 'count', '1 caja'),
  office('barrita_proteina', 'Barrita de proteína', 'Al menos 15 g de proteína y poco azúcar por barrita', 'sin_nevera', 'count', '1 caja o sueltas'),
  office('tortitas_arroz', 'Tortitas de arroz', 'Solo arroz (y sal); sin cobertura de chocolate', 'sin_nevera', 'g', '1 paquete'),
  office('pan_molde_integral', 'Pan de molde integral', 'Al menos 50 % de harina integral', 'sin_nevera', 'g', '1 paquete'),
  office('pan_integral', 'Pan integral', 'Harina integral como primer ingrediente', 'sin_nevera', 'g', '1 barra o 1 paquete'),
  office('wrap_integral', 'Wrap / tortilla integral', 'Envasados; al menos 50 % de harina integral', 'sin_nevera', 'count', '1 paquete'),
  office('nueces', 'Nueces', 'Naturales, sin sal ni fritas', 'sin_nevera', 'g', '1 bolsa pequeña'),
  office('cacahuete_crema', 'Crema de cacahuete 100 %', 'Solo cacahuete; monodosis o tarro', 'sin_nevera', 'g', 'Monodosis o 1 tarro'),
  office('datiles', 'Dátiles (medjool)', 'Sin hueso y sin azúcar añadido', 'sin_nevera', 'count', '1 caja pequeña'),
  office('miel', 'Miel', 'Miel pura, bote pequeño', 'sin_nevera', 'g', '1 bote pequeño'),
  office('mermelada', 'Mermelada de fruta', 'Fruta como primer ingrediente', 'sin_nevera', 'g', '1 tarro pequeño'),
  office('atun_natural', 'Atún al natural (latas)', 'Al natural o en agua; el pack sirve también para casa', 'sin_nevera', 'g', 'Pack de latas'),
  office('platano', 'Plátano', 'Compra piezas con distinto punto de maduración', 'sin_nevera', 'count', 'Unas piezas'),
  office('manzana', 'Manzana', 'Aguanta bien fuera de la nevera', 'sin_nevera', 'count', 'Unas piezas'),
  office('mandarina', 'Mandarina', 'De temporada; si no hay, otra fruta de mano', 'sin_nevera', 'count', 'Unas piezas'),
  office('leche_desnatada', 'Leche desnatada (brik)', 'Brik UHT; una vez abierto, a la nevera', 'sin_nevera', 'litros', '1 o 2 briks'),

  // ---- Oficina · b) Con nevera
  office('skyr', 'Skyr natural', 'Natural y sin azúcar; tarros individuales', 'con_nevera', 'count', 'Pack de tarros'),
  office('yogur_griego_0', 'Yogur griego 0 %', 'Natural sin azúcar; pack de yogures individuales', 'con_nevera', 'count', 'Pack de yogures'),
  office('queso_batido', 'Queso fresco batido 0 %', 'Tarrina grande, sin azúcar', 'con_nevera', 'g', '1 tarrina'),
  office('requeson', 'Requesón / cottage bajo en grasa', 'Tarrina pequeña, bajo en grasa', 'con_nevera', 'g', '1 tarrina'),
  office('pavo_lonchas', 'Pavo en lonchas (fiambre)', 'Alto % de pavo, sin almidón ni azúcar añadidos', 'con_nevera', 'g', '1 paquete'),
  office('jamon_cocido', 'Jamón cocido extra', 'Categoría «extra», sin azúcares añadidos', 'con_nevera', 'g', '1 paquete'),
  office('jamon_serrano', 'Jamón serrano (magro)', 'Loncheado; quita la grasa visible', 'con_nevera', 'g', '1 paquete loncheado'),
  office('huevo_cocido', 'Huevos cocidos', 'Ya pelados (refrigerados) o cuécelos en casa la víspera', 'con_nevera', 'count', '1 paquete o cocidos en casa'),
  office('frutos_rojos', 'Frutos rojos (mezcla)', 'Frescos en bandeja o congelados (descongelar en la nevera)', 'con_nevera', 'g', '1 bandeja o 1 bolsa congelada'),

  // ---- Oficina · Opcional
  office('whey', 'Proteína whey (polvo)', 'Sabor neutro o vainilla, con shaker; solo si la usas', 'opcional', 'g', '1 bote'),

  // ---- Casa · Carnes y aves
  casa('pollo_pechuga', 'Pollo (pechuga)', 'Fresca y sin piel; la bandeja grande se puede congelar', 'carnes'),
  casa('pollo_muslo', 'Muslo de pollo sin piel', 'Deshuesado y sin piel', 'carnes'),
  casa('pavo_pechuga', 'Pavo (pechuga fresca)', 'Pechuga fresca, no fiambre', 'carnes'),
  casa('ternera_magra', 'Ternera magra', 'Filetes o tacos magros, sin grasa visible', 'carnes'),
  casa('cerdo_lomo', 'Cerdo magro (lomo)', 'Cinta de lomo fresca, sin adobar', 'carnes'),

  // ---- Casa · Pescado y marisco
  casa('salmon', 'Salmón', 'Lomos frescos o congelados', 'pescado'),
  casa('merluza', 'Merluza', 'Fresca o congelada en porciones', 'pescado'),
  casa('dorada_lubina', 'Dorada / lubina', 'Entera y limpia, o en filetes', 'pescado'),
  casa('salmon_ahumado', 'Salmón ahumado', 'Sobre de lonchas; revisa la sal', 'pescado'),

  // ---- Casa · Huevos, lácteos y tofu
  casa('huevo', 'Huevos frescos', 'Talla M o L; una o dos docenas', 'huevos'),
  casa('clara_huevo', 'Clara de huevo', 'Claras pasteurizadas en brik', 'huevos'),
  casa('tofu', 'Tofu firme', 'Natural, sin marinar', 'huevos'),

  // ---- Casa · Frutas
  casa('aguacate', 'Aguacate', 'Uno maduro y otro firme; también para el wrap del desayuno', 'frutas'),

  // ---- Casa · Verduras y hortalizas
  casa('brocoli', 'Brócoli', 'Fresco o congelado', 'verduras'),
  casa('espinacas', 'Espinacas', 'Bolsa fresca o congeladas en porciones', 'verduras'),
  casa('calabacin', 'Calabacín', 'Firme y brillante', 'verduras'),
  casa('champinones', 'Champiñones', 'Bandeja fresca o laminados', 'verduras'),
  casa('ensalada_mixta', 'Ensalada mixta', 'Bolsa de lechuga, zanahoria y cebolla, o por separado', 'verduras'),
  casa('tomate', 'Tomate', 'Maduros; también para la tostada del desayuno', 'verduras'),
  casa('patata', 'Patata', 'Malla de patatas para cocer', 'verduras'),
  casa('boniato', 'Boniato', 'Piel lisa y sin golpes', 'verduras'),
  casa('crema_verduras', 'Crema de verduras (sin nata)', 'Brik sin nata ni azúcar añadido', 'verduras'),

  // ---- Casa · Legumbres, arroz, pasta y cereales
  casa('lentejas', 'Lentejas', 'Secas, pardina o castellana', 'legumbres'),
  casa('garbanzos', 'Garbanzos (secos)', 'Ponlos en remojo la noche anterior', 'legumbres'),
  casa('garbanzos_bote', 'Garbanzos cocidos (bote)', 'Bote de cristal; enjuágalos antes de usar', 'legumbres'),
  casa('arroz_blanco', 'Arroz blanco', 'Redondo o largo', 'legumbres'),
  casa('arroz_integral', 'Arroz integral', 'Integral de grano largo', 'legumbres'),
  casa('pasta_integral', 'Pasta integral', '100 % trigo integral', 'legumbres'),
  casa('quinoa', 'Quinoa', 'Lávala antes de cocer', 'legumbres'),

  // ---- Casa · Pan
  casa('pan_centeno', 'Pan de centeno integral', 'Centeno integral como primer ingrediente', 'pan'),

  // ---- Casa · Aceites y grasas
  casa('aceite_oliva', 'Aceite de oliva virgen extra', 'Botella de cristal oscuro', 'grasas'),

  // ---- Casa · Congelados útiles
  casa('gambas', 'Gambas peladas', 'Congeladas; descongélalas en la nevera', 'congelados'),
  casa('judias_verdes', 'Judías verdes', 'Congeladas, o frescas en temporada', 'congelados'),

  // ---- Casa · Despensa / básicos
  pantry('sal', 'Sal', 'Mejor sal yodada'),
  pantry('especias', 'Especias', 'Pimienta, pimentón, orégano, ajo en polvo'),
  pantry('vinagre', 'Vinagre (o limón)', 'De vino o de manzana'),
  pantry('edulcorante', 'Edulcorante (opcional)', 'Sucralosa o estevia, solo si lo usas'),
  pantry('cafe_te', 'Café / té', 'Para casa y para la oficina'),
];

/** Claves válidas del catálogo (para sanear lo persistido). */
export const SHOPPING_ITEM_KEYS: ReadonlySet<string> = new Set(SHOPPING_ITEMS.map((i) => i.key));

/**
 * Alimentos usados por algún plato que NO se compran, con el motivo. Hoy está
 * vacío (todos son comprables); el test de integridad exige que cada alimento
 * de plato esté catalogado o figure aquí, y que cada clave de aquí sea real.
 */
export const SHOPPING_EXCLUDED: Readonly<Record<string, string>> = {};

/**
 * Alimentos de platos portables Pre/Post que se compran en CASA y no en la
 * oficina, con el motivo.
 */
export const CASA_OVERRIDES: Readonly<Record<string, string>> = {
  tomate: 'Se usa sobre todo en almuerzo y cena; se compra fresco cada semana.',
  aguacate: 'Solo 15–20 g en el desayuno; uso principal en la cena y se oxida una vez abierto.',
};

// ------------------------------------------------------------- secciones

export const SHOPPING_SECTION_ORDER: readonly ShoppingSectionId[] = [
  'oficina_sin_nevera',
  'oficina_con_nevera',
  'oficina_opcional',
  'casa_carnes',
  'casa_pescado',
  'casa_huevos',
  'casa_frutas',
  'casa_verduras',
  'casa_legumbres',
  'casa_pan',
  'casa_grasas',
  'casa_congelados',
  'casa_despensa',
];

export const SHOPPING_SECTION_TITLES: Readonly<Record<ShoppingSectionId, string>> = {
  oficina_sin_nevera: 'a) Sin nevera (aguanta en el cajón)',
  oficina_con_nevera: 'b) Con nevera (si hay en la oficina)',
  oficina_opcional: 'Opcional',
  casa_carnes: 'Carnes y aves',
  casa_pescado: 'Pescado y marisco',
  casa_huevos: 'Huevos, lácteos y tofu',
  casa_frutas: 'Frutas',
  casa_verduras: 'Verduras y hortalizas',
  casa_legumbres: 'Legumbres, arroz, pasta y cereales',
  casa_pan: 'Pan',
  casa_grasas: 'Aceites y grasas',
  casa_congelados: 'Congelados útiles',
  casa_despensa: 'Despensa / básicos',
};

export const SHOPPING_BLOCK_TITLES = {
  oficina: 'Para dejar en la oficina',
  casa: 'Para casa (almuerzo y cena)',
} as const;

/** Id de sección al que pertenece un producto. */
export function sectionIdOf(item: ShoppingItem): ShoppingSectionId {
  return item.location.place === 'oficina'
    ? (`oficina_${item.location.subgroup}` as ShoppingSectionId)
    : (`casa_${item.location.aisle}` as ShoppingSectionId);
}

/** Secciones en orden de visualización; solo las que tienen productos. */
export function shoppingSections(items: readonly ShoppingItem[] = SHOPPING_ITEMS): ShoppingSection[] {
  const out: ShoppingSection[] = [];
  for (const id of SHOPPING_SECTION_ORDER) {
    const inSection = items.filter((i) => sectionIdOf(i) === id);
    if (inSection.length === 0) continue;
    out.push({
      id,
      block: id.startsWith('oficina_') ? 'oficina' : 'casa',
      title: SHOPPING_SECTION_TITLES[id],
      items: inSection,
    });
  }
  return out;
}

/** Cuántos de `items` están marcados. */
export function checkedCountIn(
  items: readonly ShoppingItem[],
  checked: Readonly<Record<string, true>>,
): number {
  let n = 0;
  for (const i of items) if (checked[i.key] === true) n++;
  return n;
}

// ------------------------------------------- Settings: lectura / escritura

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function sanitizeChecked(raw: unknown): Record<string, true> {
  const out: Record<string, true> = {};
  if (!isRecord(raw)) return out;
  for (const key of Object.keys(raw)) {
    if (raw[key] === true && SHOPPING_ITEM_KEYS.has(key)) out[key] = true;
  }
  return out;
}

/** Lectura defensiva de los productos marcados (por defecto {}). */
export function readShoppingChecked(
  settings: { shoppingChecked?: unknown } | null | undefined,
): Record<string, true> {
  return sanitizeChecked(settings?.shoppingChecked);
}

/** Mapa NUEVO con `key` marcado o desmarcado. Una clave desconocida deja una copia igual. No muta. */
export function withShoppingToggled(
  checked: Readonly<Record<string, true>>,
  key: string,
): Record<string, true> {
  const next: Record<string, true> = { ...checked };
  if (!SHOPPING_ITEM_KEYS.has(key)) return next;
  if (next[key] === true) delete next[key];
  else next[key] = true;
  return next;
}

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealDayKey(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const m = DAY_KEY.exec(v);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Fecha ('YYYY-MM-DD') del último «Desmarcar todo», o null si no hay una válida. */
export function readShoppingLastReset(
  settings: { shoppingLastReset?: unknown } | null | undefined,
): string | null {
  const v = settings?.shoppingLastReset;
  return isRealDayKey(v) ? v : null;
}

/** Clave de día LOCAL 'YYYY-MM-DD' de hoy. */
export function todayKey(now: Date = new Date()): string {
  return toLocalDayKey(now.toISOString());
}

/** Ajustes tras «Desmarcar todo»: sin marcas y con la fecha del reinicio. No muta. */
export function withShoppingReset(settings: Settings, today: string): Settings {
  return { ...settings, shoppingChecked: {}, shoppingLastReset: today };
}

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

/** '2026-11-03' → '3 de noviembre de 2026' (meses fijos, sin depender de ICU). */
export function formatResetDate(dayKey: string): string {
  const m = DAY_KEY.exec(dayKey);
  if (!m) return dayKey;
  return `${Number(m[3])} de ${MONTHS_ES[Number(m[2]) - 1]} de ${Number(m[1])}`;
}

/**
 * Sanea las claves de la lista de la compra SOLO si vienen en el objeto crudo
 * (backups): las ausentes siguen ausentes y los backups antiguos quedan idénticos.
 */
export function sanitizeShoppingKeys(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw };
  if ('shoppingChecked' in raw) out.shoppingChecked = sanitizeChecked(raw.shoppingChecked);
  if ('shoppingLastReset' in raw && !isRealDayKey(raw.shoppingLastReset)) {
    delete out.shoppingLastReset;
  }
  return out;
}

// ------------------------------------------------- cantidades de oficina

/** Días laborables que cubre la compra de oficina. */
export const WORK_DAYS = 5;

export type OfficeQuantity =
  | { kind: 'computed'; text: string; weeklyRawGrams: number }
  | { kind: 'format'; text: string };

const nf = (n: number): string => String(n).replace('.', ',');

/**
 * Cantidad orientativa legible (coma decimal es-ES).
 *  - 'g': < 100 → múltiplo de 5 (mín. 5); 100–999 → múltiplo de 10; ≥ 1000 → kg con 1 decimal.
 *  - 'count': unidades enteras por exceso (hay que comprar suficientes), mín. 1.
 *  - 'litros': múltiplos de 0,25 L (mín. 0,25), con 1 g ≈ 1 ml.
 */
export function formatOfficeAmount(
  grams: number,
  measure: OfficeMeasure,
  unit?: { singular: string; plural: string; grams: number },
): string {
  const g = Number.isFinite(grams) ? Math.max(0, grams) : 0;

  if (measure === 'count' && unit && unit.grams > 0) {
    const n = Math.max(1, Math.ceil(g / unit.grams - 1e-9));
    return `≈ ${n} ${n === 1 ? unit.singular : unit.plural}`;
  }

  if (measure === 'litros') {
    const l = Math.max(0.25, Math.round((g / 1000) * 4) / 4);
    return `≈ ${nf(l)} L`;
  }

  // 'g' (y 'count' sin unidad: se cae a gramos)
  if (g < 100) return `≈ ${Math.max(5, Math.round(g / 5) * 5)} g`;
  const r10 = Math.round(g / 10) * 10;
  if (r10 < 1000) return `≈ ${r10} g`;
  return `≈ ${nf(Math.round(g / 100) / 10)} kg`;
}

const OFFICE_MEALS: readonly MealId[] = ['pre', 'post'];

/**
 * Cantidades orientativas de los productos de OFICINA para `WORK_DAYS` días:
 * suma de los gramos EN CRUDO de cada alimento en los platos elegidos de
 * Pre y Post-entreno (el predeterminado si no hay elección), dimensionados con
 * las comidas del plan actual, × 5, redondeada a cifras prácticas.
 *
 * Un producto que no está en esos platos solo muestra su formato de compra
 * (nunca una cifra inventada). Los productos de casa no tienen entrada. Sin
 * plan (sin perfil) todos muestran su formato.
 */
export function officeQuantities(
  plan: DailyPlan | null,
  selectedPlates: SelectedPlates | null | undefined,
  catalogue: readonly ShoppingItem[] = SHOPPING_ITEMS,
): Record<string, OfficeQuantity> {
  const officeItems = catalogue.filter((i) => i.location.place === 'oficina');
  const daily = new Map<string, number>();

  if (plan) {
    for (const mealId of OFFICE_MEALS) {
      const meal = plan.meals.find((m) => m.id === mealId);
      if (!meal) continue;
      const plate = resolveChosenPlate(mealId, selectedPlates);
      for (const it of computePlate(plate, meal.macros).items) {
        daily.set(it.food.id, (daily.get(it.food.id) ?? 0) + it.rawGrams);
      }
    }
  }

  const out: Record<string, OfficeQuantity> = {};
  for (const item of officeItems) {
    const weekly = (item.foodId ? (daily.get(item.foodId) ?? 0) : 0) * WORK_DAYS;
    if (weekly > 0 && item.measure) {
      const unit = item.foodId ? getFood(item.foodId)?.unit : undefined;
      out[item.key] = {
        kind: 'computed',
        weeklyRawGrams: weekly,
        text: `${formatOfficeAmount(weekly, item.measure, unit)} · ${WORK_DAYS} días`,
      };
    } else {
      out[item.key] = { kind: 'format', text: item.format ?? '' };
    }
  }
  return out;
}
