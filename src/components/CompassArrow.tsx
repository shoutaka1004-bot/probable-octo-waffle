"use client";

import { ThemeConfig } from "@/lib/theme";

interface CompassArrowProps {
  rotation: number;
  searching?: boolean;
  theme?: ThemeConfig;
}

export function CompassArrow({ rotation, searching = false, theme }: CompassArrowProps) {
  const needle     = theme?.compassNeedle          ?? "#f97316";
  const needleHL   = theme?.compassNeedleHighlight ?? "#fb923c";
  const needleCtr  = theme?.compassNeedleCenter    ?? "#f97316";
  const ring1      = theme?.compassRing1           ?? "#1e293b";
  const ring2      = theme?.compassRing2           ?? "#334155";
  const tick       = theme?.compassTick            ?? "#334155";
  const tickMinor  = theme?.compassTickMinor       ?? "#1e293b";
  const pivotBg    = theme?.compassPivotBg         ?? "#0f172a";
  const pivotStr   = theme?.compassPivotStroke     ?? "#334155";
  const southFill  = theme?.compassSouthFill       ?? "#334155";
  const southShadow = theme?.compassSouthShadow    ?? "#1e293b";
  const glow       = theme?.compassGlow            ?? "radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)";

  return (
    <div className="relative flex items-center justify-center select-none">
      {/* Outer glow ring */}
      <div
        className="absolute rounded-full"
        style={{ width: 260, height: 260, background: glow }}
      />

      {/* Compass disc */}
      <div
        style={{
          width: 240,
          height: 240,
          transform: searching ? undefined : `rotate(${rotation}deg)`,
          transition: searching ? undefined : "transform 0.25s ease-out",
        }}
      >
        <svg
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Outer rings */}
          <circle cx="100" cy="100" r="96" stroke={ring1} strokeWidth="3" />
          <circle cx="100" cy="100" r="90" stroke={ring2} strokeWidth="0.5" />

          {/* Cardinal ticks */}
          <line x1="100" y1="6"   x2="100" y2="20"  stroke={needle} strokeWidth="3" strokeLinecap="round" />
          <line x1="194" y1="100" x2="180" y2="100" stroke={tick}   strokeWidth="1.5" strokeLinecap="round" />
          <line x1="100" y1="194" x2="100" y2="180" stroke={tick}   strokeWidth="1.5" strokeLinecap="round" />
          <line x1="6"   y1="100" x2="20"  y2="100" stroke={tick}   strokeWidth="1.5" strokeLinecap="round" />

          {/* Minor ticks every 45° */}
          {[45, 135, 225, 315].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = 100 + 90 * Math.sin(rad);
            const y1 = 100 - 90 * Math.cos(rad);
            const x2 = 100 + 82 * Math.sin(rad);
            const y2 = 100 - 82 * Math.cos(rad);
            return (
              <line
                key={angle}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={tickMinor}
                strokeWidth="1"
                strokeLinecap="round"
              />
            );
          })}

          {/* North needle tip */}
          <path d="M100 18 L113 95 L100 86 L87 95 Z" fill={needle} />
          <path d="M100 18 L107 70 L100 63 Z" fill={needleHL} opacity="0.5" />

          {/* South tail */}
          <path d="M100 182 L113 105 L100 114 L87 105 Z" fill={southFill} />
          <path d="M100 182 L107 130 L100 137 Z" fill={southShadow} opacity="0.5" />

          {/* Center pivot */}
          <circle cx="100" cy="100" r="9"   fill={pivotBg}  stroke={pivotStr} strokeWidth="1.5" />
          <circle cx="100" cy="100" r="4"   fill={needleCtr} />
          <circle cx="100" cy="100" r="1.5" fill="#fff" opacity="0.6" />
        </svg>
      </div>

      {/* Searching pulse overlay */}
      {searching && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-12 h-12 rounded-full border-2 opacity-40 animate-ping"
            style={{ borderColor: needle }}
          />
        </div>
      )}
    </div>
  );
}
