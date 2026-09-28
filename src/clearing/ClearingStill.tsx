import { useMemo } from 'react';
import { mulberry32 } from './engine/noise';

/** A lightweight illustrated version of the clearing for devices without WebGL. */
export function ClearingStill() {
  const { stars, treesLeft, treesRight } = useMemo(() => {
    const rng = mulberry32(12);
    const stars = Array.from({ length: 220 }, () => ({
      x: rng() * 1600,
      y: Math.pow(rng(), 1.3) * 560,
      r: 0.5 + Math.pow(rng(), 6) * 1.8,
      o: 0.3 + rng() * 0.7,
      d: rng() * 6,
    }));
    const tree = (x: number, base: number, h: number) => {
      const w = h * 0.34;
      const tiers = 4;
      let d = '';
      for (let i = 0; i < tiers; i++) {
        const top = base - h * (0.3 + (i / tiers) * 0.7);
        const bottom = base - h * (i / tiers) * 0.62;
        const tw = w * (1 - i / tiers) * 1.1;
        d += `M${x - tw},${bottom} L${x},${top - h * 0.12} L${x + tw},${bottom} Z `;
      }
      return d;
    };
    const treesLeft: string[] = [];
    const treesRight: string[] = [];
    for (let i = 0; i < 16; i++) {
      const x = i * 42 - 40 + rng() * 30;
      treesLeft.push(tree(x, 780 + rng() * 40, 380 + rng() * 260 - i * 12));
      const xr = 1640 - i * 42 - rng() * 30;
      treesRight.push(tree(xr, 780 + rng() * 40, 380 + rng() * 260 - i * 12));
    }
    return { stars, treesLeft, treesRight };
  }, []);

  return (
    <svg
      className="clearing-still"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Illustration of a moonlit forest clearing with a small campfire"
    >
      <defs>
        <linearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#03050c" />
          <stop offset="0.55" stopColor="#0b1224" />
          <stop offset="0.8" stopColor="#141c33" />
        </linearGradient>
        <radialGradient id="cs-moon-halo">
          <stop offset="0" stopColor="#c9d0e6" stopOpacity="0.35" />
          <stop offset="1" stopColor="#c9d0e6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cs-moon" cx="0.45" cy="0.42">
          <stop offset="0" stopColor="#fff8e8" />
          <stop offset="1" stopColor="#dcd2bb" />
        </radialGradient>
        <radialGradient id="cs-fire" cx="0.5" cy="0.6">
          <stop offset="0" stopColor="#ffb25e" stopOpacity="0.55" />
          <stop offset="0.4" stopColor="#ff6a1f" stopOpacity="0.18" />
          <stop offset="1" stopColor="#ff6a1f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cs-flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fff1c4" />
          <stop offset="0.4" stopColor="#ff9a3c" />
          <stop offset="1" stopColor="#ff4b12" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#cs-sky)" />
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill="#e8eeff"
          opacity={s.o}
          className="clearing-star"
          style={{ animationDelay: `${s.d}s` }}
        />
      ))}
      <circle cx="700" cy="440" r="210" fill="url(#cs-moon-halo)" />
      <circle cx="700" cy="440" r="40" fill="url(#cs-moon)" />
      <path
        d="M0,560 C160,520 300,540 420,510 C560,475 640,530 780,505 C920,480 1040,525 1180,500 C1320,478 1460,520 1600,500 L1600,900 L0,900 Z"
        fill="#0c1222"
      />
      <path
        d="M0,600 C200,580 360,600 520,575 C700,550 820,600 1000,580 C1180,560 1360,600 1600,575 L1600,900 L0,900 Z"
        fill="#080c16"
      />
      <path d="M0,720 C400,690 1200,690 1600,720 L1600,900 L0,900 Z" fill="#070a0c" />
      <g fill="#05070a">
        {treesLeft.map((d, i) => (
          <path key={`l${i}`} d={d} />
        ))}
        {treesRight.map((d, i) => (
          <path key={`r${i}`} d={d} />
        ))}
      </g>
      <ellipse cx="800" cy="790" rx="420" ry="160" fill="url(#cs-fire)" className="clearing-fire-glow" />
      <g className="clearing-flames">
        <path d="M785,800 C770,770 790,745 800,715 C810,745 830,770 815,800 Z" fill="url(#cs-flame)" />
        <path d="M770,802 C760,785 772,770 778,752 C786,772 792,788 786,802 Z" fill="url(#cs-flame)" opacity="0.8" />
        <path d="M814,802 C808,786 816,770 824,756 C830,772 836,788 830,802 Z" fill="url(#cs-flame)" opacity="0.8" />
      </g>
      <path d="M760,806 L842,796 M766,796 L838,808" stroke="#2a1a10" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}
