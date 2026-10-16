import '@testing-library/jest-dom/vitest';

// jsdom no implementa ResizeObserver, del que depende recharts' ResponsiveContainer.
// Polyfill mínimo para que los componentes con gráficas rendericen en test.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}
