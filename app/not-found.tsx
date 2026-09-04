import { EVENT } from "@/data/attendees";

export default function NotFound() {
  return (
    <main className="rsvp" style={{ minHeight: "100svh", display: "grid", placeItems: "center" }}>
      <div className="shell">
        <div className="section-head">
          <h2 className="serif">We don&rsquo;t recognise that link</h2>
          <p>Check the address, or ask for a fresh one</p>
        </div>
        <div className="notice">
          <p className="notice__lead">
            Invite links look like <code>yourdomain.com/abcd1234</code>.
          </p>
          <p>
            If yours was copied by hand, a character may have gone missing. Message{" "}
            {EVENT.hostName} and they&rsquo;ll resend it.
          </p>
        </div>
      </div>
    </main>
  );
}
