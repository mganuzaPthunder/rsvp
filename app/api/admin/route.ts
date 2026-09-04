import { NextResponse } from "next/server";
import { MEMBER_INDEX } from "@/data/attendees";
import { clearRequests, clearUnlocks, grantUnlock } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Constant-time-ish compare so the key can't be probed a character at a time. */
function keyMatches(given: unknown): boolean {
  const expected = process.env.ADMIN_KEY;
  if (!expected || typeof given !== "string") return false;
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * POST /api/admin — host-only actions, gated on ADMIN_KEY.
 *
 * "unlock" grants one change for a guest; the RSVP route consumes it on the
 * next successful save. "dismiss" turns down a request without unlocking.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { key, action, memberId } = (body ?? {}) as {
    key?: string;
    action?: string;
    memberId?: string;
  };

  if (!keyMatches(key)) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const member = MEMBER_INDEX.find((m) => m.id === memberId);
  if (!member) {
    return NextResponse.json({ error: "Unknown guest." }, { status: 400 });
  }

  if (action === "unlock") {
    await grantUnlock(member.id);
    return NextResponse.json({ ok: true, unlocked: member.id });
  }

  if (action === "relock" || action === "dismiss") {
    await Promise.all([clearUnlocks([member.id]), clearRequests([member.id])]);
    return NextResponse.json({ ok: true, relocked: member.id });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
