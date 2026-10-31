import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HanziStationView } from '../../src/features/hanzi/HanziStationView';
import { speakChinese, stopChineseSpeech } from '../../src/services/chineseSpeech';
import { progressApi } from '../../src/features/progress/api';
import { hanziApi } from '../../src/features/hanzi/api';

// Hoisted test state & fixtures
const fixture = vi.hoisted(() => ({
  user: { userId: 1, role: 'ROLE_USER', fullName: 'Học viên HSK' } as any,
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
    practice: vi.fn().mockResolvedValue({ success: true, data: { expAwarded: 10, masteryScore: 15 } }),
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
    fixture.user = { userId: 1, role: 'ROLE_USER', fullName: 'Học viên HSK' };
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
    fixture.user.role = 'ROLE_ADMIN'; // Only an admin can preview the pending fixture.
    render(
      <MemoryRouter>
        <HanziStationView />
      </MemoryRouter>
    );

    // Header & title
    expect(await screen.findByText('Chữ Hán và tập viết')).toBeInTheDocument();

    // Foundational Radicals Bar
    expect(screen.getByText('亻 Nhân')).toBeInTheDocument();
    expect(screen.getByText('女 Nữ')).toBeInTheDocument();
    expect(screen.getByText('口 Khẩu')).toBeInTheDocument();

    // Characters in grid
    expect((await screen.findAllByText('人'))[0]).toBeInTheDocument();
    expect(screen.getAllByText('好')[0]).toBeInTheDocument();
    expect(screen.getByText('你')).toBeInTheDocument();

    // Pending review badge for character '你'
    expect(screen.getByText('Chờ duyệt')).toBeInTheDocument();
  });

  test('learner never sees a pending character even if the API mistakenly includes it', async () => {
    render(<MemoryRouter><HanziStationView /></MemoryRouter>);
    await screen.findAllByText('人');
    expect(screen.queryByRole('button', { name: /^你 / })).not.toBeInTheDocument();
    expect(screen.queryByText('Chờ duyệt')).not.toBeInTheDocument();
  });

  test('guest can read approved characters without requesting private progress', async () => {
    fixture.user = null;
    render(<MemoryRouter><HanziStationView /></MemoryRouter>);
    expect((await screen.findAllByText('人'))[0]).toBeInTheDocument();
    expect(hanziApi.list).toHaveBeenCalled();
    expect(progressApi.mastery).not.toHaveBeenCalled();
    expect(progressApi.practice).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^你 / })).not.toBeInTheDocument();
  });

  test('API failure shows retry and never substitutes a local academic dataset', async () => {
    (hanziApi.list as any).mockResolvedValue({ success: false, message: 'Offline' });
    render(<MemoryRouter><HanziStationView /></MemoryRouter>);
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    expect(screen.queryByText('人')).not.toBeInTheDocument();
  });

  test('an empty approved collection remains an explicit empty state', async () => {
    (hanziApi.list as any).mockResolvedValue({ success: true, data: [] });
    render(<MemoryRouter><HanziStationView /></MemoryRouter>);
    expect(screen.getByRole('status').textContent).toContain('Đang tải');
    await screen.findByText('Chưa có chữ Hán đã duyệt ở cấp này.');
    expect(screen.queryByText('人')).not.toBeInTheDocument();
  });

  test('2. Filters characters by Radical and Search query', async () => {
    render(
      <MemoryRouter>
        <HanziStationView />
      </MemoryRouter>
    );

    await screen.findAllByText('人');

    // Click radical '女 Nữ'
    const femaleRadicalBtn = screen.getByText('女 Nữ');
    fireEvent.click(femaleRadicalBtn);

    // '好' has radical '女', should remain visible
    expect(screen.getAllByText('好')[0]).toBeInTheDocument();
    // '人' does not have radical '女', should not be in the filtered list
    expect(screen.queryByRole('button', { name: /^人 / })).not.toBeInTheDocument();

    // Search query test
    const searchInput = screen.getByPlaceholderText(/Tìm theo chữ Hán, Pinyin, Hán Việt/i);
    fireEvent.change(searchInput, { target: { value: 'Hảo' } });

    expect(screen.getAllByText('好')[0]).toBeInTheDocument();
  });

  test('3. Displays Chiết tự (decomposition) and applied HSK compound words with TTS audio playback', async () => {
    render(
      <MemoryRouter>
        <HanziStationView />
      </MemoryRouter>
    );

    await screen.findAllByText('人');

    // Select character '好'
    const charHaoBtn = screen.getAllByText('好')[0];
    fireEvent.click(charHaoBtn);

    // Check Sino-Vietnamese reading
    expect((await screen.findAllByText('Hảo'))[0]).toBeInTheDocument();

    // Check decomposition (Chiết tự)
    expect(screen.getByText(/女 \(Nữ\) \+ 子 \(Tử\)/i)).toBeInTheDocument();

    // Check applied compound words from exampleWordsJson
    expect(screen.getByText('你好')).toBeInTheDocument();
    expect(screen.getByText('好看')).toBeInTheDocument();
    expect(screen.getByText('đẹp, ưa nhìn')).toBeInTheDocument();

    // Test Mandarin TTS audio playback on the main character
    const speakBtn = screen.getByTitle('Nghe phát âm chữ Hán');
    expect(speakBtn).toBeDefined();
    if (speakBtn) {
      fireEvent.click(speakBtn);
      expect(speakChinese).toHaveBeenCalled();
    }
  });

  test('missing Mandarin voice offers recovery and speech stops when leaving the station', async () => {
    vi.mocked(speakChinese).mockReturnValueOnce('no-voice');
    const view = render(<MemoryRouter><HanziStationView /></MemoryRouter>);
    await screen.findAllByText('人');
    fireEvent.click(screen.getByTitle('Nghe phát âm chữ Hán'));
    expect(screen.getByRole('status').textContent).toContain('cài giọng tiếng Trung');
    const before = vi.mocked(stopChineseSpeech).mock.calls.length;
    view.unmount();
    expect(stopChineseSpeech).toHaveBeenCalledTimes(before + 1);
  });

  test('4. Handwriting completion records evidence and displays the server-confirmed reward', async () => {
    render(
      <MemoryRouter>
        <HanziStationView />
      </MemoryRouter>
    );

    await screen.findAllByText('人');

    // Switch to quiz mode "Luyện viết tay"
    const quizModeBtn = screen.getByRole('button', { name: /Luyện viết tay/i });
    fireEvent.click(quizModeBtn);

    await waitFor(() => {
      expect(fixture.lastQuizOptions).not.toBeNull();
    });

    // Simulate completion of the handwriting stroke quiz
    await fixture.lastQuizOptions.onComplete();

    // Red seal stamp should appear: <RedSealStamp text="通" />
    expect(await screen.findByText('Xong')).toBeInTheDocument();

    // Backend progress API called honestly
    expect(progressApi.practice).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'HANZI',
        isCorrect: true,
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  test('a detached writer cannot record practice after selecting another character or leaving', async () => {
    const view = render(<MemoryRouter><HanziStationView /></MemoryRouter>);
    await screen.findAllByText('人');
    fireEvent.click(screen.getByRole('button', { name: /Luyện viết tay/ }));
    await waitFor(() => expect(fixture.lastQuizOptions).not.toBeNull());
    const oldQuiz = fixture.lastQuizOptions;
    fireEvent.click(screen.getAllByText('好')[0].closest('button')!);
    await oldQuiz.onComplete();
    expect(progressApi.practice).not.toHaveBeenCalled();
    const currentQuiz = fixture.lastQuizOptions;
    view.unmount();
    await currentQuiz.onComplete();
    expect(progressApi.practice).not.toHaveBeenCalled();
  });

  test('a late practice response cannot award visible EXP to the newly selected character', async () => {
    let finish!: (result: unknown) => void;
    vi.mocked(progressApi.practice).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }) as any);
    render(<MemoryRouter><HanziStationView /></MemoryRouter>);
    await screen.findAllByText('人');
    fireEvent.click(screen.getByRole('button', { name: /Luyện viết tay/ }));
    await waitFor(() => expect(fixture.lastQuizOptions).not.toBeNull());
    fixture.lastQuizOptions.onComplete();
    await waitFor(() => expect(progressApi.practice).toHaveBeenCalledOnce());
    fireEvent.click(screen.getAllByText('好')[0].closest('button')!);
    finish({ success: true, data: { expAwarded: 999, masteryScore: 100 } });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByText(/999 EXP/)).toBeNull();
  });
});


