"use client";

import { useState, useEffect, useRef } from "react";

const FETCH_DELAY_MS = 5_000; // GPS が安定してからフェッチ

export interface Waypoint {
  lat: number;
  lng: number;
  name: string;
  trivia: string;
}

export interface AIRouteResult {
  areaName: string | null;
  waypoints: Waypoint[];
  isLoadingRoute: boolean;
}

export function useAIRoute(
  isActive: boolean,
  lat: number | null,
  lng: number | null
): AIRouteResult {
  const [areaName, setAreaName] = useState<string | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const latRef = useRef(lat);
  const lngRef = useRef(lng);
  const hasFetched = useRef(false);

  useEffect(() => { latRef.current = lat; }, [lat]);
  useEffect(() => { lngRef.current = lng; }, [lng]);

  useEffect(() => {
    if (!isActive) {
      hasFetched.current = false;
      setAreaName(null);
      setWaypoints([]);
      setIsLoadingRoute(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (hasFetched.current) return;
      const curLat = latRef.current;
      const curLng = lngRef.current;
      if (curLat === null || curLng === null) return;

      hasFetched.current = true;
      setIsLoadingRoute(true);

      try {
        const res = await fetch("/api/wander", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: curLat, lng: curLng }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.areaName) setAreaName(data.areaName);
          if (Array.isArray(data.waypoints) && data.waypoints.length > 0) {
            setWaypoints(data.waypoints as Waypoint[]);
          }
        }
      } catch {
        // silent
      } finally {
        setIsLoadingRoute(false);
      }
    }, FETCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isActive]);

  return { areaName, waypoints, isLoadingRoute };
}
