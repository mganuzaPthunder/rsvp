"use client";

import { useEffect, useRef } from "react";

type Petal = {
  x: number;
  y: number;
  size: number;
  speed: number;
  sway: number;
  swaySpeed: number;
  phase: number;
  spin: number;
  angle: number;
  alpha: number;
  hue: number;
};

const COLORS = ["243, 220, 216", "237, 207, 200", "255, 253, 251", "232, 199, 190"];

/** Drifting petal fall, drawn on a canvas so 40 of them stay cheap. */
export default function Petals({ count = 38 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let petals: Petal[] = [];
    let frame = 0;

    const spawn = (initial: boolean): Petal => ({
      x: Math.random() * width,
      y: initial ? Math.random() * height : -30,
      size: 5 + Math.random() * 9,
      speed: 0.25 + Math.random() * 0.7,
      sway: 12 + Math.random() * 34,
      swaySpeed: 0.004 + Math.random() * 0.01,
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.02,
      angle: Math.random() * Math.PI,
      alpha: 0.26 + Math.random() * 0.4,
      hue: Math.floor(Math.random() * COLORS.length),
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      petals = Array.from({ length: count }, () => spawn(true));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of petals) {
        p.y += p.speed;
        p.phase += p.swaySpeed;
        p.angle += p.spin;
        const x = p.x + Math.sin(p.phase) * p.sway;

        ctx.save();
        ctx.translate(x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = `rgb(${COLORS[p.hue]})`;
        ctx.beginPath();
        // A petal reads better as a lopsided teardrop than a plain ellipse.
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p.y > height + 40) Object.assign(p, spawn(false));
      }

      frame = requestAnimationFrame(draw);
    };

    resize();
    frame = requestAnimationFrame(draw);

    // Observe the parent, never the canvas: writing canvas.width would
    // retrigger the observer on itself.
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [count]);

  return <canvas ref={canvasRef} className="petal-canvas" aria-hidden="true" />;
}
