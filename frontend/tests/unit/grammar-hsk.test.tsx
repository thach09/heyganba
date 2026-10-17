import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { GrammarView } from '../../src/features/grammar/GrammarView';
import type { GrammarRuleDto } from '../../src/features/grammar/types';

const mockSpeakChinese = vi.fn();
vi.mock('../../src/services/chineseSpeech', () => ({
  speakChinese: (text: string) => mockSpeakChinese(text),
  stopChineseSpeech: vi.fn(),
}));

const mockRewardBamboo = vi.fn();
const mockTriggerReaction = vi.fn();
vi.mock('../../src/features/companion/useCompanionStore', () => ({
  useCompanion: () => ({
    rewardBamboo: mockRewardBamboo,
    triggerReaction: mockTriggerReaction,
  }),
}));

const mockGrammarApi = {
  rules: vi.fn(),
  exercises: vi.fn(),
  check: vi.fn(),
};

vi.mock('../../src/features/grammar/api', () => ({
  grammarApi: {
    rules: (...args: unknown[]) => mockGrammarApi.rules(...args),
    exercises: (...args: unknown[]) => mockGrammarApi.exercises(...args),
    check: (...args: unknown[]) => mockGrammarApi.check(...args),
  },
}));

vi.mock('../../src/app/useAuth', () => ({
  useAuth: () => ({
    user: { userId: 1, fullName: 'Learner', role: 'ROLE_USER' },
    requireLogin: vi.fn(),
  }),
}));

const sampleRules = [
  {
    id: 1,
    lessonId: 1,
    title: 'Đại từ nghi vấn 什么 (Cái gì)',
    structure: 'Chủ ngữ + 是 + 什么？ / Động từ + 什么？',
    explanation: 'Dùng để hỏi về đồ vật, sự vật hoặc danh xưng.',
    hskLevel: 1,
    notes: 'Người Việt hay nhầm vị trí của 什么 đặt ở đầu câu như tiếng Việt.',
    reviewStatus: 'PENDING_REVIEW',
    examples: [
      {
        id: 101,
        sentenceZh: '这是什么？',
        pinyin: 'Zhè shì shénme?',
        meaningVi: 'Đây là cái gì?',
      },
      {
        id: 102,
        sentenceZh: '你叫什么名字？',
        pinyin: 'Nǐ jiào shénme míngzi?',
        meaningVi: 'Bạn tên là gì?',
      },
    ],
  },
  {
    id: 2,
    lessonId: 2,
    title: 'Câu vị ngữ tính từ với 很',
    structure: 'Chủ ngữ + 很 + Tính từ',
    explanation: 'Trong câu khẳng định đơn giản có tính từ làm vị ngữ, cần thêm phó từ mức độ như 很.',
    hskLevel: 1,
    notes: 'Người Việt rất hay dùng "是" trước tính từ (sai: *我是很好).',
    reviewStatus: 'APPROVED',
    examples: [
      {
        id: 201,
        sentenceZh: '我很忙。',
        pinyin: 'Wǒ hěn máng.',
        meaningVi: 'Tôi rất bận.',
      },
    ],
  },
  {
    id: 3,
    lessonId: 5,
    title: 'Trợ từ kết cấu 得 biểu thị mức độ',
    structure: 'Động từ + 得 + Mức độ',
    explanation: 'Dùng để miêu tả, đánh giá kết quả hoặc trạng thái của hành động.',
    hskLevel: 2,
    notes: 'Hay nhầm trợ từ 得 với 的 và 地.',
    reviewStatus: 'APPROVED',
    examples: [
      {
        id: 301,
        sentenceZh: '他说得很快。',
        pinyin: 'Tā shuō de hěn kuài.',
        meaningVi: 'Anh ấy nói rất nhanh.',
      },
    ],
  },
].map((rule, index) => ({ ...rule, number: index + 1, lessonSlug: null, lessonTitle: null, exerciseCount: 1,
  examplesJson: JSON.stringify(rule.examples.map(ex => ({ zh: ex.sentenceZh, pinyin: ex.pinyin, vi: ex.meaningVi }))) })) satisfies GrammarRuleDto[];

