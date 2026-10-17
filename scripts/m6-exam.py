from pathlib import Path
def edit(file, fn):
    p=Path(file);p.write_text(fn(p.read_text(encoding='utf-8')),encoding='utf-8')
base='backend/src/main/java/com/heyganba/'
edit(base+'dto/exam/ExamGenerateRequest.java',lambda s:s.replace('Integer durationMinutes\n', 'Integer durationMinutes,\n\n        @Min(1) @Max(6) Integer hskLevel\n').replace(') {\n}', ') {\n    public ExamGenerateRequest(Integer totalQuestions, Integer durationMinutes) {\n        this(totalQuestions, durationMinutes, null);\n    }\n}'))
edit(base+'model/entity/MockExam.java',lambda s:s.replace('    @CreationTimestamp', '    @Column(name = "hsk_level")\n    private Integer hskLevel;\n\n    @CreationTimestamp'))
edit(base+'model/entity/ReadingPassage.java',lambda s:s.replace('    @CreationTimestamp', '    @Column(name = "hsk_level")\n    private Integer hskLevel;\n\n    @CreationTimestamp'))
for file, key in [('ExamResponse.java','List<ExamQuestionResponse> questions'),('ExamSubmitResponse.java','List<QuestionResult> details'),('ExamHistoryResponse.java','Instant submittedAt')]:
    edit(base+'dto/exam/'+file,lambda s,key=key:s.replace(key+'\n',key+',\n        Integer hskLevel,\n        int maximumScore,\n        int passingScore,\n        double scaledScore\n' if file!='ExamResponse.java' else key+',\n        Integer hskLevel,\n        int maximumScore,\n        int passingScore\n'))

def service(s):
    s=s.replace('List<Question> questions = buildQuestions(totalQuestions);', '''Integer level = request.hskLevel();
        List<Question> questions = level == null ? buildQuestions(totalQuestions) : buildHskQuestions(totalQuestions, level);''')
    s=s.replace('.user(user)\n                .totalQuestions', '.user(user)\n                .hskLevel(level)\n                .totalQuestions')
    s=s.replace('result.getCreatedAt()))', '''result.getCreatedAt(), result.getExam().getHskLevel(), maximumScore(result.getExam()),
                        passingScore(result.getExam()), scaledScore(result.getExam(), result.getScorePercent())))''')
    s=s.replace('                details\n', '''                details, exam.getHskLevel(), maximumScore(exam), passingScore(exam), scaledScore(exam, result.getScorePercent())
''')
    s=s.replace('                questionResponses\n', '                questionResponses, exam.getHskLevel(), maximumScore(exam), passingScore(exam)\n')
    s=s.replace('int durationSeconds = (int)', '''if (exam.getHskLevel() != null) {
            // Each section contributes exactly 100 points, regardless of question count.
            double sectionTotal = 0;
            for (String section : exam.getHskLevel() <= 2 ? List.of("LISTENING", "READING") : List.of("LISTENING", "READING", "GRAMMAR")) {
                long count = details.stream().filter(d -> section.equals(d.type())).count();
                long correct = details.stream().filter(d -> section.equals(d.type()) && d.correct()).count();
                sectionTotal += count == 0 ? 0 : correct * 100.0 / count;
            }
            scorePercent = round1(sectionTotal * 100 / maximumScore(exam));
        }
        int durationSeconds = (int)''')
    a=s.index('    private List<Question> buildQuestions')
    s=s[:a]+'''    private static int maximumScore(MockExam exam) {
        return exam.getHskLevel() != null && exam.getHskLevel() >= 3 ? 300 : 200;
    }

    private static int passingScore(MockExam exam) { return maximumScore(exam) * 3 / 5; }

    private static double scaledScore(MockExam exam, double percent) { return round1(percent * maximumScore(exam) / 100); }

    private List<Question> buildHskQuestions(int total, int level) {
        // Explicit APPROVED checks also apply to administrators taking a student exam.
        List<Vocabulary> words = new ArrayList<>(vocabularyRepository.findCourseWords().stream()
                .filter(v -> v.getReviewStatus() == ReviewStatus.APPROVED && Integer.valueOf(level).equals(v.getHskLevel())).toList());
        List<GrammarExercise> grammar = new ArrayList<>(grammarExerciseRepository.findAll().stream()
                .filter(e -> e.getReviewStatus() == ReviewStatus.APPROVED && e.getGrammarRule() != null
                        && e.getGrammarRule().getReviewStatus() == ReviewStatus.APPROVED
                        && Integer.valueOf(level).equals(e.getGrammarRule().getHskLevel())).toList());
        Collections.shuffle(words, random);
        Collections.shuffle(grammar, random);
        int sections = level <= 2 ? 2 : 3;
        int listening = total / sections;
        int writing = level <= 2 ? 0 : total / sections;
        int reading = total - listening - writing;
        List<String> meanings = words.stream().map(Vocabulary::getMeaningVi).filter(v -> v != null && !v.isBlank()).distinct().toList();
        if (words.size() < listening + reading || meanings.size() < 4 || grammar.size() < writing) {
            throw new BadRequestException("Chưa đủ câu hỏi đã duyệt cho HSK " + level + ". Hãy chọn ít câu hơn.");
        }
        List<Question> questions = new ArrayList<>();
        for (int i = 0; i < listening + reading; i++) {
            Vocabulary word = words.get(i);
            boolean audio = i < listening;
            questions.add(new Question(questions.size(), audio ? "LISTENING" : "READING",
                    audio ? "Nghe và chọn nghĩa đúng." : "Chọn nghĩa của từ: " + word.getWord(),
                    buildOptions(word.getMeaningVi(), meanings), word.getMeaningVi(),
                    word.getWord() + " · " + word.getPinyin() + " · " + word.getMeaningVi(), audio ? word.getWord() : null));
        }
        for (int i = 0; i < writing; i++) {
            GrammarExercise exercise = grammar.get(i);
            questions.add(new Question(questions.size(), "GRAMMAR", exercise.getQuestionText(),
                    shuffleCopy(parseOptions(exercise.getOptionsJson())), exercise.getCorrectAnswer(), exercise.getExplanation(), null));
        }
        return questions;
    }

'''+s[a:]
    return s
