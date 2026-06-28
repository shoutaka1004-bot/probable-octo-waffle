"use client";

import { useRef, useEffect } from "react";

interface Props {
  arrowRotation: number;
  timeProgress: number;
  size: number;
}

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

export function AuroraRing({ arrowRotation, timeProgress, size }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef(arrowRotation);
  const progressRef = useRef(timeProgress);
  const rafRef = useRef<number>(0);
  const tickRef = useRef(0);

  useEffect(() => { rotRef.current = arrowRotation; }, [arrowRotation]);
  useEffect(() => { progressRef.current = timeProgress; }, [timeProgress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;
    const ringR = size * 0.463;
    const spread = (38 * Math.PI) / 180;

    const tick = () => {
      tickRef.current++;
      const t = tickRef.current;
      ctx.clearRect(0, 0, size, size);

      const prog = progressRef.current;
      const [r, g, b] = progressToRGB(prog);

      // Slow breathe + urgency flutter when > 80%
      const breathe = 0.72 + 0.28 * Math.sin(t * 0.032);
      const flutter = prog > 0.8 ? 0.12 * Math.sin(t * 0.11) : 0;
      const pulse = Math.min(1, breathe + flutter);

      const rot = rotRef.current;
      const center = ((rot - 90) * Math.PI) / 180;
      const a0 = center - spread;
      const a1 = center + spread;

      // Wide soft halo
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, a0, a1);
      ctx.strokeStyle = `rgba(${r},${g},${b},${pulse * 0.14})`;
      ctx.lineWidth = size * 0.1;
      ctx.lineCap = "round";
      ctx.stroke();

      // Mid glow
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, a0, a1);
      ctx.strokeStyle = `rgba(${r},${g},${b},${pulse * 0.28})`;
      ctx.lineWidth = size * 0.058;
      ctx.lineCap = "round";
      ctx.stroke();

      // Inner glow
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, a0, a1);
      ctx.strokeStyle = `rgba(${r},${g},${b},${pulse * 0.52})`;
      ctx.lineWidth = size * 0.024;
      ctx.lineCap = "round";
      ctx.stroke();

      // Bright core line
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, a0, a1);
      ctx.strokeStyle = `rgba(${Math.min(255, r + 55)},${Math.min(255, g + 55)},${Math.min(255, b + 55)},${pulse * 0.88})`;
      ctx.lineWidth = size * 0.0065;
      ctx.lineCap = "round";
      ctx.stroke();

      // Tip sparkle at center of arc
      const tx = cx + Math.cos(center) * ringR;
      const ty = cy + Math.sin(center) * ringR;
      const gr = ctx.createRadialGradient(tx, ty, 0, tx, ty, size * 0.06);
      gr.addColorStop(0, `rgba(255,255,255,${pulse * 0.95})`);
      gr.addColorStop(0.35, `rgba(${r},${g},${b},${pulse * 0.75})`);
      gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.arc(tx, ty, size * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = gr;
      ctx.fill();

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 2 }}
    />
  );
}
