/**
 * Event details and the guest list live here. The banner photo is clean —
 * every word on it is set in type from EVENT below.
 */

export const EVENT = {
  /** The debutante. Shown in script above the RSVP wordmark. */
  celebrant: "Myleen",
  /** The milestone. Rendered inside the medallion. */
  age: "18",
  /** Who guests should contact if something goes wrong. */
  hostName: "Myleen",

  /**
   * The only wording set in type over the banner. Everything else you see on
   * it — "same girl, brighter days", the script line, "more good times ahead"
   * — is part of public/hero.jpg, so don't repeat it here.
   */
  title: "RSVP",
  subtitle: "Kindly reply by the date",
  occasion: "Debut Celebration",

  eventName: "The Debut",
  eventDate: "Saturday, December 13, 2026",
  eventShortDate: "Dec 13, 2026",
  eventTime: "6:00 PM",
  eventVenue: "The Garden Pavilion",
  /** Deadline copy under the CTA. */
  rsvpDeadline: "November 30, 2026",
};

/**
 * When false (recommended), the only way to reply is a group's own invite link.
 * When true, the home page also offers a name search that routes a guest to
 * their group link — convenient, but it means anyone can look up anyone's code.
 */
export const ALLOW_OPEN_SEARCH = false;

export type Member = {
  /** Stable id — used as the storage key. Never reuse or renumber these. */
  id: string;
  name: string;
};

export type Group = {
  id: string;
  /** Team / table / family name shown above the member list. */
  name: string;
  /**
   * The group's invite code — this is the URL you send out:
   * https://yourdomain.com/<code>
   * Treat it like a password: whoever has it can answer for this group.
   * Use `npm run codes` to generate fresh ones.
   */
  code: string;
  members: Member[];
};

export const GROUPS: Group[] = [
  {
    id: "team-aurora",
    name: "Team Aurora",
    code: "3tmn5sbh",
    members: [
      { id: "aurora-1", name: "Ana Cruz" },
      { id: "aurora-2", name: "Ben Santos" },
      { id: "aurora-3", name: "Carmela Reyes" },
      { id: "aurora-4", name: "Dexter Lim" },
    ],
  },
  {
    id: "team-bloom",
    name: "Team Bloom",
    code: "r2xb2kzp",
    members: [
      { id: "bloom-1", name: "Elena Villanueva" },
      { id: "bloom-2", name: "Francis Tan" },
      { id: "bloom-3", name: "Grace Mendoza" },
    ],
  },
  {
    id: "team-cinder",
    name: "Team Cinder",
    code: "ywe7qzrt",
    members: [
      { id: "cinder-1", name: "Hannah Dela Cruz" },
      { id: "cinder-2", name: "Ivan Ramos" },
      { id: "cinder-3", name: "Jasmine Ocampo" },
      { id: "cinder-4", name: "Kevin Aguilar" },
      { id: "cinder-5", name: "Lara Gonzales" },
    ],
  },
  {
    id: "family",
    name: "Family",
    code: "szv3yq3y",
    members: [
      { id: "family-1", name: "Maria Ganuza" },
      { id: "family-2", name: "Noel Ganuza" },
      { id: "family-3", name: "Olivia Ganuza" },
    ],
  },
];

/** Flat lookup of every member, with the group they belong to. */
export const MEMBER_INDEX = GROUPS.flatMap((group) =>
  group.members.map((member) => ({ ...member, group }))
);

/** Codes are matched case-insensitively so a link still works if it gets shouted. */
export function groupByCode(code: string): Group | null {
  const wanted = code.trim().toLowerCase();
  return GROUPS.find((group) => group.code.toLowerCase() === wanted) ?? null;
}

/**
 * Fail loudly at boot rather than silently sending two groups the same link,
 * or shadowing a real route with a code.
 */
const RESERVED = new Set(["admin", "api", "_next", "favicon.ico"]);
const seen = new Set<string>();
for (const group of GROUPS) {
  const code = group.code.trim().toLowerCase();
  if (!code) throw new Error(`Group "${group.name}" is missing an invite code.`);
  if (RESERVED.has(code)) {
    throw new Error(`Invite code "${code}" (${group.name}) is a reserved path.`);
  }
  if (seen.has(code)) {
    throw new Error(`Invite code "${code}" is used by more than one group.`);
  }
  seen.add(code);
}
