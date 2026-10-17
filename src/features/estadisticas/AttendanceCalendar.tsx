// Calendario mensual de asistencia (hecho a mano, sin librería): rejilla CSS de
// 7 columnas con cabeceras Lun–Dom (semana empieza el lunes). Resalta los días
// entrenados con el acento, marca "hoy" con un anillo sutil y atenúa el relleno
// fuera de mes. Tocar un día NO automático alterna una marca manual.

import { useEffect, useMemo, useState } from 'react';
import styles from './AttendanceCalendar.module.css';

/** Nombres de mes en español (índice 0 = enero). */
const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/** Cabeceras de día de la semana (lunes primero). */
const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Clave de día local 'YYYY-MM-DD' para un año/mes(0)/día dados. */
function dayKey(year: number, monthIndex0: number, day: number): string {
  return `${year.toString().padStart(4, '0')}-${(monthIndex0 + 1)
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

/** Mes visible del calendario (año + índice de mes base 0). */
export interface ViewMonth {
  year: number;
  month: number;
}

interface AttendanceCalendarProps {
  /** Días resaltados (auto O manual), claves locales 'YYYY-MM-DD'. */
  trainedDays: Set<string>;
  /** Días entrenados automáticamente (no alternables), claves 'YYYY-MM-DD'. */
  autoDays: Set<string>;
  /** Alterna la marca manual de un día (solo se llama para días no automáticos). */
  onToggle: (dateKey: string) => void;
  /** Fecha actual, inyectable para tests. */
  now?: Date;
  /** Notifica al padre el mes visible (para el resumen "este mes"). */
  onViewMonthChange?: (view: ViewMonth) => void;
}

export default function AttendanceCalendar({
  trainedDays,
  autoDays,
  onToggle,
  now = new Date(),
  onViewMonthChange,
}: AttendanceCalendarProps) {
  // Mes visible: por defecto el mes actual.
  const [viewMonth, setViewMonth] = useState<ViewMonth>(() => ({
    year: now.getFullYear(),
    month: now.getMonth(),
  }));

  // Informa al padre del mes visible cada vez que cambia (resumen "este mes").
  useEffect(() => {
    onViewMonthChange?.(viewMonth);
  }, [viewMonth, onViewMonthChange]);

  const todayKey = dayKey(now.getFullYear(), now.getMonth(), now.getDate());

  const cells = useMemo(() => {
    const { year, month } = viewMonth;
    const firstDay = new Date(year, month, 1);
    // getDay(): 0=domingo … 6=sábado. Convertimos a lunes-primero (0=lunes).
    const leadingBlanks = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const result: Array<{ day: number | null; key: string | null }> = [];
    for (let i = 0; i < leadingBlanks; i += 1) {
      result.push({ day: null, key: null });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      result.push({ day: d, key: dayKey(year, month, d) });
    }
    return result;
  }, [viewMonth]);

  const goPrev = () =>
    setViewMonth((v) =>
      v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 },
    );
  const goNext = () =>
    setViewMonth((v) =>
      v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 },
    );

  const monthLabel = `${MONTH_NAMES[viewMonth.month]} ${viewMonth.year}`;

  return (
    <div className={styles.calendar} data-view={`${viewMonth.year}-${viewMonth.month + 1}`}>
      <div className={styles.nav}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={goPrev}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <span className={styles.monthLabel} aria-live="polite">
          {monthLabel}
        </span>
        <button
          type="button"
          className={styles.navBtn}
          onClick={goNext}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className={styles.grid} role="grid" aria-label={`Calendario de ${monthLabel}`}>
        {WEEKDAY_HEADERS.map((h) => (
          <div key={h} className={styles.weekday} role="columnheader">
            {h}
          </div>
        ))}

        {cells.map((cell, idx) => {
          if (cell.day === null || cell.key === null) {
            return <div key={`blank-${idx}`} className={styles.blank} aria-hidden="true" />;
          }
          const isTrained = trainedDays.has(cell.key);
          const isAuto = autoDays.has(cell.key);
          const isToday = cell.key === todayKey;
          const classes = [styles.cell];
          if (isTrained) classes.push(styles.trained);
          if (isToday) classes.push(styles.today);
          // Los días automáticos no son alternables (no ocultar una sesión real).
          const togglable = !isAuto;
          const key = cell.key;
          return (
            <button
              key={key}
              type="button"
              className={classes.join(' ')}
              onClick={togglable ? () => onToggle(key) : undefined}
              disabled={!togglable}
              aria-pressed={isTrained}
              aria-label={`Día ${cell.day}${isTrained ? ', entrenado' : ''}${
                isToday ? ', hoy' : ''
              }`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
