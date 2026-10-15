import React, { useState } from 'react';
import { BookOpen, Activity, Award } from 'lucide-react';
import { PinyinTable } from './PinyinTable';
import { ToneContourWave } from './ToneContourWave';
import { PinyinQuiz } from './PinyinQuiz';
import { StudyPetCompanion } from '../companion/StudyPetCompanion';

type StationTab = 'TABLE' | 'TONES' | 'QUIZ';

export const PinyinStationView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StationTab>('TABLE');

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
      {/* Station Header */}
      <div className="flex flex-col gap-4 border-b border-rule pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cinnabar">
            <span className="inline-block h-2 w-2 rounded-full bg-cinnabar" />
            Trạm Ngữ âm & Thanh điệu · 拼音与声调
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-fg">
            Hán ngữ Phiên âm (Pinyin) & Thanh điệu
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-fg-60">
            Hệ thống 21 Thanh mẫu, 36 Vận mẫu và 4 Thanh điệu chuẩn HSK 1–6. Luyện phát âm chính xác và phân biệt cao độ ngữ âm tiếng Trung chuẩn Bắc Kinh.
          </p>
        </div>

        {/* Companion Dock & Quick Stats */}
        <div className="flex items-center gap-3">
          <StudyPetCompanion />
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-rule">
        <button
          type="button"
          onClick={() => setActiveTab('TABLE')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-serif text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'TABLE'
              ? 'border-cinnabar text-cinnabar'
              : 'border-transparent text-fg-60 hover:text-fg'
          }`}
        >
          <BookOpen size={16} /> Bảng phát âm Thanh/Vận mẫu
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TONES')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-serif text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'TONES'
              ? 'border-cinnabar text-cinnabar'
              : 'border-transparent text-fg-60 hover:text-fg'
          }`}
        >
          <Activity size={16} /> Biểu đồ cao độ thanh điệu (Pitch Wave)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('QUIZ')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-serif text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'QUIZ'
              ? 'border-cinnabar text-cinnabar'
              : 'border-transparent text-fg-60 hover:text-fg'
          }`}
        >
          <Award size={16} /> Luyện phản xạ & Nhận EXP (+10)
        </button>
      </div>

      {/* Tab Panels */}
      <div className="min-h-[460px]">
        {activeTab === 'TABLE' && <PinyinTable />}
        {activeTab === 'TONES' && <ToneContourWave />}
        {activeTab === 'QUIZ' && <PinyinQuiz />}
      </div>
    </div>
  );
};
