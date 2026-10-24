// Tipos del esquema de persistencia (design §5).
// Única fuente de verdad para las entidades almacenadas y los defaults de siembra.

/**
 * Id de día de rutina. Ahora los ids llevan prefijo de fase (p.ej. 's1-d1',
 * 's2-d3'), por lo que el tipo se amplía a `string` para admitir ambas fases
 * sin migrar el histórico persistido (los antiguos 'torsoA' siguen siendo string válido).
 */
export type DayId = string;

/** Entrada de histórico del perfil (estudio Evolt/bioimpedancia). */
export interface ProfileEntry {
  id: number; // autoincrement
  date: string; // ISO 8601 (fecha de la medición)
  age: number; // años
  heightCm: number; // cm
  sex: 'M' | 'F';
  weightKg: number; // peso total
  bodyFatPct: number; // % grasa (0-100)
  mmeKg: number; // masa muscular esquelética
}

/** Serie registrada en el gimnasio. */
export interface LoggedSet {
  id: number; // autoincrement
  date: string; // ISO
  dayId: DayId;
  exerciseId: string; // id del ejercicio en la rutina
  setIndex: number; // nº de serie dentro del ejercicio
  weightKg: number;
  reps: number;
}

/** Sesión de cardio (aeróbico): correr o bici. */
export interface CardioSession {
  id: number; // autoincrement
  date: string; // ISO 8601
  type: 'correr' | 'bici';
  durationMin: number; // duración en minutos (se conserva por compatibilidad)
  /**
   * Duración en segundos. Opcional por compatibilidad hacia atrás: los datos
   * antiguos solo tienen `durationMin`. Al computar se prefiere `durationSec`
   * cuando está presente (ver `sessionDurationSec` en domain/cardio).
   */
  durationSec?: number;
  distanceKm: number; // distancia en km
  calories?: number; // calorías estimadas (opcional)
  notes?: string; // notas libres (opcional)
}

/** Configuración de recordatorios (design §5). */
export interface ReminderSettings {
  weightLog: { enabled: boolean; time: string }; // 'HH:mm'
  hydration: {
    enabled: boolean;
    intervalMinutes: number;
    startTime: string; // 'HH:mm'
    endTime: string; // 'HH:mm'
  };
  bioimpedance: { enabled: boolean; intervalWeeks: number };
}

/** Alcance de una sustitución de ejercicio. */
export type ExerciseSwapScope = 'hoy' | 'fijo';

/** Sustitución guardada para un hueco de la rutina. */
export interface ExerciseSwap {
  toKey: string; // key del ejercicio sustituto en la base de sustituciones
  scope: ExerciseSwapScope;
  date: string; // 'YYYY-MM-DD' local del día en que se eligió (relevante para 'hoy')
}

/** Clave `${dayId}::${originalExerciseId}` → sustitución. */
export type ExerciseSwaps = Record<string, ExerciseSwap>;

/** Ajustes de la app (singleton). */
export interface Settings {
  activityFactor: number; // default 1.375
  proteinGPerKg: number; // default 2.0 (g/kg peso total/día)
  bmrBasis: 'lbm' | 'mme'; // default 'lbm'; base de Katch-McArdle (design §6.1)
  trainingStart: string; // 'HH:mm', default '07:00'
  restSeconds: number; // default 60 (rango 45-60)
  routineWeekPhase: 'semana1' | 'semana2plus'; // fase de rutina activa (default 'semana1')
  reminders: ReminderSettings;
  /** Overrides de imágenes de ejercicios, por exerciseId (design §8.2). */
  exerciseOverrides: Record<string, { imageUrl?: string; endImageUrl?: string }>;
  /**
   * Plato elegido por comida en Nutrición ("Ideas de comida"). Opcional por
   * compatibilidad hacia atrás: los datos antiguos no lo tienen y NO está en
   * DEFAULT_SETTINGS; sin valor (o con un id desconocido) se usa el primer plato.
   */
  selectedPlates?: Partial<Record<'pre' | 'post' | 'almuerzo' | 'cena', string>>;
  /** Peso objetivo (kg). Opcional por compatibilidad; null/ausente = sin objetivo. NO está en DEFAULT_SETTINGS. */
  goalWeightKg?: number | null;
  /** Peso actual en el momento de fijar el objetivo (kg). Opcional; null/ausente = desconocido. */
  goalStartWeightKg?: number | null;
  /**
   * Sustituciones de ejercicios (Gimnasio › Musculación). Opcional por
   * compatibilidad: los datos antiguos no lo tienen y NO está en DEFAULT_SETTINGS;
   * se lee siempre con `readExerciseSwaps` (lectura defensiva, default {}).
   */
  exerciseSwaps?: ExerciseSwaps;
}

/** Recordatorios por defecto (design §5, literales exactos). */
export const DEFAULT_REMINDERS: ReminderSettings = {
  weightLog: { enabled: true, time: '07:30' },
  hydration: { enabled: true, intervalMinutes: 90, startTime: '08:00', endTime: '20:00' },
  bioimpedance: { enabled: true, intervalWeeks: 4 },
};

/** Ajustes por defecto (design §5, literales exactos). */
export const DEFAULT_SETTINGS: Settings = {
  activityFactor: 1.375,
  proteinGPerKg: 2.0,
  bmrBasis: 'lbm',
  trainingStart: '07:00',
  restSeconds: 60,
  routineWeekPhase: 'semana1',
  exerciseOverrides: {},
  reminders: DEFAULT_REMINDERS,
};