test('writer download failure survives a late content response and can be retried', async () => {
  delete (window as any).HanziWriter;
  let finish!: (result: unknown) => void;
  vi.mocked(hanziApi.list).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }) as any);
  render(<MemoryRouter><HanziStationView /></MemoryRouter>);
  await waitFor(() => expect(hanziApi.list).toHaveBeenCalled());
  const script = document.querySelector('script[src="/vendor/hanzi-writer-3.5.0.min.js"]')!;
  expect(script).not.toBeNull();
  fireEvent.error(script);
  finish({ success: true, data: SAMPLE_CHARACTERS });
  expect(await screen.findByTestId('calligraphy-reference-card')).toBeInTheDocument();
  expect(screen.getByText('Chưa tải được dữ liệu nét viết')).toBeInTheDocument();
  (window as any).HanziWriter = { create: vi.fn(() => fixture.writerMock) };
  fireEvent.click(screen.getByRole('button', { name: 'Thử tải nét viết lại' }));
  await waitFor(() => expect((window as any).HanziWriter.create).toHaveBeenCalled());
  expect(screen.queryByTestId('calligraphy-reference-card')).not.toBeInTheDocument();
});

test('an empty selected group offers a path back to available characters', async () => {
  fixture.user = { userId: 1, role: 'ROLE_USER', fullName: 'Learner' };
  vi.mocked(hanziApi.list).mockImplementation(async (query) => ({
    success: true, data: new URLSearchParams(query).get('hsk') === '6' ? [] : SAMPLE_CHARACTERS,
  }) as any);
  (window as any).HanziWriter = { create: vi.fn(() => fixture.writerMock) };
  render(<MemoryRouter><HanziStationView /></MemoryRouter>);
  await screen.findAllByText('人');
  fireEvent.click(screen.getByRole('button', { name: 'Nhóm 6' }));
  await screen.findByText('Chưa có chữ Hán đã duyệt ở cấp này.');
  fireEvent.click(screen.getByRole('button', { name: 'Quay về nhóm 1' }));
  await screen.findAllByText('人');
  expect(hanziApi.list).toHaveBeenLastCalledWith('hsk=1', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(screen.getByRole('button', { name: 'Nhóm 6' })).toBeInTheDocument();
});
