import { lazy, Suspense } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from './useAuth';
import { ErrorBoundary } from './ErrorBoundary';

const Dashboard = lazy(() => import('../features/dashboard/DashboardView').then(m => ({ default: m.DashboardView })));
const Kana = lazy(() => import('../features/kana/KanaStationView').then(m => ({ default: m.KanaStationView })));
const Flashcard = lazy(() => import('../features/flashcard/FlashcardView').then(m => ({ default: m.FlashcardView })));
const Dictionary = lazy(() => import('../features/dictionary/DictionaryNotebookView').then(m => ({ default: m.DictionaryNotebookView })));
const Kanji = lazy(() => import('../features/kanji/KanjiStationView').then(m => ({ default: m.KanjiStationView })));
const Grammar = lazy(() => import('../features/grammar/GrammarView').then(m => ({ default: m.GrammarView })));
const GrammarRule = lazy(() => import('../features/grammar/GrammarRulePage').then(m => ({ default: m.GrammarRulePage })));
const Exam = lazy(() => import('../features/exam/ExamView').then(m => ({ default: m.ExamView })));
const Admin = lazy(() => import('../features/admin/AdminView').then(m => ({ default: m.AdminView })));

function KanaRoute() {
  const [params, setParams] = useSearchParams();
  const script = params.get('script') === 'katakana' ? 'KATAKANA' : 'HIRAGANA';
  return <Kana script={script} onScriptChange={value => {
    const next = new URLSearchParams(params);
    next.set('script', value === 'KATAKANA' ? 'katakana' : 'hiragana');
    setParams(next);
  }} />;
}
function AdminRoute() {
  const { user } = useAuth();
  if (user?.role === 'ROLE_ADMIN') return <Admin />;
  return <div className="mx-auto flex w-full max-w-[520px] flex-col items-center pt-16 text-center">
    <span className="font-serif text-[30px] font-light leading-none text-fg-38">403</span>
    <h3 className="mt-4 text-[15px] font-semibold text-fg">Không có quyền truy cập</h3>
    <p className="mt-2 text-[12.5px] leading-[1.9] text-fg-60">Vui lòng đăng nhập bằng tài khoản Administrator để truy cập khu vực này.</p>
    <Link to="/" className="mt-6 text-[11.5px] text-fg-38 underline underline-offset-2 transition-colors hover:text-fg">← Về trang chủ</Link>
  </div>;
}
export function AppRoutes() {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}><Suspense fallback={<p role="status" className="py-6 text-[12.5px] text-fg-60">Đang tải trạm học...</p>}>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/kana" element={<KanaRoute />} />
      <Route path="/vocabulary" element={<Flashcard />} />
      <Route path="/dictionary" element={<Dictionary />} />
      <Route path="/kanji" element={<Kanji />} />
      <Route path="/grammar" element={<Grammar />} />
      <Route path="/grammar/:ruleId" element={<GrammarRule />} />
      <Route path="/exam" element={<Exam />} />
      <Route path="/admin" element={<AdminRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense></ErrorBoundary>;
}
