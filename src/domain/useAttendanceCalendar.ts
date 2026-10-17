// Hook compartido que encapsula el cableado del calendario de asistencia:
// carga series de fuerza + sesiones de cardio + marcas manuales, deriva los
// días automáticos y resaltados con los selectores puros de `attendance.ts`,
// calcula la racha y los días entrenados del mes visible, y expone un toggle
// que persiste la marca manual (update optimista). Lo consumen tanto la
// pantalla Perfil (donde vive el calendario) como la pestaña Adherencia (que
// aún necesita `sets`/`cardio` para sus contadores).

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addAttendanceMark,
  getAllAttendanceMarks,
  getAllCardioSessions,
  getAllSets,
  removeAttendanceMark,
  type CardioSession,
  type LoggedSet,
} from '../storage';
import {
  countTrainedInMonth,
  selectCurrentStreak,
  selectTrainedDays,
  selectTrainedDaysWithManual,
} from './attendance';
import type { ViewMonth } from '../features/estadisticas/AttendanceCalendar';

export interface UseAttendanceCalendarResult {
  /** Fecha actual estable (memoizada) inyectable al calendario. */
  now: Date;
  /** Series de fuerza cargadas (para contadores de Adherencia). */
  sets: LoggedSet[];
  /** Sesiones de cardio cargadas (para contadores de Adherencia). */
  cardio: CardioSession[];
  /** Días resaltados (auto O manual). */
  trainedDays: Set<string>;
  /** Días automáticos (fuerza/cardio), no alternables. */
  autoDays: Set<string>;
  /** Días entrenados dentro del mes visible. */
  trainedThisMonth: number;
  /** Racha de días consecutivos entrenados. */
  streak: number;
  /** Alterna la marca manual de un día (solo días no automáticos). */
  handleToggle: (dateKey: string) => void;
  /** Actualiza el mes visible (para el resumen "este mes"). */
  setViewMonth: (view: ViewMonth) => void;
}

export function useAttendanceCalendar(): UseAttendanceCalendarResult {
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [cardio, setCardio] = useState<CardioSession[]>([]);
  const [manualMarks, setManualMarks] = useState<string[]>([]);
  const now = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState<ViewMonth>(() => ({
    year: now.getFullYear(),
    month: now.getMonth(),
  }));

  useEffect(() => {
    let active = true;
    (async () => {
      const [allSets, allCardio, allMarks] = await Promise.all([
        getAllSets(),
        getAllCardioSessions(),
        getAllAttendanceMarks(),
      ]);
      if (active) {
        setSets(allSets);
        setCardio(allCardio);
        setManualMarks(allMarks ?? []);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Días automáticos (fuerza/cardio) y días resaltados (auto O manual).
  const autoDays = useMemo(() => selectTrainedDays(sets, cardio), [sets, cardio]);
  const trainedDays = useMemo(
    () => selectTrainedDaysWithManual(sets, cardio, manualMarks),
    [sets, cardio, manualMarks],
  );

  const trainedThisMonth = useMemo(
    () => countTrainedInMonth(trainedDays, viewMonth.year, viewMonth.month),
    [trainedDays, viewMonth],
  );
  const streak = useMemo(
    () => selectCurrentStreak(trainedDays, now),
    [trainedDays, now],
  );

  // Alterna una marca manual (solo días no automáticos; el calendario ya lo
  // garantiza). Actualiza el estado local de forma optimista.
  const handleToggle = useCallback((dateKey: string) => {
    setManualMarks((prev) => {
      if (prev.includes(dateKey)) {
        void removeAttendanceMark(dateKey);
        return prev.filter((d) => d !== dateKey);
      }
      void addAttendanceMark(dateKey);
      return [...prev, dateKey];
    });
  }, []);

  return {
    now,
    sets,
    cardio,
    trainedDays,
    autoDays,
    trainedThisMonth,
    streak,
    handleToggle,
    setViewMonth,
  };
}
