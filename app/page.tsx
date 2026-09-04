import Hero from "@/components/Hero";
import NameFinder from "@/components/NameFinder";
import Reveal from "@/components/Reveal";
import { ALLOW_OPEN_SEARCH, EVENT } from "@/data/attendees";

export default function Page() {
  return (
    <main>
      {ALLOW_OPEN_SEARCH ? (
        <Hero />
      ) : (
        <Hero
          ctaLabel="How to reply"
          ctaHint={`Reply by ${EVENT.rsvpDeadline} using your invite link`}
        />
      )}

      <section className="rsvp" id="rsvp">
        <div className="shell">
          <Reveal>
            <div className="section-head">
              <h2 className="serif">Are you joining us?</h2>
              <p>
                {ALLOW_OPEN_SEARCH
                  ? "Search your name below"
                  : "Open your personal invite link"}
              </p>
              <div className="event-facts">
                <span>{EVENT.eventDate}</span>
                <span>{EVENT.eventTime}</span>
                <span>{EVENT.eventVenue}</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            {ALLOW_OPEN_SEARCH ? <NameFinder /> : <LockedNotice />}
          </Reveal>
        </div>
      </section>

      <footer className="footer">
        Kindly reply by {EVENT.rsvpDeadline} &nbsp;&#9825;&nbsp; {EVENT.hostName}
      </footer>
    </main>
  );
}

function LockedNotice() {
  return (
    <div className="notice">
      <p className="notice__lead">
        Your invitation came with its own link.
      </p>
      <p>
        Open that link to see your group and reply for everyone in it. Each group
        has its own, so replies stay with the right people.
      </p>
      <p className="notice__soft">
        Lost it? Message {EVENT.hostName} and they&rsquo;ll send it again.
      </p>
    </div>
  );
}
