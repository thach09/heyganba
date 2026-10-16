import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Compass, Award, Activity, AlertTriangle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { PinyinStepByStep } from './PinyinStepByStep';
import { PinyinTable } from './PinyinTable';
import { ToneContourWave } from './ToneContourWave';
import { PinyinQuiz } from './PinyinQuiz';
import { StudyPetCompanion } from '../companion/StudyPetCompanion';
import { stopChineseSpeech } from '../../services/chineseSpeech';
import { useAuth } from '../../app/useAuth';
import { PINYIN_METADATA, canAccessPinyinContent } from './pinyinData';

type StationTab = 'STEPS' | 'TABLE' | 'TONES' | 'QUIZ';

export const PinyinStationView: React.FC = () => {
  const { user, requireLogin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<StationTab>('STEPS');

  // Kiểm tra quyền Admin
  const isAdmin = user?.role === 'ROLE_ADMIN';
  const previewParam = searchParams.get('preview') === '1' || searchParams.get('preview') === 'true';

  // Admin có thể chủ động bật/tắt preview (mặc định bật cho Admin nếu không bị tắt)
  const [adminPreviewDisabled, setAdminPreviewDisabled] = useState<boolean>(false);
  const adminPreviewActive = isAdmin && (previewParam || !adminPreviewDisabled);

  // Phân quyền chuẩn: Chỉ khi APPROVED hoặc khi là ADMIN có bật preview mới được xem nội dung.
  // Người dùng thường (dù thêm ?preview=1 trên URL) vẫn KHÔNG được vượt qua màn chờ duyệt.
  const canViewContent = canAccessPinyinContent(
    PINYIN_METADATA.reviewStatus,
    user?.role,
    adminPreviewActive
  );

  const attemptedUnauthorizedPreview = !isAdmin && previewParam;

  useEffect(() => {
    return () => {
      stopChineseSpeech();
    };
  }, []);

  const handleTabChange = (tab: StationTab) => {
    stopChineseSpeech();
    setActiveTab(tab);
  };

  const togglePreview = () => {
    if (!isAdmin) {
      requireLogin();
      return;
    }
    const nextActive = !adminPreviewActive;
    setAdminPreviewDisabled(!nextActive);
    const newParams = new URLSearchParams(searchParams);
    if (nextActive) {
      newParams.set('preview', '1');
    } else {
      newParams.delete('preview');
    }
    setSearchParams(newParams);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
      {/* Review Status Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-400 shrink-0" />
          <div>
            <span className="font-bold text-amber-300">Trạng thái dữ liệu học thuật: {PINYIN_METADATA.reviewStatus}</span>
            <span className="text-amber-200/80 block sm:inline sm:ml-2">
              (Bản thảo M1 đối chiếu Đề án 1958; đang chờ thẩm định học thuật từ giáo viên/chuyên gia)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isAdmin ? (
            <>
              <span className="inline-flex items-center gap-1 rounded bg-cinnabar/20 text-cinnabar border border-cinnabar/30 px-2 py-0.5 text-[11px] font-semibold">
                <ShieldCheck size={13} /> Admin
              </span>
              <button
                type="button"
                onClick={togglePreview}
                className="inline-flex items-center gap-1 rounded border border-amber-400/40 bg-card px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-tint cursor-pointer transition-colors"
              >
                {canViewContent ? <EyeOff size={13} /> : <Eye size={13} />}
                {canViewContent ? 'Tắt xem trước' : 'Bật xem trước (Admin Preview)'}
              </button>
            </>
          ) : !user ? (
            <button
              type="button"
              onClick={requireLogin}
              className="inline-flex items-center gap-1 rounded border border-amber-400/40 bg-card px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-tint cursor-pointer transition-colors"
            >
              <ShieldCheck size={13} /> Đăng nhập Admin
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-stone-700/50 text-stone-300 border border-stone-600/50 px-2 py-0.5 text-[11px]">
              Tài khoản học viên
            </span>
          )}
        </div>
      </div>

      {/* Gating Screen: When content is unreviewed and user is regular or not admin preview */}
      {!canViewContent ? (
        <div className="flex flex-col items-center justify-center rounded border border-rule bg-card p-10 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 mb-4">
            <AlertTriangle size={28} />
          </div>
          <h2 className="font-serif text-2xl font-bold text-fg">
            Giáo trình Pinyin đang trong luồng kiểm duyệt
          </h2>
          <p className="mt-2.5 max-w-lg text-xs leading-relaxed text-fg-60">
            Nội dung phát âm M1 được biên soạn đối chiếu theo <b>Đề án Pinyin Hán ngữ 1958</b> và đang ở trạng thái <span className="font-mono text-amber-300 font-semibold">PENDING_REVIEW</span>.
            Theo quy tắc an toàn dữ liệu học thuật của nền tảng HeyGanba, nội dung chưa mở tự do cho học viên đại trà khi chưa được phê duyệt chính thức (<span className="font-mono text-emerald-400">APPROVED</span>).
          </p>

          {/* Cảnh báo nếu học viên thông thường cố tình gắn ?preview=1 */}
          {attemptedUnauthorizedPreview && (
            <div className="mt-5 w-full max-w-md rounded border border-rose-500/40 bg-rose-500/10 p-3.5 text-left text-xs text-rose-300">
              <p className="font-bold flex items-center gap-1.5 text-rose-200">
                <AlertTriangle size={15} className="shrink-0 text-rose-400" />
                Truy cập xem trước bị từ chối (?preview=1)
              </p>
              <p className="mt-1 text-rose-200/90 leading-relaxed">
                Chế độ xem trước nội dung chưa kiểm duyệt chỉ dành riêng cho tài khoản Quản trị viên (<code>ROLE_ADMIN</code>). Tài khoản thông thường hoặc khách không có quyền xem trước.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {isAdmin ? (
              <button
                type="button"
                onClick={togglePreview}
                className="inline-flex items-center gap-1.5 border border-cinnabar bg-cinnabar px-5 py-2 font-serif text-xs font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
              >
                <Eye size={14} /> Mở chế độ Xem trước (Admin Preview)
              </button>
            ) : !user ? (
              <button
                type="button"
                onClick={requireLogin}
                className="inline-flex items-center gap-1.5 border border-cinnabar bg-cinnabar px-5 py-2 font-serif text-xs font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
              >
                <ShieldCheck size={14} /> Đăng nhập tài khoản Quản trị viên (Admin)
              </button>
            ) : (
              <div className="text-xs text-fg-60">
                Tài khoản: <b className="text-fg">{user.email}</b> (Học viên) — Vui lòng chờ quản trị viên và giáo viên phê duyệt chính thức.
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Station Header */}
          <div className="flex flex-col gap-4 border-b border-rule pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cinnabar">
                <span className="inline-block h-2 w-2 rounded-full bg-cinnabar" />
                Trạm 1 · 拼音与发音 · Pinyin & Phát âm · [Bản thảo PENDING_REVIEW]
              </div>
              <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-fg">
                Pinyin & Phát âm
              </h1>
              <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-fg-60">
                Pinyin (Hán ngữ Phiên âm) là công cụ ký âm Latinh dùng để ghi lại cách đọc của chữ Hán, <b>không phải hệ chữ viết</b> thay thế chữ Hán.
                Hệ thống gồm <b>21 thanh mẫu phụ âm</b>, <b>2 dạng mở đầu y/w</b>, <b>36 vận mẫu</b> và <b>4 thanh điệu cơ bản</b> (kèm thanh nhẹ).
              </p>
            </div>

            {/* Companion Dock */}
            <div className="flex items-center gap-3">
              <StudyPetCompanion />
            </div>
          </div>

      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-rule">
        <button
          type="button"
          onClick={() => handleTabChange('STEPS')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-serif text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'STEPS'
              ? 'border-cinnabar text-cinnabar'
              : 'border-transparent text-fg-60 hover:text-fg'
          }`}
        >
          <Compass size={16} /> Học từ đầu (Lộ trình 6 chặng)
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('TABLE')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-serif text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'TABLE'
              ? 'border-cinnabar text-cinnabar'
              : 'border-transparent text-fg-60 hover:text-fg'
          }`}
        >
          <BookOpen size={16} /> Bảng tra cứu âm (21 thanh / 36 vận)
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('TONES')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-serif text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'TONES'
              ? 'border-cinnabar text-cinnabar'
              : 'border-transparent text-fg-60 hover:text-fg'
          }`}
        >
          <Activity size={16} /> Biểu đồ 4 thanh điệu
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('QUIZ')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-serif text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'QUIZ'
              ? 'border-cinnabar text-cinnabar'
              : 'border-transparent text-fg-60 hover:text-fg'
          }`}
        >
          <Award size={16} /> Bài luyện nhận biết (+10 EXP)
        </button>
      </div>

      {/* Tab Panels */}
      <div className="min-h-[460px]">
        {activeTab === 'STEPS' && (
          <PinyinStepByStep
            onGoToQuiz={() => handleTabChange('QUIZ')}
            onGoToTable={() => handleTabChange('TABLE')}
          />
        )}
        {activeTab === 'TABLE' && <PinyinTable />}
        {activeTab === 'TONES' && <ToneContourWave />}
        {activeTab === 'QUIZ' && <PinyinQuiz />}
      </div>
    </>
  )}
</div>
  );
};
