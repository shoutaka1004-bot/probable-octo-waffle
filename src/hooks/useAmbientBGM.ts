"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export function useAmbientBGM(speed: number, isEvening: boolean) {
  const [enabled, setEnabled] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const oscsRef = useRef<OscillatorNode[]>([]);
  const speedRef = useRef(speed);
  const eveningRef = useRef(isEvening);

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { eveningRef.current = isEvening; }, [isEvening]);

  useEffect(() => {
    if (!lfoRef.current || !ctxRef.current || !enabled) return;
    const eve = eveningRef.current;
    const rate = eve
      ? 0.07 + Math.min(speed, 3) * 0.03
      : 0.14 + Math.min(speed, 3) * 0.07;
    lfoRef.current.frequency.setTargetAtTime(rate, ctxRef.current.currentTime, 0.8);
  }, [speed, enabled]);

  useEffect(() => {
    if (!filterRef.current || !ctxRef.current || !enabled) return;
    filterRef.current.frequency.setTargetAtTime(
      isEvening ? 420 : 2000,
      ctxRef.current.currentTime,
      1.5
    );
  }, [isEvening, enabled]);

  const start = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx: typeof AudioContext = (window.AudioContext || (window as any).webkitAudioContext);
    const ctx = new AudioCtx();
    ctxRef.current = ctx;

    const eve = eveningRef.current;
    const sp = speedRef.current;

    const base = eve ? 44 : 55;
    const freqs = [base, base * 1.5, base * 2];
    const oscGains = [0.20, 0.10, 0.06];

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = eve ? 420 : 2000;
    filter.Q.value = 0.6;
    filterRef.current = filter;

    const master = ctx.createGain();
    master.gain.value = 0;
    masterRef.current = master;

    const lfoRate = eve ? 0.07 + Math.min(sp, 3) * 0.03 : 0.14 + Math.min(sp, 3) * 0.07;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = lfoRate;
    lfoGain.gain.value = 0.10;
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    lfo.start();
    lfoRef.current = lfo;

    const oscs = freqs.map((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = i === 0 ? 0 : i === 1 ? 4 : -3;
      g.gain.value = oscGains[i];
      osc.connect(g);
      g.connect(filter);
      osc.start();
      return osc;
    });
    oscsRef.current = oscs;

    filter.connect(master);
    master.connect(ctx.destination);
    master.gain.setTargetAtTime(0.4, ctx.currentTime, 1.5);
  }, []);

  const stop = useCallback(() => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
    setTimeout(() => {
      oscsRef.current.forEach((o) => { try { o.stop(); o.disconnect(); } catch {} });
      try { lfoRef.current?.stop(); lfoRef.current?.disconnect(); } catch {}
      try { filterRef.current?.disconnect(); } catch {}
      ctx.close();
      ctxRef.current = null;
      lfoRef.current = null;
      filterRef.current = null;
      masterRef.current = null;
      oscsRef.current = [];
    }, 1800);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      if (prev) { stop(); return false; }
      start(); return true;
    });
  }, [start, stop]);

  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      if (ctx) {
        oscsRef.current.forEach((o) => { try { o.stop(); } catch {} });
        try { lfoRef.current?.stop(); } catch {}
        ctx.close();
      }
    };
  }, []);

  return { enabled, toggle };
}
