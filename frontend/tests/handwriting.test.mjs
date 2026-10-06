import test from 'node:test';
import assert from 'node:assert/strict';
import { compareInk, skeletonize } from '../src/features/kana/handwritingScore.ts';

const size = 100;
const mask = (...lines) => {
  const m = new Uint8Array(size * size);
  for (const [x1,y1,x2,y2] of lines) {
    const steps = Math.max(Math.abs(x2-x1), Math.abs(y2-y1));
    for (let i=0;i<=steps;i++) m[Math.round(y1+(y2-y1)*i/(steps||1))*size+Math.round(x1+(x2-x1)*i/(steps||1))] = 1;
  }
  return m;
};
const reference = mask([20,25,80,25],[20,50,80,50],[20,75,80,75]);
test('matching complete paths pass', () => assert.equal(compareInk(reference, reference, size, 2).accepted, true));
test('small touch jitter passes', () => assert.equal(compareInk(reference, mask([20,26,80,26],[20,51,80,51],[20,76,80,76]), size, 2).accepted, true));
test('blank and single dot fail', () => {
  assert.equal(compareInk(reference, new Uint8Array(size*size), size).accepted, false);
  assert.equal(compareInk(reference, mask([50,50,50,50]), size).accepted, false);
});
test('missing a third of the character fails', () => assert.equal(compareInk(reference, mask([20,25,80,25],[20,50,80,50]), size, 2).accepted, false));
test('unrelated shape and filled square fail', () => {
  assert.equal(compareInk(reference, mask([10,10,90,90]), size).accepted, false);
  assert.equal(compareInk(reference, new Uint8Array(size*size).fill(1), size).accepted, false);
});
test('extra scribbles penalize precision despite full coverage', () => {
  const m = reference.slice();
  for (let i = 0; i < size*size; i+=10) m[i] = 1;
  const score = compareInk(reference, m, size, 2);
  assert.equal(score.coverage, 1); assert.equal(score.accepted, false);
});
test('threshold requires both coverage and precision, without rounding up', () => {
  const ref = mask([10,50,89,50]);
  assert.equal(compareInk(ref, mask([10,50,73,50]), size, 0).accepted, true);
  assert.equal(compareInk(ref, mask([10,50,72,50]), size, 0).accepted, false);
});
test('thinning preserves paths and removes stroke thickness', () => {
  const thick = mask(...Array.from({length:9}, (_,i)=>[20,46+i,80,46+i]));
  const thin = skeletonize(thick, size);
  assert.ok(thin.reduce((a,b)=>a+b,0) < thick.reduce((a,b)=>a+b,0)/3);
  assert.equal(compareInk(thin, mask([20,50,80,50]), size, 2).accepted, true);
});
