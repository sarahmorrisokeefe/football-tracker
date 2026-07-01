# Design: Replace Static Data with Live API Data

**Date:** 2026-07-01  
**Status:** Approved

## Overview

Replace the two remaining sources of static/example data in the app with live data from the connected APIs (api-football, Mapbox already live). The rest of the app — `TodayFeed`, `LiveMatchTicker`, `MapView` — already uses real API data.

**In scope:**
- `BracketView.tsx` — remove hardcoded R32/R16/QF/SF/Final arrays; fetch real knockout fixtures
- `YourTeams.tsx` — replace hardcoded "Next match: TBD / —" with real upcoming fixture data
- `src/lib/api-football.ts` — add in-memory TTL cache and `getAllFixtures()`
- `src/pages/api/bracket.ts` — replace standings-only fetch with grouped knockout fixture response
- New `src/pages/api/team-fixtures/[id].ts` — lightweight fixture-only endpoint

**Out of scope:** Auth, MapView, TodayFeed, LiveMatchTicker, Supabase schema, team kit data.

---

## API Budget Constraint

api-football is capped at **100 requests/day**. All server-side API calls must go through a TTL cache to prevent redundant calls across users and page loads.

### Cache layer

Add a module-level `Map<string, { data: unknown; expires: number }>` in `api-football.ts`. A `cachedFetch(key, fn, ttlMs)` wrapper checks the cache before calling `apiFetch`. Existing functions (`getLiveFixtures`, `getFixturesByDate`, etc.) are wrapped with appropriate TTLs.

| Data | Cache TTL | Reasoning |
|---|---|---|
| All WC fixtures (bracket) | 30 min | Knockout results change ~once per 90 min match |
| Team fixtures (next match) | 30 min | Opponent only changes between matchdays |
| Live fixtures | 30s | Must be fresh (existing behavior preserved) |
| Today's fixtures | 30s | Same (existing behavior preserved) |

**Serverless note:** The in-memory cache helps warm invocations but is process-bound. In serverless environments (Vercel, Netlify), the CDN `s-maxage` header is the primary shared cache. Both layers are used; `s-maxage` is the first line of defense.

### New function: `getAllFixtures()`

Calls `/fixtures?league=1&season=2026` with no date filter. Cached 30 min. Returns the full WC 2026 fixture list (group stage + knockouts). Used only by the bracket route.

---

## Bracket

### `src/pages/api/bracket.ts` (rewrite)

1. Calls `getAllFixtures()`
2. Filters out group stage: exclude any fixture where `league.round` contains `"Group"` or `"Qualifying"`
3. Groups remaining fixtures by round using **verified round name strings** from the API (a test call logs actual `league.round` values before the grouping logic is written — see implementation plan)
4. Substring matching strategy: `includes('32')`, `includes('16')`, `includes('Quarter')`, `includes('Semi')` — **`'Final'` must be matched last and only after ruling out `'Semi'`** to avoid `'Semi-finals'` being caught by a `'Final'` check
5. Pads each bucket to its expected count with synthetic TBD fixtures (see below)
6. Returns `{ r32: Fixture[], r16: Fixture[], qf: Fixture[], sf: Fixture[], final: Fixture[] }`
7. Response header: `Cache-Control: s-maxage=1800`

**Expected slot counts per round:**

| Round | Slots |
|---|---|
| Round of 32 | 16 |
| Round of 16 | 8 |
| Quarter-finals | 4 |
| Semi-finals | 2 |
| Final | 1 |

If the API returns fewer fixtures than the expected count for a round (because opponents aren't determined yet), the route pads the array with synthetic placeholder objects: `{ fixture: { id: -1, ... }, teams: { home: { name: 'TBD', ... }, away: { name: 'TBD', ... } }, goals: { home: null, away: null } }`.

### `BracketView.tsx` (update)

- Remove static `R16`, `QF`, `SF`, `FINAL` arrays
- Fetch `/api/bracket` on mount; show skeleton while loading
- Render 5 columns in order: Round of 32, Round of 16, QF, SF, Final
- `BracketCard` receives an `isTbd` prop (true when `fixture.id === -1` or team name is `'TBD'`):
  - Kit color chip replaced with a grey placeholder
  - Team name shown as `"TBD"` in muted color (`#5e6b7d`)
  - Score hidden
  - `onClick` navigation to `/match/{id}` is suppressed
- Error state: if `/api/bracket` fails, show a single-line message in place of the bracket ("Bracket data unavailable — try again shortly")

---

## YourTeams — Next Match

### New `src/pages/api/team-fixtures/[id].ts`

- Calls `getTeamFixtures(teamId)` only — **1 api-football call** (not 3 like `/api/team/{id}`)
- Returns the raw fixture array for that team
- Response header: `Cache-Control: s-maxage=1800`

### `YourTeams.tsx` (update)

- After Supabase returns the user's pinned teams, fires **parallel** `fetch('/api/team-fixtures/{id}')` calls for each (up to 5)
- Each team card renders immediately with name/group; the "Next match" row shows a small inline skeleton until its fetch resolves
- Next match = first fixture where `fixture.status.short === 'NS'`, sorted by `fixture.date` ascending
- Display: opponent name + date formatted as `"Sat 5 Jul · 20:00"`
- If the fetch fails or no NS fixture exists: show `"—"` silently (no broken UI, same as current state)

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/api-football.ts` | Add `cachedFetch` helper + `getAllFixtures()`; wrap existing functions with TTL cache |
| `src/pages/api/bracket.ts` | Rewrite: fetch grouped knockout fixtures |
| `src/pages/api/team-fixtures/[id].ts` | New: lightweight fixture-only endpoint |
| `src/components/islands/BracketView.tsx` | Remove static data; fetch from `/api/bracket`; TBD handling |
| `src/components/islands/YourTeams.tsx` | Fetch next match per team from `/api/team-fixtures/{id}` |

**Unchanged:** `api-football.ts` public API surface (existing exports keep same signatures), `/api/team/[id].ts`, `/api/fixtures.ts`, `/api/live.ts`, `MapView.tsx`, `TodayFeed.tsx`, `LiveMatchTicker.tsx`, `supabase.ts`, `teams.ts`, all Astro pages.
