"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type PermissionStatus = "unknown" | "prompt" | "granted" | "denied";

export interface OrientationState {
  heading: number | null;
  permissionStatus: PermissionStatus;
  needsPermissionButton: boolean;
  requestPermission: () => Promise<void>;
}

// iOS 13+ requires an explicit user gesture to access DeviceOrientationEvent.
function isIOS(): boolean {
  return (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown })
      .requestPermission === "function"
  );
}

export function useDeviceOrientation(): OrientationState {
  const [heading, setHeading] = useState<number | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus>("unknown");
  const [needsPermissionButton, setNeedsPermissionButton] = useState(false);

  // Keep a running cumulative angle to avoid 0↔360 animation flipping.
  const lastHeadingRef = useRef<number | null>(null);
  const cumulativeRef = useRef<number>(0);
  // Exponential Moving Average for smooth compass motion (lower α = smoother, more lag)
  const smoothedRef = useRef<number | null>(null);
  const ALPHA = 0.18;

  const attachListener = useCallback(() => {
    const handler = (event: DeviceOrientationEvent) => {
      let raw: number | null = null;

      // iOS: webkitCompassHeading — true North, 0–360 clockwise
      if (
        "webkitCompassHeading" in event &&
        (event as DeviceOrientationEvent & { webkitCompassHeading: number })
          .webkitCompassHeading != null
      ) {
        raw = (
          event as DeviceOrientationEvent & { webkitCompassHeading: number }
        ).webkitCompassHeading;
      }
      // Android: deviceorientationabsolute gives alpha where 0=East, CCW
      // → compass heading = (360 - alpha) % 360
      else if (event.alpha !== null) {
        raw = (360 - event.alpha) % 360;
      }

      if (raw === null) return;

      // Smooth across 0/360 boundary using shortest-arc delta
      if (lastHeadingRef.current === null) {
        lastHeadingRef.current = raw;
        cumulativeRef.current = raw;
      } else {
        let delta = raw - (lastHeadingRef.current % 360);
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        cumulativeRef.current += delta;
        lastHeadingRef.current = raw;
      }

      // Apply EMA on the unwrapped cumulative angle (no wrap-around issue)
      if (smoothedRef.current === null) {
        smoothedRef.current = cumulativeRef.current;
      } else {
        smoothedRef.current += ALPHA * (cumulativeRef.current - smoothedRef.current);
      }

      setHeading(smoothedRef.current);
    };

    // Prefer absolute orientation on Android
    const supportsAbsolute = "ondeviceorientationabsolute" in window;
    if (supportsAbsolute) {
      window.addEventListener(
        "deviceorientationabsolute",
        handler as EventListener,
        true
      );
    } else {
      window.addEventListener(
        "deviceorientation",
        handler as EventListener,
        true
      );
    }

    return () => {
      if (supportsAbsolute) {
        window.removeEventListener(
          "deviceorientationabsolute",
          handler as EventListener,
          true
        );
      } else {
        window.removeEventListener(
          "deviceorientation",
          handler as EventListener,
          true
        );
      }
    };
  }, []);

  // Determine if iOS permission is needed on mount
  useEffect(() => {
    if (isIOS()) {
      setNeedsPermissionButton(true);
      setPermissionStatus("prompt");
    } else {
      // Android / desktop: auto-granted
      setPermissionStatus("granted");
    }
  }, []);

  // Attach listener when granted
  useEffect(() => {
    if (permissionStatus !== "granted") return;
    return attachListener();
  }, [permissionStatus, attachListener]);

  const requestPermission = useCallback(async () => {
    if (!isIOS()) {
      setPermissionStatus("granted");
      return;
    }
    try {
      const result = await (
        DeviceOrientationEvent as unknown as {
          requestPermission: () => Promise<string>;
        }
      ).requestPermission();
      if (result === "granted") {
        setPermissionStatus("granted");
        setNeedsPermissionButton(false);
      } else {
        setPermissionStatus("denied");
      }
    } catch {
      setPermissionStatus("denied");
    }
  }, []);

  return { heading, permissionStatus, needsPermissionButton, requestPermission };
}
