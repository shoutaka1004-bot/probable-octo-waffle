import type { RoutePoint } from "@/lib/geo";

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
