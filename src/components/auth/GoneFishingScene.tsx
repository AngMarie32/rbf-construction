/**
 * "Rather Be Fishing" login illustration: an excavator using its boom as a fishing rod
 * at sunset, with a Gone Fishin' barricade. Pure SVG, no external assets.
 */
export function GoneFishingScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 460" className={className} role="img" aria-label="An excavator fishing off the shore of a lake at sunset">
      <defs>
        <linearGradient id="gf-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e2a4a" />
          <stop offset="0.55" stopColor="#7a4a5c" />
          <stop offset="1" stopColor="#f59e5b" />
        </linearGradient>
        <linearGradient id="gf-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b5c8a" />
          <stop offset="1" stopColor="#12304f" />
        </linearGradient>
        <clipPath id="gf-sign">
          <rect x="8" y="322" width="132" height="34" rx="4" />
        </clipPath>
        <clipPath id="gf-frame">
          <rect width="600" height="460" rx="28" />
        </clipPath>
        <style>{`
          @keyframes gf-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(5px) } }
          @keyframes gf-fish { 0%,100% { transform: translate(0,0) rotate(0) } 50% { transform: translate(-10px,3px) rotate(-4deg) } }
          @keyframes gf-ripple { 0% { opacity: .7; transform: scale(.6) } 100% { opacity: 0; transform: scale(1.6) } }
          .gf-bob { animation: gf-bob 2.4s ease-in-out infinite; transform-box: fill-box; }
          .gf-fish { animation: gf-fish 3.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
          .gf-ripple { animation: gf-ripple 2.4s ease-out infinite; transform-box: fill-box; transform-origin: center; }
          @media (prefers-reduced-motion: reduce) { .gf-bob, .gf-fish, .gf-ripple { animation: none } }
        `}</style>
      </defs>

      <g clipPath="url(#gf-frame)">
        {/* Sky, sun, hills */}
        <rect width="600" height="460" fill="url(#gf-sky)" />
        <circle cx="430" cy="232" r="58" fill="#fcd27a" opacity="0.95" />
        <path d="M0 250 Q120 200 240 240 T480 225 T600 240 V270 H0Z" fill="#3b3a5c" opacity="0.8" />
        <g fill="#ffffff" opacity="0.9">
          <path d="M120 90 q6 -6 12 0 q6 -6 12 0" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M160 120 q5 -5 10 0 q5 -5 10 0" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>

        {/* Lake */}
        <rect y="262" width="600" height="200" fill="url(#gf-water)" />
        <g stroke="#fcd27a" strokeLinecap="round" opacity="0.55">
          <line x1="395" y1="280" x2="465" y2="280" strokeWidth="4" />
          <line x1="405" y1="294" x2="455" y2="294" strokeWidth="3" />
          <line x1="415" y1="306" x2="445" y2="306" strokeWidth="2" />
        </g>
        <g stroke="#9cc3e6" strokeWidth="2" strokeLinecap="round" opacity="0.35" fill="none">
          <path d="M300 340 q10 -5 20 0 t20 0" />
          <path d="M500 380 q10 -5 20 0 t20 0" />
          <path d="M360 420 q10 -5 20 0 t20 0" />
        </g>

        {/* Shore */}
        <path d="M0 300 Q110 270 230 292 L270 320 L250 460 H0Z" fill="#6b4f3a" />
        <path d="M0 300 Q110 270 230 292 L245 302 Q120 285 0 312Z" fill="#7c9a4a" />

        {/* Fishing line, bobber, fish */}
        <path d="M470 118 Q478 230 476 300" stroke="#e5e7eb" strokeWidth="1.5" fill="none" />
        <ellipse className="gf-ripple" cx="476" cy="300" rx="22" ry="5" fill="none" stroke="#cfe4f7" strokeWidth="1.5" />
        <g className="gf-bob">
          <circle cx="476" cy="296" r="8" fill="#ef4444" />
          <path d="M468 296 a8 8 0 0 0 16 0Z" fill="#ffffff" />
        </g>
        <path d="M476 304 L476 372" stroke="#e5e7eb" strokeWidth="1" opacity="0.6" />
        <path d="M476 372 q-6 0 -6 6" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
        <g className="gf-fish">
          <ellipse cx="505" cy="382" rx="26" ry="13" fill="#f59e0b" />
          <path d="M528 382 l18 -12 v24Z" fill="#d97706" />
          <circle cx="487" cy="379" r="3" fill="#1f2937" />
          <path d="M480 386 q4 2 8 0" stroke="#1f2937" strokeWidth="1.5" fill="none" />
        </g>

        {/* Excavator */}
        <g>
          {/* Boom + stick as the fishing rod */}
          <path d="M170 232 L300 140 L318 156 L190 248Z" fill="#f5b301" stroke="#b77f00" strokeWidth="2" />
          <path d="M300 140 L470 116 L472 128 L312 158Z" fill="#f5b301" stroke="#b77f00" strokeWidth="2" />
          <rect x="246" y="178" width="60" height="9" rx="4" transform="rotate(-36 246 178)" fill="#9ca3af" />
          <circle cx="306" cy="148" r="7" fill="#374151" />
          {/* Bucket tipped up like a reel */}
          <path d="M462 110 q18 -2 22 14 q-8 10 -22 6Z" fill="#4b5563" />
          {/* Tracks */}
          <rect x="70" y="268" width="170" height="34" rx="17" fill="#1f2937" />
          {[90, 120, 150, 180, 210].map((x) => (
            <circle key={x} cx={x + 2} cy="285" r="9" fill="#4b5563" stroke="#111827" strokeWidth="2" />
          ))}
          {/* Body + cab */}
          <rect x="88" y="222" width="150" height="48" rx="8" fill="#f5b301" stroke="#b77f00" strokeWidth="2" />
          <rect x="88" y="252" width="150" height="8" fill="#1f2937" opacity="0.85" />
          <path d="M104 222 V160 Q104 150 114 150 H162 L184 222Z" fill="#f5b301" stroke="#b77f00" strokeWidth="2" />
          <path d="M114 162 H158 L174 214 H114Z" fill="#bfe3ff" opacity="0.9" />
          {/* Operator relaxing in the cab */}
          <circle cx="140" cy="186" r="11" fill="#e8b48f" />
          <path d="M127 182 a13 11 0 0 1 26 0Z" fill="#f97316" />
          <rect x="124" y="181" width="32" height="3.5" rx="1.5" fill="#ea580c" />
          <path d="M136 190 q4 3 8 0" stroke="#7c2d12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M128 214 Q140 196 152 214Z" fill="#2563eb" />
          <text x="92" y="246" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="15" fill="#1f2937">RBF</text>
        </g>

        {/* Gone Fishin' barricade + cone + cooler */}
        <g>
          <rect x="18" y="330" width="6" height="58" fill="#e5e7eb" />
          <rect x="124" y="330" width="6" height="58" fill="#e5e7eb" />
          <rect x="8" y="322" width="132" height="34" rx="4" fill="#ffffff" />
          <g clipPath="url(#gf-sign)">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <path key={i} d={`M${8 + i * 22} 356 l14 -34 h10 l-14 34Z`} fill="#f97316" opacity="0.9" />
            ))}
          </g>
          <rect x="22" y="327" width="104" height="24" rx="3" fill="#ffffff" />
          <text x="74" y="344" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="13" fill="#111827">GONE FISHIN'</text>
          <path d="M200 400 l14 -46 h8 l14 46Z" fill="#f97316" />
          <rect x="194" y="398" width="48" height="7" rx="2" fill="#ea580c" />
          <rect x="206" y="372" width="24" height="6" fill="#ffffff" />
          <rect x="150" y="370" width="40" height="28" rx="4" fill="#3b82f6" />
          <rect x="150" y="366" width="40" height="8" rx="3" fill="#ffffff" />
        </g>
      </g>
    </svg>
  );
}
