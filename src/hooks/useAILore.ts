"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { calculateDistance } from "@/lib/geo";

const FETCH_DISTANCE_M = 150;      // 150m 移動で再取得
const INITIAL_DELAY_MS = 20_000;   // 歩行開始20秒後に初回取得
const FALLBACK_INTERVAL_MS = 180_000; // 3分移動がなければ再取得

export function useAILore(
  isActive: boolean,
  lat: number | null,
  lng: number | null
): { aiLore: string | null; isLoadingLore: boolean } {
  const [aiLore, setAiLore] = useState<string | null>(null);
  const [isLoadingLore, setIsLoadingLore] = useState(false);

  const latRef = useRef(lat);
  const lngRef = useRef(lng);
  const lastFetchPos = useRef<{ lat: number; lng: number } | null>(null);
  const lastFetchTime = useRef<number>(0);
  const isFetching = useRef(false);

  useEffect(() => { latRef.current = lat; }, [lat]);
  useEffect(() => { lngRef.current = lng; }, [lng]);

  const fetchLore = useCallback(async (fetchLat: number, fetchLng: number) => {
    if (isFetching.current) return;
    isFetching.current = true;
    setIsLoadingLore(true);
    lastFetchPos.current = { lat: fetchLat, lng: fetchLng };
    lastFetchTime.current = Date.now();

    try {
      const res = await fetch("/api/wander", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: fetchLat, lng: fetchLng }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) setAiLore(data.message);
      }
    } catch {
      // ネットワークエラーは無視
    } finally {
      isFetching.current = false;
      setIsLoadingLore(false);
    }
  }, []);

  // 歩行開始 / 終了ライフサイクル
  useEffect(() => {
    if (!isActive) {
      lastFetchPos.current = null;
      lastFetchTime.current = 0;
      isFetching.current = false;
      setAiLore(null);
      setIsLoadingLore(false);
      return;
    }

    // 初回: 20秒後
    const initial = setTimeout(() => {
      if (latRef.current !== null && lngRef.current !== null) {
        fetchLore(latRef.current, lngRef.current);
      }
    }, INITIAL_DELAY_MS);

    // フォールバック: 30秒ごとにチェックし、3分経過していれば再取得
    const fallback = setInterval(() => {
      if (isFetching.current) return;
      if (latRef.current === null || lngRef.current === null) return;
      if (Date.now() - lastFetchTime.current < FALLBACK_INTERVAL_MS) return;
      fetchLore(latRef.current, lngRef.current);
    }, 30_000);

    return () => {
      clearTimeout(initial);
      clearInterval(fallback);
    };
  }, [isActive, fetchLore]);

  // 距離ベーストリガー
  useEffect(() => {
    if (!isActive || lat === null || lng === null) return;
    if (lastFetchPos.current === null) return;
    if (isFetching.current) return;

    const dist = calculateDistance(
      lastFetchPos.current.lat,
      lastFetchPos.current.lng,
      lat,
      lng
    );
    if (dist >= FETCH_DISTANCE_M) {
      fetchLore(lat, lng);
    }
  }, [lat, lng, isActive, fetchLore]);

  return { aiLore, isLoadingLore };
}
