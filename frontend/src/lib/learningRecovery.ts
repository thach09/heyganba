// A revocation marker invalidates old tab copies; it is not a lock or exam authority.
const observed = new Map<number, string | null | undefined>();
const marker = (userId: number) => `heyganba_recovery_revocation:${userId}`;
export function recoveryGeneration(userId: number): string | null | undefined {
  try { return localStorage.getItem(marker(userId)); } catch { return undefined; }
}
export function observeRecovery(userId: number) {
  const generation = recoveryGeneration(userId);
  observed.set(userId, generation);
  return generation;
}
export function recoveryIsCurrent(userId: number, saved: unknown): boolean {
  const generation = recoveryGeneration(userId);
  return generation === undefined || (saved ?? null) === generation;
}
export function maySaveRecovery(userId: number): boolean {
  const generation = recoveryGeneration(userId);
  // Temporary shared-storage denial must preserve the established session fallback.
  if (generation === undefined) return true;
  if (observed.has(userId) && observed.get(userId) !== generation
      && !(observed.get(userId) === undefined && generation === null)) return false;
  observed.set(userId, generation);
  return true;
}
/** Remove only this account's expired generation, preserving unrelated storage. */
export function purgeRevokedRecovery(userId: number): void {
  if (!Number.isSafeInteger(userId) || userId <= 0) return;
  for (const kind of ['localStorage', 'sessionStorage'] as const) {
    try {
      const storage = window[kind];
      const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
      for (const key of keys) {
        if (key !== `heyganba_exam:${userId}` && !key?.startsWith(`heyganba:lesson-practice:${userId}:`)) continue;
        let current = false;
        try { current = recoveryIsCurrent(userId, JSON.parse(storage.getItem(key) ?? 'null')?.recoveryGeneration); }
        catch { /* Corrupt private caches can be discarded. */ }
        if (!current) storage.removeItem(key!);
      }
    } catch { /* Storage can be disabled; privacy cleanup must not crash logout. */ }
  }
}
/** Call only after an explicit successful logout/account change, not a transient 401. */
export function revokeLearningRecovery(userId: number): void {
  if (!Number.isSafeInteger(userId) || userId <= 0) return;
  try { localStorage.setItem(marker(userId), crypto.randomUUID()); }
  catch {
    // Without shared storage no durable cross-tab revocation can be guaranteed.
    for (const kind of ['localStorage', 'sessionStorage'] as const) {
      try {
        const storage = window[kind];
        const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
        for (const key of keys) if (key === `heyganba_exam:${userId}` || key?.startsWith(`heyganba:lesson-practice:${userId}:`)) storage.removeItem(key!);
      } catch { /* Best effort when the browser refuses storage access. */ }
    }
    return;
  }
  purgeRevokedRecovery(userId);
}
export function handleRecoveryRevocation(event: StorageEvent): void {
  const match = event.key?.match(/^heyganba_recovery_revocation:([1-9]\d*)$/);
  if (match) purgeRevokedRecovery(Number(match[1]));
}
