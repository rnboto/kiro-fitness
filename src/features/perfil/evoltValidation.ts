// Validación del formulario Evolt (design §11). Reglas de rango concretas,
// propiedad de la capa de formulario (frontera con el usuario).

import type { ProfileEntry } from '../../storage';

/** Campos del estudio Evolt que edita el usuario (sin id ni date). */
export interface EvoltFields {
  age: number;
  heightCm: number;
  sex: 'M' | 'F';
  weightKg: number;
  bodyFatPct: number;
  mmeKg: number;
}

/** Errores de validación por campo (bloquean el envío). */
export type EvoltErrors = Partial<Record<keyof EvoltFields, string>>;

export interface EvoltValidationResult {
  errors: EvoltErrors;
  /** Aviso suave no bloqueante (p.ej. MME > LBM). */
  softWarning?: string;
  valid: boolean;
}

const isInt = (v: number) => Number.isFinite(v) && Number.isInteger(v);
const isNum = (v: number) => Number.isFinite(v);

/**
 * Valida los campos Evolt según design §11. Devuelve errores por campo (que
 * bloquean el envío) y, opcionalmente, un aviso suave no bloqueante.
 */
export function validateEvolt(fields: EvoltFields): EvoltValidationResult {
  const errors: EvoltErrors = {};
  const { age, heightCm, sex, weightKg, bodyFatPct, mmeKg } = fields;

  // age: requerido, entero, 14–100.
  if (!isInt(age) || age < 14 || age > 100) {
    errors.age = 'La edad debe ser un número entero entre 14 y 100.';
  }
  // heightCm: requerido, 120–230.
  if (!isNum(heightCm) || heightCm < 120 || heightCm > 230) {
    errors.heightCm = 'La altura debe estar entre 120 y 230 cm.';
  }
  // sex: requerido, 'M'|'F'.
  if (sex !== 'M' && sex !== 'F') {
    errors.sex = 'Selecciona un sexo.';
  }
  // weightKg: requerido, 30–250, 1 decimal.
  if (!isNum(weightKg) || weightKg < 30 || weightKg > 250) {
    errors.weightKg = 'El peso debe estar entre 30 y 250 kg.';
  }
  // bodyFatPct: requerido, 3–60.
  if (!isNum(bodyFatPct) || bodyFatPct < 3 || bodyFatPct > 60) {
    errors.bodyFatPct = 'El % de grasa debe estar entre 3 y 60.';
  }
  // mmeKg: requerido, 10–80, debe ser < weightKg (invariante físico duro).
  if (!isNum(mmeKg) || mmeKg < 10 || mmeKg > 80) {
    errors.mmeKg = 'La MME debe estar entre 10 y 80 kg.';
  } else if (isNum(weightKg) && mmeKg >= weightKg) {
    errors.mmeKg = 'La MME debe ser menor que el peso total.';
  }

  // Aviso suave: MME no puede superar la LBM (datos Evolt probablemente inconsistentes).
  let softWarning: string | undefined;
  if (
    !errors.mmeKg &&
    !errors.weightKg &&
    !errors.bodyFatPct &&
    isNum(weightKg) &&
    isNum(bodyFatPct) &&
    isNum(mmeKg)
  ) {
    const lbm = weightKg * (1 - bodyFatPct / 100);
    if (mmeKg > lbm) {
      softWarning =
        'Aviso: la MME introducida supera tu masa magra estimada (LBM). ' +
        'Revisa los datos del estudio; puedes guardar igualmente.';
    }
  }

  return { errors, softWarning, valid: Object.keys(errors).length === 0 };
}

/** Fecha de hoy en formato ISO (YYYY-MM-DD). */
export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Valida una fecha ISO (YYYY-MM-DD) no vacía y real. */
export function isValidDateIso(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return false;
  const d = new Date(`${value}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

/** Construye una ProfileEntry nueva (sin id) a partir de campos + fecha. */
export function toNewProfileEntry(fields: EvoltFields, date: string): Omit<ProfileEntry, 'id'> {
  return {
    date,
    age: fields.age,
    heightCm: fields.heightCm,
    sex: fields.sex,
    weightKg: fields.weightKg,
    bodyFatPct: fields.bodyFatPct,
    mmeKg: fields.mmeKg,
  };
}
