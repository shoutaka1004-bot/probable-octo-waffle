export interface Badge {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  condition: string;
  accentColor: "amber" | "cyan" | "violet";
}

export const ALL_BADGES: Record<string, Badge> = {
  first_lost: {
    id: "first_lost",
    name: "初めての迷子",
    emoji: "🗺️",
    desc: "はじめてのゴール達成",
    condition: "初めてゴールに到達すると獲得できます。記念すべき第一歩！",
    accentColor: "amber",
  },
  big_detour: {
    id: "big_detour",
    name: "大回りマスター",
    emoji: "🌀",
    desc: "直線距離の3倍以上を踏破",
    condition: "スタート地点からゴールまでの直線距離の3倍以上を歩いてゴールすると獲得できます。大いに迷った証！",
    accentColor: "cyan",
  },
  night_walker: {
    id: "night_walker",
    name: "夜の放浪者",
    emoji: "🌙",
    desc: "夜間（19時〜4時）にゴール達成",
    condition: "夜19時〜翌朝4時の間にゴールに到達すると獲得できます。夜の散歩は格別。",
    accentColor: "violet",
  },
};

interface CheckParams {
  totalDistanceMeters: number;
  straightLineMeters: number;
}

export function checkBadges({ totalDistanceMeters, straightLineMeters }: CheckParams): Badge[] {
  if (typeof window === "undefined") return [];

  const earned: Badge[] = [];

  const count = parseInt(localStorage.getItem("wander_walk_count") ?? "0", 10);
  if (count === 0) earned.push(ALL_BADGES.first_lost);

  if (straightLineMeters > 50 && totalDistanceMeters >= straightLineMeters * 3) {
    earned.push(ALL_BADGES.big_detour);
  }

  const hour = new Date().getHours();
  if (hour >= 19 || hour <= 4) earned.push(ALL_BADGES.night_walker);

  localStorage.setItem("wander_walk_count", String(count + 1));

  return earned;
}
