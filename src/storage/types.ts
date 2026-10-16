// Tipos del esquema de persistencia (design §5).
// Única fuente de verdad para las entidades almacenadas y los defaults de siembra.

/** Días de la rutina Torso/Pierna (design §8.1). */
export type DayId = 'torsoA' | 'piernaA' | 'torsoB' | 'piernaB';

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

/** Ajustes de la app (singleton). */
export interface Settings {
  activityFactor: number; // default 1.375
  proteinGPerKg: number; // default 2.0 (g/kg peso total/día)
  bmrBasis: 'lbm' | 'mme'; // default 'lbm'; base de Katch-McArdle (design §6.1)
  trainingStart: string; // 'HH:mm', default '07:00'
  restSeconds: number; // default 60 (rango 45-60)
  reminders: ReminderSettings;
  /** Overrides de imágenes de ejercicios, por exerciseId (design §8.2). */
  exerciseOverrides: Record<string, { imageUrl?: string; endImageUrl?: string }>;
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
  exerciseOverrides: {},
  reminders: DEFAULT_REMINDERS,
};
