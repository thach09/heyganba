/** A tab-local checkpoint contains only the owned attempt ID and the learner's answers. */
export interface ActiveAttempt {
  examId: number;
  answers: Record<number, string>;
  activeIndex: number;
}
const key = (userId: number) => `heyganba_exam:${userId}`;
export function readActiveAttempt(userId?: number): ActiveAttempt | null {
  if (!userId) return null;
  try {
    const value = JSON.parse(sessionStorage.getItem(key(userId)) || 'null');
    if (!value || !Number.isSafeInteger(value.examId) || value.examId <= 0 ||
      !Number.isInteger(value.activeIndex) || !value.answers || typeof value.answers !== 'object' ||
      Array.isArray(value.answers) || Object.values(value.answers).some(answer => typeof answer !== 'string')) return null;
    return value;
  } catch { return null; }
}
export function saveActiveAttempt(userId: number, value: ActiveAttempt): boolean {
  try { sessionStorage.setItem(key(userId), JSON.stringify(value)); return true; }
  catch { return false; }
}
export function clearActiveAttempt(userId: number) {
  try { sessionStorage.removeItem(key(userId)); } catch { /* A stale checkpoint is revalidated on restore. */ }
}
