import { NextResponse } from "next/server";
import { ALLOW_OPEN_SEARCH } from "@/data/attendees";
import { findMembers } from "@/lib/search";

export const dynamic = "force-dynamic";

/**
 * GET /api/find?q=name — look a guest up and hand back their group's link.
 *
 * Gated here rather than in the UI: this endpoint hands out invite codes, so
 * it must stay off unless the host has explicitly opted in.
 */
export async function GET(request: Request) {
  if (!ALLOW_OPEN_SEARCH) {
    return NextResponse.json({ error: "Name search is disabled." }, { status: 404 });
  }

  const query = new URL(request.url).searchParams.get("q") ?? "";

  return NextResponse.json({
    matches: findMembers(query).map((m) => ({
      id: m.id,
      name: m.name,
      groupName: m.group.name,
      href: `/${m.group.code}?q=${encodeURIComponent(m.name)}`,
    })),
  });
}
