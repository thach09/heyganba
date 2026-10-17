from pathlib import Path

def edit(file, transform):
    p = Path(file)
    p.write_text(transform(p.read_text(encoding='utf-8')), encoding='utf-8')

def flash(s):
    a = s.index('  // Curriculum Level Filter')
    b = s.index('  // Filtered lessons', a)
    s = s[:a] + '''  // URL is the source of truth, including back/forward and removing the filter.
  const rawLevel = (searchParams.get('level') || '').trim().toUpperCase().replace(/\\s/g, '');
  const selectedLevelFilter = /^(HSK)?[1-6]$/.test(rawLevel)
    ? `HSK ${rawLevel.slice(-1)}` : rawLevel === 'INTRO' ? 'Nhập môn' : 'ALL';
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>('');
  const availableLevels = ['Nhập môn', ...[1, 2, 3, 4, 5, 6].map(n => `HSK ${n}`)];
  const setSelectedLevelFilter = (level: string) => {
    const params = new URLSearchParams(searchParams);
    if (level === 'ALL') params.delete('level');
    else params.set('level', level === 'Nhập môn' ? 'INTRO' : level.replace(' ', ''));
    setSearchParams(params);
    setSelectedLesson(null);
  };

''' + s[b:]
    # A selected lesson must belong to the visible catalog after level/search changes.
    a = s.index('  // Filtered lesson words')
    s = s[:a] + '''  useEffect(() => {
    if (!displayedLessons.some(lesson => lesson.id === selectedLesson?.id)) {
      setSelectedLesson(displayedLessons[0] ?? null);
      setLessonWords([]);
    }
  }, [displayedLessons, selectedLesson?.id]);

''' + s[a:]
    s = s.replace('Giáo trình Từ vựng HSK 1 & HSK 2: APPROVED · Đã kiểm duyệt', 'Từ vựng HSK 1–6 · Nội dung đã duyệt')
    s = s.replace('(Bao gồm 150 từ HSK 1 và 68+ từ HSK 2 theo chuẩn HSK 3.0, mở khoá toàn bộ cho học viên ôn tập SRS)', '(Học theo chủ đề và ôn tập SRS theo cấp độ)')
    s = s.replace("{lesson.curriculumLevel === 'HSK 2' ? 'Giáo trình Chuẩn HSK 2' : lesson.curriculumLevel === 'HSK 1' ? 'Giáo trình Chuẩn HSK 1' : 'Khóa Nhập môn'}", "{lesson.curriculumLevel || 'Nhập môn'}")
    s = s.replace('flex items-center justify-between text-[11px]', 'flex min-w-0 flex-wrap items-center justify-between gap-2 text-[11px]')
    s = s.replace('mt-4 flex items-center justify-between pt-3', 'mt-4 flex flex-wrap items-center justify-between gap-2 pt-3')
    s = s.replace('absolute z-30 pointer-events-none mt-20', 'flex justify-center py-3 pointer-events-none')
    return s

edit('frontend/src/features/flashcard/FlashcardView.tsx', flash)

def grammar(s):
    a = s.index('const HSK_LEVEL_OPTIONS'); b = s.index('\n\n', a)
    s = s[:a] + "const HSK_LEVEL_OPTIONS = [{ level: 'ALL', label: 'Tất cả' }, ...[1, 2, 3, 4, 5, 6].map(n => ({ level: `HSK ${n}`, label: `HSK ${n}` }))];" + s[b:]
    s = s.replace('if (rule.hskLevel && rule.hskLevel !== targetLevel)', 'if (rule.hskLevel !== targetLevel)')
    s = s.replace('{opt.label}', "{opt.label} ({rules.filter(rule => opt.level === 'ALL' || rule.hskLevel === Number(opt.level.slice(-1))).length})")
    s = s.replace('onClick={() => setSelectedHskLevel(opt.level)}', 'onClick={() => { setSelectedHskLevel(opt.level); setSelectedRule(null); setDetailOpen(false); }}')
    return s

