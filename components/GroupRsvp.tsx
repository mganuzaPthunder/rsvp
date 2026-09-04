"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { normalize } from "@/lib/search";

type Status = "confirmed" | "declined";

type MemberView = {
  id: string;
  name: string;
  status: Status | null;
  updatedAt: string | null;
  locked: boolean;
  unlocked: boolean;
  requested: boolean;
};

type GroupView = { id: string; name: string; members: MemberView[] };

const STATUS_LABEL: Record<Status, string> = {
  confirmed: "Attending",
  declined: "Can't make it",
};

export default function GroupRsvp({
  code,
  initialGroup,
  initialQuery = "",
}: {
  code: string;
  initialGroup: GroupView;
  initialQuery?: string;
}) {
  const [group, setGroup] = useState(initialGroup);
  const [query, setQuery] = useState(initialQuery);
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null
  );

  const [choices, setChoices] = useState<Record<string, Status>>(() => {
    const seed: Record<string, Status> = {};
    for (const member of initialGroup.members) {
      if (member.status) seed[member.id] = member.status;
    }
    return seed;
  });

  const requestUnlock = useCallback(
    async (member: MemberView) => {
      setRequesting(member.id);
      try {
        const res = await fetch("/api/rsvp/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, memberId: member.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Could not send the request.");
        setGroup(data.group);
        setMessage({
          tone: "ok",
          text: `Asked the host to unlock ${member.name}'s reply.`,
        });
      } catch (error) {
        setMessage({
          tone: "error",
          text: error instanceof Error ? error.message : "Request failed.",
        });
      } finally {
        setRequesting(null);
      }
    },
    [code]
  );

  /** Statuses currently stored on the server, for dirty-checking. */
  const saved = useMemo(() => {
    const map: Record<string, Status | null> = {};
    group.members.forEach((m) => (map[m.id] = m.status));
    return map;
  }, [group]);

  const visible = useMemo(() => {
    const q = normalize(query);
    if (q.length < 2) return group.members;
    const hits = group.members.filter((m) => normalize(m.name).includes(q));
    // Never strand the guest on an empty list — a typo shows everyone instead.
    return hits.length > 0 ? hits : group.members;
  }, [group.members, query]);

  const filtered = visible.length < group.members.length;

  // A ?q= link should land on the form, not the top of the banner. Deferred a
  // frame so the browser has finished its own scroll restoration first.
  useEffect(() => {
    if (!initialQuery) return;
    const id = requestAnimationFrame(() =>
      document.getElementById("rsvp")?.scrollIntoView({ behavior: "smooth" })
    );
    return () => cancelAnimationFrame(id);
  }, [initialQuery]);

  const dirty = group.members.some(
    (m) => !m.locked && choices[m.id] && choices[m.id] !== saved[m.id]
  );
  const answered = group.members.filter((m) => m.status).length;
  const openCount = group.members.filter((m) => !m.locked).length;

  const submit = useCallback(async () => {
    const updates = group.members
      .filter((m) => !m.locked && choices[m.id] && choices[m.id] !== saved[m.id])
      .map((m) => ({ id: m.id, status: choices[m.id] }));

    if (updates.length === 0) {
      setMessage({
        tone: "error",
        text: "Nothing to send — choose an answer for someone who hasn't replied yet.",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Save failed.");

      setGroup(data.group);
      setMessage({
        tone: "ok",
        text: `Thank you! ${updates.length} ${
          updates.length === 1 ? "reply" : "replies"
        } saved.`,
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Save failed.",
      });
    } finally {
      setSaving(false);
    }
  }, [group.members, choices, saved, code]);

  return (
    <div className="search">
      <div className="search__field">
        <SearchIcon />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find your name in the list…"
          aria-label="Filter your group by name"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <p className="search__note" role="status">
        {filtered ? (
          <>
            Showing {visible.length} of {group.members.length} &middot;{" "}
            <button type="button" className="linkish" onClick={() => setQuery("")}>
              show everyone
            </button>
          </>
        ) : (
          `Reply for yourself, or for everyone in ${group.name}.`
        )}
      </p>

      <div className="group-card">
        <div className="group-card__head">
          <p>You&rsquo;re with</p>
          <h3 className="serif">{group.name}</h3>
        </div>

        {visible.map((member, index) => (
          <div
            className={`member${member.locked ? " member--locked" : ""}`}
            key={member.id}
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div>
              <div className="member__name">{member.name}</div>
              <span className="member__meta">
                {member.status
                  ? `Replied · ${STATUS_LABEL[member.status]}`
                  : "No reply yet"}
                {member.unlocked && " · unlocked to change"}
              </span>
            </div>

            {member.locked ? (
              <div className="locked-actions">
                <span className="locked-badge" title="Already submitted">
                  <LockIcon />
                  Locked
                </span>
                {member.requested ? (
                  <span className="locked-note">Change requested</span>
                ) : (
                  <button
                    type="button"
                    className="choice choice--ghost"
                    onClick={() => requestUnlock(member)}
                    disabled={requesting === member.id}
                  >
                    {requesting === member.id ? "Sending…" : "Request a change"}
                  </button>
                )}
              </div>
            ) : (
              <div
                className="choices"
                role="group"
                aria-label={`RSVP for ${member.name}`}
              >
                <button
                  type="button"
                  className="choice choice--yes"
                  aria-pressed={choices[member.id] === "confirmed"}
                  onClick={() =>
                    setChoices((c) => ({ ...c, [member.id]: "confirmed" }))
                  }
                >
                  Confirm
                </button>
                <button
                  type="button"
                  className="choice choice--no"
                  aria-pressed={choices[member.id] === "declined"}
                  onClick={() =>
                    setChoices((c) => ({ ...c, [member.id]: "declined" }))
                  }
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        ))}

        <div className="group-card__foot">
          <span
            className={
              message ? `status-line status-line--${message.tone}` : "status-line"
            }
          >
            {message
              ? message.text
              : `${answered} of ${group.members.length} answered`}
          </span>

          <button
            type="button"
            className="submit"
            onClick={submit}
            disabled={saving || !dirty}
          >
            {saving
              ? "Sending…"
              : dirty
                ? "Send RSVP"
                : openCount === 0
                  ? "All replied"
                  : "All saved"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="#a9776a" strokeWidth="1.6" />
      <path d="M16.5 16.5L21 21" stroke="#a9776a" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
