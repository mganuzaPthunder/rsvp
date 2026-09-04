import type { Metadata } from "next";
import { notFound } from "next/navigation";

import GroupRsvp from "@/components/GroupRsvp";
import Hero from "@/components/Hero";
import Reveal from "@/components/Reveal";
import { EVENT, groupByCode } from "@/data/attendees";
import { getRequests, getResponses, getUnlocks } from "@/lib/store";
import { buildGroupView } from "@/lib/views";

export const dynamic = "force-dynamic";

/** Invite links are private — keep them out of search results. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { code } = await params;
  const { q } = await searchParams;

  const group = groupByCode(code);
  if (!group) notFound();

  const [responses, unlocks, requests] = await Promise.all([
    getResponses(),
    getUnlocks(),
    getRequests(),
  ]);
  const view = buildGroupView(group, { responses, unlocks, requests });

  return (
    <main>
      <Hero />

      <section className="rsvp" id="rsvp">
        <div className="shell">
          <Reveal>
            <div className="section-head">
              <h2 className="serif">Are you joining us?</h2>
              <p>{group.name}</p>
              <div className="event-facts">
                <span>{EVENT.eventDate}</span>
                <span>{EVENT.eventTime}</span>
                <span>{EVENT.eventVenue}</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <GroupRsvp
              code={group.code}
              initialGroup={view}
              initialQuery={typeof q === "string" ? q : ""}
            />
          </Reveal>
        </div>
      </section>

      <footer className="footer">
        Kindly reply by {EVENT.rsvpDeadline} &nbsp;&#9825;&nbsp; {EVENT.hostName}
      </footer>
    </main>
  );
}
