import { headers } from "next/headers";
import { GROUPS } from "@/data/attendees";
import { getResponses, isDurable } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Private tally of who replied. Reachable at /admin?key=YOUR_KEY once
 * ADMIN_KEY is set; without that env var the page stays closed.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const expected = process.env.ADMIN_KEY;

  if (!expected || key !== expected) {
    return (
      <main className="rsvp">
        <div className="shell">
          <div className="section-head">
            <h2 className="serif">Private</h2>
            <p>Add ?key=… to view the guest tally</p>
          </div>
        </div>
      </main>
    );
  }

  const responses = await getResponses();
  const all = GROUPS.flatMap((g) => g.members);

  const headerList = await headers();
  const host = headerList.get("host") ?? "yourdomain.com";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const confirmed = all.filter((m) => responses[m.id]?.status === "confirmed").length;
  const declined = all.filter((m) => responses[m.id]?.status === "declined").length;

  return (
    <main className="rsvp">
      <div className="shell">
        <div className="section-head">
          <h2 className="serif">Guest tally</h2>
          <p>
            {confirmed} attending &middot; {declined} declined &middot;{" "}
            {all.length - confirmed - declined} awaiting reply
          </p>
          {!isDurable && (
            <p style={{ color: "#a3392b" }}>
              No KV store connected &mdash; replies are not being saved durably
            </p>
          )}
        </div>

        {GROUPS.map((group) => (
          <div className="group-card" key={group.id}>
            <div className="group-card__head">
              <p>Group &middot; invite link</p>
              <h3 className="serif">{group.name}</h3>
              <a className="invite-link" href={`/${group.code}`}>
                {origin}/{group.code}
              </a>
            </div>
            {group.members.map((member) => {
              const record = responses[member.id];
              return (
                <div className="member" key={member.id}>
                  <div>
                    <div className="member__name">{member.name}</div>
                    <span className="member__meta">
                      {record
                        ? new Date(record.updatedAt).toLocaleString()
                        : "No reply yet"}
                    </span>
                  </div>
                  <span className="member__meta">
                    {record?.status === "confirmed"
                      ? "✓ Attending"
                      : record?.status === "declined"
                        ? "✕ Declined"
                        : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </main>
  );
}
