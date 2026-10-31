import {fireEvent,render,screen} from '@testing-library/react';
import {expect,test,vi} from 'vitest';
import {PinyinStepByStep} from '../../src/features/pinyin/PinyinStepByStep';
vi.mock('../../src/services/chineseSpeech',()=>({speakChinese:vi.fn(),stopChineseSpeech:vi.fn()}));
test('named Pinyin step controls announce the selected step and permit returning',()=>{
 render(<PinyinStepByStep onGoToQuiz={vi.fn()} onGoToTable={vi.fn()} />);
 const first=screen.getByRole('button',{name:/^Chặng 1:/});
 const third=screen.getByRole('button',{name:/^Chặng 3:/});
 expect(first.getAttribute('aria-current')).toBe('step');
 fireEvent.click(third);
 expect(third.getAttribute('aria-current')).toBe('step');
 expect(first.hasAttribute('aria-current')).toBe(false);
 fireEvent.click(first);
 expect(first.getAttribute('aria-current')).toBe('step');
});
