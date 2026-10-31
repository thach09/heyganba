import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  ACTIVE_ATTEMPT_MAX_AGE_MS,
  clearActiveAttempt,
  readActiveAttempt,
  saveActiveAttempt,
} from '../../src/features/exam/activeAttempt';

const key = (userId: number) => `heyganba_exam:${userId}`;
const attempt = (examId = 42) => ({ examId, answers: { 0: 'A', 2: 'C' }, activeIndex: 2 });

function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: vi.fn((name: string) => values.get(name) ?? null),
    setItem: vi.fn((name: string, value: string) => { values.set(name, value); }),
    removeItem: vi.fn((name: string) => { values.delete(name); }),
  };
}

let session: ReturnType<typeof storage>;
let local: ReturnType<typeof storage>;
let now: number;

beforeEach(() => {
  session = storage();
  local = storage();
  now = 1_800_000_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  vi.stubGlobal('sessionStorage', session);
  vi.stubGlobal('localStorage', local);
});

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

test('save writes only recovery fields and conflict metadata to both stores', () => {
  expect(saveActiveAttempt(7, attempt())).toBe(true);
  expect(readActiveAttempt(7)).toEqual(attempt());
  expect(Object.keys(JSON.parse(local.values.get(key(7))!)).sort()).toEqual(['activeIndex', 'answers', 'examId', 'parentRevision', 'recoveryGeneration', 'revision', 'savedAt']);
});

test('reopening a tab restores its fresh localStorage checkpoint without sessionStorage', () => {
  local.values.set(key(7), JSON.stringify({ ...attempt(), savedAt: now }));
  expect(readActiveAttempt(7)).toEqual(attempt());
});

test('the newer cross-tab checkpoint wins over a stale session checkpoint', () => {
  session.values.set(key(7), JSON.stringify({ ...attempt(1), savedAt: now - 1_000 }));
  local.values.set(key(7), JSON.stringify({ ...attempt(2), savedAt: now }));
  expect(readActiveAttempt(7)?.examId).toBe(2);
});

test('equal timestamps prefer shared localStorage over stale tab-local state', () => {
  session.values.set(key(7), JSON.stringify({ ...attempt(1), savedAt: now }));
  local.values.set(key(7), JSON.stringify({ ...attempt(2), savedAt: now }));
  expect(readActiveAttempt(7)?.examId).toBe(2);
});

test('corrupt session JSON and undated persistent legacy data are ignored', () => {
  session.values.set(key(7), '{not json');
  local.values.set(key(7), JSON.stringify(attempt()));
  expect(readActiveAttempt(7)).toBeNull();
});

test.each([ACTIVE_ATTEMPT_MAX_AGE_MS + 1, -301_000])('expired and implausibly future checkpoints are ignored (%i ms)', (offset) => {
  local.values.set(key(7), JSON.stringify({ ...attempt(), savedAt: now - offset }));
  expect(readActiveAttempt(7)).toBeNull();
});

test.each([
  { ...attempt(), examId: 0 },
  { ...attempt(), examId: 1.5 },
  { ...attempt(), activeIndex: -1 },
  { ...attempt(), activeIndex: 300 },
  { ...attempt(), answers: ['A'] },
  { ...attempt(), answers: { nope: 'A' } },
  { ...attempt(), answers: { 0: 7 } },
])('invalid checkpoint data is rejected', (invalid) => {
  local.values.set(key(7), JSON.stringify({ ...invalid, savedAt: now }));
  expect(readActiveAttempt(7)).toBeNull();
});

test('each account reads only its own checkpoint', () => {
  local.values.set(key(7), JSON.stringify({ ...attempt(), savedAt: now }));
  expect(readActiveAttempt(8)).toBeNull();
  expect(readActiveAttempt(0)).toBeNull();
});

test('read and write remain safe when storage methods throw', () => {
  session.getItem.mockImplementation(() => { throw new Error('blocked'); });
  local.getItem.mockImplementation(() => { throw new Error('blocked'); });
  session.setItem.mockImplementation(() => { throw new Error('blocked'); });
  local.setItem.mockImplementation(() => { throw new Error('blocked'); });
  expect(readActiveAttempt(7)).toBeNull();
  expect(saveActiveAttempt(7, attempt())).toBe(false);
});

