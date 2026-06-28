"use client";

import { getCompanionSkin, CompanionSkinConfig } from "@/lib/shop";

interface Props {
  distanceMeters: number;
  large?: boolean;
  skinId?: string;
}

type Stage = 0 | 1 | 2 | 3;

const STAGE_NAMES = ["たまご", "スライム", "ちびっこ", "ようせい"] as const;
const STAGE_THRESHOLDS = [0, 100, 200, 300] as const;

function getStage(meters: number): Stage {
  if (meters >= 300) return 3;
  if (meters >= 200) return 2;
  if (meters >= 100) return 1;
  return 0;
}

function Egg() {
  return (
    <>
      <ellipse cx="16" cy="29" rx="7" ry="1.8" fill="rgba(0,0,0,0.15)" />
      <ellipse cx="16" cy="17" rx="9" ry="11" fill="#fefce8" stroke="#fde68a" strokeWidth="0.8" />
      <ellipse cx="12" cy="12" rx="2" ry="3" fill="rgba(255,255,255,0.75)" transform="rotate(-20,12,12)" />
      <path d="M16 7.5 L14.5 12 L16.5 13" stroke="#fde68a" strokeWidth="0.9" fill="none" strokeLinecap="round" />
    </>
  );
}

function Slime({ c }: { c: CompanionSkinConfig }) {
  return (
    <>
      <ellipse cx="16" cy="29.5" rx="8" ry="1.8" fill="rgba(0,0,0,0.15)" />
      <circle cx="11" cy="14" r="4.5" fill={c.bodyColor} />
      <circle cx="21" cy="14" r="4.5" fill={c.bodyColor} />
      <ellipse cx="16" cy="21" rx="9.5" ry="8" fill={c.bodyColor} />
      <circle cx="13.5" cy="20" r="2.2" fill={c.eyeColor} />
      <circle cx="18.5" cy="20" r="2.2" fill={c.eyeColor} />
      <circle cx="14.3" cy="19.2" r="0.8" fill="white" />
      <circle cx="19.3" cy="19.2" r="0.8" fill="white" />
      <path d="M14 23 Q16 25 18 23" stroke={c.eyeColor} strokeWidth="1" fill="none" strokeLinecap="round" />
    </>
  );
}

function Chibi({ c }: { c: CompanionSkinConfig }) {
  return (
    <>
      <circle cx="11" cy="11.5" r="4" fill={c.bodyColor} />
      <circle cx="21" cy="11.5" r="4" fill={c.bodyColor} />
      <ellipse cx="16" cy="18" rx="9" ry="7.5" fill={c.bodyColor} />
      <circle cx="13.5" cy="17" r="2" fill={c.eyeColor} />
      <circle cx="18.5" cy="17" r="2" fill={c.eyeColor} />
      <circle cx="14.2" cy="16.2" r="0.7" fill="white" />
      <circle cx="19.2" cy="16.2" r="0.7" fill="white" />
      <path d="M14 20 Q16 22 18 20" stroke={c.eyeColor} strokeWidth="1" fill="none" strokeLinecap="round" />
      <rect x="12.5" y="25" width="3" height="5.5" rx="1.5" fill={c.bodyColor} />
      <rect x="16.5" y="25" width="3" height="5.5" rx="1.5" fill={c.bodyColor} />
    </>
  );
}

function Fairy({ c }: { c: CompanionSkinConfig }) {
  return (
    <>
      <path d="M5 14 Q3 7 10 11 Q9 16 5 14Z" fill={c.wing1} opacity="0.9" />
      <path d="M27 14 Q29 7 22 11 Q23 16 27 14Z" fill={c.wing1} opacity="0.9" />
      <path d="M5 18 Q3 24 10 19.5 Q8 14.5 5 18Z" fill={c.wing2} opacity="0.7" />
      <path d="M27 18 Q29 24 22 19.5 Q24 14.5 27 18Z" fill={c.wing2} opacity="0.7" />
      <circle cx="12" cy="11" r="3.8" fill={c.bodyColor} />
      <circle cx="20" cy="11" r="3.8" fill={c.bodyColor} />
      <ellipse cx="16" cy="18" rx="8.5" ry="7" fill={c.bodyColor} />
      <circle cx="13.5" cy="17" r="2" fill={c.eyeColor} />
      <circle cx="18.5" cy="17" r="2" fill={c.eyeColor} />
      <circle cx="14.2" cy="16.2" r="0.7" fill="white" />
      <circle cx="19.2" cy="16.2" r="0.7" fill="white" />
      <path d="M14 20 Q16 22 18 20" stroke={c.eyeColor} strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M25 3 L25.7 5.8 L28.5 6.5 L25.7 7.2 L25 10 L24.3 7.2 L21.5 6.5 L24.3 5.8Z" fill="#fde68a" />
    </>
  );
}

export function WalkCompanion({ distanceMeters, large = false, skinId }: Props) {
  const stage = getStage(distanceMeters);
  const sz = large ? 72 : 52;
  const skin = getCompanionSkin(skinId ?? "default");

  const nextThreshold = STAGE_THRESHOLDS[Math.min(3, stage + 1) as Stage];
  const curThreshold = STAGE_THRESHOLDS[stage];
  const progress = stage < 3
    ? Math.min(1, (distanceMeters - curThreshold) / (nextThreshold - curThreshold))
    : 1;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        viewBox="0 0 32 32"
        width={sz}
        height={sz}
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: "companionFloat 2.4s ease-in-out infinite" }}
      >
        {stage === 0 && <Egg />}
        {stage === 1 && <Slime c={skin} />}
        {stage === 2 && <Chibi c={skin} />}
        {stage === 3 && <Fairy c={skin} />}
      </svg>
      <p className="text-[8px] text-slate-500 tracking-wider">{STAGE_NAMES[stage]}</p>
      {!large && stage < 3 && (
        <div className="w-10 h-0.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500/70 rounded-full transition-all duration-700"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
