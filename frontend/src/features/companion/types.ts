export type PetId = 'panda' | 'red_panda' | 'golden_monkey' | 'imperial_cat';

export type PetMood = 'idle' | 'studying' | 'happy' | 'sad' | 'eating';

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
  quotes: Record<PetMood, PetQuote[]>;
}

export interface CompanionState {
  selectedPetId: PetId;
  bambooCount: number;
  affectionExp: number;
  affectionLevel: number;
}
