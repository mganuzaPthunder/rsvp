# RSVP site

A one-page RSVP site. Each group gets its own invite link — `yourdomain.com/3tmn5sbh`
— which opens the banner and, below it, that group's guest list ready to confirm
or decline. Add `?q=name` to drop someone straight onto their own row:
`yourdomain.com/3tmn5sbh?q=carmela`.

## Routes

| Route | What it is |
| --- | --- |
| `/<code>` | A group's RSVP page. The code is the only credential. |
| `/<code>?q=name` | Same page, filtered to that guest and scrolled to the form. |
| `/` | Banner plus a note explaining that replies need an invite link. |
| `/admin?key=…` | Private tally, submission record, unlock requests, invite links. |
| `/api/admin/export?key=…` | The whole guest list as CSV. |

## Files

| Path | What it does |
| --- | --- |
| [`data/attendees.ts`](data/attendees.ts) | **Edit this.** Event copy, groups, invite codes, guest list. |
| [`app/[code]/page.tsx`](app/[code]/page.tsx) | The group RSVP page (server-rendered). |
| [`components/GroupRsvp.tsx`](components/GroupRsvp.tsx) | Name filter, confirm/decline, save. |
| [`components/Hero.tsx`](components/Hero.tsx) | Debut banner — photo + invitation, two columns on desktop. |
| [`components/Petals.tsx`](components/Petals.tsx) | Canvas petal fall. |
| [`components/Butterflies.tsx`](components/Butterflies.tsx) | Glowing fairy butterflies with pixie dust. |
| [`app/api/rsvp/route.ts`](app/api/rsvp/route.ts) | `GET` group state, `POST` save — both scoped by code. |
| [`lib/store.ts`](lib/store.ts) | Persistence (Redis REST, with an in-memory dev fallback). |
| [`app/api/rsvp/request/route.ts`](app/api/rsvp/request/route.ts) | A guest asking to change a locked reply. |
| [`app/api/admin/route.ts`](app/api/admin/route.ts) | Host-only unlock / re-lock, gated on `ADMIN_KEY`. |

## Records and locking

**Every submission is recorded.** `rsvp:log` keeps an append-only list of who
replied, what they said, when, and whether it was a first reply or a change —
newest first, capped at 2000. It shows on `/admin` under "Submission record",
and `/api/admin/export?key=…` gives you the whole roster as CSV (group, name,
reply, timestamp, revision count, lock state).

**A reply locks once submitted.** After that the guest sees a Locked badge and
a "Request a change" button instead of Confirm/Decline. The request appears on
`/admin`, where you Unlock or Dismiss it. An unlock is one-shot: the RSVP route
consumes it on the next save, so the reply re-locks immediately and a second
change needs a second unlock. You can also unlock or re-lock anyone directly
from the roster, without waiting for them to ask.

This is enforced in [`app/api/rsvp/route.ts`](app/api/rsvp/route.ts), not in
the UI — anyone holding an invite link can post whatever they like, so the
check has to be on the server. Re-sending an identical answer is treated as a
no-op rather than a rejected change, so a double-tap never trips the lock.

## How the codes work

Every group in `GROUPS` has a `code`. It is the whole access check: `POST /api/rsvp`
takes the code, resolves it to one group, and refuses any guest id outside it, so a
link for Team Aurora can never answer for Team Bloom. Codes are matched
case-insensitively, and startup throws if two groups share one or if a code
collides with a real path like `admin`.

Treat a code like a password — anyone holding it can answer for everyone in that
group. That is usually what you want (one link per household or team), but it does
mean groupmates can edit each other's replies.

Generate fresh codes:

```bash
npm run codes -- 6
```

`/<code>` pages are served with `noindex, nofollow` so invite links stay out of
search results.

### Optional: name search on the home page

`ALLOW_OPEN_SEARCH` in [`data/attendees.ts`](data/attendees.ts) is `false`. Setting
it to `true` puts a name search on `/` that finds a guest and links them to their
group page — convenient if people lose their links, but it means anyone can look up
anyone's code. The `/api/find` endpoint checks the same flag server-side, so
flipping it off genuinely turns the lookup off.

## Before you deploy

**1. Swap the banner photo.** `public/hero.jpg` is a 2:3 portrait. Below 900px
it is shown whole and uncropped at full width; from 900px it covers the
viewport, which crops the top and bottom (`object-position: 50% 6%` keeps the
printed top line and her face in frame — retune that if you change the photo). It carries its own printed wording — "same girl,
brighter days", the script line, "more good times ahead" — and deliberately
leaves the top right empty, because the RSVP block is set in live type and
dropped into that gap. If you replace it:

- keep the 2:3 ratio (nothing crops at another ratio, but the column cap in
  `.hero__portrait` assumes height = 1.5x width when working out what fits);
- leave the top right clear for the wordmark, or move `.invite__wordmark`;
- don't print "RSVP" on it — that would be said twice;
- update the `alt` text in [`components/Hero.tsx`](components/Hero.tsx) to match
  whatever wording the new photo carries.

**2. Fill in the guest list.** Replace `EVENT` and `GROUPS` in
[`data/attendees.ts`](data/attendees.ts). Every member needs a stable `id` — that's
the key replies are stored under, so don't renumber them after links go out. Same
for codes: changing one invalidates that group's link.

**3. Connect a store.** Without one, replies are kept in memory and vanish when a
serverless instance recycles. On Vercel: **Storage → Upstash for Redis → Connect**.
That sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`, which is all
[`lib/store.ts`](lib/store.ts) looks for (`UPSTASH_REDIS_REST_*` also works).

**4. Set `ADMIN_KEY`** to a long random string, then collect the invite links from
`/admin?key=<that string>`.

## Run it

```bash
npm install
npm run dev
```

## Deploy

```bash
npx vercel
```

Or push to GitHub and import the repo at vercel.com — it's a stock Next.js app, so
no build settings need changing.

## Animations

Petals and fairy butterflies are decorative and hidden entirely under
`prefers-reduced-motion: reduce`, along with every transition. Petal count is a
prop: `<Petals count={38} />` in [`components/Hero.tsx`](components/Hero.tsx).

The banner drifts in to 1.035 and settles back on a 20s loop (`bannerZoom`),
resting at 1:1 for the first 45% so it reads as an occasional breath. The S of
RSVP turns over on its own 7s loop (`flipS`). Both live on separate elements
from their parents' entry animations, because two animations on one element
would fight over `transform`.

Each fairy has two flight heights in
[`components/Butterflies.tsx`](components/Butterflies.tsx) — `top` for the
two-column layout and `topStacked` for phones — because the photo moves between
the two, and a fairy drifting across someone's face reads as a smudge. If you
change the photo or the breakpoint, re-check those lanes.
