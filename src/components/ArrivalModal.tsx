"use client";

import { useEffect, useState } from "react";
import { RoutePoint } from "@/lib/geo";
import { Badge } from "@/lib/badges";
import { ThemeConfig } from "@/lib/theme";
import { RouteCanvas } from "./RouteCanvas";
import { WalkCompanion } from "./WalkCompanion";
import { BadgeDisplay } from "./BadgeDisplay";

function generateShareCanvas(
  routePoints: RoutePoint[],
  elapsedSeconds: number,
  totalDistanceMeters: number,
  estimatedSteps: number,
  earnedBadges: Badge[],
): HTMLCanvasElement {
  const W = 480, H = 680;
  const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 3);
  const canvas = document.createElement("canvas");
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, W, H);
  const bgGrad = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, W * 0.65);
  bgGrad.addColorStop(0, "rgba(30,41,59,0.75)");
  bgGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // WANDER title
  ctx.textAlign = "center";
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("W  A  N  D  E  R", W / 2, 44);
  ctx.fillStyle = "#475569";
  ctx.font = "10px sans-serif";
  ctx.fillText("あえて迷う散歩", W / 2, 62);

  // Arrival icon
  ctx.fillStyle = "#f97316";
  ctx.font = "26px serif";
  ctx.fillText("✦", W / 2, 100);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("到着！", W / 2, 124);

  // Companion stage label
  const stage = totalDistanceMeters >= 300 ? 3 : totalDistanceMeters >= 200 ? 2 : totalDistanceMeters >= 100 ? 1 : 0;
  const stageNames = ["たまご", "スライム", "ちびっこ", "ようせい"];
  const stageEmoji = ["🥚", "🟢", "🌿", "🧚"];
  ctx.font = "22px serif";
  ctx.fillText(stageEmoji[stage], W / 2, 152);
  ctx.fillStyle = "#64748b";
  ctx.font = "9px sans-serif";
  ctx.fillText(stageNames[stage], W / 2, 166);

  // Route map
  const mapY = 180, mapH = 240;
  const PAD = 28;

  if (routePoints.length >= 2) {
    const lats = routePoints.map((p) => p.lat);
    const lngs = routePoints.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 0.00001;
    const lngRange = maxLng - minLng || 0.00001;
    const iW = W - PAD * 2, iH = mapH - PAD * 2;
    const scale = Math.min(iW / lngRange, iH / latRange);
    const scaledW = lngRange * scale, scaledH = latRange * scale;
    const ox = PAD + (iW - scaledW) / 2;
    const oy = mapY + PAD + (iH - scaledH) / 2;
    const toXY = (p: RoutePoint) => ({
      x: ox + (p.lng - minLng) * scale,
      y: oy + (maxLat - p.lat) * scale,
    });
    const coords = routePoints.map(toXY);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(PAD, mapY + mapH / 2); ctx.lineTo(W - PAD, mapY + mapH / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2, mapY + PAD); ctx.lineTo(W / 2, mapY + mapH - PAD); ctx.stroke();

    // Glow route
    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,0.5)";
    ctx.shadowBlur = 7;
    ctx.beginPath();
    coords.forEach((c, i) => (i === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y)));
    ctx.strokeStyle = "rgba(255,255,255,0.88)";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();

    // Start dot
    ctx.beginPath();
    ctx.arc(coords[0].x, coords[0].y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(coords[0].x, coords[0].y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Goal star
    const end = coords[coords.length - 1];
    ctx.save();
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 5;
    ctx.fillStyle = "#fbbf24";
    ctx.font = "15px serif";
    ctx.textAlign = "center";
    ctx.fillText("★", end.x, end.y + 5);
    ctx.restore();

    ctx.font = "8px monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.fillText("START", coords[0].x + 8, coords[0].y + 3);
    ctx.fillStyle = "rgba(251,191,36,0.65)";
    ctx.fillText("GOAL", end.x + 8, end.y + 3);
  } else {
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#334155";
    ctx.textAlign = "center";
    ctx.fillText("軌跡なし", W / 2, mapY + mapH / 2);
  }

  // Separator
  const sepY = mapY + mapH + 10;
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, sepY);
  ctx.lineTo(W - PAD, sepY);
  ctx.stroke();

  // Stats
  const statsY = sepY + 30;
  const m = Math.floor(elapsedSeconds / 60);
  const s = elapsedSeconds % 60;
  const statsData = [
    { label: "経過時間", value: `${m}分${s.toString().padStart(2, "0")}秒` },
    { label: "移動距離", value: `${Math.round(totalDistanceMeters)}m` },
    { label: "推定歩数", value: `${estimatedSteps.toLocaleString()}歩` },
  ];
  const colW = (W - PAD * 2) / 3;
  statsData.forEach(({ label, value }, i) => {
    const x = PAD + colW * i + colW / 2;
    ctx.textAlign = "center";
    ctx.fillStyle = "#475569";
    ctx.font = "9px sans-serif";
    ctx.fillText(label, x, statsY);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(value, x, statsY + 18);
  });

  // Badges
  if (earnedBadges.length > 0) {
    const badgesY = statsY + 48;
    ctx.textAlign = "center";
    ctx.fillStyle = "#64748b";
    ctx.font = "9px sans-serif";
    ctx.fillText("獲得バッジ", W / 2, badgesY);
    ctx.font = "16px serif";
    ctx.fillText(earnedBadges.map((b) => b.emoji).join("  "), W / 2, badgesY + 22);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px sans-serif";
    ctx.fillText(earnedBadges.map((b) => b.name).join("・"), W / 2, badgesY + 38);
  }

  // Hashtag footer
  ctx.textAlign = "center";
  ctx.fillStyle = "#f97316";
  ctx.font = "bold 10px sans-serif";
  ctx.fillText("#今日の迷走ルート", W / 2, H - 28);
  ctx.fillStyle = "#1e293b";
  ctx.font = "9px sans-serif";
  ctx.fillText("WANDER app", W / 2, H - 14);

  return canvas;
}