edit('frontend/src/features/grammar/GrammarView.tsx', grammar)
edit('frontend/src/features/hanzi/HanziStationView.tsx', lambda s: s
    .replace("(['ALL', 1, 2, 3] as const)", "(['ALL', 1, 2, 3, 4, 5, 6] as const)")
    .replace('absolute left-1 top-1 rounded bg-amber-500/15 px-1 py-0.2 text-[8px] font-semibold text-amber-500', 'mb-1 text-[12.5px] leading-relaxed text-red')
    .replace('absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-jade', 'mt-1 h-1.5 w-1.5 bg-rank')
    .replace('pointer-events-none absolute bottom-4 right-4 z-20', 'pointer-events-none flex justify-end py-3')
    .replace('grid grid-cols-4 gap-2', 'grid grid-cols-[repeat(auto-fill,minmax(94px,1fr))] gap-2'))

def reading(s):
    marker = '  const [selectedPassageId'
    a = s.index(marker)
    s = s[:a] + "  const [readingLevel, setReadingLevel] = useState<number | 'ALL'>('ALL');\n" + s[a:]
    s = s.replace("const activePassage = ALL_READING_PASSAGES.find((p) => p.id === selectedPassageId) || ALL_READING_PASSAGES[0];", "const passages = ALL_READING_PASSAGES.filter(p => readingLevel === 'ALL' || p.hskLevel === readingLevel);\n        const activePassage = passages.find((p) => p.id === selectedPassageId) || passages[0];")
    s = s.replace('HSK 1 · HSK 2</span>', 'HSK 1–6</span>').replace('văn bản ngữ cảnh HSK 1 & HSK 2.', 'văn bản ngữ cảnh HSK 1–6.')
    s = s.replace('{/* Passage Selector */}', '''<div className="flex flex-wrap gap-2" aria-label="Cấp độ bài đọc">
              {(['ALL', 1, 2, 3, 4, 5, 6] as const).map(level => (
                <button type="button" key={level} aria-pressed={readingLevel === level}
                  className="border border-rule-strong px-3 py-2 text-[12.5px] leading-relaxed text-fg-60"
                  onClick={() => { setReadingLevel(level); setReadingAnswers({}); setReadingChecked(false); setShowTranslation(false); }}>
                  {level === 'ALL' ? 'Tất cả' : `HSK ${level}`} ({ALL_READING_PASSAGES.filter(p => level === 'ALL' || p.hskLevel === level).length})
                </button>
              ))}
            </div>
            {/* Passage Selector */}''')
    s = s.replace('ALL_READING_PASSAGES.map((passage)', 'passages.map((passage)')
    return s

edit('frontend/src/features/dictionary/DictionaryNotebookView.tsx', reading)
edit('frontend/src/features/dictionary/types.ts', lambda s:s.replace('export interface ReadingPassageItem {', 'export interface ReadingPassageItem {\n  hskLevel: number;'))
edit('frontend/src/features/dictionary/readingData.ts', lambda s:s.replace('id: 1,', 'id: 1, hskLevel: 1,').replace('id: 2,', 'id: 2, hskLevel: 1,').replace('id: 3,', 'id: 3, hskLevel: 1,').replace('id: 4,', 'id: 4, hskLevel: 2,').replace('id: 5,', 'id: 5, hskLevel: 2,'))

# Keep titles and controls in normal flow throughout station headers.
for file in ['grammar/GrammarView.tsx', 'pinyin/PinyinStationView.tsx', 'dictionary/DictionaryNotebookView.tsx', 'exam/ExamView.tsx']:
    edit('frontend/src/features/' + file, lambda s:s
        .replace('flex items-center justify-between gap-6', 'flex min-w-0 flex-wrap items-center justify-between gap-6')
        .replace('flex items-center gap-2.5', 'flex min-w-0 flex-wrap items-center gap-2.5')
        .replace('flex items-center gap-3', 'flex min-w-0 flex-wrap items-center gap-3'))
