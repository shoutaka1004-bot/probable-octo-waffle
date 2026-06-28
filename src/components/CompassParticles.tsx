"use client";

import { useRef, useEffect } from "react";
import { ThemeConfig } from "@/lib/theme";

interface Particle {
  angle: number;
  baseRadius: number;
  vAngle: number;
  pSize: number;
  phase: number;
}

interface Props {
  arrowRotation: number;
  speed: number;
  size: number;
  theme?: ThemeConfig;
}

export function CompassParticles({ arrowRotation, speed, size, theme }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arrowRef = useRef(arrowRotation);
  const speedRef = useRef(speed);
  const colorRef = useRef<[number, number, number]>(theme?.particleColor ?? [251, 191, 36]);
  const rafRef = useRef<number>(0);

  useEffect(() => { arrowRef.current = arrowRotation; }, [arrowRotation]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { colorRef.current = theme?.particleColor ?? [251, 191, 36]; }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const N = 22;
    const cx = size / 2;
    const cy = size / 2;
    const baseR = size * 0.49;

    const particles: Particle[] = Array.from({ length: N }, (_, i) => ({
      angle: (i / N) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
      baseRadius: baseR + (Math.random() - 0.5) * size * 0.09,
      vAngle: (0.003 + Math.random() * 0.005) * (i % 2 === 0 ? 1 : -1),
      pSize: 1.4 + Math.random() * 1.9,
      phase: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    const tick = () => {
      t++;
      ctx.clearRect(0, 0, size, size);

      const arrowRad = (arrowRef.current * Math.PI) / 180;
      const sp = Math.min(1, (speedRef.current || 0) / 1.5);
      const boost = 1 + sp * 2.5;
      const [r, g, b] = colorRef.current;

      for (const p of particles) {
        p.angle += p.vAngle * boost;
        const wave = Math.sin(t * 0.018 + p.phase) * size * 0.026;

        let diff = p.angle - arrowRad;
        diff = ((diff % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        const prox = 1 - diff / Math.PI;

        const suck = prox * prox * size * 0.14;
        const radius = Math.max(size * 0.14, p.baseRadius + wave - suck);

        const x = cx + Math.cos(p.angle) * radius;
        const y = cy + Math.sin(p.angle) * radius;

        const alpha = 0.06 + prox * 0.58;
        const glowR = p.pSize * (3.5 + prox * 2);

        const grad = ctx.createRadialGradient(x, y, 0, x, y, glowR);
        grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, p.pSize * (0.9 + prox * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${Math.min(255, r + 20)},${Math.min(255, g + 20)},${Math.min(255, b + 20)},${Math.min(1, alpha * 2.8)})`;
        ctx.fill();
      }

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
    />
  );
}
