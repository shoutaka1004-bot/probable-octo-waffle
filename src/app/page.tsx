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
import { saveWalkLog, markBadgesEarned, addPoints, getActiveCompanionSkin, getActiveArrowSkin } from "@/lib/storage";
import { calcEarnedPoints, getArrowSkin } from "@/lib/shop";
import {
  THEMES,
  TIME_MODES,
  ThemeId,
  TimeModeId,
  ThemeConfig,
} from "@/lib/theme";
import { CompassArrow } from "@/components/CompassArrow";
import { CompassParticles } from "@/components/CompassParticles";
import { SwingArrow } from "@/components/SwingArrow";
import { WalkCompanion } from "@/components/WalkCompanion";
import { ArrivalModal } from "@/components/ArrivalModal";
import { BottomNav, AppScreen } from "@/components/BottomNav";
import { CollectionScreen } from "@/components/CollectionScreen";
import { EventPopup } from "@/components/EventPopup";
import { useWalkEvents } from "@/hooks/useWalkEvents";
import { useAmbientBGM } from "@/hooks/useAmbientBGM";
import { useAIRoute, Waypoint } from "@/hooks/useAIRoute";

type WalkState = "idle" | "routing" | "walking" | "arrived";
type RouteMode = "free" | "destination" | "loop";

interface Destination {
  lat: number;
  lng: number;
}

