// Capa PURA de rutinas de cardio sugeridas (sin React ni storage). Define las 6
// sesiones listas (3 cinta, 3 bici) como datos estáticos tipados y los helpers
// puros para expandir las rondas HIIT a una lista plana de pasos y sumar su
// duración. Sigue el patrón pure/testable de src/domain/* (igual que cardio.ts).

export type CardioMachine = 'cinta' | 'bici';
export type CardioRoutineType = 'continuo' | 'hiit' | 'variable';

/** Paso simple con duración fija. */
export interface RoutineStep {
  /** Etiqueta en español. */
  label: string;
  durationSec: number;
  /** Pista de intensidad opcional (RPE), p.ej. 'RPE 8-9'. */
  intensity?: string;
}

/** Bloque de rondas repetidas (para HIIT): se expande a work+rest × rounds. */
export interface RoutineRound {
  rounds: number;
  /** Esfuerzo fuerte. */
  work: RoutineStep;
  /** Recuperación. */
  rest: RoutineStep;
}

/** Un elemento de la rutina es un paso simple o un bloque de rondas. */
export type RoutineElement =
  | { kind: 'step'; step: RoutineStep }
  | { kind: 'round'; round: RoutineRound };

export interface CardioRoutine {
  /** 'c1'..'c3', 'b1'..'b3'. */
  id: string;
  machine: CardioMachine;
  /** p.ej. 'C1 · Zona 2 (quemagrasa, suave)'. */
  name: string;
  type: CardioRoutineType;
  /** Minutos etiquetados de la sesión (para badge/UI). */
  totalMinutes: number;
  /** Descripción corta en español. */
  description: string;
  /** Definición compacta (pasos y/o bloques de rondas). */
  elements: RoutineElement[];
}

/** Paso plano ya expandido, listo para el runner guiado. */
export interface ExpandedStep {
  label: string;
  durationSec: number;
  intensity?: string;
}

/**
 * Expande los `elements` (incluyendo rondas) a una lista plana de pasos. PURA.
 * Para `kind:'step'` emite el paso; para `kind:'round'` emite `rounds` veces la
 * pareja work+rest en orden.
 */
export function expandRoutineSteps(routine: CardioRoutine): ExpandedStep[] {
  const steps: ExpandedStep[] = [];
  for (const el of routine.elements) {
    if (el.kind === 'step') {
      steps.push({ ...el.step });
    } else {
      for (let i = 0; i < el.round.rounds; i += 1) {
        steps.push({ ...el.round.work });
        steps.push({ ...el.round.rest });
      }
    }
  }
  return steps;
}

/** Suma de segundos de todos los pasos expandidos. PURA. */
export function routineTotalSec(routine: CardioRoutine): number {
  return expandRoutineSteps(routine).reduce((acc, s) => acc + s.durationSec, 0);
}

/** Helpers internos para construir pasos de forma concisa. */
const step = (label: string, durationSec: number, intensity?: string): RoutineElement => ({
  kind: 'step',
  step: intensity ? { label, durationSec, intensity } : { label, durationSec },
});

export const CARDIO_ROUTINES: CardioRoutine[] = [
  // ───────────── CINTA (correr) ─────────────
  {
    id: 'c1',
    machine: 'cinta',
    name: 'C1 · Zona 2 (quemagrasa, suave)',
    type: 'continuo',
    totalMinutes: 35,
    description:
      'Trote continuo suave en Zona 2: el cuerpo usa grasa como combustible sin apenas fatiga.',
    elements: [
      step('Calentamiento — caminar', 300),
      step('Trote continuo (RPE 6, puedes hablar)', 1500, 'RPE 6'),
      step('Enfriamiento — caminar', 300),
    ],
  },
  {
    id: 'c2',
    machine: 'cinta',
    name: 'C2 · HIIT intervalos',
    type: 'hiit',
    totalMinutes: 28,
    description:
      'Intervalos cortos y duros con recuperación: quema mucho en poco tiempo y eleva el gasto tras la sesión.',
    elements: [
      step('Calentamiento — caminar', 300),
      {
        kind: 'round',
        round: {
          rounds: 8,
          work: { label: 'Fuerte (RPE 8-9)', durationSec: 30, intensity: 'RPE 8-9' },
          rest: { label: 'Suave — caminar/trote', durationSec: 90 },
        },
      },
      step('Enfriamiento', 300),
    ],
  },
  {
    id: 'c3',
    machine: 'cinta',
    name: 'C3 · Cuesta (incline)',
    type: 'continuo',
    totalMinutes: 30,
    description:
      'Caminar rápido en inclinación: quema sin impacto en las articulaciones.',
    elements: [
      step('Calentamiento', 300),
      step('Caminar rápido en cuesta 6-10% (RPE 7)', 1200, 'RPE 7'),
      step('Enfriamiento', 300),
    ],
  },
  // ───────────── BICI (bici fija) ─────────────
  {
    id: 'b1',
    machine: 'bici',
    name: 'B1 · Zona 2 (quemagrasa)',
    type: 'continuo',
    totalMinutes: 40,
    description:
      'Pedaleo continuo en Zona 2 con resistencia moderada: bajo impacto, grasa como combustible.',
    elements: [
      step('Calentamiento — pedaleo suave', 300),
      step('Pedaleo continuo 70-90 RPM, resistencia moderada (RPE 6)', 1800, 'RPE 6'),
      step('Enfriamiento', 300),
    ],
  },
  {
    id: 'b2',
    machine: 'bici',
    name: 'B2 · HIIT intervalos',
    type: 'hiit',
    totalMinutes: 30,
    description:
      'Intervalos de 2 min fuertes y 2 min suaves: gran gasto calórico con bajo impacto articular.',
    elements: [
      step('Calentamiento', 300),
      {
        kind: 'round',
        round: {
          rounds: 6,
          work: { label: 'Fuerte (RPE 8-9)', durationSec: 120, intensity: 'RPE 8-9' },
          rest: { label: 'Suave', durationSec: 120 },
        },
      },
      step('Enfriamiento', 300),
    ],
  },
  {
    id: 'b3',
    machine: 'bici',
    name: 'B3 · Pirámide',
    type: 'variable',
    totalMinutes: 35,
    description:
      'Sube la resistencia escalón a escalón y bájala igual, pedaleando constante.',
    elements: [
      step('Calentamiento', 300),
      step('Resistencia 1', 120),
      step('Resistencia 2', 120),
      step('Resistencia 3', 120),
      step('Resistencia 4', 120),
      step('Resistencia 5', 120),
      step('Resistencia 4', 120),
      step('Resistencia 3', 120),
      step('Resistencia 2', 120),
      step('Resistencia 1', 120),
      step('Enfriamiento', 300),
    ],
  },
];
