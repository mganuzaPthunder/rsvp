"use client";

import type { CSSProperties } from "react";

type Flight = {
  /** vertical start on the two-column layout, as a % of the hero */
  top: number;
  /** vertical start once the hero stacks — the photo moves, so faces do too */
  topStacked: number;
  /** seconds for one crossing */
  duration: number;
  delay: number;
  scale: number;
  /** wing flap period in seconds */
  flap: number;
  /** iridescent wing stops: inner, middle, outer */
  hues: [string, string, string];
  glow: string;
};

/*
 * Fixed values rather than Math.random(), so server and client markup match.
 *
 * Two sets of heights, because the photo sits differently in each layout.
 * Side by side it fills the left column and faces land around 25-58% of the
 * hero. Stacked, the hero IS the photo: faces occupy the top third and the
 * inset prints the right side, so the lanes run through the dress and
 * flowers lower down, where the bottom scrim also softens them. A fairy
 * crossing a face reads as a smudge, not a sparkle.
 */
const FLIGHTS: Flight[] = [
  {
    top: 6, topStacked: 44, duration: 27, delay: 0, scale: 1, flap: 0.3,
    hues: ["#fff6f2", "#f0cfe4", "#c98d7c"], glow: "rgba(233, 180, 200, 0.75)",
  },
  {
    top: 14, topStacked: 52, duration: 39, delay: -13, scale: 0.62, flap: 0.36,
    hues: ["#fffdfb", "#e4d3f0", "#a9776a"], glow: "rgba(206, 178, 226, 0.7)",
  },
  {
    top: 72, topStacked: 63, duration: 32, delay: -21, scale: 1.1, flap: 0.26,
    hues: ["#fff8f4", "#f6d5d0", "#d8a08e"], glow: "rgba(240, 190, 178, 0.75)",
  },
  {
    top: 87, topStacked: 72, duration: 45, delay: -34, scale: 0.72, flap: 0.4,
    hues: ["#fffdfb", "#ecd9ea", "#b8836f"], glow: "rgba(226, 190, 214, 0.7)",
  },
];

/** How long one mote of glitter stays visible, in seconds. */
const TRAIL_LIFE = 2.4;
/** Motes per butterfly. Enough to read as a stream, few enough to stay cheap. */
const TRAIL_COUNT = 7;

export default function Butterflies() {
  return (
    <div className="butterfly-layer" aria-hidden="true">
      {FLIGHTS.map((flight, index) => {
        /*
         * Glitter has to hang in the air while the butterfly flies on, but
         * these motes are its children and travel with it. Drifting them
         * backwards at exactly the crossing speed cancels that out, so they
         * appear to stay put and fall as it leaves them behind.
         *
         * The wrapper covers 124vw in `duration` seconds, so one mote's life
         * is worth this much of the screen.
         */
        const trail = ((124 / flight.duration) * TRAIL_LIFE).toFixed(2);

        return (
          <div
            key={index}
            className="butterfly"
            style={
              {
                "--fly-top": `${flight.top}%`,
                "--fly-top-stacked": `${flight.topStacked}%`,
                "--trail-x": `${trail}vw`,
                animationDuration: `${flight.duration}s`,
                animationDelay: `${flight.delay}s`,
              } as CSSProperties
            }
          >
            {Array.from({ length: TRAIL_COUNT }, (_, i) => (
              <span
                key={i}
                className="glitter"
                style={
                  {
                    "--delay": `${(TRAIL_LIFE / TRAIL_COUNT) * i}s`,
                    "--fall": `${16 + (i % 4) * 11}px`,
                    "--mote": `${5 + (i % 3) * 2}px`,
                  } as CSSProperties
                }
              />
            ))}

            <div
              className="butterfly__bob"
              style={{ animationDuration: `${3.2 + index * 0.5}s` }}
            >
              <Fairy id={index} {...flight} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * A fairy-wing butterfly: long trailing upper wings, small lower wings, an
 * iridescent gradient, a soft glow and a few sparkles that twinkle out of
 * phase with each other.
 */
function Fairy({
  id,
  hues,
  glow,
  flap,
  scale,
}: {
  id: number;
  hues: [string, string, string];
  glow: string;
  flap: number;
  scale: number;
}) {
  const wing = { animationDuration: `${flap}s` } as CSSProperties;
  const gradient = `fairy-wing-${id}`;
  const shimmer = `fairy-shimmer-${id}`;

  return (
    <svg
      viewBox="0 0 60 52"
      width={58 * scale}
      height={50 * scale}
      style={{ overflow: "visible", filter: `drop-shadow(0 0 7px ${glow})` }}
    >
      <defs>
        <linearGradient id={gradient} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor={hues[0]} stopOpacity="0.95" />
          <stop offset="55%" stopColor={hues[1]} stopOpacity="0.8" />
          <stop offset="100%" stopColor={hues[2]} stopOpacity="0.6" />
        </linearGradient>
        <radialGradient id={shimmer} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0%" stopColor="#fffdfb" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fffdfb" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="wing wing--left" style={wing}>
        {/* tall upper wing with a rounded tip, then a fuller lower lobe */}
        <path
          d="M29 26 C 24 14, 12 2, 3 5 C -3 9, 5 21, 29 26 Z"
          fill={`url(#${gradient})`}
          stroke={hues[2]}
          strokeWidth="0.4"
          strokeOpacity="0.35"
        />
        <path
          d="M29 27 C 20 30, 13 36, 15 43 C 17 49, 26 44, 29 28 Z"
          fill={`url(#${gradient})`}
          stroke={hues[2]}
          strokeWidth="0.35"
          strokeOpacity="0.28"
          opacity="0.85"
        />
        <ellipse cx="14" cy="13" rx="7" ry="4.5" fill={`url(#${shimmer})`} />
      </g>

      <g className="wing" style={wing}>
        <path
          d="M31 26 C 36 14, 48 2, 57 5 C 63 9, 55 21, 31 26 Z"
          fill={`url(#${gradient})`}
          stroke={hues[2]}
          strokeWidth="0.4"
          strokeOpacity="0.35"
        />
        <path
          d="M31 27 C 40 30, 47 36, 45 43 C 43 49, 34 44, 31 28 Z"
          fill={`url(#${gradient})`}
          stroke={hues[2]}
          strokeWidth="0.35"
          strokeOpacity="0.28"
          opacity="0.85"
        />
        <ellipse cx="46" cy="13" rx="7" ry="4.5" fill={`url(#${shimmer})`} />
      </g>

      {/* body + antennae */}
      <ellipse cx="30" cy="27" rx="1.4" ry="7.5" fill={hues[2]} opacity="0.85" />
      <circle cx="30" cy="19" r="1.7" fill={hues[2]} opacity="0.9" />
      <path
        d="M30 18 C 28 14, 26 12, 24 10 M30 18 C 32 14, 34 12, 36 10"
        stroke={hues[2]}
        strokeWidth="0.6"
        strokeOpacity="0.7"
        fill="none"
        strokeLinecap="round"
      />

      {/* a couple of motes still clinging to the wings */}
      <g fill="#fffdfb">
        <circle className="sparkle" cx="30" cy="9" r="1" style={{ animationDelay: "0.3s" }} />
        <circle className="sparkle" cx="20" cy="42" r="0.9" style={{ animationDelay: "1.2s" }} />
      </g>
    </svg>
  );
}
