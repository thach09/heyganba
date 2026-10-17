import { useState, useEffect, useCallback } from 'react';
import type { PetId, PetMood, GrowthStage } from './types';
import { getGrowthStage } from './petData';
import { useAuth } from '../../app/useAuth';
import { apiRequest } from '../../lib/api/client';

const STORAGE_PET_KEY = 'heyganba_companion_pet_id';
const VALID_PETS: PetId[] = ['panda', 'red_panda', 'golden_monkey', 'imperial_cat'];

export function useCompanion() {
  const { user } = useAuth();
  const [selectedPetId, setSelectedPetId] = useState<PetId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PET_KEY);
      return saved && VALID_PETS.includes(saved as PetId) ? (saved as PetId) : 'panda';
    } catch {
      return 'panda';
    }
  });

  const [wallet, setWallet] = useState<{ owner: number | null; bamboo: number; affectionExp: number }>({ owner: null, bamboo: 0, affectionExp: 0 });
  const bambooCount = wallet.owner === user?.userId ? wallet.bamboo : 0;
  const affectionExp = wallet.owner === user?.userId ? wallet.affectionExp : 0;
  const refreshWallet = useCallback(async () => {
    if (!user) return;
    const owner = user.userId;
    try {
      const res = await apiRequest<{ bamboo: number; affectionExp: number }>('/progress/companion/wallet');
      if (res.success && res.data) setWallet({ owner, ...res.data });
    } catch { /* Keep the last server-confirmed balance. */ }
  }, [user]);
  useEffect(() => {
    void refreshWallet();
    const onChange = () => void refreshWallet();
    window.addEventListener('companion-wallet-changed', onChange);
    return () => window.removeEventListener('companion-wallet-changed', onChange);
  }, [refreshWallet]);

  const [mood, setMood] = useState<PetMood>('idle');

  // Affection Level & Growth Stage
  const affectionLevel = Math.floor(affectionExp / 100) + 1;
  const currentLevelProgress = affectionExp % 100;
  const growthStage: GrowthStage = getGrowthStage(affectionLevel);

  // Sync to localStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_PET_KEY, selectedPetId); } catch { /* Optional cosmetic preference. */ }
  }, [selectedPetId]);

  const selectPet = useCallback((id: PetId) => {
    setSelectedPetId(id);
    setMood('happy');
    setTimeout(() => setMood('idle'), 2000);
  }, []);

  const feedBamboo = useCallback(async () => {
    if (!user || bambooCount < 1) return false;
    try {
      const res = await apiRequest<{ bamboo: number; affectionExp: number }>('/progress/companion/feed', { method: 'POST' });
      if (!res.success || !res.data) return false;
      setWallet({ owner: user.userId, ...res.data });
      window.dispatchEvent(new Event('companion-wallet-changed'));
      setMood('eating');
      setTimeout(() => setMood('idle'), 2400);
      return true;
    } catch { return false; }
  }, [user, bambooCount]);

  // Real awards are granted by daily quest claims, never by a client-supplied amount.
  const rewardBamboo = useCallback((_amount = 2) => {
    void refreshWallet();
    setMood('happy');
    setTimeout(() => setMood('idle'), 2400);
  }, [refreshWallet]);

  const triggerReaction = useCallback((type: 'correct' | 'mistake' | 'practicing' | 'cheer' | 'happy') => {
    if (type === 'correct' || type === 'cheer' || type === 'happy') {
      setMood('happy');
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
