import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HanziStationView } from '../../src/features/hanzi/HanziStationView';
import { speakChinese } from '../../services/chineseSpeech';
import { progressApi } from '../../src/features/progress/api';
import { hanziApi } from '../../src/features/hanzi/api';

// Hoisted test state & fixtures
const fixture = vi.hoisted(() => ({
  user: { id: 1, role: 'ROLE_USER', fullName: 'Học viên HSK' } as any,
  lastQuizOptions: null as any,
  writerMock: {
    animateCharacter: vi.fn(),
    quiz: vi.fn((opts: any) => {
      fixture.lastQuizOptions = opts;
    }),
  },
}));

vi.mock('../../src/app/useAuth', () => ({
  useAuth: () => ({
    user: fixture.user,
    requireLogin: vi.fn(),
  }),
}));

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

vi.mock('../../src/services/chineseSpeech', () => ({
  speakChinese: vi.fn(),
  stopChineseSpeech: vi.fn(),
  isChineseSpeechSupported: () => true,
  isChineseVoiceAvailable: () => true,
  getChineseVoice: () => null,
  getVoiceDiagnostics: () => ({ supported: true, hasVoice: true, voiceName: 'Mandarin', voiceLang: 'zh-CN' }),
}));

vi.mock('../../src/features/companion/three/Companion3DCanvas', () => ({
  Companion3DCanvas: () => <div data-testid="mock-companion-3d-canvas" />,
}));

vi.mock('../../src/features/hanzi/api', () => ({
  hanziApi: {
    list: vi.fn(),
    character: vi.fn(),
    radicals: vi.fn(),
  },
}));

vi.mock('../../src/features/progress/api', () => ({
  progressApi: {
    practice: vi.fn().mockResolvedValue({ success: true, data: { expEarned: 15 } }),
    mastery: vi.fn().mockResolvedValue({ success: true, data: [] }),
  },
}));

const SAMPLE_CHARACTERS = [
  {
    id: 1,
    character: '人',
    pinyin: 'rén',
    sinoVietnamese: 'Nhân',
    meaning: 'Người, con người',
    radical: '人',
    strokeCount: 2,
    hskLevel: 1,
    decomposition: 'Độc thể (Hình người đứng nghiêng)',
    exampleWordsJson: '[{"word":"中国人","pinyin":"Zhōngguó rén","vi":"người Trung Quốc"}]',
    practiceCount: 0,
    reviewStatus: 'APPROVED',
  },
  {
    id: 9,
    character: '好',
    pinyin: 'hǎo',
    sinoVietnamese: 'Hảo',
    meaning: 'Tốt, đẹp, hay, khỏe',
    radical: '女',
    strokeCount: 6,
    hskLevel: 1,
    decomposition: '女 (Nữ) + 子 (Tử)',
    exampleWordsJson: '[{"word":"你好","pinyin":"nǐ hǎo","vi":"xin chào"},{"word":"好看","pinyin":"hǎokàn","vi":"đẹp, ưa nhìn"}]',
    practiceCount: 0,
    reviewStatus: 'APPROVED',
  },
  {
    id: 17,
    character: '你',
    pinyin: 'nǐ',
    sinoVietnamese: 'Nhĩ',
    meaning: 'Bạn, anh, chị (ngôi thứ hai)',
    radical: '亻',
    strokeCount: 7,
    hskLevel: 1,
    decomposition: '亻 (Nhân đứng) + 尔 (Nhĩ)',
    exampleWordsJson: '[{"word":"你好","pinyin":"nǐ hǎo","vi":"xin chào"}]',
    practiceCount: 0,
    reviewStatus: 'PENDING_REVIEW',
    needsHumanCheck: true,
  },
];

