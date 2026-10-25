import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { Companion3DCanvas } from '../../src/features/companion/three/Companion3DCanvas';

vi.unmock('../../src/features/companion/three/Companion3DCanvas');
vi.mock('three', async original => ({
  ...await original<typeof import('three')>(),
  WebGLRenderer: class { constructor() { throw new Error('WebGL unavailable'); } },
}));

test('unavailable WebGL leaves a readable fallback and does not crash the learning page', () => {
  const view = render(<Companion3DCanvas petId="panda" stage="junior" />);
  expect(screen.getByRole('status').textContent).toContain('Thiết bị chưa hỗ trợ 3D');
  view.rerender(<Companion3DCanvas petId="panda" stage="junior" mood="happy" />);
  expect(screen.getByRole('status').textContent).toContain('tiếp tục học');
  view.unmount();
});
