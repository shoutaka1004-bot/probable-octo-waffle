"use client";

import { useState, useEffect, useRef } from "react";

export interface WalkEventItem {
  tag: string;
  text: string;
}

const MISSIONS: WalkEventItem[] = [
  { tag: "探知", text: "3分以内に、青い車か自動販売機を見つけよう" },
  { tag: "命令", text: "次の角を、あえて「普段選ばない方」に曲がれ" },
  { tag: "ボーナス", text: "ここから50歩、大股で歩くとお供が急成長するぞ" },
  { tag: "観察", text: "立ち止まって。今この瞬間の空の色を心に焼け" },
  { tag: "命令", text: "目を閉じて10歩、感覚だけで前に進んでみよう" },
  { tag: "探知", text: "視界に入る最も古そうな建物を見つけ、歴史を想像せよ" },
  { tag: "観察", text: "すれ違った人の靴の色を3人分、心の中でメモせよ" },
  { tag: "命令", text: "次の交差点まで、できる限り足音を立てずに歩け" },
  { tag: "探知", text: "植物か土の匂いを感じたら、その方向へ一歩踏み出せ" },
  { tag: "ボーナス", text: "誰かとすれ違ったら、心の中で「ありがとう」と伝えよう" },
];

export function useWalkEvents(isActive: boolean): {
  event: WalkEventItem | null;
  clearEvent: () => void;
} {
  const [event, setEvent] = useState<WalkEventItem | null>(null);
  const lastIdxRef = useRef(-1);
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearEvent = () => {
    if (autoHideRef.current) clearTimeout(autoHideRef.current);
    setEvent(null);
  };

  useEffect(() => {
    if (!isActive) {
      if (autoHideRef.current) clearTimeout(autoHideRef.current);
      setEvent(null);
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fire = () => {
      if (autoHideRef.current) clearTimeout(autoHideRef.current);
      const pool = MISSIONS.filter((_, i) => i !== lastIdxRef.current);
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      lastIdxRef.current = MISSIONS.indexOf(chosen);
      setEvent(chosen);
      autoHideRef.current = setTimeout(() => setEvent(null), 4000);
    };

    const firstId = setTimeout(() => {
      fire();
      intervalId = setInterval(fire, 120_000);
    }, 120_000);

    return () => {
      clearTimeout(firstId);
      if (intervalId) clearInterval(intervalId);
      if (autoHideRef.current) clearTimeout(autoHideRef.current);
    };
  }, [isActive]);

  return { event, clearEvent };
}
