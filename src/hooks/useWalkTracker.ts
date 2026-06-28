"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { calculateDistance, RoutePoint } from "@/lib/geo";

export type { RoutePoint };

export interface WalkStats {
  elapsedSeconds: number;
  totalDistanceMeters: number;
  estimatedSteps: number;
  routePoints: RoutePoint[];
}

const DIST_MIN_M = 3;   // minimum delta to count toward distance
const ROUTE_MIN_M = 5;  // minimum delta to record a new route point

export function useWalkTracker(
  currentLat: number | null,
  currentLng: number | null,
  isActive: boolean
): { stats: WalkStats; startTracking: () => void } {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);

  const startTimeRef = useRef<number | null>(null);
  const lastDistPosRef = useRef<RoutePoint | null>(null);
  const lastRoutePosRef = useRef<RoutePoint | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTracking = useCallback(() => {
    startTimeRef.current = Date.now();
    lastDistPosRef.current = null;
    lastRoutePosRef.current = null;
    setElapsedSeconds(0);
    setTotalDistance(0);
    setRoutePoints([]);
  }, []);

  // 1-second elapsed timer
  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  // GPS update: accumulate distance + record route points
  useEffect(() => {
    if (!isActive || currentLat === null || currentLng === null) return;

    // Distance accumulation (3 m threshold to filter jitter)
    if (lastDistPosRef.current === null) {
      lastDistPosRef.current = { lat: currentLat, lng: currentLng };
    } else {
      const d = calculateDistance(
        lastDistPosRef.current.lat,
        lastDistPosRef.current.lng,
        currentLat,
        currentLng
      );
      if (d >= DIST_MIN_M) {
        setTotalDistance((prev) => prev + d);
        lastDistPosRef.current = { lat: currentLat, lng: currentLng };
      }
    }

    // Route point recording (5 m threshold for clean SVG path)
    if (lastRoutePosRef.current === null) {
      lastRoutePosRef.current = { lat: currentLat, lng: currentLng };
      setRoutePoints([{ lat: currentLat, lng: currentLng }]);
    } else {
      const rd = calculateDistance(
        lastRoutePosRef.current.lat,
        lastRoutePosRef.current.lng,
        currentLat,
        currentLng
      );
      if (rd >= ROUTE_MIN_M) {
        setRoutePoints((prev) => [...prev, { lat: currentLat, lng: currentLng }]);
        lastRoutePosRef.current = { lat: currentLat, lng: currentLng };
      }
    }
  }, [currentLat, currentLng, isActive]);

  const estimatedSteps = Math.round(totalDistance / 0.75);

  return {
    stats: { elapsedSeconds, totalDistanceMeters: totalDistance, estimatedSteps, routePoints },
    startTracking,
  };
}
