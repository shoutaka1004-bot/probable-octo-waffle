"use client";

import { useState, useEffect, useRef } from "react";

const DEST_FETCH_DELAY_MS = 500;
const FREE_FETCH_DELAY_MS = 5_000;

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
  lng: number | null,
  destinationName: string = "",
  startName: string = "",
  timeMinutes: number | null = null,
  loopMode: boolean = false,
): AIRouteResult {
  const [areaName, setAreaName] = useState<string | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const latRef = useRef(lat);
  const lngRef = useRef(lng);
  const destinationNameRef = useRef(destinationName);
  const startNameRef = useRef(startName);
  const timeMinutesRef = useRef(timeMinutes);
  const loopModeRef = useRef(loopMode);
  const hasFetched = useRef(false);

  useEffect(() => { latRef.current = lat; }, [lat]);
  useEffect(() => { lngRef.current = lng; }, [lng]);
  useEffect(() => { destinationNameRef.current = destinationName; }, [destinationName]);
  useEffect(() => { startNameRef.current = startName; }, [startName]);
  useEffect(() => { timeMinutesRef.current = timeMinutes; }, [timeMinutes]);
  useEffect(() => { loopModeRef.current = loopMode; }, [loopMode]);

  useEffect(() => {
    if (!isActive) {
      hasFetched.current = false;
      setAreaName(null);
      setWaypoints([]);
      setIsLoadingRoute(false);
      return;
    }

    const hasDestination = destinationName.trim().length > 0 || loopMode;
    const delay = hasDestination ? DEST_FETCH_DELAY_MS : FREE_FETCH_DELAY_MS;

    let cancelled = false;

    const timer = setTimeout(async () => {
      if (hasFetched.current) return;

      const curLat = latRef.current;
      const curLng = lngRef.current;
      const dest = destinationNameRef.current.trim();
      const start = startNameRef.current.trim();
      const mins = timeMinutesRef.current;
      const loop = loopModeRef.current;

      if (!dest && !loop && (curLat === null || curLng === null)) return;
      if (loop && (curLat === null || curLng === null)) return;

      hasFetched.current = true;
      if (!cancelled) setIsLoadingRoute(true);

      const buildBody = (firstOnly: boolean) => {
        const body: Record<string, unknown> = {};
        if (curLat !== null) body.lat = curLat;
        if (curLng !== null) body.lng = curLng;
        if (dest) body.destinationName = dest;
        if (start) body.startName = start;
        if (mins !== null) body.timeMinutes = mins;
        if (loop) body.loopMode = true;
        if (firstOnly) body.firstOnly = true;
        return body;
      };

      const doFetch = async (firstOnly: boolean) => {
        const res = await fetch("/api/wander", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildBody(firstOnly)),
        });
        if (!res.ok) return null;
        return res.json() as Promise<{ areaName?: string; waypoints?: Waypoint[] }>;
      };

      if (hasDestination) {
        // Launch both in parallel: stage 1 (fast first checkpoint) + stage 2 (full route)
        const stage1Promise = doFetch(true);
        const stage2Promise = doFetch(false);

        // Stage 1: start walking as soon as first checkpoint arrives
        try {
          const data = await stage1Promise;
          if (!cancelled && Array.isArray(data?.waypoints) && data.waypoints.length > 0) {
            if (data.areaName) setAreaName(data.areaName);
            setWaypoints(data.waypoints);
          }
        } catch {
          // stage 1 failed, fall through — stage 2 still in flight
        }
        if (!cancelled) setIsLoadingRoute(false);

        // Stage 2: silently upgrade to full route while user is already walking
        try {
          const data = await stage2Promise;
          if (!cancelled && Array.isArray(data?.waypoints) && data.waypoints.length > 0) {
            setWaypoints(data.waypoints);
            if (data.areaName) setAreaName(data.areaName);
          }
        } catch {
          // silent
        }
      } else {
        // Free mode: single fetch, no first-checkpoint fast path needed
        try {
          const res = await fetch("/api/wander", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildBody(false)),
          });
          if (res.ok) {
            const data = await res.json() as { areaName?: string; waypoints?: Waypoint[] };
            if (!cancelled) {
              if (data.areaName) setAreaName(data.areaName);
              if (Array.isArray(data.waypoints) && data.waypoints.length > 0) {
                setWaypoints(data.waypoints);
              }
            }
          }
        } catch {
          // silent
        } finally {
          if (!cancelled) setIsLoadingRoute(false);
        }
      }
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  return { areaName, waypoints, isLoadingRoute };
}
