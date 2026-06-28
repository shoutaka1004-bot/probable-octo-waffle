export type ArrowVariant = "normal" | "slim" | "wide" | "leaf";

export interface CompanionSkinConfig {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  cost: number;
  bodyColor: string;
  eyeColor: string;
  wing1: string;
  wing2: string;
}

export interface ArrowSkinConfig {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  cost: number;
  variant: ArrowVariant;
  baseColor: [number, number, number];
}

export const COMPANION_SKINS: CompanionSkinConfig[] = [
  {
    id: "default", name: "もりのこ", desc: "初期のお供", emoji: "🌿", cost: 0,
    bodyColor: "#4ade80", eyeColor: "#14532d", wing1: "#c4b5fd", wing2: "#a78bfa",
  },
  {
    id: "ghost", name: "ゆうれい", desc: "夜の散歩が好き", emoji: "👻", cost: 200,
    bodyColor: "#e2e8f0", eyeColor: "#334155", wing1: "#bfdbfe", wing2: "#93c5fd",
  },
  {
    id: "fire", name: "ほのお", desc: "情熱で燃えてる", emoji: "🔥", cost: 350,
    bodyColor: "#fb923c", eyeColor: "#7c2d12", wing1: "#fde68a", wing2: "#fbbf24",
  },
  {
    id: "ice", name: "こおり", desc: "クールな旅人", emoji: "❄️", cost: 350,
    bodyColor: "#67e8f9", eyeColor: "#164e63", wing1: "#a5f3fc", wing2: "#06b6d4",
  },
  {
    id: "gold", name: "おうごん", desc: "伝説のお供", emoji: "✨", cost: 800,
    bodyColor: "#fbbf24", eyeColor: "#78350f", wing1: "#fef08a", wing2: "#f59e0b",
  },
];

export const ARROW_SKINS: ArrowSkinConfig[] = [
  {
    id: "default", name: "ノーマル", desc: "定番の矢印", emoji: "⬆️", cost: 0,
    variant: "normal", baseColor: [34, 211, 238],
  },
  {
    id: "blade", name: "カタナ", desc: "鋭い刃の矢印", emoji: "⚔️", cost: 300,
    variant: "slim", baseColor: [248, 113, 113],
  },
  {
    id: "rocket", name: "ロケット", desc: "力強い矢印", emoji: "🚀", cost: 400,
    variant: "wide", baseColor: [167, 139, 250],
  },
  {
    id: "leaf", name: "つばさ", desc: "風をまとう矢印", emoji: "🍃", cost: 500,
    variant: "leaf", baseColor: [251, 191, 36],
  },
];

export function getCompanionSkin(id: string): CompanionSkinConfig {
  return COMPANION_SKINS.find((s) => s.id === id) ?? COMPANION_SKINS[0];
}

export function getArrowSkin(id: string): ArrowSkinConfig {
  return ARROW_SKINS.find((s) => s.id === id) ?? ARROW_SKINS[0];
}

export const POINTS_PER_10M = 1; // 100pts per 1km
export function calcEarnedPoints(distanceMeters: number): number {
  return Math.floor(distanceMeters / 10) * POINTS_PER_10M;
}
