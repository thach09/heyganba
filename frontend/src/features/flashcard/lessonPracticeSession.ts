import type { VocabularyWord } from './types';

export type LessonPracticeState = {
  mode: 'LIST' | 'STUDY' | 'QUIZ';
  studyIndex: number;
  studyFlipped: boolean;
  quizIndex: number;
  quizScore: number;
  quizAnswer: string;
  quizSubmitted: boolean;
  quizIsCorrect: boolean | null;
  quizFinished: boolean;
  selectedChoice: string | null;
};
const key = (account: number | undefined, slug: string) => `heyganba:lesson-practice:${account ?? 'guest'}:${encodeURIComponent(slug)}`;
// This is a cache identity, not the server's academic provenance digest.
const signature = (words: VocabularyWord[]) => JSON.stringify(words.map(word => [word.id, word.word, word.pinyin, word.meaningVi]));
const index = (value: unknown, limit: number): value is number => Number.isInteger(value) && Number(value) >= 0 && Number(value) < limit;

export function readLessonPractice(account: number | undefined, slug: string, words: VocabularyWord[]): LessonPracticeState | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key(account, slug)) ?? 'null');
    if (!saved || saved.version !== 1 || saved.signature !== signature(words) || !words.length) return null;
    const state = saved.state;
    if (!state || !['LIST', 'STUDY', 'QUIZ'].includes(state.mode)
      || !index(state.studyIndex, words.length) || !index(state.quizIndex, Math.min(words.length, 10))
      || !Number.isInteger(state.quizScore) || state.quizScore < 0 || state.quizScore > Math.min(words.length, 10)
      || typeof state.quizAnswer !== 'string' || state.quizAnswer.length > 500
      || typeof state.studyFlipped !== 'boolean' || typeof state.quizSubmitted !== 'boolean' || typeof state.quizFinished !== 'boolean'
      || ![true, false, null].includes(state.quizIsCorrect)
      || !(state.selectedChoice === null || (typeof state.selectedChoice === 'string' && state.selectedChoice.length <= 500))) return null;
    return state;
  } catch { return null; }
}

export function saveLessonPractice(account: number | undefined, slug: string, words: VocabularyWord[], state: LessonPracticeState): void {
  try { sessionStorage.setItem(key(account, slug), JSON.stringify({ version: 1, signature: signature(words), state })); }
  catch { /* Optional recovery storage must not block learning. */ }
}
export function lastPracticeLesson(account: number | undefined, level: string): string | null {
  try { return sessionStorage.getItem(key(account, `last:${level}`)); }
  catch { return null; }
}
export function rememberPracticeLesson(account: number | undefined, level: string, slug: string): void {
  try { sessionStorage.setItem(key(account, `last:${level}`), slug); }
  catch { /* The current lesson still works when recovery storage is unavailable. */ }
}
