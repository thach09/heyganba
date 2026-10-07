import { useAuth } from '../../app/useAuth';
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, FolderPlus, Trash2, Play, CheckCircle2, BookmarkPlus, Volume2 } from 'lucide-react';
import { apiRequest, getSavedUser } from '../../services/api';
import { SubmitButton } from '../../components/SubmitButton';
import { Modal } from '../../components/Modal';
import { speakJapanese } from '../../services/japaneseSpeech';

interface VocabularyItem {
  id: number;
  word: string;
  reading: string;
  meaning: string;
  vietnameseMeaning?: string;
  sinoVietnamese?: string;
  exampleSentence?: string;
  exampleReading?: string;
  exampleMeaning?: string;
  source?: string;
  meaningLanguage?: string;
}

interface KanjiItem {
  id: number;
  character: string;
  strokeCount: number;
  onyomi?: string;
  kunyomi?: string;
  sinoVietnamese?: string;
  meaning: string;
  mnemonic?: string;
}

interface DictionarySearchResponse {
  query: string;
  totalMatches: number;
  vocabularies: VocabularyItem[];
  kanjis: KanjiItem[];
  page: number;
  hasMore: boolean;
}

interface VocabNotebookItem {
  id: number;
  vocabularyId: number;
  word: string;
  reading: string;
  meaning: string;
  vietnameseMeaning?: string;
  sinoVietnamese?: string;
  exampleSentence?: string;
  exampleReading?: string;
  exampleMeaning?: string;
  customNote?: string;
  practiceCount: number;
  correctCount: number;
  meaningLanguage?: string;
}

interface VocabNotebook {
  id: number;
  title: string;
  description?: string;
  isPublicSample: boolean;
  itemCount: number;
  createdAt: string;
  items: VocabNotebookItem[];
}

interface PracticeResult {
  notebookId: number;
  notebookTitle: string;
  correctCount: number;
  totalCount: number;
  expEarned: number;
  note: string;
}

const labelClass = 'text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg-38';

