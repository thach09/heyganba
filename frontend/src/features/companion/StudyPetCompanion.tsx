import type { PetMood } from './types';
import { useCompanion } from './useCompanionStore';
import { Companion3DCanvas } from './three/Companion3DCanvas';
import { FoodIcon } from './CompanionWidget';
import { PET_DEFINITIONS } from './petData';

interface StudyPetCompanionProps {
  mood?: PetMood;
  className?: string;
  onCheer?: () => void;
  compact?: boolean;
}

export function StudyPetCompanion({
  mood: propMood,
  className = '',
  onCheer,
  compact = false,
}: StudyPetCompanionProps) {
  const { selectedPetId, bambooCount, mood: storeMood, setMood, growthStage } = useCompanion();
  const currentMood = propMood || storeMood;
  const activePet = PET_DEFINITIONS[selectedPetId] || PET_DEFINITIONS.panda;

  if (compact) {
    return (
      <div
        className={`relative inline-flex items-center gap-2 rounded-lg border border-rule bg-card/90 px-2.5 py-1  backdrop-blur-sm ${className}`}
      >
        <div className="flex items-center gap-1 rounded-full border border-rule/80 bg-tint px-2 py-0.5 text-[10.5px] font-medium text-jade-ink">
          <FoodIcon type={activePet.foodIcon} className="h-3 w-3" />
          <span>{bambooCount}</span>
        </div>
        <Companion3DCanvas
          petId={selectedPetId}
          stage={growthStage}
          mood={currentMood}
          size={42}
          showSpeechBubble={false}
          interactive={true}
          onPetClick={() => {
            setMood('happy');
            setTimeout(() => setMood('idle'), 2000);
            if (onCheer) onCheer();
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative inline-flex flex-col items-center rounded-xl border border-rule bg-card/90 p-3  backdrop-blur-sm ${className}`}
    >
      {/* Food Badge */}
      <div className="mb-1 flex items-center gap-1 rounded-full border border-rule/80 bg-tint px-2 py-0.5 text-[10.5px] font-medium text-jade-ink">
        <FoodIcon type={activePet.foodIcon} className="h-3.5 w-3.5" />
        <span>{bambooCount}</span>
      </div>

      {/* 3D Pet Illustration */}
      <Companion3DCanvas
        petId={selectedPetId}
        stage={growthStage}
        mood={currentMood}
        size={96}
        showSpeechBubble={true}
        interactive={true}
        onPetClick={() => {
          setMood('happy');
          setTimeout(() => setMood('idle'), 2000);
          if (onCheer) onCheer();
        }}
      />
    </div>
  );
}

