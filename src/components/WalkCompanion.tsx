"use client";

import { getCompanionSkin, CompanionSkinConfig } from "@/lib/shop";

interface Props {
  distanceMeters?: number;
  large?: boolean;
  skinId?: string;
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

export function WalkCompanion({ large = false, skinId }: Props) {
  const sz = large ? 72 : 52;
  const skin = getCompanionSkin(skinId ?? "default");

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 32 32"
        width={sz}
        height={sz}
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: "companionFloat 2.4s ease-in-out infinite" }}
      >
        <Fairy c={skin} />
      </svg>
    </div>
  );
}
