import { NextResponse } from "next/server";
import { groupByCode } from "@/data/attendees";
import { getResponses, saveResponses, type RsvpRecord } from "@/lib/store";
import { buildGroupView } from "@/lib/views";

export const dynamic = "force-dynamic";

/** GET /api/rsvp?code=XXXX — current replies for one group. */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") ?? "";
  const group = groupByCode(code);

  if (!group) {
    return NextResponse.json({ error: "Unknown invite code." }, { status: 404 });
  }

  const responses = await getResponses();
  return NextResponse.json({ group: buildGroupView(group, responses) });
}

/**
 * POST /api/rsvp — save confirm/decline answers.
 *
 * The code decides which guests may be written to: an id that belongs to a
 * different group is rejected, so holding one link never lets you answer for
 * anyone else.
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

  const records: Record<string, RsvpRecord> = {};
  const updatedAt = new Date().toISOString();

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

    records[member.id] = {
      status,
      name: member.name,
      groupId: group.id,
      updatedAt,
    };
  }

  await saveResponses(records);

  const responses = await getResponses();
  return NextResponse.json({ ok: true, group: buildGroupView(group, responses) });
}
