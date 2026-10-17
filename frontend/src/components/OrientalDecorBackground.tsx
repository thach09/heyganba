/**
 * OrientalDecorBackground:
 * Authentic Chinese Imperial Palace & Three Kingdoms Historical Heritage Motifs.
 *
 * Visual Components:
 * 1. Floating Kongming Lanterns (Khổng Minh Đăng - 孔明灯):
 *    Decorative ceiling lanterns with a warm glow.
 * 2. Forbidden City Curved Palace Eaves (Hoàng Cung Phi Thiềm - 斗拱飞檐):
 *    Double-eaved Chinese imperial palace roofs with upward swooping horns & ridge beasts.
 * 3. Three Kingdoms Mountain Pass & Fortress (Quan Ải Tam Quốc - 虎牢关 / 剑阁):
 *    Ancient battlements, watchtowers, and mountain cliffs along the horizon.
 * 4. Imperial Window Lattice (Hoa Song Cung Đình - 窗棂万字格):
 *    Intricate imperial palace geometric fretwork.
 * 5. Vermilion Seal Watermark (Chu Sa Triện Ấn: 志在千里 - Chí tại thiên lý).
 */
import { useEffect, useState } from 'react';

/**
 * Red Chinese Lanterns (Đôi Đèn Lồng Đỏ Mái Cung Đình):
 * - Anchored strictly to the top ceiling of the scrollable page container (absolute inset-x-0 top-0).
 * - Fades out and slides up smoothly on scroll past 20px (opacity-0 -translate-y-4 pointer-events-none transition-all duration-300).
 * - Shortened cords and compact drop (<= 68px) keeping them strictly in the top ceiling margin,
 *   never overlapping card text or descriptions at scrollY === 0.
 * - Gentle natural pendulum sway (transform-origin: top center, -2.5deg to 2.5deg, 4.5s ease-in-out infinite alternate)
 *   with staggered delay (-2.25s) between the two lanterns and full prefers-reduced-motion compliance.
 */