test('save to localStorage still succeeds when sessionStorage is unavailable', () => {
  session.setItem.mockImplementation(() => { throw new Error('blocked'); });
  expect(saveActiveAttempt(7, attempt())).toBe(true);
  expect(readActiveAttempt(7)?.examId).toBe(42);
});

test('serialization failures are caught', () => {
  vi.spyOn(JSON, 'stringify').mockImplementationOnce(() => { throw new TypeError('serialization failed'); });
  expect(saveActiveAttempt(7, attempt())).toBe(false);
  expect(local.setItem).not.toHaveBeenCalled();
  expect(session.setItem).not.toHaveBeenCalled();
});

test('explicit clear removes both storage copies', () => {
  saveActiveAttempt(7, attempt());
  clearActiveAttempt(7);
  expect(session.values.has(key(7))).toBe(false);
  expect(local.values.has(key(7))).toBe(false);
});

test('failed cleanup in one storage does not prevent removing the other copy', () => {
  saveActiveAttempt(7, attempt());
  session.removeItem.mockImplementation(() => { throw new Error('blocked'); });
  expect(() => clearActiveAttempt(7)).not.toThrow();
  expect(local.values.has(key(7))).toBe(false);
});

test('legacy tab checkpoint survives a frontend update without inventing a savedAt', () => {
  session.values.set(key(7), JSON.stringify(attempt()));
  expect(readActiveAttempt(7)).toEqual(attempt());
  expect(JSON.parse(session.values.get(key(7))!)).not.toHaveProperty('savedAt');
});

test('a legacy session never takes precedence over a valid shared checkpoint', () => {
  session.values.set(key(7), JSON.stringify(attempt(1)));
  local.values.set(key(7), JSON.stringify({ ...attempt(2), savedAt: now }));
  expect(readActiveAttempt(7)?.examId).toBe(2);
});

test('a session clock ahead of another tab does not make its answers authoritative', () => {
  session.values.set(key(7), JSON.stringify({ ...attempt(1), savedAt: now + 1000 }));
  local.values.set(key(7), JSON.stringify({ ...attempt(2), savedAt: now }));
  expect(readActiveAttempt(7)?.examId).toBe(2);
});

test('a sequential stale-tab save is rejected after another tab updates the shared revision', async () => {
  const tabA = await import('../../src/features/exam/activeAttempt');
  expect(tabA.saveActiveAttempt(7, attempt())).toBe(true);
  const sessionA = session;
  const sessionB = storage();
  vi.stubGlobal('sessionStorage', sessionB);
  vi.resetModules();
  const tabB = await import('../../src/features/exam/activeAttempt');
  expect(tabB.readActiveAttempt(7)).toEqual(attempt());
  // Same millisecond: revision identity, rather than timestamps, detects the change.
  const newer = { ...attempt(), answers: { 0: 'B' } };
  expect(tabB.saveActiveAttempt(7, newer)).toBe(true);
  const shared = local.values.get(key(7));
  const oldSession = sessionA.values.get(key(7));
  vi.stubGlobal('sessionStorage', sessionA);
  now += 1000;
  expect(tabA.saveActiveAttempt(7, attempt())).toBe(false);
  expect(local.values.get(key(7))).toBe(shared);
  expect(sessionA.values.get(key(7))).toBe(oldSession);
  expect(tabA.readActiveAttempt(7)).toEqual(newer);
});

test('local write failure preserves the session child of the unchanged shared revision', () => {
  saveActiveAttempt(7, attempt());
  local.setItem.mockImplementation(() => { throw new Error('quota'); });
  const newer = { ...attempt(), answers: { 0: 'B' } };
  expect(saveActiveAttempt(7, newer)).toBe(true);
  expect(readActiveAttempt(7)).toEqual(newer);
});

