import { afterEach, expect, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(query => ({
  matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
})) });
HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// jsdom does not supply canvas/WebGL. Keep learning tests independent of rendering effects.
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('../../src/features/companion/three/Companion3DCanvas', () => ({ Companion3DCanvas: () => null }));
expect.extend({
  toBeInTheDocument(value: unknown) {
    const pass = value instanceof Node && document.documentElement.contains(value);
    return { pass, message: () => `Expected element ${pass ? 'not ' : ''}to be in the document` };
  },
});
