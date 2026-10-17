// Runner guiado de una rutina de cardio: wrapper fino que expande la rutina a
// pasos planos y delega toda la lógica cronometrada en GuidedStepRunner (el
// runner genérico compartido con el circuito de abdominales). Mantiene el prop
// público `routine` que consume CardioRoutinesGuide.

import { useMemo } from 'react';
import {
  expandRoutineSteps,
  routineTotalSec,
  type CardioRoutine,
} from '../../domain/cardioRoutines';
import GuidedStepRunner from './GuidedStepRunner';

interface CardioRoutineRunnerProps {
  routine: CardioRoutine;
}

export default function CardioRoutineRunner({ routine }: CardioRoutineRunnerProps) {
  const steps = useMemo(() => expandRoutineSteps(routine), [routine]);
  const totalSec = useMemo(() => routineTotalSec(routine), [routine]);

  return <GuidedStepRunner title={routine.name} steps={steps} totalSec={totalSec} />;
}