describe('Hanzi & Radicals Station (Trạm Chữ Hán HSK 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fixture.lastQuizOptions = null;
    (hanziApi.list as any).mockResolvedValue({
      success: true,
      data: SAMPLE_CHARACTERS,
    });

    (window as any).HanziWriter = {
      create: vi.fn(() => fixture.writerMock),
    };
  });

  test('1. Renders Hanzi Station with foundational radicals bar, HSK filter, and pending review badge', async () => {
    render(
      <MemoryRouter>
        <HanziStationView />
      </MemoryRouter>
    );

    // Header & title
    expect(await screen.findByText(/Học Chữ Hán \(Hanzi\) & Tập viết 米字格/i)).toBeInTheDocument();

    // Foundational Radicals Bar
    expect(screen.getByText('亻 Nhân')).toBeInTheDocument();
    expect(screen.getByText('女 Nữ')).toBeInTheDocument();
    expect(screen.getByText('口 Khẩu')).toBeInTheDocument();

    // Characters in grid
    expect(await screen.findByText('人')).toBeInTheDocument();
    expect(screen.getByText('好')).toBeInTheDocument();
    expect(screen.getByText('你')).toBeInTheDocument();

    // Pending review badge for character '你'
    expect(screen.getByText('Chờ duyệt')).toBeInTheDocument();
  });

  test('2. Filters characters by Radical and Search query', async () => {
    render(
      <MemoryRouter>
        <HanziStationView />
      </MemoryRouter>
    );

    await screen.findByText('人');

    // Click radical '女 Nữ'
    const femaleRadicalBtn = screen.getByText('女 Nữ');
    fireEvent.click(femaleRadicalBtn);

    // '好' has radical '女', should remain visible
    expect(screen.getByText('好')).toBeInTheDocument();
    // '人' does not have radical '女', should not be in the filtered list
    expect(screen.queryByText('Nhân')).not.toBeInTheDocument();

    // Search query test
    const searchInput = screen.getByPlaceholderText(/Tìm theo Hán tự, Pinyin, Hán Việt/i);
    fireEvent.change(searchInput, { target: { value: 'Hảo' } });

    expect(screen.getByText('好')).toBeInTheDocument();
  });

  test('3. Displays Chiết tự (decomposition) and applied HSK compound words with TTS audio playback', async () => {
    render(
      <MemoryRouter>
        <HanziStationView />
      </MemoryRouter>
    );

    await screen.findByText('人');

    // Select character '好'
    const charHaoBtn = screen.getByText('好');
    fireEvent.click(charHaoBtn);

    // Check Sino-Vietnamese reading
    expect(await screen.findByText(/Âm Hán Việt: Hảo/i)).toBeInTheDocument();

    // Check decomposition (Chiết tự)
    expect(screen.getByText(/女 \(Nữ\) \+ 子 \(Tử\)/i)).toBeInTheDocument();

    // Check applied compound words from exampleWordsJson
    expect(screen.getByText('你好')).toBeInTheDocument();
    expect(screen.getByText('好看')).toBeInTheDocument();
    expect(screen.getByText('đẹp, ưa nhìn')).toBeInTheDocument();

    // Test Mandarin TTS audio playback on the main character
    const audioBtns = screen.getAllByRole('button');
    const speakBtn = audioBtns.find((b) => b.getAttribute('title')?.includes('Phát âm') || b.querySelector('svg'));
    expect(speakBtn).toBeDefined();
    if (speakBtn) {
      fireEvent.click(speakBtn);
      expect(speakChinese).toHaveBeenCalled();
    }
  });

  test('4. Handwriting quiz completion rewards +2 Bamboo 🎋, calls progress API, and displays RedSealStamp', async () => {
    render(
      <MemoryRouter>
        <HanziStationView />
      </MemoryRouter>
    );

    await screen.findByText('人');

    // Switch to quiz mode "Luyện viết tay"
    const quizModeBtn = screen.getByRole('button', { name: /Luyện viết tay/i });
    fireEvent.click(quizModeBtn);

    await waitFor(() => {
      expect(fixture.lastQuizOptions).not.toBeNull();
    });

    // Simulate completion of the handwriting stroke quiz
    fixture.lastQuizOptions.onComplete();

    // Red seal stamp should appear: <RedSealStamp text="通" />
    expect(await screen.findByText('通')).toBeInTheDocument();

    // Backend progress API called honestly
    expect(progressApi.practice).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'HANZI',
        masteryScore: 100,
        expEarned: 15,
      })
    );
  });
});
