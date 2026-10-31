import { fireEvent, render, screen } from '@testing-library/react';
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

test('unavailable WebGL uses a compact fallback without a bubble or a false drag affordance', () => {
  const cheer = vi.fn();
  render(<Companion3DCanvas petId="panda" stage="junior" size={320} onPetClick={cheer} />);
  const button = screen.getByRole('button', { name: 'Bấm để cổ vũ linh vật' });
  expect(button.style.width).toBe('96px');
  expect(button.style.height).toBe('96px');
  expect(screen.getByRole('status').className).toContain('sr-only');
  expect((screen.getByTitle('Bấm hoặc kéo để tương tác với Linh Thú 3D') as HTMLElement).hidden).toBe(true);
  expect(screen.queryByText('Ôn cũ biết mới.')).toBeNull();
  fireEvent.click(button);
  expect(cheer).toHaveBeenCalledOnce();
});