export function ChineseLanterns() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = (window.scrollY || document.documentElement.scrollTop || 0) > 20;
      setIsScrolled(scrolled);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      aria-hidden="true"
      data-lanterns className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-24 overflow-hidden select-none transition-all duration-300 ${
        isScrolled ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="relative w-full h-full pointer-events-none">
        {/* Lantern 1 - Primary Ceiling Hanging Lantern (Top Right) */}
        <div
          className="absolute right-6 sm:right-10 lg:right-14 top-0 origin-top animate-lantern-sway"
          style={{
            transformOrigin: 'top center',
            animationDuration: '4.5s',
            animationDelay: '0s',
          }}
        >
          <div className="relative w-[34px] h-[68px]">
            <svg
              viewBox="0 0 34 68"
              fill="none"
              className="w-full h-full "
            >
              {/* Hanging cord from ceiling */}
              <line x1="17" y1="0" x2="17" y2="12" stroke="var(--paper-red)" strokeWidth="1.2" strokeOpacity="0.85" />
              {/* Top hanging knot */}
              <circle cx="17" cy="11" r="1.8" fill="var(--paper-gold)" />
              {/* Top cap */}
              <rect x="11" y="12" width="12" height="3" rx="1" fill="var(--paper-red)" />
              <rect x="12" y="14" width="10" height="1" fill="var(--paper-gold)" opacity="0.9" />

              {/* Lantern Silk Shell */}
              <path
                d="M 12 15 C 3 22, 3 45, 12 52 L 22 52 C 31 45, 31 22, 22 15 Z"
                fill="url(#lantern-silk-grad)"
                opacity="0.9"
              />

              {/* Bamboo Ribs */}
              <line x1="17" y1="15" x2="17" y2="52" stroke="var(--paper-gold)" strokeWidth="0.8" opacity="0.45" />
              <path d="M 14 15.5 C 9 23, 9 44, 14 51.5" stroke="var(--paper-gold)" strokeWidth="0.6" opacity="0.35" fill="none" />
              <path d="M 20 15.5 C 25 23, 25 44, 20 51.5" stroke="var(--paper-gold)" strokeWidth="0.6" opacity="0.35" fill="none" />

              {/* Inner Flame Glow Core */}
              <ellipse cx="17" cy="34" rx="4.5" ry="5.5" fill="var(--paper-gold)" opacity="0.85" />
              <ellipse cx="17" cy="34" rx="2.2" ry="3.2" fill="var(--paper-card)" opacity="0.95" />

              {/* Calligraphy Character: 福 (Blessing) */}
              <text
                x="17"
                y="37.5"
                textAnchor="middle"
                fill="var(--paper-gold)"
                opacity="0.55"
                fontSize="9.5"
                fontWeight="bold"
                fontFamily="'Noto Serif SC', serif"
              >
                福
              </text>

              {/* Bottom Cap */}
              <rect x="11" y="52" width="12" height="3" rx="1" fill="var(--paper-red)" />
              <rect x="12" y="52" width="10" height="1" fill="var(--paper-gold)" opacity="0.9" />

              {/* Bottom Tassel */}
              <circle cx="17" cy="56.5" r="1.5" fill="var(--paper-gold)" />
              <line x1="17" y1="56.5" x2="17" y2="67" stroke="var(--paper-red)" strokeWidth="1.2" strokeOpacity="0.85" />
              <line x1="15.5" y1="59" x2="15.5" y2="66" stroke="var(--paper-red)" strokeWidth="0.7" strokeOpacity="0.75" />
              <line x1="18.5" y1="59" x2="18.5" y2="66" stroke="var(--paper-red)" strokeWidth="0.7" strokeOpacity="0.75" />
            </svg>
          </div>
        </div>

        {/* Lantern 2 - Secondary Ceiling Hanging Lantern (Mid-Right, Staggered Sway) */}
        <div
          className="hidden sm:block absolute right-16 sm:right-22 lg:right-28 top-0 origin-top animate-lantern-sway opacity-85"
          style={{
            transformOrigin: 'top center',
            animationDuration: '4.5s',
            animationDelay: '-2.25s',
          }}
        >
          <div className="relative w-[28px] h-[56px]">
            <svg
              viewBox="0 0 28 56"
              fill="none"
              className="w-full h-full "
            >
              {/* Hanging cord from ceiling */}
              <line x1="14" y1="0" x2="14" y2="8" stroke="var(--paper-red)" strokeWidth="1.1" strokeOpacity="0.85" />
              {/* Top knot */}
              <circle cx="14" cy="7.5" r="1.5" fill="var(--paper-gold)" />
              {/* Top cap */}
              <rect x="9" y="8" width="10" height="2.5" rx="1" fill="var(--paper-red)" />
              <rect x="10" y="9.5" width="8" height="0.8" fill="var(--paper-gold)" opacity="0.9" />

              {/* Lantern Silk Shell */}
              <path
                d="M 10 10.5 C 2.5 16, 2.5 36, 10 42 L 18 42 C 25.5 36, 25.5 16, 18 10.5 Z"
                fill="url(#lantern-silk-grad)"
                opacity="0.88"
              />

              {/* Bamboo Ribs */}
              <line x1="14" y1="10.5" x2="14" y2="42" stroke="var(--paper-gold)" strokeWidth="0.7" opacity="0.4" />
              <path d="M 11.5 11 C 7.5 17, 7.5 35, 11.5 41.5" stroke="var(--paper-gold)" strokeWidth="0.5" opacity="0.3" fill="none" />
              <path d="M 16.5 11 C 20.5 17, 20.5 35, 16.5 41.5" stroke="var(--paper-gold)" strokeWidth="0.5" opacity="0.3" fill="none" />

              {/* Inner Flame Glow Core */}
              <ellipse cx="14" cy="26" rx="3.5" ry="4.5" fill="var(--paper-gold)" opacity="0.85" />
              <ellipse cx="14" cy="26" rx="1.8" ry="2.6" fill="var(--paper-card)" opacity="0.95" />

              {/* Calligraphy Character: 吉 (Auspiciousness) */}
              <text
                x="14"
                y="29"
                textAnchor="middle"
                fill="var(--paper-gold)"
                opacity="0.55"
                fontSize="8"
                fontWeight="bold"
                fontFamily="'Noto Serif SC', serif"
              >
                吉
              </text>

              {/* Bottom Cap */}
              <rect x="9" y="42" width="10" height="2.5" rx="1" fill="var(--paper-red)" />
              <rect x="10" y="42" width="8" height="0.8" fill="var(--paper-gold)" opacity="0.9" />

              {/* Bottom Tassel */}
              <circle cx="14" cy="45.5" r="1.3" fill="var(--paper-gold)" />
              <line x1="14" y1="45.5" x2="14" y2="55" stroke="var(--paper-red)" strokeWidth="1.1" strokeOpacity="0.85" />
              <line x1="12.5" y1="48" x2="12.5" y2="54" stroke="var(--paper-red)" strokeWidth="0.6" strokeOpacity="0.7" />
              <line x1="15.5" y1="48" x2="15.5" y2="54" stroke="var(--paper-red)" strokeWidth="0.6" strokeOpacity="0.7" />
            </svg>
          </div>
        </div>

        {/* SVG Gradient Definitions */}
        <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
          <defs>
            <linearGradient id="lantern-silk-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--paper-gold)" stopOpacity="0.75" />
              <stop offset="45%" stopColor="var(--paper-gold)" stopOpacity="0.95" />
              <stop offset="75%" stopColor="var(--paper-red)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="var(--paper-red)" stopOpacity="0.95" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

/**
 * OrientalDecorBackground:
 * Authentic Chinese Imperial Palace & Three Kingdoms Historical Heritage Motifs.
 *
 * Visual Components:
 * 1. Ceiling Hanging Red Chinese Lanterns (Đôi Đèn Lồng Đỏ Mái Cung Đình)
 * 2. Forbidden City Curved Palace Eaves (Hoàng Cung Phi Thiềm - 斗拱飞檐)
 * 3. Three Kingdoms Mountain Pass & Fortress (Quan Ải Tam Quốc - 虎牢关 / 剑阁)
 * 4. Imperial Window Lattice (Hoa Song Cung Đình - 窗棂万字格)
 * 5. Vermilion Seal Watermark (Chu Sa Triện Ấn: 志在千里 - Chí tại thiên lý)
 */
export function OrientalDecorBackground() {
  return (
    <>
      {/* 1. Fixed Background Scenery (Eaves, Window Lattice, Three Kingdoms Pass, Seal Watermark) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      >
        {/* SVG Gradient Definitions for Fixed Scenery */}
        <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
          <defs>
            <linearGradient id="palace-eave-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--paper-gold)" stopOpacity="0.08" />
              <stop offset="60%" stopColor="var(--paper-red)" stopOpacity="0.05" />
              <stop offset="100%" stopColor="var(--paper-ink)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

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

      {/* 2. Top Ceiling Hanging Lanterns */}
      <ChineseLanterns />
    </>
  );
}
