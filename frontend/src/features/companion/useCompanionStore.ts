import { useState, useEffect, useCallback } from 'react';
import type { PetId, PetMood, GrowthStage } from './types';
import { getGrowthStage } from './petData';

const STORAGE_PET_KEY = 'heyganba_companion_pet_id';
const STORAGE_BAMBOO_KEY = 'heyganba_companion_bamboo';
const STORAGE_EXP_KEY = 'heyganba_companion_affection_exp';
const VALID_PETS: PetId[] = ['panda', 'red_panda', 'golden_monkey', 'imperial_cat'];

export function useCompanion() {
  const [selectedPetId, setSelectedPetId] = useState<PetId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PET_KEY);
      return saved && VALID_PETS.includes(saved as PetId) ? (saved as PetId) : 'panda';
    } catch {
      return 'panda';
    }
  });

  const [bambooCount, setBambooCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BAMBOO_KEY);
      const val = saved !== null ? parseInt(saved, 10) : 6;
      return isNaN(val) ? 6 : val;
    } catch {
      return 6;
    }
  });

  const [affectionExp, setAffectionExp] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_EXP_KEY);
      const val = saved !== null ? parseInt(saved, 10) : 35;
      return isNaN(val) ? 35 : val;
    } catch {
      return 35;
    }
  });

  const [mood, setMood] = useState<PetMood>('idle');

  // Affection Level & Growth Stage
  const affectionLevel = Math.floor(affectionExp / 100) + 1;
  const currentLevelProgress = affectionExp % 100;
  const growthStage: GrowthStage = getGrowthStage(affectionLevel);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_PET_KEY, selectedPetId);
  }, [selectedPetId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_BAMBOO_KEY, bambooCount.toString());
  }, [bambooCount]);

  useEffect(() => {
    localStorage.setItem(STORAGE_EXP_KEY, affectionExp.toString());
  }, [affectionExp]);

  const selectPet = useCallback((id: PetId) => {
    setSelectedPetId(id);
    setMood('happy');
    setTimeout(() => setMood('idle'), 2000);
  }, []);

  const feedBamboo = useCallback(() => {
    if (bambooCount < 1) return false;

    setBambooCount(prev => Math.max(0, prev - 1));
    setAffectionExp(prev => prev + 25);
    setMood('eating');

    setTimeout(() => {
      setMood('happy');
      setTimeout(() => setMood('idle'), 1600);
    }, 1500);

    return true;
  }, [bambooCount]);

  const rewardBamboo = useCallback((amount = 2) => {
    setBambooCount(prev => prev + amount);
    setAffectionExp(prev => prev + amount * 10);
    setMood('happy');
    setTimeout(() => setMood('idle'), 2400);
  }, []);

  const triggerReaction = useCallback((type: 'correct' | 'mistake' | 'practicing' | 'cheer') => {
    if (type === 'correct' || type === 'cheer') {
      setMood('happy');
      setAffectionExp(prev => prev + (type === 'cheer' ? 15 : 5));
      setTimeout(() => setMood('idle'), 2500);
    } else if (type === 'mistake') {
      setMood('sad');
      setTimeout(() => setMood('idle'), 2500);
    } else if (type === 'practicing') {
      setMood('studying');
      setTimeout(() => setMood('idle'), 3000);
    }
  }, []);

  return {
    selectedPetId,
    bambooCount,
    affectionExp,
    affectionLevel,
    growthStage,
    currentLevelProgress,
    mood,
    setMood,
    selectPet,
    feedBamboo,
    rewardBamboo,
    rewardFood: rewardBamboo,
    triggerReaction,
  };
}
