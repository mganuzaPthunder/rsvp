import type { Group } from "@/data/attendees";
import type { RsvpRecord, RsvpStatus } from "@/lib/store";

export type MemberView = {
  id: string;
  name: string;
  status: RsvpStatus | null;
  updatedAt: string | null;
};

export type GroupView = { id: string; name: string; members: MemberView[] };

/** Merge a group's roster with whatever replies have been stored for it. */
export function buildGroupView(
  group: Group,
  responses: Record<string, RsvpRecord>
): GroupView {
  return {
    id: group.id,
    name: group.name,
    members: group.members.map((member) => ({
      id: member.id,
      name: member.name,
      status: responses[member.id]?.status ?? null,
      updatedAt: responses[member.id]?.updatedAt ?? null,
    })),
  };
}
