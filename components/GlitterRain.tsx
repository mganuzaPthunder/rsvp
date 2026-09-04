"use client";

import { useEffect, useRef } from "react";

type Mote = {
  x: number;
  y: number;
  radius: number;
  speed: number;
  sway: number;
  swaySpeed: number;
  swayPhase: number;
  /** Twinkle cycle, so each mote brightens and dims on its own clock. */
  twinklePhase: number;
  twinkleSpeed: number;
  baseAlpha: number;
  sprite: number;
  /** The brightest few get a cross flare on top of the glow. */
  flare: boolean;
};

/*
 * Warm off-whites and the palest blush. Deeper rose-gold reads as dark specks
 * against a cream page rather than as light; the visibility comes from the
 * white core and the halo, not from saturating the colour.
 */
const HUES = [
  "253, 244, 238",
  "249, 231, 222",
  "244, 216, 205",
  "248, 228, 236",
];

const SPRITE_PX = 64;

/** Pre-rendered once per hue: a radial gradient per mote per frame is slow. */
function buildSprite(rgb: string): HTMLCanvasElement {
  const sprite = document.createElement("canvas");
  sprite.width = SPRITE_PX;
  sprite.height = SPRITE_PX;

  const ctx = sprite.getContext("2d");
  if (!ctx) return sprite;

  const mid = SPRITE_PX / 2;
  const gradient = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  gradient.addColorStop(0.2, `rgba(${rgb}, 0.7)`);
  gradient.addColorStop(0.55, `rgba(${rgb}, 0.22)`);
  gradient.addColorStop(1, `rgba(${rgb}, 0)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SPRITE_PX, SPRITE_PX);
  return sprite;
}

/**
 * One mote per this many square pixels. A fixed count would read as a light
 * scatter on a desktop and a blizzard on a phone, whose canvas is roughly a
 * quarter of the area.
 */
const PX2_PER_MOTE = 12000;
const MIN_MOTES = 26;
const MAX_MOTES = 150;

/** Drifting glitter, drawn on a canvas so a hundred of them stay cheap. */
export default function GlitterRain({ count }: { count?: number } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sprites = HUES.map(buildSprite);

    let width = 0;
    let height = 0;
    let motes: Mote[] = [];
    let frame = 0;

    const spawn = (initial: boolean): Mote => ({
      x: Math.random() * width,
      y: initial ? Math.random() * height : -20,
      radius: 1.5 + Math.random() * 3.2,
      speed: 0.18 + Math.random() * 0.62,
      sway: 8 + Math.random() * 30,
      swaySpeed: 0.004 + Math.random() * 0.011,
      swayPhase: Math.random() * Math.PI * 2,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.02 + Math.random() * 0.055,
      baseAlpha: 0.22 + Math.random() * 0.34,
      sprite: Math.floor(Math.random() * sprites.length),
      flare: Math.random() < 0.1,
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target =
        count ??
        Math.round(
          Math.min(MAX_MOTES, Math.max(MIN_MOTES, (width * height) / PX2_PER_MOTE))
        );
      motes = Array.from({ length: target }, () => spawn(true));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const m of motes) {
        m.y += m.speed;
        m.swayPhase += m.swaySpeed;
        m.twinklePhase += m.twinkleSpeed;

        const x = m.x + Math.sin(m.swayPhase) * m.sway;
        // Never fully out: a mote blinking to zero reads as a dropped frame.
        const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(m.twinklePhase));
        const alpha = m.baseAlpha * twinkle;
        const glow = m.radius * 4;

        ctx.globalAlpha = alpha;
        ctx.drawImage(sprites[m.sprite], x - glow, m.y - glow, glow * 2, glow * 2);

        if (m.flare) {
          const reach = m.radius * 3 * twinkle;
          ctx.globalAlpha = alpha * 0.3;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(x - reach, m.y);
          ctx.lineTo(x + reach, m.y);
          ctx.moveTo(x, m.y - reach);
          ctx.lineTo(x, m.y + reach);
          ctx.stroke();
        }

        if (m.y > height + 30) Object.assign(m, spawn(false));
      }

      ctx.globalAlpha = 1;
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

  return <canvas ref={canvasRef} className="glitter-rain" aria-hidden="true" />;
}
