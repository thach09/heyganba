import { afterEach, expect, test, vi } from 'vitest';
import { developmentReadingFixtures } from '../../src/features/dictionary/readingFixtures';

afterEach(() => vi.unstubAllEnvs());
test('research reading fixtures require explicit development opt-in', async () => {
  vi.stubEnv('DEV', true);
  vi.stubEnv('VITE_ENABLE_READING_FIXTURES', undefined);
  expect(await developmentReadingFixtures()).toEqual([]);
  vi.stubEnv('VITE_ENABLE_READING_FIXTURES', 'true');
  expect((await developmentReadingFixtures()).length).toBeGreaterThan(0);
});
test('production cannot enable research readings even with the opt-in flag', async () => {
  vi.stubEnv('DEV', false);
  vi.stubEnv('VITE_ENABLE_READING_FIXTURES', 'true');
  expect(await developmentReadingFixtures()).toEqual([]);
});
