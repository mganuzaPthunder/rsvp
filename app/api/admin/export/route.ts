import { GROUPS } from "@/data/attendees";
import { getRequests, getResponses, getUnlocks } from "@/lib/store";

export const dynamic = "force-dynamic";

function cell(value: string): string {
  // Quote everything: names carry commas, and a leading = would otherwise be
  // read as a formula when the file is opened in a spreadsheet.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** GET /api/admin/export?key=… — the full guest list as CSV. */
export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return new Response("Not authorised.", { status: 401 });
  }

  const [responses, unlocks, requests] = await Promise.all([
    getResponses(),
    getUnlocks(),
    getRequests(),
  ]);

  const rows = [
    ["Group", "Name", "Reply", "Replied at", "Revisions", "State"].map(cell).join(","),
  ];

  for (const group of GROUPS) {
    for (const member of group.members) {
      const record = responses[member.id];
      const state = !record
        ? "awaiting reply"
        : unlocks[member.id]
          ? "unlocked for editing"
          : requests[member.id]
            ? "locked · change requested"
            : "locked";

      rows.push(
        [
          group.name,
          member.name,
          record ? (record.status === "confirmed" ? "Attending" : "Declined") : "",
          record?.updatedAt ?? "",
          String(record?.revision ?? 0),
          state,
        ]
          .map(cell)
          .join(",")
      );
    }
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(rows.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rsvp-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
