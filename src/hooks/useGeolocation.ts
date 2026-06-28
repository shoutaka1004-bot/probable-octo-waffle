"use client";

import { useState, useEffect } from "react";

export interface GeoState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  speed: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    speed: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((s) => ({
        ...s,
        error: "このデバイスは位置情報をサポートしていません",
        loading: false,
      }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          error: null,
          loading: false,
        });
      },
      (err) => {
        const messages: Record<number, string> = {
          [err.PERMISSION_DENIED]: "位置情報の使用が拒否されました",
          [err.POSITION_UNAVAILABLE]: "位置情報が利用できません",
          [err.TIMEOUT]: "位置情報の取得がタイムアウトしました",
        };
        setState((s) => ({
          ...s,
          error: messages[err.code] ?? "位置情報の取得に失敗しました",
          loading: false,
        }));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return state;
}
