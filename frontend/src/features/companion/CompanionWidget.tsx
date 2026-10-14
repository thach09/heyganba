import React, { useState } from 'react';
import { Heart, Sparkles, RefreshCw, X, ChevronRight } from 'lucide-react';
import { CompanionPetSvg } from './CompanionPetSvg';
import { useCompanion } from './useCompanionStore';
import { PET_DEFINITIONS } from './petData';
import { PetId } from './types';
import { OrientalCard } from '../../components/OrientalCard';

// Clean SVG icon for Bamboo Shoot (Replacing OS emoji)
export function BambooShootIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor">
      <path
        d="M12 2C8 6 6 12 7 19C10 21 14 21 17 19C18 12 16 6 12 2Z"
        fill="#10B981"
        stroke="#059669"
        strokeWidth="1.5"
      />
      <path d="M12 2V19" stroke="#34D399" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8 12C10 10 14 10 16 12" stroke="#059669" strokeWidth="1.2" />
      <path d="M7 16C10 14 14 14 17 16" stroke="#059669" strokeWidth="1.2" />
    </svg>
  );
}

export function CompanionWidget() {
  const {
    selectedPetId,
    bambooCount,
    affectionLevel,
    currentLevelProgress,
    mood,
    selectPet,
    feedBamboo,
  } = useCompanion();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const activePet = PET_DEFINITIONS[selectedPetId];

  const handleFeed = () => {
    feedBamboo();
  };

  return (
    <>
      <OrientalCard
        tag="Linh Thú Đồng Hành"
        tagVariant="jade"
        className="flex flex-col sm:flex-row items-center gap-6 p-6"
      >
        {/* Animated Pet Display */}
        <div className="flex flex-shrink-0 flex-col items-center">
          <CompanionPetSvg
            petId={selectedPetId}
            mood={mood}
            size={160}
            showSpeechBubble={true}
          />
        </div>

        {/* Pet Stats & Interaction Area */}
        <div className="flex flex-1 flex-col justify-between self-stretch text-left">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-[18px] font-bold text-fg">
                  {activePet.nameZh} • {activePet.nameVi}
                </h3>
                <p className="text-[12.5px] font-medium text-[#2E7D6B]">
                  {activePet.titleVi}
                </p>
              </div>

              {/* Switch Pet Button */}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-rule px-3 py-1.5 text-[11.5px] font-medium text-fg-60 transition-colors hover:border-[#C83E31]/50 hover:bg-[#C83E31]/10 hover:text-fg"
              >
                <RefreshCw className="h-3 w-3" />
                Đổi Linh Thú
              </button>
            </div>

            <p className="mt-2 text-[12px] leading-relaxed text-fg-60">
              {activePet.description}
            </p>
          </div>

          {/* Affection Level Bar */}
          <div className="mt-4 rounded-lg border border-rule/60 bg-black/20 p-3">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="flex items-center gap-1.5 font-medium text-fg">
                <Heart className="h-3.5 w-3.5 fill-[#C83E31] text-[#C83E31]" />
                Cấp độ thân mật: <strong className="text-fg">Cấp {affectionLevel}</strong>
              </span>
              <span className="font-mono text-[11px] text-fg-60">
                {currentLevelProgress} / 100 EXP
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-rule">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#C83E31] to-[#D97706] transition-all duration-500"
                style={{ width: `${currentLevelProgress}%` }}
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleFeed}
              disabled={bambooCount < 1}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-[12.5px] font-semibold transition-all ${
                bambooCount > 0
                  ? 'border-[#2E7D6B]/50 bg-[#2E7D6B]/20 text-[#2E7D6B] hover:bg-[#2E7D6B]/30 active:scale-95'
                  : 'cursor-not-allowed border-rule bg-rule/30 text-fg-38'
              }`}
            >
              <BambooShootIcon className="h-4 w-4" />
              Cho ăn Măng Trúc ({bambooCount})
            </button>

            <span className="flex items-center gap-1 text-[11px] text-fg-38">
              +25 EXP thân mật • Hoàn thành bài học để nhận thêm <BambooShootIcon className="inline h-3 w-3" />
            </span>
          </div>
        </div>
      </OrientalCard>

      {/* Switch Pet Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-[toast-in_0.2s_ease-out]">
          <div className="relative w-full max-w-xl rounded-2xl border border-rule bg-[#181916] p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-rule pb-4">
              <div>
                <h4 className="font-serif text-[18px] font-bold text-fg">
                  Chọn Linh Thú Đồng Hành
                </h4>
                <p className="text-[12px] text-fg-60">
                  Mỗi linh thú mang một phong thái và lời khích lệ riêng biệt.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-fg-60 transition-colors hover:bg-rule hover:text-fg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Pets Grid */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(Object.keys(PET_DEFINITIONS) as PetId[]).map(id => {
                const pet = PET_DEFINITIONS[id];
                const isSelected = selectedPetId === id;
                return (
                  <div
                    key={id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      selectPet(id);
                      setIsModalOpen(false);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        selectPet(id);
                        setIsModalOpen(false);
                      }
                    }}
                    className={`flex cursor-pointer items-center gap-3.5 rounded-xl border p-3.5 transition-all ${
                      isSelected
                        ? 'border-[#2E7D6B] bg-[#2E7D6B]/15 shadow-[2px_2px_0px_rgba(46,125,107,0.3)]'
                        : 'border-rule bg-[#1E1F1C] hover:border-rule-strong hover:bg-tint'
                    }`}
                  >
                    <div className="h-16 w-16 flex-shrink-0">
                      <CompanionPetSvg
                        petId={id}
                        mood={isSelected ? 'happy' : 'idle'}
                        size={64}
                        interactive={false}
                        showSpeechBubble={false}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-serif text-[14px] font-bold text-fg">
                          {pet.nameZh}
                        </span>
                        <span className="text-[12px] text-fg-60">
                          {pet.nameVi}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-[#2E7D6B]">
                        {pet.titleVi}
                      </span>
                      <p className="mt-1 line-clamp-2 text-[10.5px] leading-tight text-fg-38">
                        {pet.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
