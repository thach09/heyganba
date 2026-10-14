import { useState } from 'react';
import { Heart, RefreshCw, X, Sparkles } from 'lucide-react';
import { Companion3DCanvas } from './three/Companion3DCanvas';
import { useCompanion } from './useCompanionStore';
import { PET_DEFINITIONS, GROWTH_STAGES } from './petData';
import type { PetId } from './types';
import { OrientalCard } from '../../components/OrientalCard';

// Clean SVG icon for food items (Bamboo, Apple, Peach, Fish)
export function FoodIcon({ type = 'bamboo', className = 'w-4 h-4' }: { type?: string; className?: string }) {
  if (type === 'apple') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor">
        <circle cx="12" cy="13" r="8" fill="#C83E31" stroke="#991B1B" strokeWidth="1.5" />
        <path d="M12 5V2" stroke="#2E7D6B" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 3C14 2 16 3 16 5C14 5 13 4 12 3Z" fill="#2E7D6B" />
      </svg>
    );
  }
  if (type === 'peach') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor">
        <path
          d="M12 4C8 4 4 8 4 13C4 18 8 21 12 21C16 21 20 18 20 13C20 8 16 4 12 4Z"
          fill="#F43F5E"
          stroke="#E11D48"
          strokeWidth="1.5"
        />
        <path d="M12 4C10 8 10 16 12 21" stroke="#FB7185" strokeWidth="1.2" />
        <path d="M12 4C14 2 17 3 17 5C15 6 13 5 12 4Z" fill="#10B981" />
      </svg>
    );
  }
  if (type === 'fish') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor">
        <path
          d="M18 12C14 7 8 8 3 12C8 16 14 17 18 12Z"
          fill="#D97706"
          stroke="#B45309"
          strokeWidth="1.5"
        />
        <polygon points="18,12 23,8 21,12 23,16" fill="#D97706" stroke="#B45309" strokeWidth="1.2" />
        <circle cx="6" cy="11.5" r="1" fill="#FFFFFF" />
      </svg>
    );
  }
  // Default Bamboo
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
    growthStage,
    currentLevelProgress,
    mood,
    selectPet,
    feedBamboo,
  } = useCompanion();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const activePet = PET_DEFINITIONS[selectedPetId] || PET_DEFINITIONS.panda;
  const currentStageInfo = GROWTH_STAGES[growthStage];

  const handleFeed = () => {
    feedBamboo();
  };

  // Evolution text hint
  const getEvolutionHint = () => {
    if (growthStage === 'baby') {
      return `Cần đạt Cấp 5 để tiến hoá lên Linh Thú (còn ${5 - affectionLevel} cấp)`;
    }
    if (growthStage === 'junior') {
      return `Cần đạt Cấp 10 để tiến hoá lên Thần Thú (còn ${10 - affectionLevel} cấp)`;
    }
    return 'Đã đạt cảnh giới Thần Thú tối thượng!';
  };

  return (
    <>
      <OrientalCard
        className="flex flex-col sm:flex-row items-center gap-6 p-6 border-[#282a36] bg-gradient-to-b from-[#151722]/95 via-[#101218]/95 to-[#0b0c11]/95 backdrop-blur-md shadow-[0_8px_32px_-4px_rgba(0,0,0,0.6)]"
      >
        {/* Interactive 3D Pet Display */}
        <div className="flex flex-shrink-0 flex-col items-center">
          <Companion3DCanvas
            petId={selectedPetId}
            stage={growthStage}
            mood={mood}
            size={180}
            showSpeechBubble={true}
          />
          <span className="mt-1 text-[10px] text-fg-38 tracking-wide">
            ✦ Bấm hoặc kéo xoay 360°
          </span>
        </div>

        {/* Pet Stats & Evolution Area */}
        <div className="flex flex-1 flex-col justify-between self-stretch text-left">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-serif text-[18px] font-bold text-fg">
                  {activePet.nameZh} · {activePet.nameVi}
                </h3>
                {/* Growth Stage Badge */}
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-serif text-[10.5px] font-semibold ${currentStageInfo.badgeTone}`}>
                  <Sparkles className="h-3 w-3" />
                  {currentStageInfo.labelVi}
                </span>
                <span className="rounded-full border border-rule bg-rule/20 px-2 py-0.5 text-[10.5px] text-fg-60">
                  {activePet.badge}
                </span>
              </div>

              {/* Switch Pet Button */}
              <button
                id="btn-switch-companion"
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#34384a] px-3 py-1.5 text-[11.5px] font-medium text-fg-60 transition-all hover:border-[#D97706]/70 hover:bg-[#D97706]/15 hover:text-[#F59E0B] shadow-sm"
              >
                <RefreshCw className="h-3 w-3" />
                Đổi Linh Thú
              </button>
            </div>

            <p className="mt-1.5 text-[12px] text-fg-60">
              {activePet.description}
            </p>
          </div>

          {/* Affection Level & Evolution Progress */}
          <div className="mt-3.5 rounded-lg border border-rule/60 bg-black/30 p-3">
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
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-rule">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#C83E31] via-[#D97706] to-[#F59E0B] transition-all duration-500"
                style={{ width: `${currentLevelProgress}%` }}
              />
            </div>

            {/* Stage evolution milestone tip */}
            <div className="mt-2 flex items-center justify-between text-[10.5px] text-fg-38">
              <span>{getEvolutionHint()}</span>
              <span className="font-serif text-[#D97706]">
                {growthStage === 'baby' ? 'Tiến hoá: Cấp 5' : growthStage === 'junior' ? 'Tiến hoá: Cấp 10' : 'Cảnh giới tối cao'}
              </span>
            </div>
          </div>

          {/* Feeding Action Row */}
          <div className="mt-3.5 flex flex-wrap items-center gap-3">
            <button
              id="btn-feed-companion"
              type="button"
              onClick={handleFeed}
              disabled={bambooCount < 1}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-[12px] font-semibold transition-all ${
                bambooCount > 0
                  ? 'cursor-pointer border-[#2E7D6B]/60 bg-[#2E7D6B]/20 text-[#34D399] hover:bg-[#2E7D6B]/30 hover:border-[#34D399]/60 active:scale-95 shadow-[0_0_12px_rgba(46,125,107,0.25)]'
                  : 'cursor-not-allowed border-rule bg-rule/30 text-fg-38'
              }`}
            >
              <FoodIcon type={activePet.foodIcon} className="h-4 w-4" />
              Cho ăn {activePet.foodNameVi} ({bambooCount})
            </button>

            <span className="text-[11px] text-fg-38">
              +25 EXP / lần ăn · Học 1 bài = +1 {activePet.foodNameVi}
            </span>
          </div>
        </div>
      </OrientalCard>

      {/* Switch Pet Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-[toast-in_0.2s_ease-out]">
          <div className="relative w-full max-w-xl rounded-2xl border border-[#D97706]/40 bg-[#0f1118] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(217,119,6,0.15)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#252834] pb-3.5">
              <div>
                <h4 className="font-serif text-[18px] font-bold text-fg">
                  Chọn Linh Thú Đồng Hành (Voxel 3D)
                </h4>
                <p className="text-[11.5px] text-fg-60">
                  Linh thú mô hình Voxel 3D phong cách Tam Quốc & Cung Đình, tiến hóa theo hành trình học tập.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-fg-60 transition-colors hover:bg-white/10 hover:text-fg"
              >
                <X className="h-4 w-4" />
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
                    className={`flex cursor-pointer items-center gap-3.5 rounded-xl border p-3 transition-all ${
                      isSelected
                        ? 'border-[#D97706] bg-[#D97706]/15 shadow-[0_0_15px_rgba(217,119,6,0.3)]'
                        : 'border-[#222533] bg-[#141620] hover:border-[#D97706]/40 hover:bg-[#181a26]'
                    }`}
                  >
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/40 border border-[#2a2d3d]">
                      <Companion3DCanvas
                        petId={id}
                        stage="junior"
                        mood={isSelected ? 'happy' : 'idle'}
                        size={60}
                        interactive={false}
                        showSpeechBubble={false}
                      />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="font-serif text-[13px] font-bold text-fg leading-snug">
                        {pet.id === 'golden_monkey' ? '小悟空 · Ngộ Không' : `${pet.nameZh} · ${pet.nameVi}`}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-[#2E7D6B]">
                          {pet.titleVi}
                        </span>
                        <span className="flex-shrink-0 rounded bg-[#C83E31]/15 px-1 py-0.2 font-serif text-[9px] font-medium text-[#C83E31]">
                          {pet.badge}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[10.5px] text-fg-38">
                        <span>Thức ăn:</span>
                        <FoodIcon type={pet.foodIcon} className="h-3 w-3" />
                        <span className="text-fg-60">{pet.foodNameVi}</span>
                      </div>
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