export const DictionaryNotebookView: React.FC = () => {
  const { user, requireLogin: onRequireLogin } = useAuth();
  const [activeTab, setActiveTab] = useState<'DICTIONARY' | 'NOTEBOOKS'>('DICTIONARY');

  // Dictionary state
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<DictionarySearchResponse | null>(null);
  const searchSequence = useRef(0);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  // Notebooks state
  const [notebooks, setNotebooks] = useState<VocabNotebook[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<VocabNotebook | null>(null);
  const [loadingNotebooks, setLoadingNotebooks] = useState(false);

  // Create notebook modal / inline
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Add word to notebook modal
  const [wordToAdd, setWordToAdd] = useState<VocabularyItem | null>(null);
  const [targetNotebookId, setTargetNotebookId] = useState<number | null>(null);
  const [customNote, setCustomNote] = useState('');

  // Practice state
  const [practiceActive, setPracticeActive] = useState(false);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceScore, setPracticeScore] = useState(0);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [practiceFinished, setPracticeFinished] = useState<PracticeResult | null>(null);
  const [practiceKind, setPracticeKind] = useState<'MEANING' | 'READING'>('MEANING');
  const practiceAnswers = useRef<{ vocabularyId: number; answer: string; kind: 'MEANING' | 'READING' }[]>([]);
  const practiceSessionId = useRef('');

  const questionKind = (item: VocabNotebookItem) => practiceKind === 'READING' && /[\u3400-\u9fff]/.test(item.word) ? 'READING' : 'MEANING';
  const answerFor = (item: VocabNotebookItem, kind: 'MEANING' | 'READING') => kind === 'READING' ? item.reading : item.meaning;

  // Success / error toast
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const setupOptionsForIndex = (nb: VocabNotebook, idx: number) => {
    const item = nb.items[idx];
    if (!item) return;
    const kind = questionKind(item);
    const correct = answerFor(item, kind);
    const others = [...new Set(nb.items.map(i => answerFor(i, kind)))].filter(m => m !== correct);
    const shuffledOthers = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
    setCurrentOptions([correct, ...shuffledOthers].sort(() => Math.random() - 0.5));
  };

  const doSearch = async (queryText: string, page = 0) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;

    const sequence = ++searchSequence.current;
    setIsSearching(true);
    if (page === 0) setSearchResult(null);
    try {
      const res = await apiRequest<DictionarySearchResponse>(
        `/dictionary/search?q=${encodeURIComponent(trimmed)}&page=${page}`
      );
      if (sequence !== searchSequence.current) return;
      if (res.success && res.data) {
        setSearchResult(previous => page > 0 && previous ? { ...res.data, vocabularies: [...previous.vocabularies, ...res.data.vocabularies], kanjis: previous.kanjis } : res.data);
      } else {
        showNotice(res.message || 'Không thể tra cứu từ điển vào lúc này.');
      }
    } catch {
      showNotice('Không thể kết nối đến máy chủ để tra cứu.');
    } finally {
      if (sequence === searchSequence.current) setIsSearching(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    if (searchParams.get('q') === trimmed) await doSearch(trimmed);
    else setSearchParams({ q: trimmed });
  };

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q.trim()) {
      setSearchQuery(q.trim());
      void doSearch(q.trim());
    }
    else { searchSequence.current++; setSearchQuery(''); setSearchResult(null); setIsSearching(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchNotebooks = async () => {
    if (!user) return;
    const accountId = user.userId;
    setLoadingNotebooks(true);
    try {
      const res = await apiRequest<VocabNotebook[]>('/notebooks');
      if (getSavedUser()?.userId !== accountId) return;
      if (res.success && res.data) {
        setNotebooks(res.data);
        const personal = res.data.filter(n => !n.isPublicSample);
        setTargetNotebookId(current => personal.some(n => n.id === current) ? current : personal[0]?.id ?? null);
        setSelectedNotebook(current => current ? res.data.find(n => n.id === current.id) ?? null : null);
      }
      else showNotice(res.message || 'Không tải được sổ từ. Vui lòng thử lại.');
    } finally {
      setLoadingNotebooks(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react/set-state-in-effect
    if (user && activeTab === 'NOTEBOOKS') {
      fetchNotebooks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]);

  useEffect(() => {
    if (!user) { setNotebooks([]); setSelectedNotebook(null); setWordToAdd(null); setPracticeActive(false); setActiveTab('DICTIONARY'); }
  }, [user]);

  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || savingRef.current) return;
    savingRef.current = true; setSaving(true);

    const res = await apiRequest<VocabNotebook>('/notebooks', {
      method: 'POST',
      body: JSON.stringify({ title: newTitle.trim(), description: newDesc.trim() || undefined }),
    });

    savingRef.current = false; setSaving(false);
    if (res.success && res.data) {
      showNotice('Tạo sổ từ vựng mới thành công');
      setNewTitle('');
      setNewDesc('');
      setShowCreateModal(false);
      fetchNotebooks();
    }
    else showNotice(res.message || 'Không tạo được sổ từ. Vui lòng thử lại.');
  };

  const handleCloneSample = async (sampleId: number) => {
    if (!user) {
      onRequireLogin();
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true);
    const res = await apiRequest<VocabNotebook>(`/notebooks/clone-sample/${sampleId}`, { method: 'POST' });
    savingRef.current = false; setSaving(false);
    if (res.success && res.data) {
      showNotice('Đã lưu nhóm từ mẫu vào kho từ vựng của bạn');
      fetchNotebooks();
      setSelectedNotebook(res.data);
    }
    else showNotice(res.message || 'Chưa nhận được nhóm mẫu. Vui lòng thử lại.');
  };

  const handleAddWordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wordToAdd || !targetNotebookId || savingRef.current) return;
    savingRef.current = true; setSaving(true);

    const res = await apiRequest<VocabNotebook>(`/notebooks/${targetNotebookId}/items`, {
      method: 'POST',
      body: JSON.stringify({ vocabularyId: wordToAdd.id, customNote: customNote.trim() || undefined }),
    });

    savingRef.current = false; setSaving(false);
    if (res.success) {
      showNotice(`Đã thêm "${wordToAdd.word}" vào sổ tay`);
      setWordToAdd(null);
      setCustomNote('');
      fetchNotebooks();
    } else {
      showNotice(res.message || 'Lỗi khi thêm từ vựng');
    }
  };

  const handleRemoveWord = async (notebookId: number, vocabId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xoá từ này khỏi sổ tay?')) return;
    const res = await apiRequest(`/notebooks/${notebookId}/items/${vocabId}`, { method: 'DELETE' });
    if (res.success) {
      showNotice('Đã xoá từ khỏi sổ tay');
      fetchNotebooks();
    }
    else showNotice(res.message || 'Chưa xoá được từ. Vui lòng thử lại.');
  };

  const handleDeleteNotebook = async (notebookId: number) => {
    if (!confirm('Xoá toàn bộ sổ từ vựng này?')) return;
    const res = await apiRequest(`/notebooks/${notebookId}`, { method: 'DELETE' });
    if (res.success) {
      showNotice('Đã xoá sổ từ vựng');
      setSelectedNotebook(null);
      fetchNotebooks();
    }
    else showNotice(res.message || 'Chưa xoá được sổ. Vui lòng thử lại.');
  };

  // Practice session logic
  const startPractice = (nb: VocabNotebook) => {
    if (!nb.items || nb.items.length === 0) {
      showNotice('Sổ từ vựng đang trống, vui lòng thêm từ trước khi luyện tập');
      return;
    }
    if (nb.items.length > 200) {
      nb = { ...nb, items: [...nb.items].sort(() => Math.random() - 0.5).slice(0, 200) };
      showNotice('Phiên này chọn 200 từ. Những từ còn lại vẫn ở trong sổ.');
    }
    if (nb.items.some(item => new Set(nb.items.map(i => answerFor(i, questionKind(item)))).size < 2)) {
      showNotice('Hãy thêm ít nhất 2 từ có nghĩa khác nhau để luyện trắc nghiệm.');
      return;
    }
    setSelectedNotebook(nb);
    practiceAnswers.current = [];
    practiceSessionId.current = crypto.randomUUID();
    setPracticeIndex(0);
    setPracticeScore(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setPracticeFinished(null);
    setupOptionsForIndex(nb, 0);
    setPracticeActive(true);
  };

  const handleSelectOption = (chosen: string) => {
    if (isAnswered || !selectedNotebook) return;
    setSelectedOption(chosen);
    setIsAnswered(true);

    const currentItem = selectedNotebook.items[practiceIndex];
    const kind = questionKind(currentItem);
    if (practiceAnswers.current.some(a => a.vocabularyId === currentItem.vocabularyId)) return;
    practiceAnswers.current.push({ vocabularyId: currentItem.vocabularyId, answer: chosen, kind });
    if (chosen === answerFor(currentItem, kind)) {
      setPracticeScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = async () => {
    if (!selectedNotebook || !isAnswered || savingRef.current) return;
    const nextIdx = practiceIndex + 1;
    if (nextIdx < selectedNotebook.items.length) {
      setPracticeIndex(nextIdx);
      setSelectedOption(null);
      setIsAnswered(false);
      setupOptionsForIndex(selectedNotebook, nextIdx);
    } else {
      // Finished practice
      savingRef.current = true; setSaving(true);
      const res = await apiRequest<PracticeResult>(`/notebooks/${selectedNotebook.id}/practice-result`, {
        method: 'POST',
        body: JSON.stringify({ sessionId: practiceSessionId.current, answers: practiceAnswers.current }),
      });
      savingRef.current = false; setSaving(false);
      if (res.success && res.data) {
        setPracticeFinished(res.data);
        void fetchNotebooks();
      } else {
        showNotice(res.message || 'Chưa lưu được kết quả. Vui lòng bấm thử lại.');
      }
    }
  };

  const currentItem = selectedNotebook?.items?.[practiceIndex];

  return (
    <div className="flex w-full min-w-0 flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className={labelClass}>
            Dictionary & Notebooks{' '}
            <span className="ml-2 font-serif text-[12.5px] font-normal normal-case tracking-[0.06em]">辞書・単語帳</span>
          </div>
          <h2 className="mt-3 text-[17px] font-semibold text-fg">Tra cứu Từ điển & Kho từ vựng cá nhân</h2>
          <p className="mt-1.5 text-[12px] leading-[1.8] text-fg-38">
            Tra cứu từ thông dụng có nghĩa tiếng Việt và tiếng Anh; tìm theo chữ Nhật, kana, romaji hoặc nghĩa.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="inline-flex border border-rule bg-card p-1">
          <button
            type="button"
            onClick={() => setActiveTab('DICTIONARY')}
            className={`cursor-pointer px-4 py-1.5 text-[12px] font-medium transition-colors ${
              activeTab === 'DICTIONARY' ? 'bg-fg text-bg font-semibold' : 'text-fg-60 hover:text-fg'
            }`}
          >
            Tra cứu từ điển
          </button>
          <button
            type="button"
            onClick={() => {
              if (!user) {
                onRequireLogin();
                return;
              }
              setActiveTab('NOTEBOOKS');
            }}
            className={`cursor-pointer px-4 py-1.5 text-[12px] font-medium transition-colors ${
              activeTab === 'NOTEBOOKS' ? 'bg-fg text-bg font-semibold' : 'text-fg-60 hover:text-fg'
            }`}
          >
            Kho từ vựng cá nhân
          </button>
        </div>
      </div>

      {notice && (
        <div role="status" className="mt-5 border-l-2 border-l-fg-60 bg-tint px-4 py-2.5 text-[12.5px] text-fg animate-toast-in">
          {notice}
        </div>
      )}

      {/* TAB 1: DICTIONARY SEARCH */}
      {activeTab === 'DICTIONARY' && (
        <div className="mt-8 flex flex-col gap-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                aria-label="Từ khoá tra cứu"
                maxLength={100}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="日本語, にほんご, nihongo, nghĩa Việt / Anh…"
                className="w-full border border-rule bg-card px-4 py-3 pl-10 text-[13.5px] text-fg placeholder:text-fg-38 focus:border-fg-60 focus:outline-none"
              />
              <Search size={16} className="absolute left-3.5 top-3.5 text-fg-38" />
            </div>
            <SubmitButton type="submit" loading={isSearching} variant="primary">
              Tra cứu
            </SubmitButton>
          </form>
          <p className="text-[12.5px] leading-[1.8] text-fg-60">
            Từ phổ biến có cả nghĩa Việt và Anh đã đối chiếu; các mục khác dùng nghĩa tiếng Anh của JMdict.
            {' '}Nguồn đối chiếu: <a className="underline" href="https://www.edrdg.org/jmdict/j_jmdict.html" target="_blank" rel="noreferrer">JMdict / EDRDG</a>,{' '}
            <a className="underline" href="https://marugoto.jpf.go.jp/en/teacher/resource/starter_c/" target="_blank" rel="noreferrer">Marugoto A1</a>,{' '}
            <a className="underline" href="https://vietcafe-learning.com/dictionary/%E5%8C%BB%E8%80%85" target="_blank" rel="noreferrer">VIETCAFE</a>,{' '}
            <a className="underline" href="https://jdict.net/" target="_blank" rel="noreferrer">Jdict</a>.
            {' · '}<a className="underline" href="https://www.edrdg.org/edrdg/licence.html" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.
          </p>
          {isSearching && <p role="status" className="text-[12.5px] text-fg-60">Đang tra cứu…</p>}

          {searchResult && (
            <div className="mt-2 flex flex-col gap-8">
              <div className="text-[12px] text-fg-38">
                Tìm thấy <strong className="font-semibold text-fg">{searchResult.totalMatches}</strong> kết quả cho "
                {searchResult.query}"
              </div>

              {/* Vocabularies */}
              {searchResult.vocabularies.length > 0 && (
                <div>
                  <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-fg-60">
                    Từ vựng ({searchResult.vocabularies.length})
                  </h3>
                  <div className="grid gap-3 min-[768px]:grid-cols-2">
                    {searchResult.vocabularies.map((v) => {
                      const [primaryEnglishMeaning, ...additionalEnglishMeanings] = v.meaning.split(' / ');
                      return (
                      <div key={v.id} className="relative flex flex-col justify-between border border-rule bg-card p-4">
                        <div>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-serif text-[20px] font-semibold text-fg">{v.word}</span>
                            <span className="font-serif text-[13px] text-fg-60">{v.reading}</span>
                          </div>
                          {v.sinoVietnamese && (
                            <div className="mt-0.5 text-[11px] font-medium text-fg-38">{v.sinoVietnamese}</div>
                          )}
                          <div className="mt-2 space-y-1.5 text-[13.5px]">
                            {v.meaningLanguage === 'en' ? <>
                              <div><span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-fg-38">Việt</span><span className="font-medium text-fg">{v.vietnameseMeaning || 'Chưa có nghĩa Việt đã đối chiếu'}</span></div>
                              <div><span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-fg-38">Anh</span><span className="text-fg-60">{primaryEnglishMeaning}</span></div>
                              {additionalEnglishMeanings.length > 0 && <details className="ml-8 text-[11.5px] text-fg-60"><summary className="cursor-pointer">Các nghĩa khác ({additionalEnglishMeanings.length})</summary><div className="mt-1 leading-[1.7]">{additionalEnglishMeanings.join(' / ')}</div></details>}
                            </> : <div className="font-medium text-fg">{v.meaning}</div>}
                          </div>
                          <div className="mt-2 text-[12.5px] text-fg-38">{v.meaningLanguage === 'en' ? 'JMdict / EDRDG · nghĩa Anh' : 'Giáo trình HeyGanba · nghĩa Việt'}</div>
                          {v.exampleSentence && (
                            <div className="mt-3 border-t border-rule/50 pt-2 text-[12px] text-fg-60">
                              <div className="font-serif">{v.exampleSentence}</div>
                              {v.exampleReading && <div className="text-[11px] text-fg-38">{v.exampleReading}</div>}
                              {v.exampleMeaning && <div className="mt-0.5 text-fg-60">{v.exampleMeaning}</div>}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex justify-between border-t border-rule pt-3">
                          <button type="button" onClick={() => speakJapanese(v.reading)} aria-label={`Nghe cách đọc ${v.word}`} className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-[11.5px] text-fg-60 hover:text-fg"><Volume2 size={14} />Nghe</button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!user) {
                                onRequireLogin();
                                return;
                              }
                              setWordToAdd(v);
                              fetchNotebooks();
                            }}
                            className="inline-flex cursor-pointer items-center gap-1.5 text-[11.5px] font-medium text-fg-60 hover:text-fg"
                          >
                            <BookmarkPlus size={13} />
                            <span>Lưu vào sổ tay</span>
                          </button>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>
              )}

              {/* Kanji matches */}
              {searchResult.kanjis.length > 0 && (
                <div>
                  <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-fg-60">
                    Chữ Hán — Kanji ({searchResult.kanjis.length})
                  </h3>
                  <div className="grid gap-3 min-[768px]:grid-cols-3">
                    {searchResult.kanjis.map((k) => (
                      <div key={k.id} className="border border-rule bg-card p-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-12 w-12 items-center justify-center border border-rule bg-bg font-serif text-[24px] font-bold text-fg">
                            {k.character}
                          </span>
                          <div>
                            <div className="text-[13px] font-semibold text-fg">{k.sinoVietnamese || k.character}</div>
                            <div className="text-[11.5px] text-fg-60">{k.meaning}</div>
                            <div className="text-[10px] text-fg-38">{k.strokeCount} nét</div>
                          </div>
                        </div>
                        {(k.onyomi || k.kunyomi) && (
                          <div className="mt-3 border-t border-rule/50 pt-2 text-[11px] text-fg-38">
                            {k.onyomi && <div>On: {k.onyomi}</div>}
                            {k.kunyomi && <div>Kun: {k.kunyomi}</div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResult.totalMatches === 0 && (
                <div className="py-12 text-center text-[13px] text-fg-38">
                  Không tìm thấy kết quả. Thử dạng từ gốc, cách đọc kana hoặc nghĩa tiếng Anh.
                </div>
              )}
              {searchResult.hasMore && <SubmitButton loading={isSearching} onClick={() => doSearch(searchResult.query, searchResult.page + 1)} variant="secondary">Xem thêm kết quả</SubmitButton>}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NOTEBOOKS */}
      {activeTab === 'NOTEBOOKS' && (
        <div className="mt-8 flex flex-col gap-10">
          <p className="text-[12.5px] leading-[1.8] text-fg-60">Từ JMdict trong sổ có nghĩa tiếng Anh. Nguồn: <a className="underline" href="https://www.edrdg.org/jmdict/j_jmdict.html" target="_blank" rel="noreferrer">JMdict / EDRDG</a> · <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.</p>
          <label className="flex flex-wrap items-center gap-3 text-[12.5px] text-fg-60">Luyện theo
            <select value={practiceKind} onChange={e => setPracticeKind(e.target.value as 'MEANING' | 'READING')} className="min-h-11 border border-rule-strong bg-card px-3 text-fg">
              <option value="MEANING">Nghĩa của từ</option><option value="READING">Cách đọc kana (từ có kanji)</option>
            </select>
          </label>
          {/* Sample Decks */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-fg-60">
                Nhóm từ mẫu (Dekiru Core Curated Decks)
              </h3>
              <span className="text-[11px] text-fg-38">Nhấn để lưu vào sổ tay của bạn</span>
            </div>
            <div className="mt-4 grid gap-3 min-[768px]:grid-cols-3">
              {notebooks
                .filter((n) => n.isPublicSample)
                .sort((a, b) => a.title.localeCompare(b.title, 'vi', { numeric: true }))
                .map((sample) => (
                  <div key={sample.id} className="flex flex-col justify-between border border-rule bg-card p-4">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-fg">{sample.title}</h4>
                        <span className="border border-rule px-1.5 py-0.5 text-[10px] uppercase text-rank">Mẫu</span>
                      </div>
                      <p className="mt-1 text-[11.5px] text-fg-38">{sample.description || 'Bộ từ vựng chuẩn'}</p>
                      <div className="mt-3 text-[12px] font-medium text-fg-60">{sample.itemCount} từ vựng</div>
                    </div>

                    <div className="mt-4 border-t border-rule pt-3">
                      <SubmitButton onClick={() => handleCloneSample(sample.id)} disabled={saving} variant="secondary" className="w-full">
                        <FolderPlus size={13} />
                        <span>Lưu về sổ tay của tôi</span>
                      </SubmitButton>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* User Notebooks */}
          <div className="border-t border-rule pt-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-fg-60">
                  Sổ từ vựng của bạn ({notebooks.filter((n) => !n.isPublicSample).length})
                </h3>
                <span className="text-[11px] text-fg-38">Nhóm từ tự chọn do bạn tạo</span>
              </div>
              <SubmitButton onClick={() => setShowCreateModal(true)} variant="primary">
                <Plus size={14} />
                <span>Tạo sổ từ mới</span>
              </SubmitButton>
            </div>

            {loadingNotebooks && (
              <div className="mt-4 text-[12px] text-fg-38">Đang tải danh sách sổ tay...</div>
            )}

            <div className="mt-4 grid gap-4 min-[768px]:grid-cols-3">
              {notebooks
                .filter((n) => !n.isPublicSample)
                .map((nb) => {
                  const isSelected = selectedNotebook?.id === nb.id;
                  return (
                    <div
                      key={nb.id}
                      className={`flex flex-col justify-between border p-4 transition-all ${
                        isSelected ? 'border-rank bg-tint' : 'border-rule bg-card'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-fg">{nb.title}</h4>
                          <button
                            type="button"
                            onClick={() => handleDeleteNotebook(nb.id)}
                            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center text-fg-38 hover:text-red"
                            title="Xoá sổ này"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        {nb.description && <p className="mt-1 text-[11.5px] text-fg-38">{nb.description}</p>}
                        <div className="mt-3 text-[12px] text-fg-60">{nb.itemCount} từ vựng</div>
                      </div>

                      <div className="mt-4 flex gap-2 border-t border-rule pt-3">
                        <button
                          type="button"
                          onClick={() => setSelectedNotebook(nb)}
                          className="flex-1 cursor-pointer border border-rule px-3 py-1.5 text-center text-[11.5px] font-medium text-fg hover:border-fg"
                        >
                          Xem từ ({nb.itemCount})
                        </button>
                        <SubmitButton
                          onClick={() => startPractice(nb)}
                          disabled={nb.itemCount === 0}
                          variant="secondary"
                          className="px-3"
                          title="Luyện tập tự do nhóm từ này"
                        >
                          <Play size={12} />
                          <span>Luyện tập</span>
                        </SubmitButton>
                      </div>
                    </div>
                  );
                })}

              {notebooks.filter((n) => !n.isPublicSample).length === 0 && (
                <div className="col-span-3 py-10 text-center text-[13px] text-fg-38">
                  Bạn chưa tạo sổ từ vựng nào. Hãy bấm "Tạo sổ từ mới" hoặc "Lưu về sổ tay của tôi" từ các nhóm từ mẫu ở trên!
                </div>
              )}
            </div>
          </div>

          {/* Selected Notebook Words List */}
          {selectedNotebook && (
            <div className="mt-4 border-t border-rule pt-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className={labelClass}>Chi tiết sổ tay</div>
                  <h3 className="mt-1 font-serif text-[18px] font-semibold text-fg">{selectedNotebook.title}</h3>
                  {selectedNotebook.description && (
                    <p className="text-[12px] text-fg-38">{selectedNotebook.description}</p>
                  )}
                </div>
                <SubmitButton
                  onClick={() => startPractice(selectedNotebook)}
                  disabled={!selectedNotebook.items || selectedNotebook.items.length === 0}
                  variant="primary"
                >
                  <Play size={13} />
                  <span>Bắt đầu luyện tập nhóm từ này</span>
                </SubmitButton>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse text-[12.5px]">
                  <thead>
                    <tr>
                      <th className="border-b border-rule pb-2 text-left font-semibold uppercase tracking-[0.14em] text-fg-38">
                        Từ vựng
                      </th>
                      <th className="border-b border-rule pb-2 text-left font-semibold uppercase tracking-[0.14em] text-fg-38">
                        Cách đọc
                      </th>
                      <th className="border-b border-rule pb-2 text-left font-semibold uppercase tracking-[0.14em] text-fg-38">
                        Hán Việt
                      </th>
                      <th className="border-b border-rule pb-2 text-left font-semibold uppercase tracking-[0.14em] text-fg-38">
                        Ý nghĩa
                      </th>
                      <th className="border-b border-rule pb-2 text-left font-semibold uppercase tracking-[0.14em] text-fg-38">
                        Ghi chú
                      </th>
                      <th className="border-b border-rule px-3 pb-2 text-left font-semibold text-fg-38">Đúng / Lượt luyện</th>
                      <th className="border-b border-rule pb-2 text-right font-semibold uppercase tracking-[0.14em] text-fg-38">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedNotebook.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="border-b border-rule py-3 font-serif text-[15px] font-semibold text-fg">
                          {item.word}
                        </td>
                        <td className="border-b border-rule py-3 font-serif text-fg-60">{item.reading}</td>
                        <td className="border-b border-rule py-3 text-fg-38">{item.sinoVietnamese || '—'}</td>
                        <td className="border-b border-rule py-3 text-fg">{item.meaning}{item.vietnameseMeaning ? ` · ${item.vietnameseMeaning}` : ''}</td>
                        <td className="border-b border-rule py-3 text-fg-38">{item.customNote || '—'}</td>
                        <td className="border-b border-rule px-3 py-3 text-fg-60">{item.practiceCount ? `${item.correctCount}/${item.practiceCount} đúng` : 'Chưa luyện'}</td>
                        <td className="border-b border-rule py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveWord(selectedNotebook.id, item.vocabularyId)}
                            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center text-fg-38 hover:text-red"
                            title="Xoá khỏi sổ"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!selectedNotebook.items || selectedNotebook.items.length === 0) && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-fg-38">
                          Sổ tay này chưa có từ vựng. Vào mục "Tra cứu từ điển" để thêm từ vựng vào đây nhé!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE NOTEBOOK MODAL */}
      {showCreateModal && (
        <Modal title="Tạo sổ từ" onClose={() => setShowCreateModal(false)}>
            <h3 className="font-serif text-[17px] font-semibold text-fg">Tạo sổ từ vựng cá nhân</h3>
            <form onSubmit={handleCreateNotebook} className="mt-4 flex flex-col gap-4">
              <div>
                <label className={labelClass}>Tên sổ từ</label>
                <input
                  type="text"
                  required
                  aria-label="Tên sổ từ"
                  maxLength={200}
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="VD: Từ vựng N5 hay quên, Đi ăn quán..."
                  className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                />
              </div>
              <div>
                <label className={labelClass}>Mô tả (tuỳ chọn)</label>
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Mục đích hoặc ghi chú của sổ từ này..."
                  className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                />
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="cursor-pointer border border-rule px-4 py-2 text-[12px] text-fg-60 hover:text-fg"
                >
                  Huỷ
                </button>
                <SubmitButton type="submit" loading={saving} variant="primary">
                  Tạo sổ
                </SubmitButton>
              </div>
            </form>
        </Modal>
      )}

      {/* ADD WORD MODAL */}
      {wordToAdd && !showCreateModal && (
        <Modal title="Thêm từ vào sổ" onClose={() => setWordToAdd(null)}>
            <h3 className="font-serif text-[17px] font-semibold text-fg">Thêm từ vào Sổ từ vựng</h3>
            <div className="mt-3 border-l-2 border-l-rank bg-tint p-3 text-[13px]">
              <span className="font-serif font-bold text-fg">{wordToAdd.word}</span>{' '}
              <span className="text-fg-60">({wordToAdd.reading})</span> — {wordToAdd.meaning}{wordToAdd.vietnameseMeaning ? ` · ${wordToAdd.vietnameseMeaning}` : ''}
            </div>

            <form onSubmit={handleAddWordSubmit} className="mt-4 flex flex-col gap-4">
              <div>
                <label className={labelClass}>Chọn sổ từ vựng</label>
                <select
                  aria-label="Chọn sổ từ vựng"
                  value={targetNotebookId ?? ''}
                  onChange={(e) => setTargetNotebookId(Number(e.target.value))}
                  className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                  required
                >
                  <option value="" disabled>Chọn sổ từ…</option>
                  {notebooks
                    .filter((n) => !n.isPublicSample)
                    .map((nb) => (
                      <option key={nb.id} value={nb.id}>
                        {nb.title} ({nb.itemCount} từ)
                      </option>
                    ))}
                </select>
              </div>
              {!notebooks.some(n => !n.isPublicSample) && <div className="text-[12.5px] text-fg-60">
                Bạn chưa có sổ cá nhân. <button type="button" className="cursor-pointer underline" onClick={() => setShowCreateModal(true)}>Tạo sổ đầu tiên</button>
              </div>}
              <div>
                <label className={labelClass}>Ghi chú cá nhân (tuỳ chọn)</label>
                <input
                  type="text"
                  value={customNote}
                  maxLength={2000}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="VD: Hay nhầm âm ngắt, bài 3..."
                  className="mt-1 w-full border border-rule bg-bg px-3 py-2 text-[13px] text-fg focus:border-fg focus:outline-none"
                />
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setWordToAdd(null)}
                  className="cursor-pointer border border-rule px-4 py-2 text-[12px] text-fg-60 hover:text-fg"
                >
                  Huỷ
                </button>
                <SubmitButton type="submit" loading={saving} disabled={!targetNotebookId} variant="primary">
                  Lưu từ
                </SubmitButton>
              </div>
            </form>
        </Modal>
      )}

      {/* PRACTICE MODAL */}
      {practiceActive && selectedNotebook && (
        <Modal title="Luyện sổ từ" onClose={() => setPracticeActive(false)} onKeyDown={e => {
          if (practiceFinished || saving || (e.target as HTMLElement).matches('input, textarea, select')) return;
          const index = Number(e.key) - 1;
          if (!isAnswered && index >= 0 && index < currentOptions.length) { e.preventDefault(); handleSelectOption(currentOptions[index]); }
          if (isAnswered && e.key === 'Enter') { e.preventDefault(); void handleNextQuestion(); }
        }}>
            {selectedNotebook.items.some(i => i.meaningLanguage === 'en') && <p className="mb-3 text-[11.5px] leading-[1.8] text-fg-60">Nghĩa tiếng Anh: <a className="underline" href="https://www.edrdg.org/jmdict/j_jmdict.html" target="_blank" rel="noreferrer">JMdict / EDRDG</a> · <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.</p>}
            {!practiceFinished ? (
              <div>
                <div className="flex items-center justify-between text-[11px] text-fg-38">
                  <span>
                    Câu {practiceIndex + 1} / {selectedNotebook.items.length} · Đúng {practiceScore}
                  </span>
                  <span className="font-semibold text-rank">Luyện tập tự do (Không ảnh hưởng SRS)</span>
                </div>

                <div className="my-8 text-center">
                  <div className="font-serif text-[36px] font-bold text-fg">{currentItem?.word}</div>
                  {currentItem && (questionKind(currentItem) !== 'READING' || isAnswered) && <div className="mt-1 font-serif text-[15px] text-fg-60">{currentItem.reading}</div>}
                  <p className="mt-3 text-[12.5px] text-fg-60">{currentItem && questionKind(currentItem) === 'READING' ? 'Chọn cách đọc kana' : `Chọn nghĩa ${currentItem?.meaningLanguage === 'en' ? 'tiếng Anh' : 'tiếng Việt'}`}</p>
                  {currentItem?.sinoVietnamese && (
                    <div className="mt-0.5 text-[12px] text-fg-38">{currentItem?.sinoVietnamese}</div>
                  )}
                </div>

                <div className="flex flex-col gap-2.5">
                  {currentOptions.map((opt, idx) => {
                    const isCorrect = currentItem && opt === answerFor(currentItem, questionKind(currentItem));
                    const isChosen = selectedOption === opt;
                    let btnStyle = 'border-rule hover:border-fg text-fg bg-bg';
                    if (isAnswered) {
                      if (isCorrect) btnStyle = 'border-rank bg-rank/15 text-rank font-semibold';
                      else if (isChosen) btnStyle = 'border-red bg-red/15 text-red';
                      else btnStyle = 'border-rule text-fg-38 opacity-50 bg-bg';
                    }
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectOption(opt)}
                        disabled={isAnswered}
                        className={`cursor-pointer border p-3.5 text-left text-[13px] transition-all ${btnStyle}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {isAnswered && (
                  <div className="mt-6 flex justify-end">
                    <SubmitButton onClick={handleNextQuestion} loading={saving} shortcutHint="Enter" variant="primary">
                      {practiceIndex + 1 < selectedNotebook.items.length ? 'Câu tiếp theo →' : 'Xem kết quả'}
                    </SubmitButton>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <CheckCircle2 size={40} className="mx-auto text-rank" />
                <h3 className="mt-4 font-serif text-[22px] font-semibold text-fg">Hoàn thành phiên luyện tập!</h3>
                <p className="mt-2 text-[13px] text-fg-60">{practiceFinished.notebookTitle}</p>

                <div className="my-6 border border-rule bg-bg p-4 text-[13px]">
                  <div className="flex justify-between py-1">
                    <span className="text-fg-38">Trả lời đúng:</span>
                    <b className="font-semibold text-fg">
                      {practiceFinished.correctCount} / {practiceFinished.totalCount} câu
                    </b>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-fg-38">Kinh nghiệm nhận được:</span>
                    <b className="font-semibold text-rank">+{practiceFinished.expEarned} EXP</b>
                  </div>
                </div>

                <div className="border-l-2 border-l-rank bg-tint p-3 text-left text-[12px] leading-[1.7] text-fg-60">
                  {practiceFinished.note}
                </div>

                <div className="mt-6 flex justify-center">
                  <SubmitButton onClick={() => setPracticeActive(false)} variant="primary">
                    Đóng cửa sổ
                  </SubmitButton>
                </div>
              </div>
            )}
        </Modal>
      )}
    </div>
  );
};
