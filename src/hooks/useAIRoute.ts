"use client";

import { useState, useEffect, useRef } from "react";

const RANDOM_FETCH_DELAY_MS = 5_000;
const DEST_FETCH_DELAY_MS = 500;

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
): AIRouteResult {
  const [areaName, setAreaName] = useState<string | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const latRef = useRef(lat);
  const lngRef = useRef(lng);
  const destinationNameRef = useRef(destinationName);
  const startNameRef = useRef(startName);
  const timeMinutesRef = useRef(timeMinutes);
  const hasFetched = useRef(false);

  useEffect(() => { latRef.current = lat; }, [lat]);
  useEffect(() => { lngRef.current = lng; }, [lng]);
  useEffect(() => { destinationNameRef.current = destinationName; }, [destinationName]);
  useEffect(() => { startNameRef.current = startName; }, [startName]);
  useEffect(() => { timeMinutesRef.current = timeMinutes; }, [timeMinutes]);

  useEffect(() => {
    if (!isActive) {
      hasFetched.current = false;
      setAreaName(null);
      setWaypoints([]);
      setIsLoadingRoute(false);
      return;
    }

    const hasDestination = destinationName.trim().length > 0;
    const delay = hasDestination ? DEST_FETCH_DELAY_MS : RANDOM_FETCH_DELAY_MS;

    const timer = setTimeout(async () => {
      if (hasFetched.current) return;

      const curLat = latRef.current;
      const curLng = lngRef.current;
      const dest = destinationNameRef.current.trim();
      const start = startNameRef.current.trim();
      const mins = timeMinutesRef.current;

      if (!dest && (curLat === null || curLng === null)) return;

      hasFetched.current = true;
      setIsLoadingRoute(true);

      try {
        const body: Record<string, unknown> = {};
        if (curLat !== null) body.lat = curLat;
        if (curLng !== null) body.lng = curLng;
        if (dest) body.destinationName = dest;
        if (start) body.startName = start;
        if (mins !== null) body.timeMinutes = mins;

        const res = await fetch("/api/wander", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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
    }, delay);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  return { areaName, waypoints, isLoadingRoute };
}
