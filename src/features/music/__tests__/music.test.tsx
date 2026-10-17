// Tests (Testing Library + jsdom) del acceso rápido a Amazon Music: el botón de
// Perfil y el FAB global renderizan de forma accesible y, al pulsarlos, lanzan
// https://music.amazon.com en una nueva pestaña con noopener.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MusicButton from '../MusicButton';
import MusicFab from '../MusicFab';
import { AMAZON_MUSIC_URL } from '../amazonMusic';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Acceso rápido a Amazon Music', () => {
  it('AMAZON_MUSIC_URL apunta a https://music.amazon.com', () => {
    expect(AMAZON_MUSIC_URL).toBe('https://music.amazon.com');
  });

  it('MusicButton (Perfil) renderiza accesible y lanza Amazon Music con noopener en _blank', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const user = userEvent.setup();
    render(<MusicButton />);

    const btn = screen.getByRole('button', { name: /Abrir Amazon Música/i });
    expect(btn).toBeInTheDocument();

    await user.click(btn);
    expect(open).toHaveBeenCalledTimes(1);
    const [url, target, features] = open.mock.calls[0];
    expect(url).toBe('https://music.amazon.com');
    expect(target).toBe('_blank');
    expect(features).toContain('noopener');
  });

  it('MusicFab (global) renderiza accesible y lanza Amazon Music con noopener en _blank', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const user = userEvent.setup();
    render(<MusicFab />);

    const fab = screen.getByRole('button', { name: /Abrir Amazon Música/i });
    expect(fab).toBeInTheDocument();

    await user.click(fab);
    expect(open).toHaveBeenCalledTimes(1);
    const [url, target, features] = open.mock.calls[0];
    expect(url).toBe('https://music.amazon.com');
    expect(target).toBe('_blank');
    expect(features).toContain('noopener');
  });
});
