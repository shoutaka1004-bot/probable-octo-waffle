"use client";

import { useState, useEffect, useRef } from "react";

const INITIAL_DELAY_MS = 8_000;   // 歩行開始8秒後にフェッチ
const TRIVIA_STEP_M    = 150;     // 150mごとに次のtriviaへ

interface LoreData {
  areaName: string;
  routeTheme: string;
  triviaList: string[];
}

export interface AILoreResult {
  areaName: string | null;
  currentMessage: string | null;
  messageLabel: "route" | "trivia";
  isLoadingLore: boolean;
}

export function useAILore(
  isActive: boolean,
  lat: number | null,
  lng: number | null,
  totalDistanceMeters: number
): AILoreResult {
  const [lore, setLore] = useState<LoreData | null>(null);
  const [isLoadingLore, setIsLoadingLore] = useState(false);
  const [triviaIndex, setTriviaIndex] = useState(0);

  const latRef = useRef(lat);
  const lngRef = useRef(lng);
  const hasFetched = useRef(false);
  const lastStepM = useRef(0);

  useEffect(() => { latRef.current = lat; }, [lat]);
  useEffect(() => { lngRef.current = lng; }, [lng]);

  // ── Reset & fetch on walk start ──
  useEffect(() => {
    if (!isActive) {
      hasFetched.current = false;
      lastStepM.current = 0;
      setLore(null);
      setTriviaIndex(0);
      setIsLoadingLore(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (hasFetched.current) return;
      const curLat = latRef.current;
      const curLng = lngRef.current;
      if (curLat === null || curLng === null) return;

      hasFetched.current = true;
      setIsLoadingLore(true);

      try {
        const res = await fetch("/api/wander", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: curLat, lng: curLng }),
        });
        if (res.ok) {
          const data: LoreData = await res.json();
          if (data.areaName) setLore(data);
        }
      } catch {
        // silent
      } finally {
        setIsLoadingLore(false);
      }
    }, INITIAL_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isActive]);

  // ── Advance trivia index every TRIVIA_STEP_M ──
  useEffect(() => {
    if (!lore?.triviaList.length) return;
    const maxIndex = lore.triviaList.length - 1;
    if (triviaIndex >= maxIndex) return;

    const nextTrigger = lastStepM.current + TRIVIA_STEP_M;
    if (totalDistanceMeters >= nextTrigger) {
      lastStepM.current = totalDistanceMeters;
      setTriviaIndex((i) => Math.min(i + 1, maxIndex));
    }
  }, [totalDistanceMeters, lore, triviaIndex]);

  // ── Build output ──
  // triviaIndex 0 → show routeTheme, 1+ → show triviaList[index-1]
  let currentMessage: string | null = null;
  let messageLabel: "route" | "trivia" = "route";

  if (lore) {
    if (triviaIndex === 0) {
      currentMessage = lore.routeTheme;
      messageLabel = "route";
    } else {
      currentMessage = lore.triviaList[triviaIndex - 1] ?? lore.routeTheme;
      messageLabel = "trivia";
    }
  }

  return {
    areaName: lore?.areaName ?? null,
    currentMessage,
    messageLabel,
    isLoadingLore,
  };
}
