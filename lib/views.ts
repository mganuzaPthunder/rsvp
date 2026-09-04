import type { Group } from "@/data/attendees";
import type {
  ChangeRequest,
  RsvpRecord,
  RsvpStatus,
  UnlockGrant,
} from "@/lib/store";

export type MemberView = {
  id: string;
  name: string;
  status: RsvpStatus | null;
  updatedAt: string | null;
  /** A reply that has been submitted and not unlocked cannot be changed. */
  locked: boolean;
  /** The host has granted a one-shot change. */
  unlocked: boolean;
  /** This guest has asked for that change and is waiting. */
  requested: boolean;
};

export type GroupView = { id: string; name: string; members: MemberView[] };

export type ViewState = {
  responses: Record<string, RsvpRecord>;
  unlocks: Record<string, UnlockGrant>;
  requests: Record<string, ChangeRequest>;
};

/** Merge a group's roster with the replies, unlocks and pending requests. */
export function buildGroupView(group: Group, state: ViewState): GroupView {
  return {
    id: group.id,
    name: group.name,
    members: group.members.map((member) => {
      const record = state.responses[member.id];
      const unlocked = Boolean(state.unlocks[member.id]);
      return {
        id: member.id,
        name: member.name,
        status: record?.status ?? null,
        updatedAt: record?.updatedAt ?? null,
        locked: Boolean(record) && !unlocked,
        unlocked,
        requested: Boolean(state.requests[member.id]),
      };
    }),
  };
}
