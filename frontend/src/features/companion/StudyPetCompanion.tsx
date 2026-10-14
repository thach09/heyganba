import React, { useState } from 'react';
import { PetMood } from './types';
import { useCompanion } from './useCompanionStore';
import { CompanionPetSvg } from './CompanionPetSvg';
import { BambooShootIcon } from './CompanionWidget';

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
  const { selectedPetId, bambooCount, mood: storeMood, setMood } = useCompanion();
  const currentMood = propMood || storeMood;

  if (compact) {
    return (
      <div
        className={`relative inline-flex items-center gap-2 rounded-lg border border-rule bg-[#1A1B18]/90 px-2.5 py-1 shadow-sm backdrop-blur-sm ${className}`}
      >
        <div className="flex items-center gap-1 rounded-full border border-rule/80 bg-black/40 px-2 py-0.5 text-[10.5px] font-medium text-[#2E7D6B]">
          <BambooShootIcon className="h-3 w-3" />
          <span>{bambooCount}</span>
        </div>
        <CompanionPetSvg
          petId={selectedPetId}
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
      className={`relative inline-flex flex-col items-center rounded-xl border border-rule bg-[#1A1B18]/90 p-3 shadow-md backdrop-blur-sm ${className}`}
    >
      {/* Bamboo Shoots Badge */}
      <div className="mb-1 flex items-center gap-1 rounded-full border border-rule/80 bg-black/40 px-2 py-0.5 text-[10.5px] font-medium text-[#2E7D6B]">
        <BambooShootIcon className="h-3 w-3" />
        <span>{bambooCount}</span>
      </div>

      {/* Mini Pet Illustration */}
      <CompanionPetSvg
        petId={selectedPetId}
        mood={currentMood}
        size={88}
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
