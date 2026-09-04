import { NextResponse } from "next/server";
import { groupByCode } from "@/data/attendees";
import {
  getRequests,
  getResponses,
  getUnlocks,
  saveRequest,
} from "@/lib/store";
import { buildGroupView } from "@/lib/views";

export const dynamic = "force-dynamic";

/**
 * POST /api/rsvp/request — a guest asks the host to unlock their reply.
 *
 * Scoped by the same invite code as everything else, so a link can only raise
 * requests for its own group. Recording it here is what makes the ask visible
 * on /admin instead of relying on a text message.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { code, memberId } = (body ?? {}) as {
    code?: string;
    memberId?: string;
  };

  const group = groupByCode(typeof code === "string" ? code : "");
  if (!group) {
    return NextResponse.json({ error: "Unknown invite code." }, { status: 404 });
  }

  const member = group.members.find((m) => m.id === memberId);
  if (!member) {
    return NextResponse.json(
      { error: "That guest is not in this group." },
      { status: 403 }
    );
  }

  const responses = await getResponses();
  if (!responses[member.id]) {
    return NextResponse.json(
      { error: `${member.name} hasn't replied yet — no need to unlock.` },
      { status: 400 }
    );
  }

  await saveRequest(member.id, {
    requestedAt: new Date().toISOString(),
    name: member.name,
    groupId: group.id,
  });

  const [unlocks, requests] = await Promise.all([getUnlocks(), getRequests()]);
  return NextResponse.json({
    ok: true,
    group: buildGroupView(group, { responses, unlocks, requests }),
  });
}
