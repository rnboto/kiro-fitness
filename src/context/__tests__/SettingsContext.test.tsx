import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../SettingsContext';
import { __resetBackendForTests } from '../../storage/db';
import { getSettings } from '../../storage';
import { readShoppingChecked, withShoppingToggled } from '../../domain/shoppingList';

beforeEach(() => {
  localStorage.clear();
  __resetBackendForTests();
});

afterEach(() => cleanup());

let api: ReturnType<typeof useSettings>;

function Probe() {
  api = useSettings();
  const keys = Object.keys(readShoppingChecked(api.settings)).sort().join(',');
  return <p data-testid="checked">{api.loading ? 'cargando' : keys || 'ninguno'}</p>;
}

describe('SettingsContext.patchSettings', () => {
  it('dos cambios en el mismo tick se aplican ambos (sin pisarse) y se persisten', async () => {
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('checked')).toHaveTextContent('ninguno'));

    let done: Promise<void>[] = [];
    act(() => {
      const toggle = (key: string) =>
        api.patchSettings((s) => ({
          ...s,
          shoppingChecked: withShoppingToggled(readShoppingChecked(s), key),
        }));
      done = [toggle('platano'), toggle('muesli')];
    });
    await act(async () => {
      await Promise.all(done);
    });

    expect(screen.getByTestId('checked')).toHaveTextContent('muesli,platano');
    expect(readShoppingChecked(await getSettings())).toEqual({ muesli: true, platano: true });
  });

  it('updateSettings sigue funcionando y refresca la base de los siguientes cambios', async () => {
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('checked')).toHaveTextContent('ninguno'));

    await act(async () => {
      await api.updateSettings({ ...api.settings!, shoppingChecked: { skyr: true } });
    });
    await act(async () => {
      await api.patchSettings((s) => ({
        ...s,
        shoppingChecked: withShoppingToggled(readShoppingChecked(s), 'tofu'),
      }));
    });

    expect(readShoppingChecked(await getSettings())).toEqual({ skyr: true, tofu: true });
  });
});