test('a fresh tab must read an existing shared checkpoint before overwriting it', async () => {
  local.values.set(key(7), JSON.stringify({ ...attempt(), savedAt: now }));
  vi.resetModules();
  const freshTab = await import('../../src/features/exam/activeAttempt');
  expect(freshTab.saveActiveAttempt(7, attempt(99))).toBe(false);
  expect(local.setItem).not.toHaveBeenCalled();
});

test('extra root properties and the root toJSON hook are excluded from the checkpoint', () => {
  const extra = { ...attempt(), secret: 'do-not-persist', toJSON: () => ({ secret: 'do-not-persist' }) };
  expect(saveActiveAttempt(7, extra)).toBe(true);
  expect(local.values.get(key(7))).not.toContain('do-not-persist');
});

test('an unreadable shared copy is never blindly overwritten while session recovery remains available', () => {
  local.getItem.mockImplementation(() => { throw new Error('read denied'); });
  expect(saveActiveAttempt(7, attempt())).toBe(true);
  expect(local.setItem).not.toHaveBeenCalled();
  expect(readActiveAttempt(7)).toEqual(attempt());
});

test('storage getters may throw without crashing save, read or clear', () => {
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage')!;
  Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('denied'); } });
  try {
    expect(saveActiveAttempt(7, attempt())).toBe(true);
    expect(readActiveAttempt(7)).toEqual(attempt());
    expect(() => clearActiveAttempt(7)).not.toThrow();
  } finally { Object.defineProperty(window, 'localStorage', original); }
});

test('a change detected between serialization and write rejects the save', () => {
  saveActiveAttempt(7, attempt());
  const other = JSON.stringify({ ...attempt(99), savedAt: now });
  const stringify = JSON.stringify;
  vi.spyOn(JSON, 'stringify').mockImplementationOnce((value) => {
    local.values.set(key(7), other);
    return stringify(value);
  });
  expect(saveActiveAttempt(7, attempt())).toBe(false);
  expect(local.values.get(key(7))).toBe(other);
});

test('a live tab observes another tab clearing the shared checkpoint and does not resurrect it on repeated reads', () => {
  saveActiveAttempt(7, attempt());
  local.values.delete(key(7));
  expect(readActiveAttempt(7)).toBeNull();
  expect(readActiveAttempt(7)).toBeNull();
  expect(saveActiveAttempt(7, attempt())).toBe(false);
});

test('a legacy session can be read and upgraded to a versioned checkpoint without losing answers', async () => {
  session.values.set(key(7), JSON.stringify(attempt()));
  vi.resetModules();
  const updatedFrontend = await import('../../src/features/exam/activeAttempt');
  const recovered = updatedFrontend.readActiveAttempt(7);
  expect(recovered).toEqual(attempt());
  // ExamView performs server revalidation before calling save with the accepted answers.
  expect(updatedFrontend.saveActiveAttempt(7, recovered!)).toBe(true);
  const persisted = JSON.parse(local.values.get(key(7))!);
  expect(persisted).toMatchObject({ ...attempt(), savedAt: now });
  expect(persisted.revision).toEqual(expect.any(String));
  expect(session.values.get(key(7))).toBe(local.values.get(key(7)));
});

test('shared data may still be overwritten by simultaneous writers between the final check and setItem', () => {
  expect(saveActiveAttempt(7, attempt())).toBe(true);
  const newerAnswers = { ...attempt(), answers: { 0: 'B' }, savedAt: now,
    revision: 'concurrent-writer', parentRevision: null };
  let anotherTabWrote = false;
  local.setItem.mockImplementationOnce((name, serialized) => {
    // Interleave Tab B after Tab A has completed its last read/check, but before A's write.
    local.values.set(name, JSON.stringify(newerAnswers));
    anotherTabWrote = true;
    local.values.set(name, serialized);
  });
  expect(saveActiveAttempt(7, attempt())).toBe(true);
  expect(anotherTabWrote).toBe(true);
  expect(JSON.parse(local.values.get(key(7))!).answers).toEqual(attempt().answers);
  // This documents the remaining non-atomic limitation, rather than claiming CAS safety.
});
