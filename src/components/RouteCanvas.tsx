"use client";

import { RoutePoint } from "@/lib/geo";

interface RouteCanvasProps {
  points: RoutePoint[];
}

const W = 320;
const H = 220;
const PAD = 24;

export function RouteCanvas({ points }: RouteCanvasProps) {
  if (points.length < 2) {
    return (
      <div
        className="w-full rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center"
        style={{ aspectRatio: `${W}/${H}` }}
      >
        <p className="text-slate-700 text-[10px] tracking-widest">軌跡なし</p>
      </div>
    );
  }

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 0.000_01;
  const lngRange = maxLng - minLng || 0.000_01;

  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const scale = Math.min(innerW / lngRange, innerH / latRange);
  const scaledW = lngRange * scale;
  const scaledH = latRange * scale;
  const ox = PAD + (innerW - scaledW) / 2;
  const oy = PAD + (innerH - scaledH) / 2;

  const toXY = (p: RoutePoint) => ({
    x: ox + (p.lng - minLng) * scale,
    y: oy + (maxLat - p.lat) * scale, // flip Y: larger lat = higher on screen
  });

  const coords = points.map(toXY);
  const pathD = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(" ");
  const start = coords[0];
  const end = coords[coords.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      aria-label="歩行ルートの軌跡"
    >
      <defs>
        <filter id="lineGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width={W} height={H} fill="#020617" rx="12" />

      {/* Subtle grid lines */}
      <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
      <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />

      {/* Glow layer */}
      <path
        d={pathD}
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#lineGlow)"
      />
      {/* Main route line */}
      <path
        d={pathD}
        fill="none"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Start: white circle */}
      <circle cx={start.x} cy={start.y} r="5" fill="rgba(255,255,255,0.15)" />
      <circle cx={start.x} cy={start.y} r="3" fill="white" opacity="0.9" />

      {/* End: yellow star */}
      <text
        x={end.x}
        y={end.y}
        fontSize="14"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fbbf24"
        filter="url(#starGlow)"
      >
        ★
      </text>

      {/* Labels */}
      <text x={start.x + 7} y={start.y + 1} fontSize="7" fill="rgba(255,255,255,0.4)" dominantBaseline="middle">
        START
      </text>
      <text x={end.x + 9} y={end.y} fontSize="7" fill="rgba(251,191,36,0.6)" dominantBaseline="middle">
        GOAL
      </text>
    </svg>
  );
}
