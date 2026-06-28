"use client";

import { useRef, useEffect } from "react";

function progressToRGB(p: number): [number, number, number] {
  if (p < 0.5) {
    const t = p / 0.5;
    return [Math.round(t * 34), Math.round(190 + t * 21), Math.round(255 - t * 17)];
  }
  if (p < 0.8) {
    const t = (p - 0.5) / 0.3;
    return [Math.round(34 + t * 217), Math.round(211 - t * 71), Math.round(238 - t * 238)];
  }
  const t = Math.min(1, (p - 0.8) / 0.2);
  return [255, Math.round(140 - t * 140), Math.round(t * 80)];
}

interface Props {
  rotation: number;
  timeProgress: number;
  timeLimitSeconds: number | null;
  baseColor?: [number, number, number];
  size?: number;
}

export function SwingArrow({
  rotation,
  timeProgress,
  timeLimitSeconds,
  baseColor = [34, 211, 238],
  size = 240,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef(rotation);
  const progressRef = useRef(timeProgress);
  const rafRef = useRef<number>(0);
  const tickRef = useRef(0);

  useEffect(() => { rotRef.current = rotation; }, [rotation]);
  useEffect(() => { progressRef.current = timeProgress; }, [timeProgress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;

    // Arrow shape constants
    const totalH  = size * 0.38;   // center → tip distance
    const tailH   = size * 0.12;   // center → tail end distance
    const headH   = size * 0.17;   // arrowhead height
    const headHW  = size * 0.115;  // arrowhead half-width
    const shaftHW = size * 0.028;  // shaft half-width
    const shoulder = size * 0.016; // shoulder rounding offset

    const drawPath = () => {
      ctx.beginPath();
      ctx.moveTo(0, -totalH);                            // tip
      ctx.lineTo(headHW, -totalH + headH);               // right head corner
      ctx.lineTo(shaftHW, -totalH + headH + shoulder);   // right shoulder
      ctx.lineTo(shaftHW, tailH);                        // bottom right
      ctx.lineTo(-shaftHW, tailH);                       // bottom left
      ctx.lineTo(-shaftHW, -totalH + headH + shoulder);  // left shoulder
      ctx.lineTo(-headHW, -totalH + headH);              // left head corner
      ctx.closePath();
    };

    const tick = () => {
      tickRef.current++;
      const t = tickRef.current;
      ctx.clearRect(0, 0, size, size);

      const prog = progressRef.current;
      const [r, g, b] = timeLimitSeconds !== null ? progressToRGB(prog) : baseColor;

      // Swing ±20°, ~3.7s period at 60fps (2π / 0.028 ≈ 224 frames)
      const swingDeg = Math.sin(t * 0.028) * 20;
      // Urgency flutter when > 80%
      const flutterDeg =
        timeLimitSeconds !== null && prog > 0.8
          ? Math.sin(t * 0.11) * 4
          : 0;
      const totalDeg = rotRef.current + swingDeg + flutterDeg;

      // Breathe glow
      const breathe = 0.72 + 0.28 * Math.sin(t * 0.025);
      const urgBoost =
        timeLimitSeconds !== null && prog > 0.8
          ? 0.18 * Math.abs(Math.sin(t * 0.085))
          : 0;
      const glowA = Math.min(1, breathe + urgBoost);

      // CSS rotation 0 = pointing up; canvas 0 = pointing right → subtract 90°
      const rad = ((totalDeg - 90) * Math.PI) / 180;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rad);

      // Layer 1: wide halo (2.5× scaled, very low alpha)
      ctx.save();
      ctx.scale(2.5, 2.5);
      drawPath();
      ctx.fillStyle = `rgba(${r},${g},${b},${glowA * 0.05})`;
      ctx.fill();
      ctx.restore();

      // Layer 2: outer glow via shadowBlur
      ctx.save();
      ctx.shadowColor = `rgba(${r},${g},${b},${glowA * 0.85})`;
      ctx.shadowBlur = size * 0.12;
      drawPath();
      ctx.fillStyle = `rgba(${r},${g},${b},${glowA * 0.28})`;
      ctx.fill();
      ctx.restore();

      // Layer 3: mid glow
      ctx.save();
      ctx.shadowColor = `rgba(${r},${g},${b},${glowA * 0.7})`;
      ctx.shadowBlur = size * 0.045;
      drawPath();
      ctx.fillStyle = `rgba(${r},${g},${b},${glowA * 0.55})`;
      ctx.fill();
      ctx.restore();

      // Layer 4: bright core
      const cr = Math.min(255, r + 45);
      const cg = Math.min(255, g + 45);
      const cb = Math.min(255, b + 45);
      ctx.save();
      ctx.shadowColor = `rgba(255,255,255,0.35)`;
      ctx.shadowBlur = size * 0.012;
      drawPath();
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${glowA * 0.9})`;
      ctx.fill();
      ctx.restore();

      // Tip sparkle
      const tipGr = ctx.createRadialGradient(0, -totalH, 0, 0, -totalH, size * 0.07);
      tipGr.addColorStop(0, `rgba(255,255,255,${glowA * 0.92})`);
      tipGr.addColorStop(0.35, `rgba(${r},${g},${b},${glowA * 0.8})`);
      tipGr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.arc(0, -totalH, size * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = tipGr;
      ctx.fill();

      ctx.restore();
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [size, timeLimitSeconds, baseColor]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="pointer-events-none"
    />
  );
}
