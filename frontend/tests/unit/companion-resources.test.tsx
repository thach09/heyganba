import { render } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { Companion3DCanvas } from '../../src/features/companion/three/Companion3DCanvas';

const fixture = vi.hoisted(() => ({ models: [] as any[], renderers: [] as any[] }));
vi.unmock('../../src/features/companion/three/Companion3DCanvas');
vi.mock('three', async original => ({
  ...await original<typeof import('three')>(),
  WebGLRenderer: class {
    domElement = document.createElement('canvas'); shadowMap = {};
    setSize = vi.fn(); setPixelRatio = vi.fn(); render = vi.fn(); dispose = vi.fn();
    constructor() { fixture.renderers.push(this); }
  },
}));
vi.mock('../../src/features/companion/three/Pet3DModels', async () => {
  const three = await vi.importActual<typeof import('three')>('three');
  return {
    create3DFoodModel: () => new three.Group(),
    create3DPetModel: () => {
      const group = new three.Group();
      const geometry = new three.BoxGeometry(); const texture = new three.Texture();
      const material = new three.MeshStandardMaterial({ map: texture });
      group.add(new three.Mesh(geometry, material), new three.Mesh(geometry, material));
      const resources = { geometry: vi.spyOn(geometry, 'dispose'), material: vi.spyOn(material, 'dispose'), texture: vi.spyOn(texture, 'dispose') };
      fixture.models.push(resources); return group;
    },
  };
});

test('rebuilding and unmounting dispose shared GPU resources exactly once per scene', () => {
  fixture.models.length = 0; fixture.renderers.length = 0;
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 19));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const view = render(<Companion3DCanvas petId="panda" stage="junior" />);
  view.rerender(<Companion3DCanvas petId="panda" stage="junior" mood="happy" />);
  for (const dispose of Object.values(fixture.models[0])) expect(dispose).toHaveBeenCalledOnce();
  expect(fixture.renderers[0].dispose).toHaveBeenCalledOnce();
  view.unmount();
  for (const dispose of Object.values(fixture.models[1])) expect(dispose).toHaveBeenCalledOnce();
  expect(fixture.renderers[1].dispose).toHaveBeenCalledOnce();
});

test('reduced motion renders once without scheduling idle animation frames', () => {
  fixture.renderers.length = 0;
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const schedule = vi.fn(() => 20); vi.stubGlobal('requestAnimationFrame', schedule);
  const view = render(<Companion3DCanvas petId="panda" stage="junior" />);
  expect(fixture.renderers[0].render).toHaveBeenCalledOnce();
  expect(schedule).not.toHaveBeenCalled();
  view.unmount();
});
