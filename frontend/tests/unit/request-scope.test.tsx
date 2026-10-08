import { expect, test, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRequestScope } from '../../src/lib/hooks/useRequestScope';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}
test('superseded results are ignored even when a server ignores cancellation', async () => {
  const { result } = renderHook(() => useRequestScope(1));
  const old = deferred<number>();
  let oldSignal!: AbortSignal;
  const first = result.current.run('search', signal => { oldSignal = signal; return old.promise; });
  expect(await result.current.run('search', async () => 2)).toBe(2);
  expect(oldSignal.aborted).toBe(true);
  old.resolve(1);
  expect(await first).toBeNull();
});
test('independent channels remain active and unmount prevents further work', async () => {
  const { result, unmount } = renderHook(() => useRequestScope(1));
  const gate = deferred<number>();
  let signal!: AbortSignal;
  const pending = result.current.run('deck', s => { signal = s; return gate.promise; });
  expect(await result.current.run('stats', async () => 3)).toBe(3);
  expect(signal.aborted).toBe(false);
  unmount();
  expect(signal.aborted).toBe(true);
  gate.resolve(1);
  expect(await pending).toBeNull();
  const task = vi.fn();
  expect(await result.current.run('deck', task)).toBeNull();
  expect(task).not.toHaveBeenCalled();
});
test('changing accounts cancels requests belonging to the previous learner', async () => {
  const { result, rerender } = renderHook(({ id }) => useRequestScope(id), { initialProps: { id: 1 } });
  const gate = deferred<number>();
  let signal!: AbortSignal;
  const pending = result.current.run('progress', s => { signal = s; return gate.promise; });
  rerender({ id: 2 });
  expect(signal.aborted).toBe(true);
  gate.resolve(1);
  expect(await pending).toBeNull();
});
