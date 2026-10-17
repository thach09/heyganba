import { useEffect, useState } from 'react';
import type { PetId, PetMood, PetQuote } from './types';
import { PET_DEFINITIONS } from './petData';

interface CompanionPetSvgProps {
  petId: PetId;
  mood?: PetMood;
  size?: number; // Size in px (defaults to 180)
  interactive?: boolean;
  showSpeechBubble?: boolean;
  onPetClick?: () => void;
  className?: string;
}

export function CompanionPetSvg({
  petId,
  mood = 'idle',
  size = 180,
  interactive = true,
  showSpeechBubble = true,
  onPetClick,
  className = '',
}: CompanionPetSvgProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [squish, setSquish] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<PetQuote>(() => {
    const pet = PET_DEFINITIONS[petId] || PET_DEFINITIONS.panda;
    const quotes = pet?.quotes?.[mood] || PET_DEFINITIONS.panda.quotes.idle;
    return quotes[0] || { zh: '今天一起加油！', vi: 'Hôm nay cùng cố gắng nhé!' };
  });

  // Natural blinking effect every 3.5 - 4.5 seconds
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 160);
    }, 3800);
    return () => clearInterval(blinkInterval);
  }, []);

  // Update quote when mood or pet changes
  useEffect(() => {
    const pet = PET_DEFINITIONS[petId] || PET_DEFINITIONS.panda;
    const quotes = pet?.quotes?.[mood] || PET_DEFINITIONS.panda.quotes.idle;
    if (quotes && quotes.length > 0) {
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      setCurrentQuote(randomQuote);
    }
  }, [mood, petId]);

  const handleClick = () => {
    if (!interactive) return;
    setSquish(true);
    setTimeout(() => setSquish(false), 450);

    // Pick a new random quote
    const pet = PET_DEFINITIONS[petId] || PET_DEFINITIONS.panda;
    const quotes = pet?.quotes?.[mood] || PET_DEFINITIONS.panda.quotes.idle;
    if (quotes && quotes.length > 0) {
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      setCurrentQuote(randomQuote);
    }

    if (onPetClick) {
      onPetClick();
    }
  };

  // Determine animation classes based on mood and interaction
  const getAnimationClass = () => {
    if (squish) return 'animate-[seal-slam_0.45s_ease-out]';
    switch (mood) {
      case 'happy':
        return 'animate-[pet-bounce_0.8s_infinite]';
      case 'eating':
        return 'animate-[pet-chew_0.5s_infinite]';
      case 'studying':
        return 'animate-[pet-float_2.4s_ease-in-out_infinite]';
      case 'sad':
        return 'opacity-85 translate-y-1';
      case 'idle':
      default:
        return 'animate-[pet-breathe_3.2s_ease-in-out_infinite]';
    }
  };

  return (
    <div className={`relative inline-flex flex-col items-center select-none ${className}`}>
      {/* Speech Bubble */}
      {showSpeechBubble && (
        <div
          className={`pointer-events-none mb-2 max-w-[240px] rounded-xl border border-rule bg-card/95 px-3.5 py-2  backdrop-blur-md transition-all duration-300 ${
            mood === 'happy' ? 'border-gold/40 ' : ''
          }`}
        >
          <p className="font-serif text-[13px] font-medium tracking-wide text-fg">
            {currentQuote.zh}
          </p>
          <p className="mt-0.5 text-[11px] leading-tight text-fg-60">
            {currentQuote.vi}
          </p>
          {/* Arrow */}
          <div className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-r border-b border-rule bg-card" />
        </div>
      )}

      {/* Pet SVG Canvas */}
      <div
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={handleClick}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleClick()}
        className={`relative cursor-pointer transition-transform duration-200 active:scale-95 ${
          interactive ? 'hover:scale-105' : ''
        } ${getAnimationClass()}`}
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 200 200"
          width={size}
          height={size}
          className="drop-"
        >
          <defs>
            {/* Gradients */}
            <radialGradient id="panda-belly" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E5E4DE" />
            </radialGradient>
            <linearGradient id="red-panda-coat" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D94E34" />
              <stop offset="100%" stopColor="#A8321D" />
            </linearGradient>
            <linearGradient id="golden-fur" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="cat-fur" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#F4EFE6" />
            </linearGradient>
            <linearGradient id="bamboo-stem" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {/* 1. PANDA: Đoàn Đoàn (团团) */}
          {petId === 'panda' && (
            <g id="panda-character">
              {/* Ears */}
              <circle cx="58" cy="54" r="22" fill="#1C1D1A" />
              <circle cx="58" cy="54" r="14" fill="#2E302B" />
              <circle cx="142" cy="54" r="22" fill="#1C1D1A" />
              <circle cx="142" cy="54" r="14" fill="#2E302B" />

              {/* Scholar Headband Tails */}
              <path
                d="M 148 76 Q 170 82 178 105 Q 166 100 152 86 Z"
                fill="#C83E31"
              />

              {/* Body */}
              <ellipse cx="100" cy="146" rx="58" ry="48" fill="url(#panda-belly)" />
              {/* Back Arms / Shoulders */}
              <path
                d="M 46 120 C 38 140 48 170 70 174 C 80 165 65 135 60 120 Z"
                fill="#1C1D1A"
              />
              <path
                d="M 154 120 C 162 140 152 170 130 174 C 120 165 135 135 140 120 Z"
                fill="#1C1D1A"
              />

              {/* Head */}
              <ellipse cx="100" cy="94" rx="54" ry="46" fill="url(#panda-belly)" />

              {/* Scholar Red Headband Front */}
              <path
                d="M 52 74 Q 100 64 148 74 L 146 84 Q 100 74 54 84 Z"
                fill="#C83E31"
              />
              <circle cx="100" cy="74" r="5" fill="#D97706" />

              {/* Eye Patches */}
              <ellipse cx="76" cy="94" rx="15" ry="19" fill="#1C1D1A" transform="rotate(-15 76 94)" />
              <ellipse cx="124" cy="94" rx="15" ry="19" fill="#1C1D1A" transform="rotate(15 124 94)" />

              {/* Eyes */}
              {isBlinking || mood === 'happy' ? (
                // Happy curved eyes
                <>
                  <path d="M 68 94 Q 76 86 84 94" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M 116 94 Q 124 86 132 94" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" />
                </>
              ) : mood === 'sad' ? (
                // Sad eyes
                <>
                  <ellipse cx="76" cy="96" r="4" fill="#FFFFFF" />
                  <ellipse cx="124" cy="96" r="4" fill="#FFFFFF" />
                  <circle cx="78" cy="98" r="2" fill="#60A5FA" />
                </>
              ) : (
                // Normal bright eyes
                <>
                  <circle cx="76" cy="94" r="5.5" fill="#FFFFFF" />
                  <circle cx="74" cy="92" r="2" fill="#1C1D1A" />
                  <circle cx="124" cy="94" r="5.5" fill="#FFFFFF" />
                  <circle cx="122" cy="92" r="2" fill="#1C1D1A" />
                </>
              )}

              {/* Nose & Mouth */}
              <ellipse cx="100" cy="108" rx="8" ry="6" fill="#1C1D1A" />
              {mood === 'eating' ? (
                <ellipse cx="100" cy="118" rx="6" ry="6" fill="#C83E31" />
              ) : mood === 'happy' ? (
                <path d="M 94 114 Q 100 122 106 114" stroke="#1C1D1A" strokeWidth="2.5" fill="#C83E31" />
              ) : mood === 'sad' ? (
                <path d="M 94 119 Q 100 114 106 119" stroke="#1C1D1A" strokeWidth="2.2" fill="none" />
              ) : (
                <path d="M 94 114 Q 100 119 106 114" stroke="#1C1D1A" strokeWidth="2.2" fill="none" />
              )}

              {/* Cheeks */}
              <circle cx="62" cy="108" r="7" fill="#F43F5E" opacity="0.25" />
              <circle cx="138" cy="108" r="7" fill="#F43F5E" opacity="0.25" />

              {/* Bamboo Shoot in Hands */}
              <g transform="translate(112, 128) rotate(-15)">
                <path d="M 0 0 L 12 -28 L 24 0 Z" fill="url(#bamboo-stem)" />
                <path d="M 4 -8 L 12 -38 L 20 -8 Z" fill="#34D399" />
                <circle cx="6" cy="14" r="10" fill="#1C1D1A" />
              </g>
            </g>
          )}

          {/* 2. RED PANDA: Đào Đào (淘淘) */}
          {petId === 'red_panda' && (
            <g id="red-panda-character">
              {/* Fluffy Striped Tail */}
              <g className="origin-[45px_155px] animate-[pet-wag_1.6s_ease-in-out_infinite]">
                <path
                  d="M 45 155 Q 15 140 18 100 Q 22 75 42 70 Q 52 85 45 125 Z"
                  fill="url(#red-panda-coat)"
                />
                {/* Tail Rings */}
                <path d="M 22 96 Q 32 94 40 98" stroke="#FDE68A" strokeWidth="6" fill="none" strokeLinecap="round" />
                <path d="M 18 116 Q 30 114 42 120" stroke="#FDE68A" strokeWidth="6" fill="none" strokeLinecap="round" />
                <path d="M 26 138 Q 36 135 44 142" stroke="#FDE68A" strokeWidth="6" fill="none" strokeLinecap="round" />
              </g>

              {/* Ears */}
              <polygon points="56,70 34,26 82,46" fill="#A8321D" />
              <polygon points="58,66 42,34 76,48" fill="#FFFFFF" />
              <polygon points="144,70 166,26 118,46" fill="#A8321D" />
              <polygon points="142,66 158,34 124,48" fill="#FFFFFF" />

              {/* Body */}
              <ellipse cx="100" cy="146" rx="52" ry="42" fill="#1F1D1A" />
              <ellipse cx="100" cy="144" rx="44" ry="34" fill="url(#red-panda-coat)" />

              {/* Head */}
              <ellipse cx="100" cy="94" rx="52" ry="42" fill="url(#red-panda-coat)" />

              {/* White Face Markings */}
              <path
                d="M 60 88 Q 72 82 78 94 Q 68 112 56 102 Z"
                fill="#FFFFFF"
              />
              <path
                d="M 140 88 Q 128 82 122 94 Q 132 112 144 102 Z"
                fill="#FFFFFF"
              />
              <ellipse cx="100" cy="106" rx="20" ry="14" fill="#FFFFFF" />

              {/* Eyebrow dots */}
              <circle cx="82" cy="74" r="4.5" fill="#FFFFFF" />
              <circle cx="118" cy="74" r="4.5" fill="#FFFFFF" />

              {/* Eyes */}
              {isBlinking || mood === 'happy' ? (
                <>
                  <path d="M 72 92 Q 80 84 88 92" stroke="#1F1D1A" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M 112 92 Q 120 84 128 92" stroke="#1F1D1A" strokeWidth="3" fill="none" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <circle cx="80" cy="92" r="5.5" fill="#1F1D1A" />
                  <circle cx="78" cy="90" r="2" fill="#FFFFFF" />
                  <circle cx="120" cy="92" r="5.5" fill="#1F1D1A" />
                  <circle cx="118" cy="90" r="2" fill="#FFFFFF" />
                </>
              )}

              {/* Nose & Mouth */}
              <ellipse cx="100" cy="103" rx="5.5" ry="4" fill="#1F1D1A" />
              {mood === 'eating' ? (
                <ellipse cx="100" cy="112" rx="5" ry="5" fill="#C83E31" />
              ) : mood === 'happy' ? (
                <path d="M 94 108 Q 100 116 106 108" stroke="#1F1D1A" strokeWidth="2.2" fill="#C83E31" />
              ) : (
                <path d="M 95 108 Q 100 112 105 108" stroke="#1F1D1A" strokeWidth="2" fill="none" />
              )}

              {/* Paws */}
              <circle cx="74" cy="154" r="12" fill="#1F1D1A" />
              <circle cx="126" cy="154" r="12" fill="#1F1D1A" />
            </g>
          )}

          {/* 3. GOLDEN MONKEY: Tiểu Ngộ Không (小悟空) */}
          {petId === 'golden_monkey' && (
            <g id="golden-monkey-character">
              {/* Ears */}
              <circle cx="50" cy="94" r="18" fill="#F59E0B" />
              <circle cx="52" cy="94" r="11" fill="#FEF3C7" />
              <circle cx="150" cy="94" r="18" fill="#F59E0B" />
              <circle cx="148" cy="94" r="11" fill="#FEF3C7" />

              {/* Body */}
              <ellipse cx="100" cy="148" rx="48" ry="42" fill="url(#golden-fur)" />
              <ellipse cx="100" cy="148" rx="36" ry="32" fill="#FEF3C7" />

              {/* Head */}
              <ellipse cx="100" cy="94" rx="48" ry="44" fill="url(#golden-fur)" />

              {/* Blueish Heart-shaped Face Mask (Unique feature of Golden Snub-nosed Monkey) */}
              <path
                d="M 100 76 C 85 64 66 74 70 94 C 74 112 100 120 100 120 C 100 120 126 112 130 94 C 134 74 115 64 100 76 Z"
                fill="#E0F2FE"
              />

              {/* Golden Fillet (Kim Cô Bổng / Vòng Kim Cô) */}
              <path
                d="M 60 74 Q 100 60 140 74"
                stroke="#F59E0B"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 94 66 Q 100 56 106 66"
                stroke="#F59E0B"
                strokeWidth="4"
                fill="none"
              />

              {/* Eyes */}
              {isBlinking || mood === 'happy' ? (
                <>
                  <path d="M 76 90 Q 84 82 92 90" stroke="#78350F" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M 108 90 Q 116 82 124 90" stroke="#78350F" strokeWidth="3" fill="none" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <circle cx="84" cy="90" r="5.5" fill="#78350F" />
                  <circle cx="82" cy="88" r="2" fill="#FFFFFF" />
                  <circle cx="116" cy="90" r="5.5" fill="#78350F" />
                  <circle cx="114" cy="88" r="2" fill="#FFFFFF" />
                </>
              )}

              {/* Snub Nose & Mouth */}
              <ellipse cx="100" cy="99" rx="4.5" ry="3" fill="#0284C7" />
              {mood === 'happy' ? (
                <path d="M 92 106 Q 100 114 108 106" stroke="#78350F" strokeWidth="2.5" fill="#C83E31" />
              ) : (
                <path d="M 93 106 Q 100 110 107 106" stroke="#78350F" strokeWidth="2" fill="none" />
              )}

              {/* Hands holding Mini Calligraphy Brush */}
              <g transform="translate(110, 130) rotate(-20)">
                <rect x="0" y="-30" width="4" height="40" fill="#78350F" rx="2" />
                <path d="M -1 -30 Q 2 -42 5 -30 Z" fill="#ECECE6" />
                <circle cx="2" cy="0" r="8" fill="#F59E0B" />
              </g>
            </g>
          )}

          {/* 4. IMPERIAL CAT: Ngự Miêu (御猫) */}
          {petId === 'imperial_cat' && (
            <g id="imperial-cat-character">
              {/* Cat Ears with Pink Inner */}
              <polygon points="58,66 42,20 86,42" fill="url(#cat-fur)" />
              <polygon points="60,62 48,30 80,44" fill="#FECDD3" />
              <polygon points="142,66 158,20 114,42" fill="url(#cat-fur)" />
              <polygon points="140,62 152,30 120,44" fill="#FECDD3" />

              {/* Curled Tail */}
              <path
                d="M 145 155 Q 175 145 170 115 Q 165 95 150 105"
                stroke="url(#cat-fur)"
                strokeWidth="14"
                fill="none"
                strokeLinecap="round"
              />

              {/* Body */}
              <ellipse cx="100" cy="146" rx="50" ry="42" fill="url(#cat-fur)" />

              {/* Head */}
              <ellipse cx="100" cy="92" rx="50" ry="40" fill="url(#cat-fur)" />

              {/* Red Silk Ribbon Collar & Brass Bell */}
              <path
                d="M 64 122 Q 100 134 136 122"
                stroke="#C83E31"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
              />
              <circle cx="100" cy="130" r="7" fill="#F59E0B" />
              <circle cx="100" cy="132" r="2" fill="#78350F" />

              {/* Eyes (Imperial Golden Eyes) */}
              {isBlinking || mood === 'happy' ? (
                <>
                  <path d="M 72 90 Q 80 82 88 90" stroke="#78350F" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M 112 90 Q 120 82 128 90" stroke="#78350F" strokeWidth="3" fill="none" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <ellipse cx="80" cy="90" rx="7" ry="6" fill="#F59E0B" />
                  <ellipse cx="80" cy="90" rx="2.5" ry="5.5" fill="#1C1D1A" />
                  <circle cx="78" cy="87" r="2" fill="#FFFFFF" />

                  <ellipse cx="120" cy="90" rx="7" ry="6" fill="#F59E0B" />
                  <ellipse cx="120" cy="90" rx="2.5" ry="5.5" fill="#1C1D1A" />
                  <circle cx="118" cy="87" r="2" fill="#FFFFFF" />
                </>
              )}

              {/* Whiskers */}
              <line x1="50" y1="96" x2="68" y2="98" stroke="#D1D5DB" strokeWidth="1.5" />
              <line x1="48" y1="104" x2="68" y2="102" stroke="#D1D5DB" strokeWidth="1.5" />
              <line x1="150" y1="96" x2="132" y2="98" stroke="#D1D5DB" strokeWidth="1.5" />
              <line x1="152" y1="104" x2="132" y2="102" stroke="#D1D5DB" strokeWidth="1.5" />

              {/* Nose & Mouth */}
              <polygon points="97,98 103,98 100,102" fill="#F43F5E" />
              {mood === 'happy' ? (
                <path d="M 94 103 Q 100 110 106 103" stroke="#78350F" strokeWidth="2" fill="#F43F5E" />
              ) : (
                <path d="M 94 103 Q 97 107 100 104 Q 103 107 106 103" stroke="#78350F" strokeWidth="1.8" fill="none" />
              )}

              {/* Paws */}
              <ellipse cx="78" cy="158" rx="11" ry="8" fill="#F4EFE6" />
              <ellipse cx="122" cy="158" rx="11" ry="8" fill="#F4EFE6" />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
