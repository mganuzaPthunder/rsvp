import { MEMBER_INDEX, type Group, type Member } from "@/data/attendees";

export type Match = Member & { group: Group };

/** Lowercase, strip accents, collapse whitespace and punctuation. */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Rank guests against a typed query. Higher score is a better match:
 * exact full name > full name prefix > any word prefix > substring.
 */
export function findMembers(query: string, limit = 8): Match[] {
  const q = normalize(query);
  if (q.length < 2) return [];

  const scored: { match: Match; score: number }[] = [];

  for (const entry of MEMBER_INDEX) {
    const name = normalize(entry.name);
    const words = name.split(" ");

    let score = 0;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (words.some((w) => w.startsWith(q))) score = 60;
    else if (name.includes(q)) score = 40;
    else if (q.split(" ").every((part) => name.includes(part))) score = 20;

    if (score > 0) {
      // Shorter names that match are usually the more precise hit.
      scored.push({ match: entry, score: score - name.length * 0.01 });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.match);
}
