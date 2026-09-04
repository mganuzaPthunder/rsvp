/**
 * RSVP persistence.
 *
 * Uses a Redis-compatible REST store (Vercel KV / Upstash) when its env vars
 * are present, and falls back to an in-process map otherwise so `npm run dev`
 * works with zero setup. The fallback is NOT durable — on Vercel it resets
 * whenever a serverless instance recycles, so connect a store before you send
 * the links out. See README.md.
 *
 * Four keys:
 *   rsvp:responses  hash   memberId -> the current reply
 *   rsvp:unlocks    hash   memberId -> a one-shot permission to change it
 *   rsvp:requests   hash   memberId -> a guest asking for that permission
 *   rsvp:log        list   every submission, newest first
 */

export type RsvpStatus = "confirmed" | "declined";

export type RsvpRecord = {
  status: RsvpStatus;
  name: string;
  groupId: string;
  updatedAt: string;
  /** Bumped each time the reply is changed; 1 on the first submission. */
  revision?: number;
};

export type UnlockGrant = { grantedAt: string };

export type ChangeRequest = {
  requestedAt: string;
  name: string;
  groupId: string;
};

export type LogEntry = {
  at: string;
  memberId: string;
  name: string;
  groupId: string;
  status: RsvpStatus;
  /** "first" for an initial reply, "update" for a change after an unlock. */
  kind: "first" | "update";
};

const RESPONSES = "rsvp:responses";
const UNLOCKS = "rsvp:unlocks";
const REQUESTS = "rsvp:requests";
const LOG = "rsvp:log";

/** Plenty for a guest list; keeps one runaway loop from filling the store. */
const LOG_CAP = 2000;

const REST_URL =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "";
const REST_TOKEN =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

export const isDurable = Boolean(REST_URL && REST_TOKEN);

/** Survives hot reloads in dev; per-instance only in production. */
type Memory = {
  hashes: Map<string, Map<string, unknown>>;
  log: LogEntry[];
};
const memory: Memory = ((globalThis as any).__rsvpMemory ??= {
  hashes: new Map(),
  log: [],
});

function bucket(key: string): Map<string, unknown> {
  let map = memory.hashes.get(key);
  if (!map) {
    map = new Map();
    memory.hashes.set(key, map);
  }
  return map;
}

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
  return (await res.json()).result;
}

function safeParse<T>(value: unknown): T | null {
  if (value && typeof value === "object") return value as T;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function readHash<T>(key: string): Promise<Record<string, T>> {
  const out: Record<string, T> = {};

  if (!isDurable) {
    for (const [field, value] of bucket(key)) out[field] = value as T;
    return out;
  }

  const result = await restCommand(["HGETALL", key]);

  // Upstash returns either a flat [field, value, ...] array or an object.
  if (Array.isArray(result)) {
    for (let i = 0; i < result.length; i += 2) {
      const parsed = safeParse<T>(result[i + 1]);
      if (parsed) out[result[i]] = parsed;
    }
  } else if (result && typeof result === "object") {
    for (const [field, value] of Object.entries(result)) {
      const parsed = safeParse<T>(value);
      if (parsed) out[field] = parsed;
    }
  }

  return out;
}

async function writeHash(key: string, entries: Record<string, unknown>) {
  const pairs = Object.entries(entries);
  if (pairs.length === 0) return;

  if (!isDurable) {
    for (const [field, value] of pairs) bucket(key).set(field, value);
    return;
  }

  const command: string[] = ["HSET", key];
  for (const [field, value] of pairs) command.push(field, JSON.stringify(value));
  await restCommand(command);
}

async function deleteFields(key: string, fields: string[]) {
  if (fields.length === 0) return;
  if (!isDurable) {
    for (const field of fields) bucket(key).delete(field);
    return;
  }
  await restCommand(["HDEL", key, ...fields]);
}

/* ------------------------------- replies ------------------------------- */

export function getResponses(): Promise<Record<string, RsvpRecord>> {
  return readHash<RsvpRecord>(RESPONSES);
}

export function saveResponses(records: Record<string, RsvpRecord>) {
  return writeHash(RESPONSES, records);
}

/* ------------------------------- unlocks ------------------------------- */

export function getUnlocks(): Promise<Record<string, UnlockGrant>> {
  return readHash<UnlockGrant>(UNLOCKS);
}

export function grantUnlock(memberId: string) {
  return writeHash(UNLOCKS, {
    [memberId]: { grantedAt: new Date().toISOString() } satisfies UnlockGrant,
  });
}

export function clearUnlocks(memberIds: string[]) {
  return deleteFields(UNLOCKS, memberIds);
}

/* --------------------------- change requests --------------------------- */

export function getRequests(): Promise<Record<string, ChangeRequest>> {
  return readHash<ChangeRequest>(REQUESTS);
}

export function saveRequest(memberId: string, request: ChangeRequest) {
  return writeHash(REQUESTS, { [memberId]: request });
}

export function clearRequests(memberIds: string[]) {
  return deleteFields(REQUESTS, memberIds);
}

/* ------------------------------ submission log ------------------------------ */

export async function appendLog(entries: LogEntry[]) {
  if (entries.length === 0) return;

  if (!isDurable) {
    memory.log.unshift(...entries);
    memory.log.length = Math.min(memory.log.length, LOG_CAP);
    return;
  }

  await restCommand(["LPUSH", LOG, ...entries.map((e) => JSON.stringify(e))]);
  // Trim in the same round trip budget rather than growing without bound.
  await restCommand(["LTRIM", LOG, 0, LOG_CAP - 1]);
}

export async function getLog(limit = 500): Promise<LogEntry[]> {
  if (!isDurable) return memory.log.slice(0, limit);

  const result = await restCommand(["LRANGE", LOG, 0, limit - 1]);
  if (!Array.isArray(result)) return [];
  return result
    .map((raw) => safeParse<LogEntry>(raw))
    .filter((e): e is LogEntry => e !== null);
}
