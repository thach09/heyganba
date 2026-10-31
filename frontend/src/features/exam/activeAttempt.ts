import { maySaveRecovery, observeRecovery, recoveryGeneration, recoveryIsCurrent } from '../../lib/learningRecovery';
/** Untrusted recovery input; ExamView must revalidate the attempt with the server before use. */
export interface ActiveAttempt {
  examId: number;
  answers: Record<number, string>;
  activeIndex: number;
}
type StoredActiveAttempt = ActiveAttempt & { savedAt: number; revision?: string; parentRevision?: string | null; recoveryGeneration?: string | null };
// Per-tab observation, not an assertion about the age of the answers in a later save.
const observedLocal = new Map<number, string | null>();

// Checkpoints are a recovery convenience; the server remains authoritative for expiry/status.
export const ACTIVE_ATTEMPT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_ANSWER_LENGTH = 4096;

const key = (userId: number) => `heyganba_exam:${userId}`;

function isValidAttempt(value: unknown, now: number): value is StoredActiveAttempt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<StoredActiveAttempt>;
  if (!Number.isSafeInteger(candidate.examId) || candidate.examId! <= 0) return false;
  if (!Number.isSafeInteger(candidate.activeIndex) || candidate.activeIndex! < 0 || candidate.activeIndex! >= 300) return false;
  if (!Number.isSafeInteger(candidate.savedAt) || candidate.savedAt! > now + FUTURE_CLOCK_SKEW_MS || now - candidate.savedAt! > ACTIVE_ATTEMPT_MAX_AGE_MS) return false;
  if (!candidate.answers || typeof candidate.answers !== 'object' || Array.isArray(candidate.answers)) return false;
  const answers = candidate.answers as Record<string, unknown>;
  return Object.entries(answers).every(([index, answer]) =>
    /^(0|[1-9]\d*)$/.test(index) && Number(index) < 300 && typeof answer === 'string' && answer.length <= MAX_ANSWER_LENGTH
  );
}

function parseCheckpoint(raw: string | null, now: number, legacySession = false): StoredActiveAttempt | null {
  try {
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    // Only tab-scoped legacy data may lack a timestamp. Its age is unknown; server revalidation is mandatory.
    if (legacySession && parsed && typeof parsed === 'object' && !('savedAt' in parsed)) {
      const candidate = { ...parsed, savedAt: now };
      return isValidAttempt(candidate, now) ? { ...candidate, savedAt: 0 } : null;
    }
    return isValidAttempt(parsed, now) ? parsed : null;
  } catch {
    return null;
  }
}

function stored(kind: 'sessionStorage' | 'localStorage', storageKey: string) {
  try { return { available: true, raw: window[kind].getItem(storageKey) }; }
  catch { return { available: false, raw: null }; }
}

export function readActiveAttempt(userId?: number): ActiveAttempt | null {
  if (!Number.isSafeInteger(userId) || !userId || userId < 0) return null;
  observeRecovery(userId);
  const storageKey = key(userId);
  const now = Date.now();
  const session = stored('sessionStorage', storageKey);
  const local = stored('localStorage', storageKey);
  const wasRemoved = local.available && local.raw === null && observedLocal.get(userId) != null;
  if (wasRemoved) return null;
  if (local.available) observedLocal.set(userId, local.raw);
  const sessionAttempt = parseCheckpoint(session.raw, now, true);
  const localAttempt = parseCheckpoint(local.raw, now);
  // The shared copy wins conflicts independent of wall-clock timestamps. A session-only
  // write can be newer only when it was based on this exact shared revision (e.g. quota failure).
  const sessionBasedOnLocal = sessionAttempt?.revision && localAttempt?.revision &&
    sessionAttempt.parentRevision === localAttempt.revision;
  const selected = sessionBasedOnLocal ? sessionAttempt : localAttempt ?? sessionAttempt;
  if (!selected || !recoveryIsCurrent(userId, selected.recoveryGeneration)) return null;
  const { examId, answers, activeIndex } = selected;
  return { examId, answers, activeIndex };
}

export function saveActiveAttempt(userId: number, value: ActiveAttempt): boolean {
  if (!Number.isSafeInteger(userId) || userId <= 0 || !value || typeof value !== 'object') return false;
  if (!maySaveRecovery(userId)) return false;
  let serialized: string;
  const storageKey = key(userId);
  const local = stored('localStorage', storageKey);
  const session = stored('sessionStorage', storageKey);
  // An unread existing shared checkpoint cannot safely be overwritten. Both absent
  // means a new attempt/context, including storage cleared between sessions.
  if (local.available && !(local.raw === null && session.raw === null) &&
      (!observedLocal.has(userId) || observedLocal.get(userId) !== local.raw)) return false;
  try {
    const checkpoint = { examId: value.examId, answers: value.answers, activeIndex: value.activeIndex,
      savedAt: Date.now(), revision: crypto.randomUUID(), recoveryGeneration: recoveryGeneration(userId),
      parentRevision: parseCheckpoint(local.raw, Date.now())?.revision ?? null };
    if (!isValidAttempt(checkpoint, checkpoint.savedAt)) return false;
    serialized = JSON.stringify(checkpoint);
    if (typeof serialized !== 'string') return false;
  } catch {
    return false;
  }
  let saved = false;
  // Optimistic conflict detection, not CAS: another tab can still write after this check.
  const latestLocal = stored('localStorage', storageKey);
  if (local.available && latestLocal.available && latestLocal.raw !== local.raw) return false;
  if (local.available && latestLocal.available) {
    try {
      window.localStorage.setItem(storageKey, serialized);
      observedLocal.set(userId, serialized);
      saved = true;
    } catch { /* session copy may still be available */ }
  }
  try { window.sessionStorage.setItem(storageKey, serialized); saved = true; } catch { /* shared copy may still be available */ }
  return saved;
}

export function clearActiveAttempt(userId: number): void {
  if (!Number.isSafeInteger(userId) || userId <= 0) return;
  const storageKey = key(userId);
  observedLocal.delete(userId);
  try { window.sessionStorage.removeItem(storageKey); } catch { /* best effort */ }
  try { window.localStorage.removeItem(storageKey); } catch { /* best effort */ }
}