const ARRIVAL_THRESHOLD_M = 20;
const ARROW_SIZE = 280;
const ROUTING_TIMEOUT_MS = 20_000;

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function HomePage() {
  const geo = useGeolocation();
  const orientation = useDeviceOrientation();

  // ── UI state ──
  const [activeScreen, setActiveScreen] = useState<AppScreen>("compass");
  const [themeId, setThemeId] = useState<ThemeId>("cyber");
  const [timeMode, setTimeMode] = useState<TimeModeId>("free");

  // ── Walk input state ──
  const [routeMode, setRouteMode] = useState<RouteMode>("free");
  const [destinationInput, setDestinationInput] = useState("");
  const [startLocationInput, setStartLocationInput] = useState("");
  const [useGPSStart, setUseGPSStart] = useState(true);

  // ── Walk state ──
  const [walkState, setWalkState] = useState<WalkState>("idle");
  const [destination, setDestination] = useState<Destination | null>(null);
  const [startDistance, setStartDistance] = useState<number | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const badgesComputedRef = useRef(false);

  // ── Waypoint navigation ──
  const [waypointIndex, setWaypointIndex] = useState(0);
  const lastAdvancedRef = useRef(-1);

  // ── GPS ref for async/timeout callbacks ──
  const geoRef = useRef({ lat: geo.latitude, lng: geo.longitude });
  useEffect(() => {
    geoRef.current = { lat: geo.latitude, lng: geo.longitude };
  }, [geo.latitude, geo.longitude]);

  // ── Active skins ──
  const [companionSkinId, setCompanionSkinId] = useState("default");
  const [arrowSkinId, setArrowSkinId] = useState("default");

  const refreshSkins = useCallback(() => {
    setCompanionSkinId(getActiveCompanionSkin());
    setArrowSkinId(getActiveArrowSkin());
  }, []);

  const isWalking = walkState === "walking";
  const isRouteActive = walkState === "routing" || walkState === "walking";

  const { stats, startTracking } = useWalkTracker(geo.latitude, geo.longitude, isWalking);
  const { hint, hintType } = useWalkHints(isWalking);
  const { event: walkEvent, clearEvent } = useWalkEvents(isWalking);
  const { enabled: bgmEnabled, toggle: toggleBGM } = useAmbientBGM(
    geo.speed ?? 0,
    new Date().getHours() >= 19,
  );

  const timeModeConfig = TIME_MODES.find((m) => m.id === timeMode);
  const timeLimitSeconds: number | null =
    timeModeConfig && timeModeConfig.minutes !== null
      ? timeModeConfig.minutes * 60
      : null;

  const { areaName, waypoints, isLoadingRoute } = useAIRoute(
    isRouteActive,
    geo.latitude,
    geo.longitude,
    routeMode === "destination" ? destinationInput : "",
    routeMode === "destination" && !useGPSStart ? startLocationInput : "",
    timeLimitSeconds !== null ? Math.round(timeLimitSeconds / 60) : null,
    routeMode === "loop",
  );

  const statsRef = useRef(stats);
  useEffect(() => { statsRef.current = stats; }, [stats]);

  const theme: ThemeConfig = THEMES[themeId];

  // ── Load skins on mount ──
  useEffect(() => { refreshSkins(); }, [refreshSkins]);

  // ── Persist preferences ──
  useEffect(() => {
    const t = localStorage.getItem("wander_theme") as ThemeId | null;
    if (t && THEMES[t]) setThemeId(t);
    const tm = localStorage.getItem("wander_time_mode") as TimeModeId | null;
    if (tm && TIME_MODES.find((d) => d.id === tm)) setTimeMode(tm);
    const rm = localStorage.getItem("wander_route_mode") as RouteMode | null;
    if (rm && ["free", "destination", "loop"].includes(rm)) setRouteMode(rm);
  }, []);

  useEffect(() => { localStorage.setItem("wander_theme", themeId); }, [themeId]);
  useEffect(() => { localStorage.setItem("wander_time_mode", timeMode); }, [timeMode]);
  useEffect(() => { localStorage.setItem("wander_route_mode", routeMode); }, [routeMode]);

  // ── Start walk ──
  const handleStart = useCallback(() => {
    if (geo.latitude === null || geo.longitude === null) return;

    setWaypointIndex(0);
    lastAdvancedRef.current = -1;
    badgesComputedRef.current = false;
    setEarnedBadges([]);

    if (routeMode === "destination" || routeMode === "loop") {
      // AI generates route → wait for waypoints
      setWalkState("routing");
    } else {
      // Free mode → random immediate start
      const dest = generateRandomDestination(geo.latitude, geo.longitude, 500, 1000);
      const dist = calculateDistance(geo.latitude, geo.longitude, dest.lat, dest.lng);
      setStartDistance(dist);
      setDestination(dest);
      startTracking();
      setWalkState("walking");
    }
  }, [geo.latitude, geo.longitude, startTracking, routeMode]);

  // ── Routing → walking: transition when AI waypoints arrive ──
  useEffect(() => {
    if (walkState !== "routing" || waypoints.length === 0) return;
    const finalWp = waypoints[waypoints.length - 1];
    const { lat: gLat, lng: gLng } = geoRef.current;
    const dist =
      gLat !== null && gLng !== null
        ? calculateDistance(gLat, gLng, finalWp.lat, finalWp.lng)
        : 0;
    setStartDistance(dist);
    setWaypointIndex(0);
    lastAdvancedRef.current = -1;
    setDestination({ lat: waypoints[0].lat, lng: waypoints[0].lng });
    startTracking();
    setWalkState("walking");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints]);

  // ── Routing timeout: AI が応答しない場合は idle に戻る ──
  useEffect(() => {
    if (walkState !== "routing") return;
    const timeout = setTimeout(() => {
      setWalkState("idle");
    }, ROUTING_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [walkState]);

  // ── When AI waypoints arrive during random walk, retarget compass ──
  useEffect(() => {
    if (!isWalking || waypoints.length === 0) return;
    setWaypointIndex(0);
    lastAdvancedRef.current = -1;
    setDestination({ lat: waypoints[0].lat, lng: waypoints[0].lng });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints]);

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

    // ── Intermediate waypoint arrival ──
    if (waypoints.length > 0 && waypointIndex < waypoints.length - 1) {
      if (waypointIndex > lastAdvancedRef.current) {
        lastAdvancedRef.current = waypointIndex;
        const nextIdx = waypointIndex + 1;
        setWaypointIndex(nextIdx);
        setDestination({ lat: waypoints[nextIdx].lat, lng: waypoints[nextIdx].lng });
      }
      return;
    }

    // ── Final arrival ──
    if (!badgesComputedRef.current) {
      badgesComputedRef.current = true;
      const s = statsRef.current;
      const pts = calcEarnedPoints(s.totalDistanceMeters);
      addPoints(pts);
      setEarnedPoints(pts);
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
        distanceMode: "normal",
      });
      markBadgesEarned(earned.map((b) => b.id));
    }
    setWalkState("arrived");
  }, [walkState, destination, geo.latitude, geo.longitude, stats.totalDistanceMeters, startDistance, waypoints, waypointIndex]);

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

  const activeArrowSkin = getArrowSkin(arrowSkinId);

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
        <BottomNav
          activeTab={activeScreen}
          onTabChange={(tab) => { setActiveScreen(tab); if (tab === "compass") refreshSkins(); }}
          theme={theme}
        />
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

              {/* Route mode selector */}
              <div className="w-full max-w-[280px]">
                <p
                  className="text-[9px] tracking-[0.4em] uppercase text-center mb-2"
                  style={{ color: theme.textDim }}
                >
                  ルートタイプ
                </p>
                <div
                  className="grid grid-cols-3 rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${theme.cardBorder}` }}
                >
                  {([
                    { id: "free",        label: "🎲 自由散歩", desc: "ランダム" },
                    { id: "destination", label: "🎯 目的地へ", desc: "場所を指定" },
                    { id: "loop",        label: "🔄 周回",     desc: "戻ってくる" },
                  ] as { id: RouteMode; label: string; desc: string }[]).map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setRouteMode(mode.id)}
                      className="py-2.5 text-center transition-colors"
                      style={
                        routeMode === mode.id
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

              {/* Destination + start inputs — only for destination mode */}
              {routeMode === "destination" && (
                <>
                  <div className="w-full max-w-[280px]">
                    <p
                      className="text-[9px] tracking-[0.4em] uppercase text-center mb-2"
                      style={{ color: theme.textDim }}
                    >
                      目的地
                    </p>
                    <input
                      type="text"
                      value={destinationInput}
                      onChange={(e) => setDestinationInput(e.target.value)}
                      placeholder="行きたい場所を入力（例：渋谷駅）"
                      className="w-full px-4 py-3 rounded-xl text-sm tracking-wide bg-transparent focus:outline-none placeholder:opacity-40"
                      style={{
                        border: `1px solid ${destinationInput ? theme.accentColor + "88" : theme.cardBorder}`,
                        color: theme.textPrimary,
                        backgroundColor: theme.cardBg,
                      }}
                    />
                  </div>

                  <div className="w-full max-w-[280px]">
                    <p
                      className="text-[9px] tracking-[0.4em] uppercase text-center mb-2"
                      style={{ color: theme.textDim }}
                    >
                      出発地点
                    </p>
                    <div
                      className="flex rounded-xl overflow-hidden mb-2"
                      style={{ border: `1px solid ${theme.cardBorder}` }}
                    >
                      <button
                        onClick={() => setUseGPSStart(true)}
                        className="flex-1 py-2.5 text-center transition-colors text-[11px] font-medium"
                        style={
                          useGPSStart
                            ? { backgroundColor: theme.accentColor, color: "#fff" }
                            : { backgroundColor: theme.cardBg, color: theme.textDim }
                        }
                      >
                        📍 現在地
                      </button>
                      <button
                        onClick={() => setUseGPSStart(false)}
                        className="flex-1 py-2.5 text-center transition-colors text-[11px] font-medium"
                        style={
                          !useGPSStart
                            ? { backgroundColor: theme.accentColor, color: "#fff" }
                            : { backgroundColor: theme.cardBg, color: theme.textDim }
                        }
                      >
                        ✏️ 場所を入力
                      </button>
                    </div>
                    {!useGPSStart && (
                      <input
                        type="text"
                        value={startLocationInput}
                        onChange={(e) => setStartLocationInput(e.target.value)}
                        placeholder="出発地点を入力（例：新宿駅）"
                        className="w-full px-4 py-3 rounded-xl text-sm tracking-wide bg-transparent focus:outline-none placeholder:opacity-40"
                        style={{
                          border: `1px solid ${theme.cardBorder}`,
                          color: theme.textPrimary,
                          backgroundColor: theme.cardBg,
                        }}
                      />
                    )}
                  </div>
                </>
              )}

              {/* Time mode selector */}
              <div className="w-full max-w-[280px]">
                <p
                  className="text-[9px] tracking-[0.4em] uppercase text-center mb-2"
                  style={{ color: theme.textDim }}
                >
                  目安の時間
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
              {(() => {
                const disabled = routeMode === "destination" && !destinationInput.trim();
                const label =
                  routeMode === "free" ? "ランダムに出発" :
                  routeMode === "loop" ? "周回ルートで出発" :
                  "ルートを構成してスタート";
                const sub =
                  routeMode === "free" ? "ランダムな目的地へ出発" :
                  routeMode === "loop" ? "出発地に戻る周回ルートを生成" :
                  destinationInput.trim() ? `→ ${destinationInput}` : "目的地を入力してください";
                return (
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={handleStart}
                      disabled={disabled}
                      className="px-10 py-4 text-white rounded-2xl font-semibold tracking-widest text-base transition-colors shadow-lg disabled:opacity-40"
                      style={{
                        backgroundColor: theme.accentColor,
                        boxShadow: disabled ? "none" : `0 10px 15px -3px ${theme.accentShadow}`,
                      }}
                    >
                      {label}
                    </button>
                    <p className="text-[10px] tracking-wider" style={{ color: theme.textDimmer }}>
                      {sub}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── ROUTING ── */}
          {walkState === "routing" && (
            <div className="flex flex-col items-center gap-6 w-full">
              <CompassArrow rotation={0} searching theme={theme} />

              <div className="flex flex-col items-center gap-3 text-center">
                <p
                  className="text-[10px] tracking-[0.45em] uppercase animate-pulse"
                  style={{ color: theme.textDim }}
                >
                  {routeMode === "loop" ? "周回ルートを構成中..." : "ルートを構成中..."}
                </p>

                {routeMode === "destination" && destinationInput && (
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm tracking-wider"
                    style={{
                      background: theme.cardBg,
                      border: `1px solid ${theme.accentColor}55`,
                      color: theme.textPrimary,
                    }}
                  >
                    <span style={{ color: theme.accentColor }}>→</span>
                    <span>{destinationInput}</span>
                  </div>
                )}

                {routeMode === "loop" && (
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm tracking-wider"
                    style={{
                      background: theme.cardBg,
                      border: `1px solid ${theme.accentColor}55`,
                      color: theme.textPrimary,
                    }}
                  >
                    <span style={{ color: theme.accentColor }}>🔄</span>
                    <span>出発地に戻る周回ルート</span>
                  </div>
                )}

                {routeMode === "destination" && !useGPSStart && startLocationInput && (
                  <p className="text-[10px] tracking-wider" style={{ color: theme.textDimmer }}>
                    出発: {startLocationInput}
                  </p>
                )}

                <p className="text-[10px] tracking-wider" style={{ color: theme.textDimmer }}>
                  AIがあなたの散歩ルートを生成しています
                </p>
              </div>

              <button
                onClick={() => setWalkState("idle")}
                className="px-6 py-2 rounded-full text-xs tracking-[0.3em] transition-colors"
                style={{
                  border: `1px solid ${theme.cardBorder}`,
                  color: theme.textDimmer,
                }}
              >
                キャンセル
              </button>
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

              {/* Arrow area */}
              <div
                className="relative flex items-center justify-center"
                style={{ width: ARROW_SIZE, height: ARROW_SIZE }}
              >
                <CompassParticles
                  arrowRotation={arrowRotation}
                  speed={geo.speed ?? 0}
                  size={ARROW_SIZE}
                  theme={theme}
                />

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

                <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 4 }}>
                  <SwingArrow
                    rotation={arrowRotation}
                    timeProgress={0}
                    timeLimitSeconds={null}
                    baseColor={arrowSkinId !== "default" ? activeArrowSkin.baseColor : theme.particleColor}
                    arrowVariant={activeArrowSkin.variant}
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
                  className="text-[10px] tracking-[0.3em] mt-2"
                  style={{ color: theme.textDim }}
                >
                  {waypoints.length > 0
                    ? `→ ${waypoints[waypointIndex]?.name ?? "目的地"}`
                    : isLoadingRoute
                    ? "ルート構成中..."
                    : "残り距離"}
                </p>
              </div>

              {/* Route progress dots + area name */}
              {(waypoints.length > 0 || areaName) && (
                <div className="flex flex-col items-center gap-1.5">
                  {waypoints.length > 0 && (
                    <div className="flex items-center gap-2">
                      {waypoints.map((wp: Waypoint, i: number) => (
                        <div
                          key={i}
                          className="flex flex-col items-center gap-0.5"
                          title={wp.name}
                        >
                          <div
                            className="rounded-full transition-all duration-500"
                            style={{
                              width: i === waypointIndex ? 8 : 6,
                              height: i === waypointIndex ? 8 : 6,
                              background:
                                i < waypointIndex
                                  ? "rgba(167,139,250,0.9)"
                                  : i === waypointIndex
                                  ? "rgba(196,181,253,1)"
                                  : "rgba(100,100,120,0.5)",
                              boxShadow: i === waypointIndex ? "0 0 6px rgba(167,139,250,0.8)" : "none",
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {areaName && (
                    <div
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] tracking-wider"
                      style={{
                        background: "rgba(167,139,250,0.10)",
                        border: "1px solid rgba(167,139,250,0.22)",
                        color: "rgba(196,181,253,0.65)",
                      }}
                    >
                      <span>📍</span>
                      <span>{areaName}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Waypoint trivia / hint card */}
              {(() => {
                const wpTrivia = waypoints[waypointIndex]?.trivia;
                const showAI = isLoadingRoute || wpTrivia;
                const cardKey = isLoadingRoute ? "route-loading" : wpTrivia ? `wp-${waypointIndex}` : (hint ?? "");
                const isAI = isLoadingRoute || !!wpTrivia;
                const label = isLoadingRoute ? "ルート構成中" : "スポット情報";
                const text = isLoadingRoute ? "このエリアのルートを構成しています..." : (wpTrivia ?? hint);
                if (!showAI && !hint) return null;
                return (
                  <div
                    key={cardKey}
                    className="w-full max-w-xs"
                    style={{ animation: "hintFade 0.8s ease-out forwards" }}
                  >
                    <div
                      className="rounded-r-xl px-4 py-3 backdrop-blur-sm"
                      style={{
                        background: theme.cardBg + "99",
                        border: `1px solid ${theme.cardBorder}`,
                        borderLeft: isAI || hintType === "lore"
                          ? "2px solid rgba(167,139,250,0.6)"
                          : `2px solid ${theme.hintBorder}`,
                      }}
                    >
                      {(isAI || hintType === "lore") && (
                        <p
                          className="text-[8px] tracking-[0.45em] uppercase mb-1.5"
                          style={{ color: "rgba(167,139,250,0.65)" }}
                        >
                          {label}
                        </p>
                      )}
                      <p
                        className={`text-[11px] tracking-[0.12em] leading-relaxed italic font-light${isLoadingRoute ? " animate-pulse" : ""}`}
                        style={{
                          color: isAI || hintType === "lore"
                            ? "rgba(196,181,253,0.70)"
                            : theme.hintText,
                        }}
                      >
                        {text}
                      </p>
                      {!isLoadingRoute && wpTrivia && (
                        <p className="text-[8px] mt-1.5" style={{ color: "rgba(167,139,250,0.35)" }}>
                          ✦ AI
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

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
            <WalkCompanion skinId={companionSkinId} />
          </div>
        )}

        {/* ── Footer ── */}
        <footer className="relative z-10 flex flex-col items-center gap-3 w-full">
          {walkState === "walking" && (
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="flex items-center justify-center">
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
            earnedPoints={earnedPoints}
            companionSkinId={companionSkinId}
            theme={theme}
            onRestart={handleStart}
            onFinish={() => { setDestination(null); setWalkState("idle"); }}
          />
        )}
      </main>

      {walkState !== "walking" && (
        <BottomNav activeTab={activeScreen} onTabChange={setActiveScreen} theme={theme} />
      )}
    </>
  );
}
