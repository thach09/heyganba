export const PET_IDS = ['panda', 'red_panda', 'golden_monkey', 'imperial_cat'] as const;
export type PetId = typeof PET_IDS[number];

export type PetMood = 'idle' | 'studying' | 'happy' | 'sad' | 'eating';

export type GrowthStage = 'baby' | 'junior' | 'adult';

export interface GrowthStageInfo {
  stage: GrowthStage;
  labelZh: string;
  labelVi: string;
  minLevel: number;
  description: string;
  badgeTone: string;
}

export interface PetQuote {
  zh: string;
  vi: string;
}

export interface PetDefinition {
  id: PetId;
  nameZh: string;
  nameVi: string;
  titleVi: string;
  description: string;
  badge: string;
  primaryColor: string;
  foodNameZh: string;
  foodNameVi: string;
  foodIcon: string;
  quotes: Record<PetMood, PetQuote[]>;
}

export interface CompanionState {
  selectedPetId: PetId;
  bambooCount: number;
  affectionExp: number;
  affectionLevel: number;
  growthStage: GrowthStage;
}

