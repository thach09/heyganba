import { render } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import * as THREE from 'three';
import { Companion3DCanvas } from '../../src/features/companion/three/Companion3DCanvas';
import { create3DFoodModel, create3DPetModel } from '../../src/features/companion/three/Pet3DModels';

const fixture = vi.hoisted(() => ({ scenes: [] as any[] }));
vi.unmock('../../src/features/companion/three/Companion3DCanvas');
vi.mock('three', async original => ({
  ...await original<typeof import('three')>(),
  WebGLRenderer: class {
    domElement = document.createElement('canvas'); shadowMap = {};
    setSize() {} setPixelRatio() {} dispose() {}
    render(scene: unknown) { fixture.scenes.push(scene); }
  },
}));
function materials(root: THREE.Object3D) {
  const values = new Set<THREE.Material>();
  root.traverse(object => {
    if (object instanceof THREE.Mesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) values.add(material);
  });
  return values;
}

test('disposing one visible companion does not invalidate the other canvas palette', () => {
  fixture.scenes.length = 0;
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const first = render(<Companion3DCanvas petId="panda" stage="junior" />);
  const firstMaterials = materials(fixture.scenes[0]);
  const firstDisposals = [...firstMaterials].map(material => vi.spyOn(material, 'dispose'));
  const second = render(<Companion3DCanvas petId="panda" stage="junior" />);
  const secondMaterials = materials(fixture.scenes[1]);
  const secondDisposals = [...secondMaterials].map(material => vi.spyOn(material, 'dispose'));
  expect([...firstMaterials].some(material => secondMaterials.has(material))).toBe(false);
  first.unmount();
  firstDisposals.forEach(dispose => expect(dispose).toHaveBeenCalledOnce());
  secondDisposals.forEach(dispose => expect(dispose).not.toHaveBeenCalled());
  second.unmount();
  secondDisposals.forEach(dispose => expect(dispose).toHaveBeenCalledOnce());
});

test('pet and food factories reuse materials within a model but never across owned models', () => {
  for (const factory of [() => create3DPetModel('panda', 'adult'), () => create3DFoodModel('bamboo')]) {
    const first = factory(); const second = factory();
    const firstMaterials = materials(first); const secondMaterials = materials(second);
    expect(firstMaterials.size).toBeGreaterThan(0);
    expect([...firstMaterials].some(material => secondMaterials.has(material))).toBe(false);
    let meshes = 0; first.traverse(object => { if (object instanceof THREE.Mesh) meshes++; });
    expect(firstMaterials.size).toBeLessThan(meshes);
  }
});
