import { NextResponse } from "next/server";
import { groupByCode } from "@/data/attendees";
import {
  appendLog,
  clearRequests,
  clearUnlocks,
  getRequests,
  getResponses,
  getUnlocks,
  saveResponses,
  type LogEntry,
  type RsvpRecord,
} from "@/lib/store";
import { buildGroupView, type ViewState } from "@/lib/views";

export const dynamic = "force-dynamic";

async function readState(): Promise<ViewState> {
  const [responses, unlocks, requests] = await Promise.all([
    getResponses(),
    getUnlocks(),
    getRequests(),
  ]);
  return { responses, unlocks, requests };
}

/** GET /api/rsvp?code=XXXX — current replies and lock state for one group. */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") ?? "";
  const group = groupByCode(code);

  if (!group) {
    return NextResponse.json({ error: "Unknown invite code." }, { status: 404 });
  }

  return NextResponse.json({ group: buildGroupView(group, await readState()) });
}

/**
 * POST /api/rsvp — save confirm/decline answers.
 *
 * The code decides which guests may be written to: an id that belongs to a
 * different group is rejected, so holding one link never lets you answer for
 * anyone else.
 *
 * A reply that already exists is locked. Changing it needs an unlock granted
 * from /admin, which this route consumes on use — so one unlock buys exactly
 * one change. Enforced here rather than in the UI, because the UI is only a
 * suggestion to anyone holding the link.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { code, updates } = (body ?? {}) as { code?: string; updates?: unknown };

  const group = groupByCode(typeof code === "string" ? code : "");
  if (!group) {
    return NextResponse.json({ error: "Unknown invite code." }, { status: 404 });
  }

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json(
      { error: "Send at least one { id, status } update." },
      { status: 400 }
    );
  }

  const state = await readState();
  const records: Record<string, RsvpRecord> = {};
  const log: LogEntry[] = [];
  const consumed: string[] = [];
  const at = new Date().toISOString();

  for (const update of updates) {
    const { id, status } = (update ?? {}) as { id?: string; status?: string };
    const member = group.members.find((m) => m.id === id);

    if (!member) {
      return NextResponse.json(
        { error: "That guest is not in this group." },
        { status: 403 }
      );
    }
    if (status !== "confirmed" && status !== "declined") {
      return NextResponse.json(
        { error: `Invalid status for ${member.name}.` },
        { status: 400 }
      );
    }

    const existing = state.responses[member.id];

    // Re-sending the same answer is a no-op, not an attempt to change it.
    if (existing && existing.status === status) continue;

    if (existing && !state.unlocks[member.id]) {
      return NextResponse.json(
        {
          error: `${member.name} has already replied. Ask the host to unlock it before changing.`,
          lockedMemberId: member.id,
        },
        { status: 409 }
      );
    }

    if (existing) consumed.push(member.id);

    records[member.id] = {
      status,
      name: member.name,
      groupId: group.id,
      updatedAt: at,
      revision: (existing?.revision ?? 0) + 1,
    };
    log.push({
      at,
      memberId: member.id,
      name: member.name,
      groupId: group.id,
      status,
      kind: existing ? "update" : "first",
    });
  }

  if (Object.keys(records).length > 0) {
    await saveResponses(records);
    await appendLog(log);
    // An unlock buys one change; the request that earned it is done too.
    if (consumed.length > 0) {
      await Promise.all([clearUnlocks(consumed), clearRequests(consumed)]);
    }
  }

  return NextResponse.json({
    ok: true,
    saved: Object.keys(records).length,
    group: buildGroupView(group, await readState()),
  });
}
