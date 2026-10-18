import { lazy, Suspense } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { ErrorBoundary } from './ErrorBoundary';

const Dashboard = lazy(() => import('../features/dashboard/DashboardView').then(m => ({ default: m.DashboardView })));
const Flashcard = lazy(() => import('../features/flashcard/FlashcardView').then(m => ({ default: m.FlashcardView })));
const Dictionary = lazy(() => import('../features/dictionary/DictionaryNotebookView').then(m => ({ default: m.DictionaryNotebookView })));
const Pinyin = lazy(() => import('../features/pinyin/PinyinStationView').then(m => ({ default: m.PinyinStationView })));
const Hanzi = lazy(() => import('../features/hanzi/HanziStationView').then(m => ({ default: m.HanziStationView })));
const Grammar = lazy(() => import('../features/grammar/GrammarView').then(m => ({ default: m.GrammarView })));
const GrammarRule = lazy(() => import('../features/grammar/GrammarRulePage').then(m => ({ default: m.GrammarRulePage })));
const Exam = lazy(() => import('../features/exam/ExamView').then(m => ({ default: m.ExamView })));
const Admin = lazy(() => import('../features/admin/AdminView').then(m => ({ default: m.AdminView })));

function AdminRoute() {
  const { user } = useAuth();
  if (user?.role === 'ROLE_ADMIN') return <Admin />;
  return <div className="mx-auto flex w-full max-w-[520px] flex-col items-center pt-16 text-center">
    <span className="font-serif text-[30px] font-light leading-none text-fg-38">403</span>
    <h3 className="mt-4 text-[15px] font-semibold text-fg">Không có quyền truy cập</h3>
    <p className="mt-2 text-[12.5px] leading-[1.9] text-fg-60">Vui lòng đăng nhập bằng tài khoản quản trị viên để truy cập khu vực này.</p>
    <Link to="/" className="mt-6 text-[11.5px] text-fg-38 underline underline-offset-2 transition-colors hover:text-fg">← Về trang chủ</Link>
  </div>;
}

export function AppRoutes() {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}><Suspense fallback={<p role="status" className="py-6 text-[12.5px] text-fg-60">Đang tải trạm học...</p>}>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/pinyin" element={<Pinyin />} />
      <Route path="/vocabulary" element={<Flashcard />} />
      <Route path="/dictionary" element={<Dictionary />} />
      <Route path="/hanzi" element={<Hanzi />} />
      <Route path="/grammar" element={<Grammar />} />
      <Route path="/grammar/:ruleId" element={<GrammarRule />} />
      <Route path="/exam" element={<Exam />} />
      <Route path="/admin" element={<AdminRoute />} />
      {/* Legacy routes: redirect so old deep links stay functional */}
      <Route path="/flashcards" element={<Navigate to="/vocabulary" replace />} />
      <Route path="/flashcard" element={<Navigate to="/vocabulary" replace />} />
      <Route path="/kana" element={<Navigate to="/pinyin" replace />} />
      <Route path="/hanzi" element={<Navigate to="/hanzi" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense></ErrorBoundary>;
}
