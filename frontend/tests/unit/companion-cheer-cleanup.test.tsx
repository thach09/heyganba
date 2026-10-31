import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { StudyPetCompanion } from '../../src/features/companion/StudyPetCompanion';

const fixture = vi.hoisted(() => ({ mood: vi.fn() }));
vi.mock('../../src/features/companion/useCompanionStore', () => ({ useCompanion: () => ({
  selectedPetId: 'panda', bambooCount: 1, mood: 'idle', setMood: fixture.mood, growthStage: 'baby',
}) }));
vi.mock('../../src/features/companion/CompanionWidget', () => ({ FoodIcon: () => null, CompanionSkeletonFallback: () => null }));
vi.mock('../../src/features/companion/three/Companion3DCanvas', () => ({
  Companion3DCanvas: ({ onPetClick }: { onPetClick: () => void }) => <button onClick={onPetClick}>Cheer fixture</button>,
}));

test('repeated cheers replace their timer and leaving clears the delayed mood write', async () => {
  fixture.mood.mockClear();
  const view = render(<StudyPetCompanion />);
  const button = await screen.findByRole('button', { name: 'Cheer fixture' });
  vi.useFakeTimers();
  try {
    fireEvent.click(button); fireEvent.click(button);
    expect(fixture.mood.mock.calls).toEqual([['happy'], ['happy']]);
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    act(() => vi.advanceTimersByTime(2000));
    expect(fixture.mood.mock.calls).toEqual([['happy'], ['happy']]);
    expect(vi.getTimerCount()).toBe(0);
  } finally { vi.useRealTimers(); }
});
