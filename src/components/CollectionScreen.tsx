"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getEarnedBadgeIds, getWalkLogs, WalkLog,
  getAvailablePoints, isSkinUnlocked, unlockSkin, spendPoints,
  getActiveCompanionSkin, getActiveArrowSkin, setActiveCompanionSkin, setActiveArrowSkin,
} from "@/lib/storage";
import { COMPANION_SKINS, ARROW_SKINS } from "@/lib/shop";
import { ALL_BADGES, Badge } from "@/lib/badges";
import { RouteCanvas } from "./RouteCanvas";
import { WalkCompanion } from "./WalkCompanion";
import { ThemeConfig } from "@/lib/theme";

const HEX_OUTER = "M32 2 L60 18 L60 54 L32 70 L4 54 L4 18 Z";
const HEX_INNER = "M32 9 L53 22 L53 50 L32 63 L11 50 L11 22 Z";

const ACCENT = {
  amber:  { fill: "#451a03", stroke: "#d97706", inner: "#78350f", label: "#fbbf24" },
  cyan:   { fill: "#083344", stroke: "#0e7490", inner: "#0c4a6e", label: "#22d3ee" },
  violet: { fill: "#2e1065", stroke: "#7c3aed", inner: "#3b0764", label: "#a78bfa" },
} as const;

const MODE_LABELS: Record<string, string> = {
  short:  "サクッと",
  normal: "なみのり",
  long:   "がっつり",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}秒`;
  return `${m}分${s.toString().padStart(2, "0")}秒`;
}

function formatDist(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)}km`;
  return `${Math.round(meters)}m`;
}

type CollectionTab = "badges" | "logs" | "shop";

interface Props {
  theme: ThemeConfig;
}

