"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useDeviceOrientation } from "@/hooks/useDeviceOrientation";
import { useWalkTracker } from "@/hooks/useWalkTracker";
import { useWalkHints } from "@/hooks/useWalkHints";
import {
  calculateBearing,
  calculateDistance,
  generateRandomDestination,
  formatDistance,
} from "@/lib/geo";
import { checkBadges, Badge } from "@/lib/badges";
import { saveWalkLog, markBadgesEarned } from "@/lib/storage";
import {
  THEMES,
  DISTANCE_MODES,
  TIME_MODES,
  ThemeId,
  DistanceModeId,
  TimeModeId,
  ThemeConfig,
} from "@/lib/theme";
import { CompassArrow } from "@/components/CompassArrow";
import { CompassParticles } from "@/components/CompassParticles";
import { AuroraRing } from "@/components/AuroraRing";
import { SwingArrow } from "@/components/SwingArrow";
import { WalkCompanion } from "@/components/WalkCompanion";
import { ArrivalModal } from "@/components/ArrivalModal";
import { BottomNav, AppScreen } from "@/components/BottomNav";
import { CollectionScreen } from "@/components/CollectionScreen";
import { EventPopup } from "@/components/EventPopup";
import { useWalkEvents } from "@/hooks/useWalkEvents";
import { useAmbientBGM } from "@/hooks/useAmbientBGM";

type WalkState = "idle" | "walking" | "arrived";

interface Destination {
  lat: number;
  lng: number;
}

const ARRIVAL_THRESHOLD_M = 20;
const ARROW_SIZE = 280;

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function countdownColor(progress: number): string {
  if (progress >= 0.8) return "#ef4444";
  if (progress >= 0.5) return "#eab308";
  return "#22d3ee";
}

