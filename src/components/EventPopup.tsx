"use client";

import { WalkEventItem } from "@/hooks/useWalkEvents";

interface Props {
  event: WalkEventItem;
  onDismiss: () => void;
  accentColor: string;
}

export function EventPopup({ event, onDismiss, accentColor }: Props) {
  return (
    <div
      className="fixed left-4 right-4 z-40 cursor-pointer select-none"
      style={{
        top: "88px",
        animation: "eventPop 0.45s cubic-bezier(0.16,1,0.3,1) forwards",
      }}
      onClick={onDismiss}
    >
      <div
        className="rounded-2xl p-4 backdrop-blur-md"
        style={{
          background: "rgba(2,6,23,0.95)",
          border: `1px solid ${accentColor}55`,
          boxShadow: `0 4px 32px ${accentColor}18, 0 0 1px ${accentColor}30`,
        }}
      >
        <div className="flex items-start gap-3">
          <span
            className="text-[9px] font-bold tracking-[0.3em] uppercase px-2.5 py-1 rounded-full flex-shrink-0 mt-0.5"
            style={{
              backgroundColor: accentColor + "20",
              color: accentColor,
              border: `1px solid ${accentColor}44`,
            }}
          >
            {event.tag}
          </span>
          <p className="text-sm tracking-[0.06em] text-white/90 leading-relaxed">
            {event.text}
          </p>
        </div>
        <p className="text-[9px] tracking-[0.3em] text-white/25 text-right mt-2.5">
          タップで閉じる
        </p>
      </div>
    </div>
  );
}
