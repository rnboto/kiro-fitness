// Lista de la compra (Nutrición): productos agrupados por oficina / casa que se
// marcan con un toque como «comprados». Las marcas se guardan en Settings
// (shoppingChecked) al instante; «Desmarcar todo» las limpia de golpe para la
// compra del mes siguiente. Las cantidades de oficina son orientativas y se
// calculan aquí, en el dispositivo, con el perfil y los platos elegidos.

import { memo, useCallback, useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import { useSettings } from '../../context/SettingsContext';
import type { DailyPlan } from '../../domain/nutrition';
import type { SelectedPlates } from '../../domain/plateSelection';
import {
  SHOPPING_BLOCK_TITLES,
  SHOPPING_ITEMS,
  checkedCountIn,
  formatResetDate,
  officeQuantities,
  readShoppingChecked,
  readShoppingLastReset,
  shoppingSections,
  todayKey,
  withShoppingReset,
  withShoppingToggled,
  type ShoppingItem,
} from '../../domain/shoppingList';
import styles from './ShoppingList.module.css';

interface ShoppingListProps {
  plan: DailyPlan | null;
  selectedPlates: SelectedPlates;
}

const SECTIONS = shoppingSections();
const TOTAL = SHOPPING_ITEMS.length;

const idOf = (key: string) => `sl-${key.replace(/[^a-zA-Z0-9_]/g, '-')}`;

interface RowProps {
  item: ShoppingItem;
  checked: boolean;
  qty: string | null;
  onToggle: (key: string) => void;
}

const ShoppingRow = memo(function ShoppingRow({ item, checked, qty, onToggle }: RowProps) {
  const base = idOf(item.key);
  return (
    <li>
      <label className={`${styles.row} ${checked ? styles.rowChecked : ''}`}>
        <input
          type="checkbox"
          className={`visually-hidden ${styles.input}`}
          checked={checked}
          onChange={() => onToggle(item.key)}
          aria-labelledby={`${base}-n`}
          aria-describedby={qty ? `${base}-t ${base}-q` : `${base}-t`}
        />
        <span className={styles.box} aria-hidden="true">
          <svg viewBox="0 0 16 16" className={styles.check} focusable="false">
            <path d="M3.5 8.5l3 3 6-7" />
          </svg>
        </span>
        <span className={styles.text}>
          <span id={`${base}-n`} className={styles.name}>
            {item.name}
          </span>
          <span id={`${base}-t`} className={styles.tip}>
            {item.tip}
          </span>
          {qty && (
            <span id={`${base}-q`} className={styles.qty}>
              {qty}
            </span>
          )}
        </span>
      </label>
    </li>
  );
});

export default function ShoppingList({ plan, selectedPlates }: ShoppingListProps) {
  const { settings, patchSettings } = useSettings();
  const [hideChecked, setHideChecked] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const checkedMap = settings?.shoppingChecked;
  const checked = useMemo(() => readShoppingChecked({ shoppingChecked: checkedMap }), [checkedMap]);
  const lastReset = readShoppingLastReset(settings);
  const quantities = useMemo(() => officeQuantities(plan, selectedPlates), [plan, selectedPlates]);

  const checkedCount = checkedCountIn(SHOPPING_ITEMS, checked);
  const pct = TOTAL > 0 ? Math.round((checkedCount / TOTAL) * 100) : 0;

  const onToggle = useCallback(
    (key: string) => {
      void patchSettings((s) => ({
        ...s,
        shoppingChecked: withShoppingToggled(readShoppingChecked(s), key),
      }));
    },
    [patchSettings],
  );

  const confirmReset = () => {
    void patchSettings((s) => withShoppingReset(s, todayKey()));
    setConfirmOpen(false);
  };

  let lastBlock: string | null = null;

  return (
    <section className={`${styles.list} kiro-print-area`} aria-label="Lista de la compra">
      <h2 className={styles.printTitle}>Kiro · Lista de la compra</h2>

      <div className={styles.toolbar}>
        <p className={styles.counter} aria-live="polite">
          {`${checkedCount} de ${TOTAL} comprados`}
        </p>
        <div
          className={styles.progress}
          role="progressbar"
          aria-label="Productos comprados"
          aria-valuemin={0}
          aria-valuemax={TOTAL}
          aria-valuenow={checkedCount}
        >
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>

        <button
          type="button"
          className={styles.resetBtn}
          disabled={checkedCount === 0}
          onClick={() => setConfirmOpen(true)}
          data-print-hide
        >
          Desmarcar todo
        </button>
        {lastReset && (
          <p className={styles.lastReset} data-print-hide>
            {`Última vez desmarcado: ${formatResetDate(lastReset)}`}
          </p>
        )}

        <div className={styles.toolbarRow} data-print-hide>
          <label className={styles.switchLabel}>
            <input
              type="checkbox"
              role="switch"
              className={styles.switchInput}
              checked={hideChecked}
              onChange={(e) => setHideChecked(e.target.checked)}
            />
            <span>Ocultar comprados</span>
          </label>
          <button type="button" className={styles.printBtn} onClick={() => window.print()}>
            Imprimir / guardar PDF
          </button>
        </div>
      </div>

      {SECTIONS.map((section) => {
        const newBlock = section.block !== lastBlock;
        lastBlock = section.block;
        const done = checkedCountIn(section.items, checked);
        const visible = hideChecked
          ? section.items.filter((i) => checked[i.key] !== true)
          : section.items;
        const headingId = `sl-sec-${section.id}`;
        return (
          <div key={section.id} className={styles.sectionWrap}>
            {newBlock && (
              <div className={styles.blockHead}>
                <h2 className={styles.blockTitle}>{SHOPPING_BLOCK_TITLES[section.block]}</h2>
                <p className={styles.blockSub}>
                  {section.block === 'oficina'
                    ? 'Para el desayuno (Post-entreno) y el pre-entreno ligero que tomas en el trabajo.'
                    : 'Agrupado por pasillo del súper. Lo de la oficina no se repite aquí.'}
                </p>
              </div>
            )}
            <section className={styles.section} aria-labelledby={headingId}>
              <header className={styles.sectionHead}>
                <h3 id={headingId} className={styles.sectionTitle}>
                  {section.title}
                </h3>
                <span className={styles.sectionCount}>{`${done}/${section.items.length}`}</span>
              </header>
              {section.block === 'oficina' && (
                <p className={styles.sectionNote}>Orientativo · 5 días laborables</p>
              )}
              {visible.length === 0 ? (
                <p className={styles.allDone}>Todo comprado</p>
              ) : (
                <ul className={styles.items}>
                  {visible.map((item) => {
                    const q = quantities[item.key];
                    return (
                      <ShoppingRow
                        key={item.key}
                        item={item}
                        checked={checked[item.key] === true}
                        qty={q ? q.text : null}
                        onToggle={onToggle}
                      />
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        );
      })}

      <p className={styles.footnote}>
        Cantidades orientativas; se recalculan con tu perfil. Si cambias de plato en Nutrición, las
        cantidades de oficina se ajustan.
      </p>

      <Modal open={confirmOpen} title="Desmarcar todo" onClose={() => setConfirmOpen(false)}>
        <div className={styles.confirmBody}>
          <p>
            {checkedCount === 1
              ? '¿Desmarcar el producto comprado? Úsalo al empezar la compra del mes siguiente.'
              : `¿Desmarcar los ${checkedCount} productos comprados? Úsalo al empezar la compra del mes siguiente.`}
          </p>
          <div className={styles.confirmActions}>
            <button type="button" className={styles.dangerBtn} onClick={confirmReset}>
              Sí, desmarcar todo
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={() => setConfirmOpen(false)}>
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
