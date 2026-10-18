/**
 * OrientalDecorBackground:
 * Authentic Chinese Imperial Palace & Three Kingdoms Historical Heritage Motifs.
 *
 * Visual Components:
 * 1. Floating Kongming Lanterns (Khổng Minh Đăng - 孔明灯):
 *    Invented by Zhuge Liang in the Three Kingdoms era, floating in the night sky with warm amber glow.
 * 2. Forbidden City Curved Palace Eaves (Hoàng Cung Phi Thiềm - 斗拱飞檐):
 *    Double-eaved Chinese imperial palace roofs with upward swooping horns & ridge beasts.
 * 3. Three Kingdoms Mountain Pass & Fortress (Quan Ải Tam Quốc - 虎牢关 / 剑阁):
 *    Ancient battlements, watchtowers, and mountain cliffs along the horizon.
 * 4. Imperial Window Lattice (Hoa Song Cung Đình - 窗棂万字格):
 *    Intricate imperial palace geometric fretwork.
 * 5. Vermilion Seal Watermark (Chu Sa Triện Ấn: 志在千里 - Chí tại thiên lý).
 */
import { useEffect, useState } from 'react';

export function OrientalDecorBackground() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* 1. Floating Kongming Lanterns (Khổng Minh Đăng - 孔明灯) in the Upper Night Sky */}
      <div
        data-lanterns
        className={`absolute inset-x-0 top-0 h-[480px] pointer-events-none transition-opacity duration-300 motion-reduce:transition-none ${
          isScrolled ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Lantern 1 - Top right margin, clear of content */}
        <div
          className="absolute right-[4%] top-4 animate-lantern-sway"
          style={{ animationDuration: '7s' }}
        >
          <div className="relative w-12 h-16 animate-lantern-glow">
            {/* Lantern Body */}
            <svg viewBox="0 0 48 64" fill="none" className="w-full h-full drop-shadow-[0_0_16px_rgba(245,158,11,0.45)]">
              {/* Outer Glow & Shell */}
              <path
                d="M 12 8 Q 24 4 36 8 L 40 48 Q 24 54 8 48 Z"
                fill="url(#lantern-grad-1)"
                opacity="0.85"
              />
              {/* Bamboo rib frames */}
              <line x1="24" y1="6" x2="24" y2="51" stroke="#78350F" strokeWidth="0.8" opacity="0.6" />
              <line x1="16" y1="7" x2="14" y2="49" stroke="#78350F" strokeWidth="0.6" opacity="0.5" />
              <line x1="32" y1="7" x2="34" y2="49" stroke="#78350F" strokeWidth="0.6" opacity="0.5" />
              {/* Inner Flame Core */}
              <ellipse cx="24" cy="42" rx="6" ry="7" fill="#FEF08A" opacity="0.9" />
              <ellipse cx="24" cy="42" rx="3" ry="4" fill="#FFFFFF" opacity="0.95" />
              {/* Character '志' (Ambition / Chí) */}
              <text x="24" y="32" textAnchor="middle" fill="#78350F" opacity="0.4" fontSize="11" fontFamily="'Noto Serif SC', serif">
                志
              </text>
              {/* Bottom fire ring & tassel */}
              <rect x="18" y="50" width="12" height="3" rx="1.5" fill="#B91C1C" opacity="0.8" />
              <line x1="24" y1="53" x2="24" y2="62" stroke="#B91C1C" strokeWidth="1" opacity="0.7" />
              <circle cx="24" cy="62" r="1.5" fill="#D97706" />
            </svg>
          </div>
        </div>

        {/* Lantern 2 - Upper center-right, mid distance */}
        <div
          className="absolute right-[28%] top-20 animate-lantern-sway opacity-60"
          style={{ animationDuration: '9s', animationDelay: '-2s' }}
        >
          <div className="relative w-8 h-11">
            <svg viewBox="0 0 48 64" fill="none" className="w-full h-full drop-shadow-[0_0_12px_rgba(245,158,11,0.35)]">
              <path
                d="M 12 8 Q 24 4 36 8 L 40 48 Q 24 54 8 48 Z"
                fill="url(#lantern-grad-1)"
              />
              <ellipse cx="24" cy="42" rx="5" ry="6" fill="#FEF08A" opacity="0.85" />
              <rect x="18" y="50" width="12" height="3" rx="1.5" fill="#B91C1C" opacity="0.7" />
              <line x1="24" y1="53" x2="24" y2="60" stroke="#B91C1C" strokeWidth="1" opacity="0.6" />
            </svg>
          </div>
        </div>

        {/* Lantern 3 - Far distance, small drift */}
        <div
          className="absolute right-[42%] top-6 animate-lantern-sway opacity-40"
          style={{ animationDuration: '11s', animationDelay: '-5s' }}
        >
          <div className="relative w-5 h-7">
            <svg viewBox="0 0 48 64" fill="none" className="w-full h-full">
              <path
                d="M 12 8 Q 24 4 36 8 L 40 48 Q 24 54 8 48 Z"
                fill="#F59E0B"
                opacity="0.8"
              />
              <ellipse cx="24" cy="42" rx="5" ry="5" fill="#FEF08A" />
            </svg>
          </div>
        </div>

        {/* Lantern 4 - Top left drift (hidden on mobile to keep header clean) */}
        <div
          className="hidden sm:block absolute left-[12%] top-6 animate-lantern-sway opacity-40"
          style={{ animationDuration: '8.5s', animationDelay: '-3.5s' }}
        >
          <div className="relative w-7 h-10">
            <svg viewBox="0 0 48 64" fill="none" className="w-full h-full drop-shadow-[0_0_10px_rgba(245,158,11,0.25)]">
              <path
                d="M 12 8 Q 24 4 36 8 L 40 48 Q 24 54 8 48 Z"
                fill="url(#lantern-grad-1)"
                opacity="0.75"
              />
              <ellipse cx="24" cy="42" rx="5" ry="6" fill="#FEF08A" opacity="0.8" />
              <line x1="24" y1="50" x2="24" y2="58" stroke="#B91C1C" strokeWidth="1" opacity="0.6" />
            </svg>
          </div>
        </div>

        {/* SVG Gradient Definitions */}
        <svg className="absolute w-0 h-0" aria-hidden="true">
          <defs>
            <linearGradient id="lantern-grad-1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D97706" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#B91C1C" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="palace-eave-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--paper-gold)" stopOpacity="0.08" />
              <stop offset="60%" stopColor="var(--paper-red)" stopOpacity="0.05" />
              <stop offset="100%" stopColor="var(--paper-ink)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* 2. Forbidden City Curved Palace Eaves (Phi Thiềm Hoàng Cung - 斗拱飞檐) in Upper Right */}
      <svg
        className="absolute -top-6 right-0 w-[580px] max-w-[50vw] h-[320px] text-gold-ink opacity-[0.055] pointer-events-none"
        viewBox="0 0 500 280"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      >
        {/* Upper Tier Palace Ridge (Thượng Thiềm) */}
        <path
          d="M 160 30 Q 320 60 480 15 Q 492 12 498 4 C 496 18, 480 28, 450 36 L 220 54 Z"
          fill="currentColor"
          fillOpacity="0.25"
        />
        {/* Chi-wen roof beast ornament (吻兽) at the tip */}
        <path d="M 498 4 C 504 1 508 8 502 14 C 496 18 490 16 488 12 Z" fill="currentColor" />

        {/* Lower Tier Grand Eaves (Hạ Thiềm Phi Vĩ) with deep classical upward swoop */}
        <path
          d="M 40 100 Q 260 135 460 70 Q 480 62 494 48 C 490 68, 465 82, 420 95 L 120 125 Z"
          fill="currentColor"
          fillOpacity="0.3"
        />
        {/* Lower roof tip beast */}
        <path d="M 494 48 C 500 44 506 52 498 58 C 492 62 486 60 484 54 Z" fill="currentColor" />

        {/* Dougong Brackets (Đấu Củng - 斗拱) support blocks */}
        <g strokeWidth="1" stroke="currentColor" opacity="0.8">
          <rect x="180" y="54" width="14" height="10" />
          <rect x="230" y="58" width="14" height="10" />
          <rect x="280" y="62" width="14" height="10" />
          <rect x="330" y="66" width="14" height="10" />
          <rect x="380" y="70" width="14" height="10" />
          {/* Lower tier bracket row */}
          <rect x="120" y="125" width="16" height="12" />
          <rect x="180" y="130" width="16" height="12" />
          <rect x="240" y="135" width="16" height="12" />
          <rect x="300" y="138" width="16" height="12" />
          <rect x="360" y="136" width="16" height="12" />
        </g>

        {/* Imperial Vermilion Palace Pillars (Trụ Son Cung Đình) */}
        <line x1="200" y1="147" x2="200" y2="280" stroke="var(--paper-red)" strokeWidth="3" opacity="0.4" />
        <line x1="320" y1="150" x2="320" y2="280" stroke="var(--paper-red)" strokeWidth="3" opacity="0.4" />
        <line x1="420" y1="148" x2="420" y2="280" stroke="var(--paper-red)" strokeWidth="3" opacity="0.4" />
      </svg>

      {/* 3. Classical Chinese Window Lattice (Hoa Song Cung Đình - 万字万象) in Top Left */}
      <svg
        className="absolute top-0 left-0 w-44 h-44 text-gold-ink opacity-[0.035] pointer-events-none"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      >
        <path d="M 0 0 L 70 0 L 70 18 L 18 18 L 18 70 L 0 70 Z" />
        <path d="M 28 28 L 56 28 L 56 40 L 40 40 L 40 56 L 28 56 Z" />
        <line x1="0" y1="35" x2="18" y2="35" />
        <line x1="35" y1="0" x2="35" y2="18" />
        <circle cx="56" cy="56" r="4" fill="currentColor" opacity="0.5" />
      </svg>

      {/* 4. Three Kingdoms Mountain Pass & Fortress Silhouette (Quan Ải Tam Quốc - 虎牢关 / 剑阁) along Bottom */}
      <div className="absolute bottom-0 inset-x-0 h-[240px] pointer-events-none">
        <svg
          className="w-full h-full text-fg opacity-[0.055] pointer-events-none"
          viewBox="0 0 1440 240"
          fill="currentColor"
          preserveAspectRatio="none"
        >
          {/* Distant Heroic Mountain Pass Peaks (Dãy Núi Hiểm Trở) */}
          <path
            d="M 0 240 L 0 140 Q 140 70 280 130 T 560 90 Q 720 40 880 120 T 1200 80 Q 1320 50 1440 100 L 1440 240 Z"
            fill="var(--paper-ink)"
            opacity="0.6"
          />

          {/* Three Kingdoms Watchtowers & Battlements (Thành Lâu Quan Ải & Nữ Tường) */}
          {/* Mountain Pass Gate 1 (Left): Kiếm Các / Hổ Lao Quan */}
          <g fill="var(--paper-ink)" opacity="0.95">
            {/* Gate rampart base */}
            <path d="M 160 240 L 180 150 L 320 150 L 340 240 Z" />
            {/* Gate archway portal */}
            <path d="M 230 240 L 230 190 Q 250 170 270 190 L 270 240 Z" fill="var(--paper-ink)" />
            {/* Crenelated battlements on wall top */}
            <rect x="180" y="142" width="15" height="8" />
            <rect x="205" y="142" width="15" height="8" />
            <rect x="230" y="142" width="15" height="8" />
            <rect x="255" y="142" width="15" height="8" />
            <rect x="280" y="142" width="15" height="8" />
            <rect x="305" y="142" width="15" height="8" />
            {/* Multi-story Gate Watchtower Pavilion (Môn Lâu) */}
            <path d="M 210 142 L 210 115 L 290 115 L 290 142 Z" />
            {/* Curved watchtower roof with upward eaves */}
            <path d="M 190 118 Q 250 112 310 118 L 316 112 Q 250 96 184 112 Z" fill="var(--paper-gold)" opacity="0.4" />
            {/* Battle Pennant / Flag (Chiến Kỳ Tam Quốc) */}
            <line x1="290" y1="115" x2="290" y2="82" stroke="var(--paper-gold)" strokeWidth="1.5" />
            <path d="M 290 82 L 314 90 L 290 98 Z" fill="var(--paper-red)" opacity="0.75" />
          </g>

          {/* Fortress Tower 2 (Right Horizon) */}
          <g fill="var(--paper-ink)" opacity="0.85">
            <path d="M 1120 240 L 1135 160 L 1225 160 L 1240 240 Z" />
            <rect x="1135" y="154" width="12" height="6" />
            <rect x="1155" y="154" width="12" height="6" />
            <rect x="1175" y="154" width="12" height="6" />
            <rect x="1195" y="154" width="12" height="6" />
            <rect x="1213" y="154" width="12" height="6" />
            <path d="M 1150 154 L 1150 130 L 1210 130 L 1210 154 Z" />
            <path d="M 1138 132 Q 1180 126 1222 132 L 1226 128 Q 1180 116 1134 128 Z" fill="var(--paper-gold)" opacity="0.35" />
            <line x1="1210" y1="130" x2="1210" y2="105" stroke="var(--paper-gold)" strokeWidth="1.2" />
            <path d="M 1210 105 L 1228 111 L 1210 117 Z" fill="var(--paper-red)" opacity="0.65" />
          </g>

          {/* Foreground Atmospheric Mist Wave (Sương Mù Quan Ải) */}
          <path
            d="M 0 240 L 0 205 C 240 190, 480 215, 720 198 C 960 185, 1200 215, 1440 200 L 1440 240 Z"
            fill="var(--paper-ink)"
            opacity="0.9"
          />
        </svg>
      </div>

      {/* 5. Authentic Vermilion Seal Watermark (朱红御印: 志在千里 - Chí Tại Thiên Lý) */}
      <div className="absolute right-8 bottom-6 flex flex-col items-center opacity-[0.05] pointer-events-none select-none">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-sm border-2 border-cinnabar p-1 rotate-[-3deg] ">
          <div className="absolute inset-0.5 rounded-[1px] border border-cinnabar/60" />
          <div className="grid grid-cols-2 gap-1 text-center font-serif text-[12.5px] font-bold leading-none text-cinnabar-ink">
            <span>志</span>
            <span>在</span>
            <span>千</span>
            <span>里</span>
          </div>
        </div>
      </div>
    </div>
  );
}