async function handleShareClick(
  routePoints: RoutePoint[],
  elapsedSeconds: number,
  totalDistanceMeters: number,
  estimatedSteps: number,
  earnedBadges: Badge[],
) {
  const canvas = generateShareCanvas(
    routePoints, elapsedSeconds, totalDistanceMeters, estimatedSteps, earnedBadges,
  );
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) return;

  const file = new File([blob], "wander-route.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: "今日の迷走ルート",
        text: "#今日の迷走ルート #WANDER",
        files: [file],
      });
      return;
    } catch {
      // fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "wander-route.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

interface ArrivalModalProps {
  elapsedSeconds: number;
  totalDistanceMeters: number;
  estimatedSteps: number;
  routePoints: RoutePoint[];
  earnedBadges: Badge[];
  earnedPoints?: number;
  companionSkinId?: string;
  theme?: ThemeConfig;
  onRestart: () => void;
  onFinish: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} 秒`;
  return `${m} 分 ${s.toString().padStart(2, "0")} 秒`;
}

// Pre-generate stable sparkle positions to avoid hydration issues
const SPARKLES = Array.from({ length: 12 }, (_, i) => ({
  size: 3 + ((i * 7) % 6),
  left: (i * 37 + 13) % 100,
  top: (i * 53 + 7) % 100,
  duration: 1.2 + (i % 4) * 0.4,
  delay: (i % 5) * 0.3,
}));

export function ArrivalModal({
  elapsedSeconds,
  totalDistanceMeters,
  estimatedSteps,
  routePoints,
  earnedBadges,
  earnedPoints,
  companionSkinId,
  theme,
  onRestart,
  onFinish,
}: ArrivalModalProps) {
  const accent = theme?.accentColor ?? "#f97316";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto bg-slate-950/96 backdrop-blur-md transition-opacity duration-500 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Sparkles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {SPARKLES.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-orange-400"
            style={{
              width: s.size,
              height: s.size,
              left: `${s.left}%`,
              top: `${s.top}%`,
              animation: `sparkle ${s.duration}s ease-out ${s.delay}s both`,
            }}
          />
        ))}
      </div>

      {/* Scrollable content */}
      <div className="relative flex flex-col items-center gap-6 px-6 py-12 w-full max-w-sm mx-auto">
        {/* Bounce-in icon */}
        <div
          className={`transition-all duration-700 delay-100 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div
            className="text-6xl"
            style={{
              animation:
                "arrivalBounce 0.6s cubic-bezier(0.36,0.07,0.19,0.97) 0.2s both",
            }}
          >
            ✦
          </div>
        </div>

        {/* Title */}
        <div
          className={`text-center transition-all duration-700 delay-150 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p
            className="text-[10px] tracking-[0.6em] uppercase mb-1"
            style={{ color: accent }}
          >
            Goal
          </p>
          <h2 className="text-4xl font-bold tracking-wider text-white">
            到着！
          </h2>
          <p className="text-slate-400 text-sm mt-2 tracking-wider">
            お散歩おつかれさまでした
          </p>
        </div>

        {/* Companion final form */}
        <div
          className={`transition-all duration-700 delay-200 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <WalkCompanion distanceMeters={totalDistanceMeters} large skinId={companionSkinId} />
        </div>

        {/* Route map */}
        <div
          className={`w-full transition-all duration-700 delay-[300ms] ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="text-[9px] tracking-[0.5em] text-slate-600 uppercase mb-2 text-center">
            あなたの軌跡
          </p>
          <RouteCanvas points={routePoints} />
        </div>

        {/* Stats */}
        <div
          className={`grid grid-cols-3 gap-3 w-full transition-all duration-700 delay-[400ms] ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <StatCard label="経過時間" value={formatTime(elapsedSeconds)} />
          <StatCard
            label="移動距離"
            value={`${Math.round(totalDistanceMeters)} m`}
          />
          <StatCard
            label="推定歩数"
            value={`${estimatedSteps.toLocaleString()} 歩`}
          />
        </div>

        {/* Points earned */}
        {earnedPoints !== undefined && earnedPoints > 0 && (
          <div
            className={`w-full transition-all duration-700 delay-[450ms] ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <div
              className="flex items-center justify-center gap-3 rounded-xl py-3"
              style={{ backgroundColor: `${accent}18`, border: `1px solid ${accent}44` }}
            >
              <span className="text-xl">🪙</span>
              <div>
                <p className="text-[9px] tracking-widest" style={{ color: accent, opacity: 0.7 }}>
                  Wコイン獲得
                </p>
                <p className="text-lg font-bold tabular-nums" style={{ color: accent }}>
                  +{earnedPoints}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <div
            className={`w-full transition-all duration-700 delay-[500ms] ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <BadgeDisplay badges={earnedBadges} />
          </div>
        )}

        {/* Action buttons */}
        <div
          className={`flex flex-col gap-3 w-full transition-all duration-700 delay-[600ms] ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <button
            onClick={onRestart}
            className="w-full py-4 text-white rounded-2xl font-medium tracking-widest text-sm transition-colors"
            style={{ backgroundColor: accent }}
          >
            もう一度歩く
          </button>
          <button
            onClick={() =>
              handleShareClick(
                routePoints,
                elapsedSeconds,
                totalDistanceMeters,
                estimatedSteps,
                earnedBadges,
              )
            }
            className="w-full py-3 rounded-2xl text-sm tracking-widest transition-colors font-medium"
            style={{
              background: "rgba(249,115,22,0.10)",
              border: "1px solid rgba(249,115,22,0.35)",
              color: "#fb923c",
            }}
          >
            ⬆ #今日の迷走ルート をシェア
          </button>
          <button
            onClick={onFinish}
            className="w-full py-3 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-300 rounded-2xl text-sm tracking-widest transition-colors"
          >
            お散歩を終了する
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-2 bg-slate-900 rounded-xl p-3 border border-slate-800">
      <span className="text-[9px] text-slate-500 tracking-wider text-center leading-tight">
        {label}
      </span>
      <span className="text-xs font-semibold text-white text-center tabular-nums leading-tight">
        {value}
      </span>
    </div>
  );
}
