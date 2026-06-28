export type ThemeId = "cyber" | "retro";

export interface ThemeConfig {
  id: ThemeId;
  label: string;
  desc: string;
  bgColor: string;
  bgGradient: string;
  textPrimary: string;
  textDim: string;
  textDimmer: string;
  accentColor: string;
  accentHover: string;
  accentShadow: string;
  compassNeedle: string;
  compassNeedleHighlight: string;
  compassNeedleCenter: string;
  compassRing1: string;
  compassRing2: string;
  compassTick: string;
  compassTickMinor: string;
  compassPivotBg: string;
  compassPivotStroke: string;
  compassSouthFill: string;
  compassSouthShadow: string;
  compassGlow: string;
  particleColor: [number, number, number];
  radarFar: string;
  radarMid: string;
  radarNear: string;
  hintBorder: string;
  hintText: string;
  cardBg: string;
  cardBorder: string;
  tabActiveBg: string;
  tabActiveText: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  cyber: {
    id: "cyber",
    label: "サイバー・レーダー",
    desc: "ダーク＋シアン",
    bgColor: "#020617",
    bgGradient: "radial-gradient(ellipse 60% 50% at 50% 60%, rgba(30,41,59,0.8) 0%, transparent 100%)",
    textPrimary: "#e2e8f0",
    textDim: "#64748b",
    textDimmer: "#475569",
    accentColor: "#f97316",
    accentHover: "#fb923c",
    accentShadow: "rgba(124,45,18,0.3)",
    compassNeedle: "#f97316",
    compassNeedleHighlight: "#fb923c",
    compassNeedleCenter: "#f97316",
    compassRing1: "#1e293b",
    compassRing2: "#334155",
    compassTick: "#334155",
    compassTickMinor: "#1e293b",
    compassPivotBg: "#0f172a",
    compassPivotStroke: "#334155",
    compassSouthFill: "#334155",
    compassSouthShadow: "#1e293b",
    compassGlow: "radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)",
    particleColor: [251, 191, 36],
    radarFar: "rgba(34,211,238,0.32)",
    radarMid: "rgba(249,115,22,0.45)",
    radarNear: "rgba(239,68,68,0.5)",
    hintBorder: "rgba(249,115,22,0.5)",
    hintText: "rgba(254,215,170,0.55)",
    cardBg: "#0f172a",
    cardBorder: "#1e293b",
    tabActiveBg: "#f97316",
    tabActiveText: "#ffffff",
  },
  retro: {
    id: "retro",
    label: "レトロ・コンパス",
    desc: "セピア＋アンバー",
    bgColor: "#1a1208",
    bgGradient: "radial-gradient(ellipse 60% 50% at 50% 60%, rgba(41,29,12,0.9) 0%, transparent 100%)",
    textPrimary: "#e8d5b0",
    textDim: "#92816a",
    textDimmer: "#6b5d4e",
    accentColor: "#d97706",
    accentHover: "#f59e0b",
    accentShadow: "rgba(120,53,15,0.4)",
    compassNeedle: "#d97706",
    compassNeedleHighlight: "#f59e0b",
    compassNeedleCenter: "#d97706",
    compassRing1: "#3d2e1a",
    compassRing2: "#5c4530",
    compassTick: "#5c4530",
    compassTickMinor: "#3d2e1a",
    compassPivotBg: "#2a1f10",
    compassPivotStroke: "#5c4530",
    compassSouthFill: "#5c4530",
    compassSouthShadow: "#3d2e1a",
    compassGlow: "radial-gradient(circle, rgba(217,119,6,0.10) 0%, transparent 70%)",
    particleColor: [253, 186, 116],
    radarFar: "rgba(217,119,6,0.28)",
    radarMid: "rgba(217,119,6,0.48)",
    radarNear: "rgba(180,83,9,0.6)",
    hintBorder: "rgba(217,119,6,0.5)",
    hintText: "rgba(253,230,138,0.6)",
    cardBg: "#2a1f10",
    cardBorder: "#3d2e1a",
    tabActiveBg: "#d97706",
    tabActiveText: "#ffffff",
  },
};

export const DISTANCE_MODES = [
  { id: "short",  label: "サクッと",  desc: "300〜500m",  min: 300,  max: 500  },
  { id: "normal", label: "なみのり",  desc: "500m〜1km",  min: 500,  max: 1000 },
  { id: "long",   label: "がっつり",  desc: "1〜2km",     min: 1000, max: 2000 },
] as const;

export type DistanceModeId = (typeof DISTANCE_MODES)[number]["id"];

export const TIME_MODES = [
  { id: "free",  label: "自由に",  desc: "制限なし",    minutes: null },
  { id: "15min", label: "15分",   desc: "ちょこっと",   minutes: 15  },
  { id: "30min", label: "30分",   desc: "ほどよく迷子", minutes: 30  },
  { id: "60min", label: "60分",   desc: "がっつり探検", minutes: 60  },
] as const;

export type TimeModeId = (typeof TIME_MODES)[number]["id"];
