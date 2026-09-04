import { headers } from "next/headers";
import AdminUnlock from "@/components/AdminUnlock";
import { GROUPS, MEMBER_INDEX } from "@/data/attendees";
import {
  getLog,
  getRequests,
  getResponses,
  getUnlocks,
  isDurable,
} from "@/lib/store";

export const dynamic = "force-dynamic";

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/**
 * Private tally. Reachable at /admin?key=YOUR_KEY once ADMIN_KEY is set;
 * without that env var the page stays closed.
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

  const [responses, unlocks, requests, log] = await Promise.all([
    getResponses(),
    getUnlocks(),
    getRequests(),
    getLog(200),
  ]);

  const all = MEMBER_INDEX;
  const confirmed = all.filter((m) => responses[m.id]?.status === "confirmed");
  const declined = all.filter((m) => responses[m.id]?.status === "declined");
  const pending = Object.entries(requests);

  const headerList = await headers();
  const host = headerList.get("host") ?? "yourdomain.com";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;

  return (
    <main className="rsvp">
      <div className="shell">
        <div className="section-head">
          <h2 className="serif">Guest tally</h2>
          <p>
            {confirmed.length} attending &middot; {declined.length} declined
            &middot; {all.length - confirmed.length - declined.length} awaiting
            reply
          </p>
        </div>

        {!isDurable && (
          <div className="admin-flag">
            <strong>No store connected.</strong> Replies are being kept in
            memory on a single serverless instance and will disappear when it
            recycles. Connect Upstash for Redis in the Vercel dashboard
            (Storage &rarr; Connect) before sending the links out — nothing
            below is a durable record until you do.
          </div>
        )}

        <div className="admin-bar">
          <a
            className="admin-button admin-button--solid"
            href={`/api/admin/export?key=${encodeURIComponent(expected)}`}
          >
            Download CSV
          </a>
        </div>

        {/* --- guests waiting on an unlock --- */}
        <div className="group-card">
          <div className="group-card__head">
            <p>Change requests</p>
            <h3 className="serif">
              {pending.length === 0
                ? "Nothing waiting"
                : `${pending.length} waiting`}
            </h3>
          </div>
          {pending.length === 0 ? (
            <p className="admin-empty">
              When a guest asks to change a reply they&rsquo;ve already sent, it
              appears here to unlock.
            </p>
          ) : (
            pending.map(([memberId, request]) => {
              const group = GROUPS.find((g) => g.id === request.groupId);
              return (
                <div className="member" key={memberId}>
                  <div>
                    <div className="member__name">{request.name}</div>
                    <span className="member__meta">
                      {group?.name} &middot; asked {when(request.requestedAt)}
                    </span>
                  </div>
                  <div className="locked-actions">
                    <AdminUnlock
                      adminKey={expected}
                      memberId={memberId}
                      action="unlock"
                      label="Unlock"
                      solid
                    />
                    <AdminUnlock
                      adminKey={expected}
                      memberId={memberId}
                      action="dismiss"
                      label="Dismiss"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* --- every submission, newest first --- */}
        <div className="group-card">
          <div className="group-card__head">
            <p>Submission record</p>
            <h3 className="serif">
              {log.length === 0 ? "No replies yet" : `${log.length} entries`}
            </h3>
          </div>
          {log.length === 0 ? (
            <p className="admin-empty">
              Every reply and every change lands here, newest first.
            </p>
          ) : (
            log.map((entry, i) => (
              <div className="log-entry" key={`${entry.memberId}-${entry.at}-${i}`}>
                <span>
                  <strong>{entry.name}</strong>{" "}
                  {entry.status === "confirmed" ? "is attending" : "declined"}
                  {"  "}
                  <span className="member__meta">
                    {GROUPS.find((g) => g.id === entry.groupId)?.name}
                  </span>
                </span>
                <span className="locked-actions">
                  <span
                    className={`log-entry__tag${
                      entry.kind === "update" ? " log-entry__tag--update" : ""
                    }`}
                  >
                    {entry.kind === "update" ? "changed" : "first reply"}
                  </span>
                  <span className="log-entry__when">{when(entry.at)}</span>
                </span>
              </div>
            ))
          )}
        </div>

        {/* --- roster, by group --- */}
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
              const unlocked = Boolean(unlocks[member.id]);
              return (
                <div className="member" key={member.id}>
                  <div>
                    <div className="member__name">{member.name}</div>
                    <span className="member__meta">
                      {record
                        ? `${when(record.updatedAt)}${
                            (record.revision ?? 1) > 1
                              ? ` · changed ${record.revision! - 1}x`
                              : ""
                          }`
                        : "No reply yet"}
                    </span>
                  </div>
                  <div className="locked-actions">
                    <span className="member__meta">
                      {record?.status === "confirmed"
                        ? "✓ Attending"
                        : record?.status === "declined"
                          ? "✕ Declined"
                          : "—"}
                    </span>
                    {record &&
                      (unlocked ? (
                        <AdminUnlock
                          adminKey={expected}
                          memberId={member.id}
                          action="relock"
                          label="Re-lock"
                        />
                      ) : (
                        <AdminUnlock
                          adminKey={expected}
                          memberId={member.id}
                          action="unlock"
                          label="Unlock"
                        />
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </main>
  );
}
