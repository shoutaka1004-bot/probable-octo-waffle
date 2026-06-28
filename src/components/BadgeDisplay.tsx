"use client";

import { Badge } from "@/lib/badges";

const HEX_OUTER = "M32 2 L60 18 L60 54 L32 70 L4 54 L4 18 Z";
const HEX_INNER = "M32 9 L53 22 L53 50 L32 63 L11 50 L11 22 Z";

const ACCENT = {
  amber:  { fill: "#451a03", stroke: "#d97706", inner: "#78350f", label: "#fbbf24" },
  cyan:   { fill: "#083344", stroke: "#0e7490", inner: "#0c4a6e", label: "#22d3ee" },
  violet: { fill: "#2e1065", stroke: "#7c3aed", inner: "#3b0764", label: "#a78bfa" },
} as const;

export function BadgeDisplay({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null;

  return (
    <div className="w-full">
      <p className="text-[9px] tracking-[0.5em] text-slate-600 uppercase mb-4 text-center">
        獲得バッジ
      </p>
      <div className="flex gap-5 justify-center flex-wrap">
        {badges.map((badge, i) => {
          const a = ACCENT[badge.accentColor];
          return (
            <div
              key={badge.id}
              className="flex flex-col items-center gap-2"
              style={{
                animation: `badgePop 0.55s cubic-bezier(0.36,0.07,0.19,0.97) ${i * 0.18}s both`,
              }}
            >
              {/* Hexagonal patch */}
              <div className="relative" style={{ width: 64, height: 72 }}>
                <svg width="64" height="72" viewBox="0 0 64 72" fill="none">
                  <path d={HEX_OUTER} fill={a.fill} stroke={a.stroke} strokeWidth="2.5" strokeDasharray="5 3" />
                  <path d={HEX_INNER} fill="none" stroke={a.inner} strokeWidth="1" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[22px] leading-none">{badge.emoji}</span>
                </div>
              </div>
              {/* Label */}
              <div className="text-center">
                <p className="text-[10px] font-bold tracking-wider" style={{ color: a.label }}>
                  {badge.name}
                </p>
                <p className="text-[8px] text-slate-600 mt-0.5 leading-tight">{badge.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