export default function HomePage() {
  const geo = useGeolocation();
  const orientation = useDeviceOrientation();

  // ── UI state ──
  const [activeScreen, setActiveScreen] = useState<AppScreen>("compass");
  const [themeId, setThemeId] = useState<ThemeId>("cyber");
  const [distanceMode, setDistanceMode] = useState<DistanceModeId>("normal");
  const [timeMode, setTimeMode] = useState<TimeModeId>("free");

  // ── Walk state ──
  const [walkState, setWalkState] = useState<WalkState>("idle");
  const [destination, setDestination] = useState<Destination | null>(null);
  const [startDistance, setStartDistance] = useState<number | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const badgesComputedRef = useRef(false);
  const lastRelocationRef = useRef<number>(0);

  const isWalking = walkState === "walking";
  const { stats, startTracking } = useWalkTracker(geo.latitude, geo.longitude, isWalking);
  const { hint, hintType } = useWalkHints(isWalking);
  const { event: walkEvent, clearEvent } = useWalkEvents(isWalking);
  const { enabled: bgmEnabled, toggle: toggleBGM } = useAmbientBGM(
    geo.speed ?? 0,
    new Date().getHours() >= 19,
  );

  // Refs so effects can read latest values without stale closures
  const statsRef = useRef(stats);
  const distanceModeRef = useRef(distanceMode);
  const timeModeRef = useRef(timeMode);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { distanceModeRef.current = distanceMode; }, [distanceMode]);
  useEffect(() => { timeModeRef.current = timeMode; }, [timeMode]);

  const theme: ThemeConfig = THEMES[themeId];

  // ── Persist preferences ──
  useEffect(() => {
    const t = localStorage.getItem("wander_theme") as ThemeId | null;
    if (t && THEMES[t]) setThemeId(t);
    const m = localStorage.getItem("wander_distance_mode") as DistanceModeId | null;
    if (m && DISTANCE_MODES.find((d) => d.id === m)) setDistanceMode(m);
    const tm = localStorage.getItem("wander_time_mode") as TimeModeId | null;
    if (tm && TIME_MODES.find((d) => d.id === tm)) setTimeMode(tm);
  }, []);

  useEffect(() => { localStorage.setItem("wander_theme", themeId); }, [themeId]);
  useEffect(() => { localStorage.setItem("wander_distance_mode", distanceMode); }, [distanceMode]);
  useEffect(() => { localStorage.setItem("wander_time_mode", timeMode); }, [timeMode]);

  // ── Time limit computations ──
  const timeModeConfig = TIME_MODES.find((m) => m.id === timeMode);
  const timeLimitSeconds: number | null =
    timeModeConfig && timeModeConfig.minutes !== null
      ? timeModeConfig.minutes * 60
      : null;
  const timeProgress =
    timeLimitSeconds !== null
      ? Math.min(1, stats.elapsedSeconds / timeLimitSeconds)
      : 0;
  const timeRemaining =
    timeLimitSeconds !== null
      ? Math.max(0, timeLimitSeconds - stats.elapsedSeconds)
      : null;

  // ── Start walk ──
  const handleStart = useCallback(() => {
    if (geo.latitude === null || geo.longitude === null) return;
    const modeConfig = DISTANCE_MODES.find((d) => d.id === distanceModeRef.current)!;
    const dest = generateRandomDestination(
      geo.latitude, geo.longitude, modeConfig.min, modeConfig.max
    );
    const dist = calculateDistance(geo.latitude, geo.longitude, dest.lat, dest.lng);
    setStartDistance(dist);
    setDestination(dest);
    badgesComputedRef.current = false;
    lastRelocationRef.current = 0;
    setEarnedBadges([]);
    startTracking();
    setWalkState("walking");
  }, [geo.latitude, geo.longitude, startTracking]);

  // ── Arrival detection + time-limit relocation ──
  useEffect(() => {
    if (
      walkState !== "walking" ||
      !destination ||
      geo.latitude === null ||
      geo.longitude === null
    ) return;

    const dist = calculateDistance(
      geo.latitude, geo.longitude, destination.lat, destination.lng
    );

    if (dist > ARRIVAL_THRESHOLD_M) return;

    // Check time-limit relocation: if < 80% of allotted time used → redirect
    const currentMode = timeModeRef.current;
    const mCfg = TIME_MODES.find((m) => m.id === currentMode);
    const limitSec: number | null =
      mCfg && mCfg.minutes !== null ? mCfg.minutes * 60 : null;
    const elapsed = statsRef.current.elapsedSeconds;
    const tProg = limitSec !== null ? elapsed / limitSec : 1;

    if (limitSec !== null && tProg < 0.8) {
      const now = Date.now();
      if (now - lastRelocationRef.current > 5000) {
        lastRelocationRef.current = now;
        const newDest = generateRandomDestination(
          geo.latitude, geo.longitude, 150, 350
        );
        setDestination(newDest);
      }
      return;
    }

    // Normal arrival
    if (!badgesComputedRef.current) {
      badgesComputedRef.current = true;
      const s = statsRef.current;
      const earned = checkBadges({
        totalDistanceMeters: s.totalDistanceMeters,
        straightLineMeters: startDistance ?? 0,
      });
      setEarnedBadges(earned);
      saveWalkLog({
        id: Date.now().toString(),
        date: new Date().toISOString(),
        distanceMeters: s.totalDistanceMeters,
        elapsedSeconds: s.elapsedSeconds,
        estimatedSteps: s.estimatedSteps,
        routePoints: s.routePoints,
        earnedBadgeIds: earned.map((b) => b.id),
        distanceMode: distanceModeRef.current,
      });
      markBadgesEarned(earned.map((b) => b.id));
    }
    setWalkState("arrived");
  }, [walkState, destination, geo.latitude, geo.longitude, stats.totalDistanceMeters, startDistance]);

  // ── Compass calcs ──
  let bearing: number | null = null;
  let distance: number | null = null;
  let arrowRotation = 0;

  if (destination && geo.latitude !== null && geo.longitude !== null) {
    bearing = calculateBearing(
      geo.latitude, geo.longitude, destination.lat, destination.lng
    );
    distance = calculateDistance(
      geo.latitude, geo.longitude, destination.lat, destination.lng
    );
    arrowRotation =
      orientation.heading !== null ? bearing - orientation.heading : bearing;
  }

  const gpsReady = !geo.loading && geo.latitude !== null && geo.error === null;

  // ── Radar pulse config ──
  const pulseDur =
    distance !== null
      ? Math.max(0.7, Math.min(3.2, 0.7 + (Math.max(0, distance - 20) / 480) * 2.5))
      : 3.2;
  const ringColor =
    distance === null ? theme.radarFar
    : distance < 80   ? theme.radarNear
    : distance < 200  ? theme.radarMid
    : theme.radarFar;

  // ── Collection screen ──
  if (activeScreen === "collection") {
    return (
      <>
        <CollectionScreen theme={theme} />
        <BottomNav activeTab={activeScreen} onTabChange={setActiveScreen} theme={theme} />
      </>
    );
  }

  return (
    <>
      <main
        className="min-h-dvh bg-grain flex flex-col items-center justify-between px-6 py-10 overflow-hidden relative"
        style={{ backgroundColor: theme.bgColor }}
      >
        {/* Radial ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: theme.bgGradient }}
        />

        {/* ── Header ── */}
        <header className="relative z-10 w-full mt-4">
          {walkState === "walking" ? (
            /* Walking: mini spinning compass + WANDER text + BGM toggle */
            <div className="flex items-center gap-3 px-1">
              <div
                style={{
                  transform: `rotate(${arrowRotation}deg)`,
                  transition: "transform 0.25s ease-out",
                  flexShrink: 0,
                }}
              >
                <svg viewBox="0 0 60 60" width={60} height={60}>
                  <circle cx="30" cy="30" r="27" stroke={theme.compassRing2} strokeWidth="1.5" fill="none" opacity="0.7" />
                  <circle cx="30" cy="30" r="22" stroke={theme.compassRing1} strokeWidth="0.5" fill="none" opacity="0.4" />
                  <path d="M30 5 L34.5 24 L30 22 L25.5 24 Z" fill={theme.compassNeedle} />
                  <path d="M30 55 L34.5 36 L30 38 L25.5 36 Z" fill={theme.compassSouthFill} opacity="0.6" />
                  <circle cx="30" cy="30" r="3.5" fill={theme.compassPivotBg} stroke={theme.compassPivotStroke} strokeWidth="1" />
                  <circle cx="30" cy="30" r="1.4" fill={theme.compassNeedle} />
                  <circle cx="30" cy="30" r="0.6" fill="#fff" opacity="0.6" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[9px] tracking-[0.35em] uppercase" style={{ color: theme.textDim }}>
                  No map · No plan
                </p>
                <h1 className="text-2xl font-bold tracking-[0.2em]" style={{ color: theme.textPrimary }}>
                  WANDER
                </h1>
                <p className="text-[9px] tracking-[0.25em]" style={{ color: theme.textDimmer }}>
                  あえて迷う散歩
                </p>
              </div>
              {/* BGM toggle */}
              <button
                onClick={toggleBGM}
                className="text-base px-2.5 py-1.5 rounded-full transition-all"
                style={{
                  backgroundColor: bgmEnabled ? theme.accentColor + "25" : "transparent",
                  border: `1px solid ${bgmEnabled ? theme.accentColor + "66" : theme.cardBorder}`,
                  color: bgmEnabled ? theme.accentColor : theme.textDimmer,
                }}
                title={bgmEnabled ? "BGM オフ" : "BGM オン"}
              >
                {bgmEnabled ? "♫" : "♪"}
              </button>
            </div>
          ) : (
            /* Idle / GPS loading: centered */
            <div className="text-center">
              <p className="text-[10px] tracking-[0.4em] uppercase" style={{ color: theme.textDim }}>
                No map · No plan
              </p>
              <h1 className="text-3xl font-bold tracking-[0.25em] mt-1" style={{ color: theme.textPrimary }}>
                WANDER
              </h1>
              <p className="text-[10px] tracking-[0.3em] mt-0.5" style={{ color: theme.textDimmer }}>
                あえて迷う散歩
              </p>
            </div>
          )}
        </header>

        {/* ── Main content ── */}
        <section className="relative z-10 flex flex-col items-center gap-6 flex-1 justify-center w-full">

          {/* GPS loading */}
          {geo.loading && (
            <div className="flex flex-col items-center gap-4">
              <CompassArrow rotation={0} searching theme={theme} />
              <p
                className="text-sm tracking-widest animate-pulse"
                style={{ color: theme.textDim }}
              >
                GPS を取得中...
              </p>
            </div>
          )}

          {/* GPS error */}
          {!geo.loading && geo.error && (
            <div className="text-center text-sm px-4" style={{ color: "rgb(248 113 113)" }}>
              <p className="text-3xl mb-3">⚠</p>
              <p>{geo.error}</p>
            </div>
          )}

          {/* ── IDLE ── */}
          {walkState === "idle" && gpsReady && (
            <div className="flex flex-col items-center gap-5 w-full">
              <CompassArrow rotation={0} searching theme={theme} />

              {orientation.needsPermissionButton &&
                orientation.permissionStatus === "prompt" && (
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={orientation.requestPermission}
                      className="px-6 py-2.5 rounded-full text-xs tracking-widest transition-colors"
                      style={{
                        backgroundColor: theme.cardBg,
                        border: `1px solid ${theme.cardBorder}`,
                        color: theme.textDim,
                      }}
                    >
                      コンパスを有効にする
                    </button>
                    <p
                      className="text-[10px] tracking-wider"
                      style={{ color: theme.textDimmer }}
                    >
                      iOS では方位センサーの許可が必要です
                    </p>
                  </div>
                )}

              {/* Distance mode selector */}
              <div className="w-full max-w-[280px]">
                <p
                  className="text-[9px] tracking-[0.4em] uppercase text-center mb-2"
                  style={{ color: theme.textDim }}
                >
                  お散歩の距離
                </p>
                <div
                  className="flex rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${theme.cardBorder}` }}
                >
                  {DISTANCE_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setDistanceMode(mode.id)}
                      className="flex-1 py-2.5 text-center transition-colors"
                      style={
                        distanceMode === mode.id
                          ? { backgroundColor: theme.accentColor, color: "#fff" }
                          : { backgroundColor: theme.cardBg, color: theme.textDim }
                      }
                    >
                      <div className="text-[11px] font-medium">{mode.label}</div>
                      <div className="text-[9px] opacity-70">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time mode selector */}
              <div className="w-full max-w-[280px]">
                <p
                  className="text-[9px] tracking-[0.4em] uppercase text-center mb-2"
                  style={{ color: theme.textDim }}
                >
                  制限時間
                </p>
                <div
                  className="grid grid-cols-4 rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${theme.cardBorder}` }}
                >
                  {TIME_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setTimeMode(mode.id)}
                      className="py-2.5 text-center transition-colors"
                      style={
                        timeMode === mode.id
                          ? { backgroundColor: theme.accentColor, color: "#fff" }
                          : { backgroundColor: theme.cardBg, color: theme.textDim }
                      }
                    >
                      <div className="text-[11px] font-medium">{mode.label}</div>
                      <div className="text-[9px] opacity-70 leading-tight">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme selector */}
              <div className="w-full max-w-[280px]">
                <p
                  className="text-[9px] tracking-[0.4em] uppercase text-center mb-2"
                  style={{ color: theme.textDim }}
                >
                  世界観テーマ
                </p>
                <div
                  className="flex rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${theme.cardBorder}` }}
                >
                  {Object.values(THEMES).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setThemeId(t.id)}
                      className="flex-1 py-2.5 text-center transition-colors"
                      style={
                        themeId === t.id
                          ? { backgroundColor: theme.accentColor, color: "#fff" }
                          : { backgroundColor: theme.cardBg, color: theme.textDim }
                      }
                    >
                      <div className="text-[11px] font-medium">{t.label}</div>
                      <div className="text-[9px] opacity-70">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start button */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleStart}
                  className="px-10 py-4 text-white rounded-2xl font-semibold tracking-widest text-base transition-colors shadow-lg"
                  style={{
                    backgroundColor: theme.accentColor,
                    boxShadow: `0 10px 15px -3px ${theme.accentShadow}`,
                  }}
                >
                  お散歩をスタートする
                </button>
                <p
                  className="text-[10px] tracking-wider"
                  style={{ color: theme.textDimmer }}
                >
                  ランダムな目的地へ出発
                </p>
              </div>
            </div>
          )}

          {/* ── WALKING ── */}
          {walkState === "walking" && destination && distance !== null && (
            <div className="flex flex-col items-center gap-6 w-full">
              {orientation.needsPermissionButton &&
                orientation.permissionStatus === "prompt" && (
                  <button
                    onClick={orientation.requestPermission}
                    className="px-6 py-2.5 text-white rounded-full text-xs tracking-widest transition-colors"
                    style={{ backgroundColor: theme.accentColor }}
                  >
                    コンパスを有効にする
                  </button>
                )}

              {/* Arrow area: particles + aurora + radar rings + swing arrow */}
              <div
                className="relative flex items-center justify-center"
                style={{ width: ARROW_SIZE, height: ARROW_SIZE }}
              >
                {/* z=0 — orbit particles */}
                <CompassParticles
                  arrowRotation={arrowRotation}
                  speed={geo.speed ?? 0}
                  size={ARROW_SIZE}
                  theme={theme}
                />

                {/* z=2 — aurora glow ring (only when time limit is set) */}
                {timeLimitSeconds !== null && (
                  <AuroraRing
                    arrowRotation={arrowRotation}
                    timeProgress={timeProgress}
                    size={ARROW_SIZE}
                  />
                )}

                {/* z=auto — radar expand rings */}
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: 218,
                      height: 218,
                      left: (ARROW_SIZE - 218) / 2,
                      top: (ARROW_SIZE - 218) / 2,
                      border: `1.5px solid ${ringColor}`,
                      animation: `radarRing ${pulseDur}s ease-out ${
                        (i * pulseDur) / 3
                      }s infinite`,
                    }}
                  />
                ))}

                {/* z=4 — swing direction arrow (replaces big compass needle) */}
                <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 4 }}>
                  <SwingArrow
                    rotation={arrowRotation}
                    timeProgress={timeProgress}
                    timeLimitSeconds={timeLimitSeconds}
                    baseColor={theme.particleColor}
                    size={ARROW_SIZE}
                  />
                </div>
              </div>

              {/* Distance */}
              <div className="text-center">
                <div
                  className="text-7xl font-thin tracking-tight tabular-nums"
                  style={{ color: theme.textPrimary }}
                >
                  {formatDistance(distance)}
                </div>
                <p
                  className="text-[10px] tracking-[0.4em] mt-2 uppercase"
                  style={{ color: theme.textDim }}
                >
                  残り距離
                </p>
              </div>

              {/* Hint / lore */}
              {hint && (
                <div
                  key={hint}
                  className="w-full max-w-xs"
                  style={{ animation: "hintFade 0.8s ease-out forwards" }}
                >
                  <div
                    className="rounded-r-xl px-4 py-3 backdrop-blur-sm"
                    style={{
                      background: theme.cardBg + "99",
                      border: `1px solid ${theme.cardBorder}`,
                      borderLeft: hintType === "lore"
                        ? "2px solid rgba(167,139,250,0.6)"
                        : `2px solid ${theme.hintBorder}`,
                    }}
                  >
                    {hintType === "lore" && (
                      <p
                        className="text-[8px] tracking-[0.45em] uppercase mb-1.5"
                        style={{ color: "rgba(167,139,250,0.65)" }}
                      >
                        土地の記憶
                      </p>
                    )}
                    <p
                      className="text-[11px] tracking-[0.12em] leading-relaxed italic font-light"
                      style={{
                        color: hintType === "lore"
                          ? "rgba(196,181,253,0.70)"
                          : theme.hintText,
                      }}
                    >
                      {hint}
                    </p>
                  </div>
                </div>
              )}

              {orientation.heading === null &&
                orientation.permissionStatus === "granted" && (
                  <p
                    className="text-xs text-center tracking-wider"
                    style={{ color: theme.textDimmer }}
                  >
                    スマホを動かしてコンパスを調整してください
                  </p>
                )}
            </div>
          )}

          {orientation.permissionStatus === "denied" && (
            <p className="text-xs text-center" style={{ color: theme.textDimmer }}>
              方位センサーが拒否されました。設定アプリから許可してください。
            </p>
          )}
        </section>

        {/* ── Companion (top-right, walking only) ── */}
        {walkState === "walking" && (
          <div
            className="fixed top-36 right-4 z-20 rounded-xl p-2 backdrop-blur-sm"
            style={{
              background: theme.bgColor + "99",
              border: `1px solid ${theme.cardBorder}`,
            }}
          >
            <WalkCompanion distanceMeters={stats.totalDistanceMeters} />
          </div>
        )}

        {/* ── Footer ── */}
        <footer className="relative z-10 flex flex-col items-center gap-3 w-full">
          {walkState === "walking" && (
            <div className="flex flex-col items-center gap-3 w-full">
              {/* Time display row */}
              <div className="flex items-center justify-center gap-6">
                <div className="flex flex-col items-center">
                  <span
                    className="text-sm font-mono tabular-nums"
                    style={{ color: theme.textDim }}
                  >
                    {formatElapsed(stats.elapsedSeconds)}
                  </span>
                  <span
                    className="text-[9px] tracking-widest"
                    style={{ color: theme.textDimmer }}
                  >
                    経過
                  </span>
                </div>
                {timeRemaining !== null && (
                  <>
                    <span style={{ color: theme.cardBorder }}>｜</span>
                    <div className="flex flex-col items-center">
                      <span
                        className="text-sm font-mono tabular-nums font-semibold"
                        style={{ color: countdownColor(timeProgress) }}
                      >
                        {formatElapsed(timeRemaining)}
                      </span>
                      <span
                        className="text-[9px] tracking-widest"
                        style={{ color: theme.textDimmer }}
                      >
                        残り時間
                      </span>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => { setDestination(null); setWalkState("idle"); }}
                className="px-6 py-2 rounded-full text-xs tracking-[0.3em] transition-colors"
                style={{
                  border: `1px solid ${theme.cardBorder}`,
                  color: theme.textDimmer,
                }}
              >
                やめる
              </button>
            </div>
          )}

          {/* Debug row */}
          <div
            className="flex gap-4 text-[10px] tabular-nums"
            style={{ color: theme.cardBorder }}
          >
            {geo.accuracy !== null && (
              <span>精度 ±{Math.round(geo.accuracy)}m</span>
            )}
            {orientation.heading !== null && (
              <span>方位 {((orientation.heading % 360 + 360) % 360).toFixed(0)}°</span>
            )}
            {bearing !== null && <span>目標 {bearing.toFixed(0)}°</span>}
          </div>
        </footer>

        {/* ── Walk event popup ── */}
        {walkState === "walking" && walkEvent && (
          <EventPopup
            event={walkEvent}
            onDismiss={clearEvent}
            accentColor={theme.accentColor}
          />
        )}

        {/* ── Arrival modal ── */}
        {walkState === "arrived" && (
          <ArrivalModal
            elapsedSeconds={stats.elapsedSeconds}
            totalDistanceMeters={stats.totalDistanceMeters}
            estimatedSteps={stats.estimatedSteps}
            routePoints={stats.routePoints}
            earnedBadges={earnedBadges}
            theme={theme}
            onRestart={handleStart}
            onFinish={() => { setDestination(null); setWalkState("idle"); }}
          />
        )}
      </main>

      {/* Bottom nav — hidden during walking to prevent mid-walk screen switches */}
      {walkState !== "walking" && (
        <BottomNav activeTab={activeScreen} onTabChange={setActiveScreen} theme={theme} />
      )}
    </>
  );
}