export function CollectionScreen({ theme }: Props) {
  const [activeTab, setActiveTab] = useState<CollectionTab>("badges");
  const [earnedIds, setEarnedIds] = useState<string[]>([]);
  const [logs, setLogs] = useState<WalkLog[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Shop state
  const [points, setPoints] = useState(0);
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(["default"]);
  const [activeCompanion, setActiveCompanionState] = useState("default");
  const [activeArrow, setActiveArrowState] = useState("default");

  const refreshShop = useCallback(() => {
    setPoints(getAvailablePoints());
    setUnlockedSkins(["default", ...COMPANION_SKINS.filter(s => s.id !== "default" && isSkinUnlocked(s.id)).map(s => s.id),
                      ...ARROW_SKINS.filter(s => s.id !== "default" && isSkinUnlocked(s.id)).map(s => s.id)]);
    setActiveCompanionState(getActiveCompanionSkin());
    setActiveArrowState(getActiveArrowSkin());
  }, []);

  useEffect(() => {
    setEarnedIds(getEarnedBadgeIds());
    setLogs(getWalkLogs());
    refreshShop();
  }, [refreshShop]);

  const handleBuyOrEquipCompanion = (id: string, cost: number) => {
    if (!isSkinUnlocked(id)) {
      if (!spendPoints(cost)) return;
      unlockSkin(id);
    }
    setActiveCompanionSkin(id);
    refreshShop();
  };

  const handleBuyOrEquipArrow = (id: string, cost: number) => {
    if (!isSkinUnlocked(id)) {
      if (!spendPoints(cost)) return;
      unlockSkin(id);
    }
    setActiveArrowSkin(id);
    refreshShop();
  };

  const allBadges = Object.values(ALL_BADGES);

  return (
    <main
      className="min-h-dvh bg-grain flex flex-col pb-16"
      style={{ backgroundColor: theme.bgColor, color: theme.textPrimary }}
    >
      {/* Header */}
      <header className="px-6 pt-10 pb-4 relative z-10">
        <p
          className="text-[10px] tracking-[0.4em] uppercase"
          style={{ color: theme.textDim }}
        >
          Collection
        </p>
        <h1
          className="text-2xl font-bold tracking-[0.2em] mt-1"
          style={{ color: theme.textPrimary }}
        >
          お散歩図鑑
        </h1>
      </header>

      {/* Inner tabs */}
      <div
        className="mx-6 mb-6 flex rounded-xl overflow-hidden relative z-10"
        style={{ border: `1px solid ${theme.cardBorder}` }}
      >
        {(["badges", "logs", "shop"] as CollectionTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); if (tab === "shop") refreshShop(); }}
            className="flex-1 py-2.5 text-xs tracking-wider transition-colors"
            style={
              activeTab === tab
                ? { backgroundColor: theme.tabActiveBg, color: theme.tabActiveText }
                : { backgroundColor: "transparent", color: theme.textDim }
            }
          >
            {tab === "badges" ? "🏅 バッジ" : tab === "logs" ? "📜 記録" : "🛒 ショップ"}
          </button>
        ))}
      </div>

      {/* ── Badge tab ── */}
      {activeTab === "badges" && (
        <div className="px-6 relative z-10">
          <p
            className="text-[10px] tracking-[0.4em] uppercase mb-5 text-center"
            style={{ color: theme.textDim }}
          >
            {earnedIds.length} / {allBadges.length} 獲得
          </p>
          <div className="grid grid-cols-3 gap-6">
            {allBadges.map((badge) => {
              const earned = earnedIds.includes(badge.id);
              const a = ACCENT[badge.accentColor];
              return (
                <button
                  key={badge.id}
                  onClick={() => setSelectedBadge(badge)}
                  className="flex flex-col items-center gap-2"
                  style={{ opacity: earned ? 1 : 0.35 }}
                >
                  <div className="relative" style={{ width: 64, height: 72 }}>
                    <svg width="64" height="72" viewBox="0 0 64 72" fill="none">
                      <path
                        d={HEX_OUTER}
                        fill={a.fill}
                        stroke={a.stroke}
                        strokeWidth="2.5"
                        strokeDasharray="5 3"
                      />
                      <path d={HEX_INNER} fill="none" stroke={a.inner} strokeWidth="1" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[22px] leading-none">
                        {earned ? badge.emoji : "🔒"}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p
                      className="text-[10px] font-bold tracking-wider"
                      style={{ color: earned ? a.label : theme.textDim }}
                    >
                      {badge.name}
                    </p>
                    <p
                      className="text-[8px] mt-0.5 leading-tight"
                      style={{ color: theme.textDimmer }}
                    >
                      {badge.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Log tab ── */}
      {activeTab === "logs" && (
        <div className="px-6 flex flex-col gap-3 relative z-10">
          {logs.length === 0 ? (
            <p
              className="text-center text-sm py-16 leading-relaxed"
              style={{ color: theme.textDim }}
            >
              まだ記録がありません。
              <br />
              お散歩をしてみよう！
            </p>
          ) : (
            logs.map((log) => {
              const expanded = expandedLogId === log.id;
              return (
                <div key={log.id}>
                  <button
                    className="w-full text-left rounded-xl p-4 transition-colors"
                    style={{
                      backgroundColor: theme.cardBg,
                      border: `1px solid ${expanded ? theme.accentColor : theme.cardBorder}`,
                      borderBottomLeftRadius: expanded ? 0 : undefined,
                      borderBottomRightRadius: expanded ? 0 : undefined,
                    }}
                    onClick={() =>
                      setExpandedLogId(expanded ? null : log.id)
                    }
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p
                          className="text-[11px] font-semibold"
                          style={{ color: theme.textPrimary }}
                        >
                          {formatDate(log.date)}
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: theme.textDim }}>
                          {formatDist(log.distanceMeters)}　{formatElapsed(log.elapsedSeconds)}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: theme.textDimmer }}>
                          {MODE_LABELS[log.distanceMode] ?? log.distanceMode}
                          　{log.estimatedSteps.toLocaleString()}歩
                        </p>
                      </div>
                      <div className="flex gap-0.5 flex-shrink-0">
                        {log.earnedBadgeIds.map((id) => (
                          <span key={id} className="text-lg leading-none">
                            {ALL_BADGES[id]?.emoji ?? ""}
                          </span>
                        ))}
                        <span
                          className="text-[10px] ml-1 self-center"
                          style={{ color: theme.textDim }}
                        >
                          {expanded ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded route */}
                  {expanded && (
                    <div
                      className="rounded-b-xl px-3 pb-3 pt-2"
                      style={{
                        backgroundColor: theme.cardBg,
                        borderLeft: `1px solid ${theme.accentColor}`,
                        borderRight: `1px solid ${theme.accentColor}`,
                        borderBottom: `1px solid ${theme.accentColor}`,
                      }}
                    >
                      {log.routePoints.length > 1 ? (
                        <RouteCanvas points={log.routePoints} />
                      ) : (
                        <p
                          className="text-[10px] text-center py-4"
                          style={{ color: theme.textDimmer }}
                        >
                          ルートデータが少なすぎます
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Shop tab ── */}
      {activeTab === "shop" && (
        <div className="px-6 pb-6 flex flex-col gap-6 relative z-10">
          {/* Points display */}
          <div
            className="flex items-center justify-between rounded-xl px-5 py-4"
            style={{ backgroundColor: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
          >
            <div>
              <p className="text-[9px] tracking-[0.4em] uppercase" style={{ color: theme.textDim }}>
                Wコイン
              </p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: theme.accentColor }}>
                {points.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px]" style={{ color: theme.textDimmer }}>
                100m歩く = 10コイン
              </p>
              <p className="text-[9px] mt-0.5" style={{ color: theme.textDimmer }}>
                お散歩するたびに貯まる
              </p>
            </div>
          </div>

          {/* Companion skins */}
          <div>
            <p className="text-[9px] tracking-[0.4em] uppercase mb-3" style={{ color: theme.textDim }}>
              コンパニオン
            </p>
            <div className="grid grid-cols-2 gap-3">
              {COMPANION_SKINS.map((skin) => {
                const owned = isSkinUnlocked(skin.id);
                const canAfford = points >= skin.cost;
                const isActive = activeCompanion === skin.id;
                return (
                  <div
                    key={skin.id}
                    className="rounded-xl p-3 flex flex-col items-center gap-2"
                    style={{
                      backgroundColor: theme.cardBg,
                      border: `1px solid ${isActive ? theme.accentColor : theme.cardBorder}`,
                    }}
                  >
                    <WalkCompanion distanceMeters={300} large skinId={skin.id} />
                    <p className="text-[11px] font-semibold" style={{ color: theme.textPrimary }}>
                      {skin.emoji} {skin.name}
                    </p>
                    <p className="text-[9px]" style={{ color: theme.textDimmer }}>{skin.desc}</p>
                    {isActive ? (
                      <span
                        className="text-[10px] px-3 py-1 rounded-full"
                        style={{ backgroundColor: theme.accentColor + "22", color: theme.accentColor }}
                      >
                        ✦ 装備中
                      </span>
                    ) : owned ? (
                      <button
                        onClick={() => handleBuyOrEquipCompanion(skin.id, skin.cost)}
                        className="text-[10px] px-3 py-1 rounded-full transition-colors"
                        style={{ border: `1px solid ${theme.cardBorder}`, color: theme.textDim }}
                      >
                        装備する
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuyOrEquipCompanion(skin.id, skin.cost)}
                        disabled={!canAfford}
                        className="text-[10px] px-3 py-1 rounded-full transition-colors"
                        style={{
                          backgroundColor: canAfford ? theme.accentColor : "transparent",
                          border: `1px solid ${canAfford ? theme.accentColor : theme.cardBorder}`,
                          color: canAfford ? "#fff" : theme.textDimmer,
                          opacity: canAfford ? 1 : 0.5,
                        }}
                      >
                        {skin.cost} コイン
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Arrow skins */}
          <div>
            <p className="text-[9px] tracking-[0.4em] uppercase mb-3" style={{ color: theme.textDim }}>
              やじるし
            </p>
            <div className="grid grid-cols-2 gap-3">
              {ARROW_SKINS.map((skin) => {
                const owned = isSkinUnlocked(skin.id);
                const canAfford = points >= skin.cost;
                const isActive = activeArrow === skin.id;
                const [r, g, b] = skin.baseColor;
                return (
                  <div
                    key={skin.id}
                    className="rounded-xl p-3 flex flex-col items-center gap-2"
                    style={{
                      backgroundColor: theme.cardBg,
                      border: `1px solid ${isActive ? theme.accentColor : theme.cardBorder}`,
                    }}
                  >
                    {/* Arrow color preview */}
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-3xl"
                      style={{ backgroundColor: `rgba(${r},${g},${b},0.12)` }}
                    >
                      <span style={{ filter: `drop-shadow(0 0 6px rgba(${r},${g},${b},0.8))` }}>
                        {skin.emoji}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold" style={{ color: theme.textPrimary }}>
                      {skin.name}
                    </p>
                    <p className="text-[9px]" style={{ color: theme.textDimmer }}>{skin.desc}</p>
                    {isActive ? (
                      <span
                        className="text-[10px] px-3 py-1 rounded-full"
                        style={{ backgroundColor: theme.accentColor + "22", color: theme.accentColor }}
                      >
                        ✦ 装備中
                      </span>
                    ) : owned ? (
                      <button
                        onClick={() => handleBuyOrEquipArrow(skin.id, skin.cost)}
                        className="text-[10px] px-3 py-1 rounded-full transition-colors"
                        style={{ border: `1px solid ${theme.cardBorder}`, color: theme.textDim }}
                      >
                        装備する
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuyOrEquipArrow(skin.id, skin.cost)}
                        disabled={!canAfford}
                        className="text-[10px] px-3 py-1 rounded-full transition-colors"
                        style={{
                          backgroundColor: canAfford ? theme.accentColor : "transparent",
                          border: `1px solid ${canAfford ? theme.accentColor : theme.cardBorder}`,
                          color: canAfford ? "#fff" : theme.textDimmer,
                          opacity: canAfford ? 1 : 0.5,
                        }}
                      >
                        {skin.cost} コイン
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Badge condition popup ── */}
      {selectedBadge && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center pb-20"
          onClick={() => setSelectedBadge(null)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm mx-4 rounded-2xl p-6"
            style={{
              backgroundColor: theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="text-5xl leading-none">
                {earnedIds.includes(selectedBadge.id) ? selectedBadge.emoji : "🔒"}
              </span>
              <h3
                className="text-lg font-bold tracking-wider"
                style={{ color: theme.textPrimary }}
              >
                {selectedBadge.name}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: theme.textDim }}
              >
                {selectedBadge.condition}
              </p>
              {earnedIds.includes(selectedBadge.id) && (
                <p
                  className="text-xs font-bold"
                  style={{ color: ACCENT[selectedBadge.accentColor].label }}
                >
                  ✦ 獲得済み
                </p>
              )}
              <button
                onClick={() => setSelectedBadge(null)}
                className="mt-1 px-6 py-2 rounded-full text-xs tracking-wider"
                style={{
                  border: `1px solid ${theme.cardBorder}`,
                  color: theme.textDim,
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
