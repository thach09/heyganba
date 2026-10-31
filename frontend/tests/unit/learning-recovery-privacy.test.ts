import { beforeEach, expect, test, vi } from 'vitest';
import { handleRecoveryRevocation, observeRecovery, revokeLearningRecovery } from '../../src/lib/learningRecovery';
import { clearActiveAttempt, readActiveAttempt, saveActiveAttempt } from '../../src/features/exam/activeAttempt';
import { readLessonPractice, saveLessonPractice, rememberPracticeLesson, lastPracticeLesson } from '../../src/features/flashcard/lessonPracticeSession';

const attempt = { examId: 42, answers: { 0: 'private answer' }, activeIndex: 0 };
const words = [{ id: 1, word: 'fixture', pinyin: 'fixture', meaningVi: 'fixture' }];
const practice = { mode: 'QUIZ' as const, studyIndex: 0, studyFlipped: false, quizIndex: 0,
  quizScore: 0, quizAnswer: 'private input', quizSubmitted: false, quizIsCorrect: null,
  quizFinished: false, selectedChoice: null };
beforeEach(() => { clearActiveAttempt(1); clearActiveAttempt(2); observeRecovery(1); observeRecovery(2); });

test('successful explicit revocation removes this account exam, lesson and resume pointer only', () => {
  saveActiveAttempt(1, attempt); saveLessonPractice(1, 'fixture', words, practice);
  rememberPracticeLesson(1, 'HSK 1', 'fixture'); saveActiveAttempt(2, { ...attempt, examId: 43 });
  localStorage.setItem('theme', 'dark');
  revokeLearningRecovery(1);
  expect(localStorage.getItem('heyganba_exam:1')).toBeNull();
  expect(sessionStorage.getItem('heyganba_exam:1')).toBeNull();
  expect(sessionStorage.getItem('heyganba:lesson-practice:1:fixture')).toBeNull();
  expect(lastPracticeLesson(1, 'HSK 1')).toBeNull();
  expect(readActiveAttempt(2)?.examId).toBe(43);
  expect(localStorage.getItem('theme')).toBe('dark');
});
test('stale writers cannot recreate private answers after another tab revokes recovery', () => {
  saveActiveAttempt(1, attempt); saveLessonPractice(1, 'fixture', words, practice);
  const oldSession = sessionStorage.getItem('heyganba_exam:1')!;
  localStorage.setItem('heyganba_recovery_revocation:1', crypto.randomUUID());
  handleRecoveryRevocation(new StorageEvent('storage', { key: 'heyganba_recovery_revocation:1' }));
  expect(saveActiveAttempt(1, attempt)).toBe(false);
  saveLessonPractice(1, 'fixture', words, practice);
  expect(sessionStorage.getItem('heyganba:lesson-practice:1:fixture')).toBeNull();
  sessionStorage.setItem('heyganba_exam:1', oldSession);
  expect(readActiveAttempt(1)).toBeNull();
});
test('a new login can create a new generation; a delayed storage event preserves its checkpoint', () => {
  saveActiveAttempt(1, attempt); revokeLearningRecovery(1);
  expect(readActiveAttempt(1)).toBeNull();
  expect(saveActiveAttempt(1, { ...attempt, examId: 99 })).toBe(true);
  saveLessonPractice(1, 'fixture', words, practice);
  handleRecoveryRevocation(new StorageEvent('storage', { key: 'heyganba_recovery_revocation:1' }));
  expect(readActiveAttempt(1)?.examId).toBe(99);
  expect(readLessonPractice(1, 'fixture', words)?.quizAnswer).toBe('private input');
});
test('legacy checkpoints remain recoverable before any explicit revocation, then fail closed', () => {
  sessionStorage.setItem('heyganba_exam:1', JSON.stringify(attempt));
  expect(readActiveAttempt(1)).toEqual(attempt);
  localStorage.setItem('heyganba_recovery_revocation:1', crypto.randomUUID());
  expect(readActiveAttempt(1)).toBeNull();
});
test('storage denial never crashes privacy cleanup', () => {
  const fail = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied'); });
  try { expect(() => revokeLearningRecovery(1)).not.toThrow(); } finally { fail.mockRestore(); }
});