describe('HSK Grammar Lab (GrammarView)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGrammarApi.rules.mockResolvedValue({ success: true, data: sampleRules });
    mockGrammarApi.exercises.mockResolvedValue({
      success: true,
      data: [
        {
          id: 10,
          questionText: '这是______？ (Đây là cái gì?)',
          options: ['什么', '谁', '哪儿', '几'],
        },
      ],
    });
    mockGrammarApi.check.mockResolvedValue({
      success: true,
      data: {
        correct: true,
        correctAnswer: '什么',
        submittedAnswer: '什么',
        explanation: 'Dùng 什么 để hỏi về đồ vật.',
      },
    });
  });

  it('renders HSK level filters and filters rules by HSK level', async () => {
    render(
      <MemoryRouter>
        <GrammarView />
      </MemoryRouter>
    );

    // Initial load displays rules
    expect(await screen.findByText('Đại từ nghi vấn 什么 (Cái gì)')).toBeTruthy();
    expect(screen.getByText('Câu vị ngữ tính từ với 很')).toBeTruthy();
    expect(screen.getByText('Trợ từ kết cấu 得 biểu thị mức độ')).toBeTruthy();

    // Click HSK 1 filter chip
    const hsk1Filter = screen.getByRole('button', { name: /^HSK 1 \(/ });
    fireEvent.click(hsk1Filter);

    // HSK 1 rules remain, HSK 2 rule is filtered out
    expect(screen.getByText('Đại từ nghi vấn 什么 (Cái gì)')).toBeTruthy();
    expect(screen.getByText('Câu vị ngữ tính từ với 很')).toBeTruthy();
    expect(screen.queryByText('Trợ từ kết cấu 得 biểu thị mức độ')).toBeNull();
  });

  it('displays Core Formula and Vietnamese learner common mistakes callouts', async () => {
    render(
      <MemoryRouter>
        <GrammarView />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByText('Đại từ nghi vấn 什么 (Cái gì)'));
    expect((await screen.findAllByText('Chủ ngữ + 是 + 什么？ / Động từ + 什么？'))[0]).toBeTruthy();
    expect(screen.getByText(/Người Việt hay nhầm vị trí của 什么 đặt ở đầu câu/)).toBeTruthy();
  });

  it('toggles Pinyin display on example sentences', async () => {
    render(
      <MemoryRouter>
        <GrammarView />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByText('Đại từ nghi vấn 什么 (Cái gì)'));
    expect(await screen.findByText('Zhè shì shénme?')).toBeTruthy();

    // Find and click Toggle Pinyin button
    const pinyinToggle = screen.getByRole('button', { name: /Ẩn Pinyin/ });
    fireEvent.click(pinyinToggle);

    // Pinyin text should be hidden
    expect(screen.queryByText('Zhè shì shénme?')).toBeNull();
    expect(screen.getByRole('button', { name: /Hiện Pinyin/ })).toBeTruthy();
  });

  it('plays Mandarin audio via speakChinese when clicking speaker icon', async () => {
    render(
      <MemoryRouter>
        <GrammarView />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByText('Đại từ nghi vấn 什么 (Cái gì)'));
    await screen.findByText('这是什么？');
    const audioButtons = screen.getAllByRole('button', { name: /Nghe phát âm chuẩn Quan thoại/ });
    fireEvent.click(audioButtons[0]);

    expect(mockSpeakChinese).toHaveBeenCalledWith('这是什么？');
  });

  it('validates exercise cleanly and awards companion bamboo shoots + RedSealStamp', async () => {
    render(
      <MemoryRouter>
        <GrammarView />
      </MemoryRouter>
    );

    // Open Practice mode
    fireEvent.click(screen.getByRole('button', { name: 'Luyện tập' }));

    // Wait for exercise to load
    await screen.findByText('这是______？ (Đây là cái gì?)');

    // Choose correct answer '什么'
    const option = screen.getByRole('button', { name: /1\s*什么/ });
    fireEvent.click(option);

    // Check result
    await screen.findByText('Chính xác');
    expect(mockGrammarApi.check).toHaveBeenCalledTimes(1);
    expect(mockRewardBamboo).toHaveBeenCalledWith(2);
    expect(screen.getByText('通')).toBeTruthy();
    expect(mockTriggerReaction).toHaveBeenCalledWith('happy');
  });
});