edit(base+'service/ExamService.java',service)

def frontend(s):
    s=s.replace('const [totalQuestions,', 'const [hskLevel, setHskLevel] = useState(1);\n  const [totalQuestions,')
    s=s.replace('JSON.stringify({ totalQuestions, durationMinutes })', 'JSON.stringify({ totalQuestions, durationMinutes, hskLevel })')
    s=s.replace('const scaledHskScore = result ? Math.round((result.correctCount / Math.max(1, result.totalCount)) * 200) : 0;\n  const isHskPassed = scaledHskScore >= 120;', '''const maximumScore = result?.maximumScore ?? exam?.maximumScore ?? (hskLevel <= 2 ? 200 : 300);
  const passingScore = result?.passingScore ?? maximumScore * 0.6;
  const scaledHskScore = result?.scaledScore ?? (result ? Math.round(result.scorePercent * maximumScore / 100) : 0);
  const isHskPassed = scaledHskScore >= passingScore;''')
    s=s.replace('Đề Thi Thử HSK 1 Chuẩn (HSK 1 全真模拟卷)', 'Bài luyện thi HSK {hskLevel}')
    s=s.replace('<b>200 điểm</b>', '<b>{hskLevel <= 2 ? 200 : 300} điểm</b>').replace('<b>120 / 200 điểm (≥ 60%)</b>', '<b>{hskLevel <= 2 ? 120 : 180} / {hskLevel <= 2 ? 200 : 300} điểm (≥ 60%)</b>')
    s=s.replace('HSK 1 Chuẩn Hán ngữ', 'HSK {hskLevel} · Bài luyện nội bộ')
    marker='<div className="flex flex-wrap items-center gap-x-8 gap-y-4">'
    s=s.replace(marker, '''<div className="flex flex-wrap gap-2" aria-label="Cấp độ đề thi">
                {[1, 2, 3, 4, 5, 6].map(level => <button key={level} type="button" aria-pressed={hskLevel === level}
                  className={chipClass(hskLevel === level)} onClick={() => setHskLevel(level)}>HSK {level}</button>)}
              </div>
              <p className="text-[12.5px] leading-relaxed text-fg-60">{hskLevel <= 2 ? 'Nghe 100 + Đọc 100' : 'Nghe 100 + Đọc 100 + Ngữ pháp 100'}. Phần nghe dùng TTS, phần ngữ pháp thay cho viết tự luận trong bài luyện này.</p>
              '''+marker)
    s=s.replace("question.type === 'KANA' || question.type === 'VOCABULARY'", "question.type === 'LISTENING' || question.type === 'KANA' || question.type === 'VOCABULARY'")
    s=s.replace("isListening ? 'Phần 1: Nghe hiểu (听力)' : 'Phần 2: Đọc hiểu & Ngữ pháp (阅读)'", "isListening ? 'Phần 1: Nghe hiểu (听力)' : question.type === 'GRAMMAR' && maximumScore === 300 ? 'Phần 3: Ngữ pháp (语法)' : 'Phần 2: Đọc hiểu & Ngữ pháp (阅读)'")
    s=s.replace('{scaledHskScore}</span> / 200 điểm', '{scaledHskScore} / {maximumScore}</span> điểm')
    s=s.replace("isHskPassed ? '「合格」 ĐẠT TIÊU CHUẨN NĂNG LỰC HSK (≥ 120 điểm)' : '「未合格」 CHƯA ĐẠT TIÊU CHUẨN (< 120 điểm)'", "isHskPassed ? `「合格」 Đạt chuẩn bài luyện (≥ ${passingScore} điểm)` : `「未过」 Cần ôn luyện thêm (< ${passingScore} điểm)`")
    s=s.replace('Đăng nhập để thi thử đề chuẩn HSK 1–3, chấm điểm tự động và xếp hạng theo lớp. Đề thi được tạo ngẫu nhiên từ ngân hàng câu hỏi chính thức.', 'Đăng nhập để luyện thi HSK 1–6, chấm điểm tự động và xếp hạng theo lớp. Đề được tạo từ nội dung đã duyệt theo cấp độ.')
    s=s.replace('Mô phỏng đề thi năng lực Hán ngữ HSK chuẩn (Phần Nghe 听力, Phần Đọc &amp; Điền từ 阅读), tính điểm theo thang 200 điểm chính thức và cấp dấu triện đạt chuẩn.', 'Luyện theo cấp độ HSK 1–6: thang 200 điểm cho HSK 1–2, thang 300 điểm cho HSK 3–6. Đây là bài luyện nội bộ, không cấp chứng chỉ HSK.')
    s=s.replace('Chấm điểm hoàn toàn tự động ở máy chủ với thang chuẩn 200 điểm của Hanban/CTI (ngưỡng đạt: 120/200 điểm).', 'Chấm điểm tại máy chủ: HSK 1–2 đạt 120/200, HSK 3–6 đạt 180/300. Bài luyện ngữ pháp thay cho viết tự luận, không tương đương đề HSK chính thức.')
    s=s.replace('Math.round((item.correctCount / Math.max(1, item.totalCount)) * 200)', 'item.scaledScore ?? Math.round(item.scorePercent * (item.maximumScore ?? 200) / 100)')
    s=s.replace('/ 200</', '/ {item.maximumScore ?? 200}</')
    s=s.replace('rounded-xl border border-rule bg-card p-6 shadow-md', 'min-w-0 bg-card p-6')
    s=s.replace('flex items-center gap-2', 'flex min-w-0 flex-wrap items-center gap-2')
    return s
edit('frontend/src/features/exam/ExamView.tsx',frontend)
edit('frontend/src/features/exam/types.ts',lambda s:s.replace('  examId: number;', '  examId: number;\n  hskLevel?: number;\n  maximumScore?: number;\n  passingScore?: number;\n  scaledScore?: number;'))
