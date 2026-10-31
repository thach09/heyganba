import type { ReadingPassageItem } from './types';

/** Unreviewed research fixtures are never a production publication channel. */
export async function developmentReadingFixtures(): Promise<ReadingPassageItem[]> {
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_READING_FIXTURES !== 'true') return [];
  // The compile-time DEV guard also excludes the unreviewed corpus from production chunks.
  return (await import('./readingData')).ALL_READING_PASSAGES;
}
