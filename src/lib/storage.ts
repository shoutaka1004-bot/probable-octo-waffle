import type { RoutePoint } from "@/lib/geo";

// ── Points ──────────────────────────────────────────────────────────
const KEY_TOTAL_PTS  = "wander_total_points";
const KEY_SPENT_PTS  = "wander_spent_points";
const KEY_UNLOCKED   = "wander_unlocked_skins";
const KEY_COMPANION  = "wander_active_companion";
const KEY_ARROW      = "wander_active_arrow";

function readInt(key: string): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(key) ?? "0", 10) || 0;
}

export function getTotalPoints(): number { return readInt(KEY_TOTAL_PTS); }
export function getSpentPoints(): number { return readInt(KEY_SPENT_PTS); }
export function getAvailablePoints(): number {
  return Math.max(0, getTotalPoints() - getSpentPoints());
}

export function addPoints(n: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_TOTAL_PTS, String(getTotalPoints() + n));
}

export function spendPoints(n: number): boolean {
  if (getAvailablePoints() < n) return false;
  localStorage.setItem(KEY_SPENT_PTS, String(getSpentPoints() + n));
  return true;
}

export function getUnlockedSkins(): string[] {
  if (typeof window === "undefined") return ["default"];
  const raw = localStorage.getItem(KEY_UNLOCKED);
  if (!raw) return ["default"];
  try { return JSON.parse(raw) as string[]; } catch { return ["default"]; }
}

export function unlockSkin(id: string): void {
  if (typeof window === "undefined") return;
  const list = getUnlockedSkins();
  if (!list.includes(id)) {
    localStorage.setItem(KEY_UNLOCKED, JSON.stringify([...list, id]));
  }
}

export function isSkinUnlocked(id: string): boolean {
  if (id === "default") return true;
  return getUnlockedSkins().includes(id);
}

export function getActiveCompanionSkin(): string {
  if (typeof window === "undefined") return "default";
  return localStorage.getItem(KEY_COMPANION) ?? "default";
}

export function getActiveArrowSkin(): string {
  if (typeof window === "undefined") return "default";
  return localStorage.getItem(KEY_ARROW) ?? "default";
}

export function setActiveCompanionSkin(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_COMPANION, id);
}

export function setActiveArrowSkin(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_ARROW, id);
}

// ── Walk logs ────────────────────────────────────────────────────────
export interface WalkLog {
  id: string;
  date: string;
  distanceMeters: number;
  elapsedSeconds: number;
  estimatedSteps: number;
  routePoints: RoutePoint[];
  earnedBadgeIds: string[];
  distanceMode: string;
}

const KEY_LOGS = "wander_walk_logs";
const KEY_BADGES = "wander_earned_badges";

export function saveWalkLog(log: WalkLog): void {
  if (typeof window === "undefined") return;
  const logs = getWalkLogs();
  logs.unshift(log);
  localStorage.setItem(KEY_LOGS, JSON.stringify(logs.slice(0, 50)));
}

export function getWalkLogs(): WalkLog[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY_LOGS);
  if (!raw) return [];
  try { return JSON.parse(raw) as WalkLog[]; } catch { return []; }
}

export function getEarnedBadgeIds(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY_BADGES);
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

export function markBadgesEarned(ids: string[]): void {
  if (typeof window === "undefined") return;
  const current = getEarnedBadgeIds();
  const merged = Array.from(new Set([...current, ...ids]));
  localStorage.setItem(KEY_BADGES, JSON.stringify(merged));
}
