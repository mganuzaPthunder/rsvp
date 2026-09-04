import Image from "next/image";
import { EVENT } from "@/data/attendees";
import Butterflies from "./Butterflies";
import Petals from "./Petals";

/**
 * Debut banner.
 *
 * public/hero.jpg already carries "same girl, brighter days", the script line
 * and "more good times ahead" — everything except the RSVP block, which is set
 * in live type here and dropped into the gap at the top right.
 *
 * Stacked (below 900px): the whole photo, uncropped, with the wordmark over
 * its top right and the crest, details and button overlapping its lower edge
 * behind a soft scrim. Two columns from 900px: photo left, invitation right.
 */
export default function Hero({
  ctaLabel = "Find your name",
  ctaHint,
}: {
  ctaLabel?: string;
  /** Defaults to pointing at the form; override when there isn't one. */
  ctaHint?: string;
} = {}) {
  return (
    <header className="hero">
      <div className="hero__backdrop" aria-hidden="true" />
      <div className="hero__wash" aria-hidden="true" />

      <Petals />
      <Butterflies />

      <div className="hero__grid">
        <div className="hero__portrait">
          <span className="hero__frame">
            <Image
              className="hero__image"
              src="/hero.jpg"
              alt={`${EVENT.celebrant} in a blush tulle gown — same girl, brighter days; good people, brighter memories`}
              width={1024}
              height={1536}
              sizes="(max-width: 899px) 100vw, 46vw"
              priority
            />
          </span>
        </div>

        <div className="invite">
          <div className="invite__wordmark">
            <h1 className="invite__title serif">
              {EVENT.title.split("").map((letter, i) => (
                <span
                  key={i}
                  className="invite__letter"
                  style={{ animationDelay: `${0.25 + i * 0.11}s` }}
                >
                  {/* The S turns over on its own, long after the entry
                      settles. Nested so the two animations don't both try to
                      own this element's transform. */}
                  {letter === "S" ? (
                    <span className="invite__flip">{letter}</span>
                  ) : (
                    letter
                  )}
                </span>
              ))}
            </h1>
            <p className="invite__subtitle tracked">{EVENT.subtitle}</p>
          </div>

          <div className="invite__crest">
            <span className="invite__occasion">
              <span className="script">{EVENT.celebrant}&rsquo;s</span>
              <span className="tracked">{EVENT.occasion}</span>
            </span>
          </div>

          <dl className="invite__facts">
            <div>
              <dt className="tracked">When</dt>
              <dd>
                {EVENT.eventShortDate}
                <span aria-hidden="true"> · </span>
                {EVENT.eventTime}
              </dd>
            </div>
            <div>
              <dt className="tracked">Where</dt>
              <dd>{EVENT.eventVenue}</dd>
            </div>
          </dl>

          <div className="invite__cta">
            <a className="cta-button" href="#rsvp">
              {ctaLabel}
              <span aria-hidden="true">&#8595;</span>
            </a>
            <span className="cta-hint">
              {ctaHint ??
                `The RSVP form is just below — reply by ${EVENT.rsvpDeadline}`}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
