"use client";

import { useState, useEffect, useRef } from "react";

export type HintType = "hint" | "lore";

const HINTS = [
  "あっちの方角、ちょっと気になる路地がない？",
  "いい匂いがするほうへ、あえて曲がってみよう。",
  "スマホをポケットに入れて、1分間だけ風を感じて歩いてみて。",
  "信号が赤だったら、次は左に曲がってみる？",
  "今の気分にぴったりの、エモい自販機を見つけよう。",
  "ちょっと立ち止まって、空を見上げてみて。",
];

const LORE = [
  "かつてこの道は、商人たちが行き交う街道だったかもしれない。",
  "この地の地下には、今も古い水路が静かに流れているという。",
  "ここに昔、誰かが毎朝通った道があったはずだ。",
  "この角に立つと、時代が少しだけ透けて見える気がする。",
  "風の匂いが変わった。昔ここには緑が多かったのかもしれない。",
  "地面の微妙な傾きに、この土地の記憶が刻まれている。",
  "どこかの誰かが、この場所で大切な何かを決めた。",
  "夜になると、ここには違う顔が現れるという。",
  "この建物の影が落ちる場所に、昔は何があったのだろう。",
  "空気がここだけ少し古い。時間の層が薄いのかもしれない。",
];

interface HintEntry {
  text: string;
  type: HintType;
}

const ALL: HintEntry[] = [
  ...HINTS.map((text) => ({ text, type: "hint" as HintType })),
  ...LORE.map((text) => ({ text, type: "lore" as HintType })),
];

function pickRandom(exclude?: string): HintEntry {
  const pool = ALL.filter((e) => e.text !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function useWalkHints(isActive: boolean): {
  hint: string | null;
  hintType: HintType;
} {
  const [entry, setEntry] = useState<HintEntry | null>(null);
  const currentRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setEntry(null);
      currentRef.current = null;
      return;
    }

    let cancelled = false;

    const showNext = (delay: number) => {
      timerRef.current = setTimeout(() => {
        if (cancelled) return;
        const next = pickRandom(currentRef.current ?? undefined);
        currentRef.current = next.text;
        setEntry(next);
        showNext(30000 + Math.random() * 30000);
      }, delay);
    };

    showNext(10000);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isActive]);

  return {
    hint: entry?.text ?? null,
    hintType: entry?.type ?? "hint",
  };
}
