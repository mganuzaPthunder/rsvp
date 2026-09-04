/**
 * RSVP persistence.
 *
 * Uses a Redis-compatible REST store (Vercel KV / Upstash) when its env vars
 * are present, and falls back to an in-process map otherwise so `npm run dev`
 * works with zero setup. The fallback is NOT durable — on Vercel it resets
 * whenever a serverless instance recycles, so connect a store before you send
 * the link out. See README.md.
 */

export type RsvpStatus = "confirmed" | "declined";

export type RsvpRecord = {
  status: RsvpStatus;
  name: string;
  groupId: string;
  updatedAt: string;
};

const HASH_KEY = "rsvp:responses";

const REST_URL =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "";
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

export const isDurable = Boolean(REST_URL && REST_TOKEN);

/** Survives hot reloads in dev; per-instance only in production. */
const memory: Map<string, RsvpRecord> = ((globalThis as any).__rsvpMemory ??=
  new Map());

async function restCommand(command: (string | number)[]): Promise<any> {
  const res = await fetch(REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`KV request failed (${res.status}): ${await res.text()}`);
  }
  const body = await res.json();
  return body.result;
}

export async function getResponses(): Promise<Record<string, RsvpRecord>> {
  if (!isDurable) return Object.fromEntries(memory);

  const result = await restCommand(["HGETALL", HASH_KEY]);
  const out: Record<string, RsvpRecord> = {};

  // Upstash returns either a flat [field, value, ...] array or an object.
  if (Array.isArray(result)) {
    for (let i = 0; i < result.length; i += 2) {
      const parsed = safeParse(result[i + 1]);
      if (parsed) out[result[i]] = parsed;
    }
  } else if (result && typeof result === "object") {
    for (const [field, value] of Object.entries(result)) {
      const parsed = safeParse(value);
      if (parsed) out[field] = parsed;
    }
  }

  return out;
}

export async function saveResponses(
  records: Record<string, RsvpRecord>
): Promise<void> {
  const entries = Object.entries(records);
  if (entries.length === 0) return;

  if (!isDurable) {
    for (const [id, record] of entries) memory.set(id, record);
    return;
  }

  const command: string[] = ["HSET", HASH_KEY];
  for (const [id, record] of entries) command.push(id, JSON.stringify(record));
  await restCommand(command);
}

function safeParse(value: unknown): RsvpRecord | null {
  if (value && typeof value === "object") return value as RsvpRecord;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as RsvpRecord;
  } catch {
    return null;
  }
}
