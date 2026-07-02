# Live API Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded bracket results and "Next match: TBD" placeholders with live data from api-football, staying within the 100 requests/day rate limit via a server-side TTL cache.

**Architecture:** A module-level TTL cache in `api-football.ts` deduplicates server-side API calls across all routes and users. The bracket route fetches all WC 2026 fixtures once per 30 min, groups them into knockout rounds, and pads missing slots with synthetic TBD entries. YourTeams fetches a new lightweight per-team fixture endpoint to show the next scheduled match. CDN `s-maxage` headers are the first line of defense in serverless deployments; the in-memory cache helps warm invocations.

**Tech Stack:** Astro 7, React 19 (islands), TypeScript, api-football v3, Vitest

## Global Constraints

- api-football: **100 requests/day max** — every call must go through `cachedFetch`
- WC 2026 league ID: `1`, season: `2026`
- Knockout round slot counts: R32 = 16, R16 = 8, QF = 4, SF = 2, Final = 1
- TBD fixture sentinel: `fixture.id === -1`
- Cache TTLs: live/today fixtures = 30 s, all other fixture data = 30 min (1 800 000 ms)
- `s-maxage` response headers must match in-memory TTL for each route: `30` for live, `1800` for bracket and team fixtures
- Next match date format: user's local timezone via `toLocaleDateString`/`toLocaleTimeString` with `undefined` locale
- `BracketData` type lives in `src/types/index.ts` — not in the API route — so both the route and BracketView can import it safely
- Do **not** import from `src/pages/` in React island components — Astro processes pages separately

---

### Task 1: Set up Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm test` runs all `src/**/*.test.ts` files

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

Expected: vitest appears in `devDependencies` in `package.json`.

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 3: Add test scripts to `package.json`**

In the `"scripts"` block add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify setup runs cleanly**

```bash
npm test
```

Expected: exits 0, output mentions "No test files found" or "0 tests". If it errors on the config file, check that `vitest` version matches what was installed.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest"
```

---

### Task 2: Add TTL cache and `getAllFixtures` to `api-football.ts`

**Files:**
- Modify: `src/lib/api-football.ts`
- Create: `src/lib/api-football.test.ts`

**Interfaces:**
- Produces (new exports):
  - `cachedFetch<T>(key: string, fn: () => Promise<T>, ttlMs: number): Promise<T>`
  - `clearCache(): void` — exported for tests only
  - `getAllFixtures(): Promise<unknown[]>` — fetches all WC 2026 fixtures, cached 30 min
- Existing exports (`getLiveFixtures`, `getFixturesByDate`, `getFixtureById`, `getStandings`, `getTeamInfo`, `getTeamFixtures`, `getFixtureLineups`, `getFixtureEvents`, `getFixtureStats`) keep the same signatures — internally wrapped with `cachedFetch`

- [ ] **Step 1: Write failing tests**

Create `src/lib/api-football.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cachedFetch, clearCache } from './api-football';

describe('cachedFetch', () => {
  beforeEach(() => clearCache());

  it('calls fn on first request', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const result = await cachedFetch('key-a', fn, 60_000);
    expect(fn).toHaveBeenCalledOnce();
    expect(result).toBe('result');
  });

  it('returns cached value without calling fn again', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    await cachedFetch('key-b', fn, 60_000);
    const result = await cachedFetch('key-b', fn, 60_000);
    expect(fn).toHaveBeenCalledOnce();
    expect(result).toBe('result');
  });

  it('re-fetches after TTL expires', async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockResolvedValue('result');
    await cachedFetch('key-c', fn, 1_000);
    vi.advanceTimersByTime(1_001);
    await cachedFetch('key-c', fn, 1_000);
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('uses separate cache entries per key', async () => {
    const fn1 = vi.fn().mockResolvedValue('a');
    const fn2 = vi.fn().mockResolvedValue('b');
    const r1 = await cachedFetch('key-d', fn1, 60_000);
    const r2 = await cachedFetch('key-e', fn2, 60_000);
    expect(r1).toBe('a');
    expect(r2).toBe('b');
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npm test
```

Expected: FAIL with "cachedFetch is not exported from ./api-football" or similar.

- [ ] **Step 3: Rewrite `src/lib/api-football.ts`**

```typescript
const BASE = 'https://v3.football.api-sports.io';
const WC_LEAGUE = 1;
const WC_SEASON = 2026;

const LIVE_TTL = 30_000;
const FIXTURE_TTL = 1_800_000;

const _cache = new Map<string, { data: unknown; expires: number }>();

export function clearCache() {
  _cache.clear();
}

export async function cachedFetch<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number
): Promise<T> {
  const cached = _cache.get(key);
  if (cached && Date.now() < cached.expires) {
    return cached.data as T;
  }
  const data = await fn();
  _cache.set(key, { data, expires: Date.now() + ttlMs });
  return data;
}

async function apiFetch(path: string, params: Record<string, string | number> = {}) {
  const key = import.meta.env.API_FOOTBALL_KEY;
  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url.toString(), {
    headers: {
      'x-apisports-key': key,
      'x-rapidapi-key': key,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  if (!res.ok) throw new Error(`API-Football ${path} → ${res.status}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length) {
    throw new Error(`API-Football error: ${JSON.stringify(json.errors)}`);
  }
  return json.response;
}

export async function getLiveFixtures() {
  return cachedFetch('live', () => apiFetch('/fixtures', { live: 'all', league: WC_LEAGUE, season: WC_SEASON }), LIVE_TTL);
}

export async function getFixturesByDate(date: string) {
  return cachedFetch(`fixtures-date-${date}`, () => apiFetch('/fixtures', { date, league: WC_LEAGUE, season: WC_SEASON }), LIVE_TTL);
}

export async function getFixtureById(id: number) {
  return cachedFetch(`fixture-${id}`, () => apiFetch('/fixtures', { id }), LIVE_TTL);
}

export async function getStandings(leagueId = WC_LEAGUE) {
  return cachedFetch(`standings-${leagueId}`, () => apiFetch('/standings', { league: leagueId, season: WC_SEASON }), FIXTURE_TTL);
}

export async function getTeamInfo(teamId: number) {
  return cachedFetch(`team-info-${teamId}`, async () => {
    const [info, squad] = await Promise.all([
      apiFetch('/teams', { id: teamId }),
      apiFetch('/players/squads', { team: teamId }),
    ]);
    return { info: info[0], squad: squad[0] };
  }, FIXTURE_TTL);
}

export async function getTeamFixtures(teamId: number) {
  return cachedFetch(`team-fixtures-${teamId}`, () => apiFetch('/fixtures', { team: teamId, league: WC_LEAGUE, season: WC_SEASON }), FIXTURE_TTL);
}

export async function getAllFixtures() {
  return cachedFetch('all-fixtures', () => apiFetch('/fixtures', { league: WC_LEAGUE, season: WC_SEASON }), FIXTURE_TTL);
}

export async function getFixtureLineups(fixtureId: number) {
  return cachedFetch(`lineups-${fixtureId}`, () => apiFetch('/fixtures/lineups', { fixture: fixtureId }), LIVE_TTL);
}

export async function getFixtureEvents(fixtureId: number) {
  return cachedFetch(`events-${fixtureId}`, () => apiFetch('/fixtures/events', { fixture: fixtureId }), LIVE_TTL);
}

export async function getFixtureStats(fixtureId: number) {
  return cachedFetch(`stats-${fixtureId}`, () => apiFetch('/fixtures/statistics', { fixture: fixtureId }), LIVE_TTL);
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npm test
```

Expected: 4 passing tests in `api-football.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api-football.ts src/lib/api-football.test.ts
git commit -m "feat: add TTL cache and getAllFixtures to api-football"
```

---

### Task 3: Create `/api/team-fixtures/[id]` route

**Files:**
- Create: `src/pages/api/team-fixtures/[id].ts`

**Interfaces:**
- Consumes: `getTeamFixtures(teamId: number): Promise<Fixture[]>` from `src/lib/api-football.ts`
- Produces: `GET /api/team-fixtures/:id` → `Fixture[]` (JSON), `Cache-Control: s-maxage=1800`

No unit tests — thin wrapper verified manually.

- [ ] **Step 1: Create the route**

Create `src/pages/api/team-fixtures/[id].ts`:

```typescript
import type { APIRoute } from 'astro';
import { getTeamFixtures } from '../../../lib/api-football';

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!id) return new Response('Not found', { status: 404 });

  try {
    const data = await getTeamFixtures(id);
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=1800',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

- [ ] **Step 2: Start the dev server and verify the route responds**

```bash
npm run dev
```

In a separate terminal (Brazil's team ID is `6`):

```bash
curl -s http://localhost:4321/api/team-fixtures/6 | head -c 300
```

Expected: a JSON array starting with `[{` or `{"error":` if the API key isn't set. Either confirms the route is wired correctly.

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/team-fixtures/
git commit -m "feat: add team-fixtures API route (fixtures only, no squad data)"
```

---

### Task 4: Add `BracketData` type, then rewrite `bracket.ts`

**Files:**
- Modify: `src/types/index.ts` (add `BracketData`)
- Modify: `src/pages/api/bracket.ts` (rewrite)
- Create: `src/lib/bracket.ts` (pure grouping logic — extracted for testability)
- Create: `src/lib/bracket.test.ts`

**Why a separate `src/lib/bracket.ts`?** Astro API routes (`src/pages/api/`) can't be imported by client React components. The `BracketData` type and grouping logic are needed in both the API route and `BracketView`. Extracting them to `src/lib/` makes the logic safely importable from anywhere.

**Interfaces:**
- Produces:
  - `BracketData` in `src/types/index.ts`
  - `groupKnockoutFixtures(fixtures: Fixture[]): BracketData` in `src/lib/bracket.ts`
  - `GET /api/bracket` → `BracketData` (JSON), `Cache-Control: s-maxage=1800`

- [ ] **Step 1: Verify actual round name strings from the API (costs 1 request)**

With the dev server stopped, run:

```bash
source .env 2>/dev/null; curl -s "https://v3.football.api-sports.io/fixtures?league=1&season=2026" \
  -H "x-apisports-key: $API_FOOTBALL_KEY" | \
  node -e "let d='';process.stdin.resume();process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const r=[...new Set(JSON.parse(d).response.map(f=>f.league.round))].sort();console.log(r.join('\n'))})"
```

Note the exact strings printed. The grouping logic in Step 4 uses substring checks — **if the actual round strings differ from the ones assumed below, update `classifyRound` in Step 4 to match exactly.** Assumed values:
```
Group Stage - 1 / Group Stage - 2 / Group Stage - 3
Round of 32
Round of 16
Quarter-finals
Semi-finals
Final
```

- [ ] **Step 2: Add `BracketData` to `src/types/index.ts`**

Append to the end of `src/types/index.ts`:

```typescript
export interface BracketData {
  r32: Fixture[];
  r16: Fixture[];
  qf: Fixture[];
  sf: Fixture[];
  final: Fixture[];
}
```

- [ ] **Step 3: Write failing tests for the grouping logic**

Create `src/lib/bracket.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { groupKnockoutFixtures } from './bracket';
import type { Fixture } from '../types';

function makeFixture(round: string, id = Math.floor(Math.random() * 100_000)): Fixture {
  return {
    fixture: { id, date: '2026-07-05T20:00:00+00:00', status: { long: 'Not Started', short: 'NS', elapsed: null }, venue: { name: 'Stadium', city: 'City' } },
    league: { id: 1, name: 'FIFA World Cup', round },
    teams: {
      home: { id: 1, name: 'Team A', logo: '', winner: null },
      away: { id: 2, name: 'Team B', logo: '', winner: null },
    },
    goals: { home: null, away: null },
    score: { halftime: { home: null, away: null }, fulltime: { home: null, away: null } },
  };
}

const isTbd = (f: Fixture) => f.fixture.id === -1;

describe('groupKnockoutFixtures', () => {
  it('excludes group stage fixtures', () => {
    const result = groupKnockoutFixtures([makeFixture('Group Stage - 1'), makeFixture('Round of 32')]);
    const realFixtures = [...result.r32, ...result.r16, ...result.qf, ...result.sf, ...result.final].filter(f => !isTbd(f));
    expect(realFixtures).toHaveLength(1);
  });

  it('pads r32 to 16 slots', () => {
    const result = groupKnockoutFixtures([makeFixture('Round of 32'), makeFixture('Round of 32')]);
    expect(result.r32).toHaveLength(16);
    expect(isTbd(result.r32[2])).toBe(true);
  });

  it('pads r16 to 8 slots when no fixtures exist for that round', () => {
    const result = groupKnockoutFixtures([]);
    expect(result.r16).toHaveLength(8);
    expect(isTbd(result.r16[0])).toBe(true);
  });

  it('pads qf to 4, sf to 2, final to 1 when empty', () => {
    const result = groupKnockoutFixtures([]);
    expect(result.qf).toHaveLength(4);
    expect(result.sf).toHaveLength(2);
    expect(result.final).toHaveLength(1);
  });

  it('puts Semi-finals in sf, not final', () => {
    const result = groupKnockoutFixtures([makeFixture('Semi-finals')]);
    expect(result.sf.filter(f => !isTbd(f))).toHaveLength(1);
    expect(result.final.filter(f => !isTbd(f))).toHaveLength(0);
  });

  it('puts Final in final, not sf', () => {
    const result = groupKnockoutFixtures([makeFixture('Final')]);
    expect(result.final.filter(f => !isTbd(f))).toHaveLength(1);
    expect(result.sf.filter(f => !isTbd(f))).toHaveLength(0);
  });

  it('puts Quarter-finals in qf', () => {
    const result = groupKnockoutFixtures([makeFixture('Quarter-finals')]);
    expect(result.qf.filter(f => !isTbd(f))).toHaveLength(1);
  });
});
```

- [ ] **Step 4: Run tests — confirm they fail**

```bash
npm test
```

Expected: FAIL — `groupKnockoutFixtures` not exported from `./bracket`.

- [ ] **Step 5: Create `src/lib/bracket.ts` with the grouping logic**

```typescript
import type { BracketData, Fixture } from '../types';

const SLOT_COUNTS: Record<keyof BracketData, number> = {
  r32: 16, r16: 8, qf: 4, sf: 2, final: 1,
};

const ROUND_NAMES: Record<keyof BracketData, string> = {
  r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-finals', sf: 'Semi-finals', final: 'Final',
};

function makeTbd(round: string): Fixture {
  return {
    fixture: { id: -1, date: '', status: { long: 'Not Started', short: 'NS', elapsed: null }, venue: { name: '', city: '' } },
    league: { id: 1, name: 'FIFA World Cup', round },
    teams: {
      home: { id: -1, name: 'TBD', logo: '', winner: null },
      away: { id: -1, name: 'TBD', logo: '', winner: null },
    },
    goals: { home: null, away: null },
    score: { halftime: { home: null, away: null }, fulltime: { home: null, away: null } },
  };
}

function pad(fixtures: Fixture[], count: number, roundName: string): Fixture[] {
  const result = [...fixtures];
  while (result.length < count) result.push(makeTbd(roundName));
  return result;
}

function classifyRound(round: string): keyof BracketData | null {
  const r = round.toLowerCase();
  if (r.includes('group') || r.includes('qualifying')) return null;
  if (r.includes('32')) return 'r32';
  if (r.includes('16')) return 'r16';
  if (r.includes('quarter')) return 'qf';
  if (r.includes('semi')) return 'sf';    // must come before 'final' — "Semi-finals" contains "final"
  if (r.includes('final')) return 'final';
  return null;
}

export function groupKnockoutFixtures(fixtures: Fixture[]): BracketData {
  const buckets: Record<keyof BracketData, Fixture[]> = { r32: [], r16: [], qf: [], sf: [], final: [] };

  for (const f of fixtures) {
    const bucket = classifyRound(f.league.round);
    if (bucket) buckets[bucket].push(f);
  }

  return {
    r32: pad(buckets.r32, SLOT_COUNTS.r32, ROUND_NAMES.r32),
    r16: pad(buckets.r16, SLOT_COUNTS.r16, ROUND_NAMES.r16),
    qf: pad(buckets.qf, SLOT_COUNTS.qf, ROUND_NAMES.qf),
    sf: pad(buckets.sf, SLOT_COUNTS.sf, ROUND_NAMES.sf),
    final: pad(buckets.final, SLOT_COUNTS.final, ROUND_NAMES.final),
  };
}
```

- [ ] **Step 6: Run tests — confirm they pass**

```bash
npm test
```

Expected: 7 bracket tests + 4 cache tests = 11 passing.

- [ ] **Step 7: Rewrite `src/pages/api/bracket.ts`**

```typescript
import type { APIRoute } from 'astro';
import { getAllFixtures } from '../../lib/api-football';
import { groupKnockoutFixtures } from '../../lib/bracket';

export const GET: APIRoute = async () => {
  try {
    const fixtures = await getAllFixtures();
    const data = groupKnockoutFixtures(fixtures);
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=1800',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

- [ ] **Step 8: Manually verify the bracket endpoint**

With dev server running (`npm run dev`):

```bash
curl -s http://localhost:4321/api/bracket | \
  node -e "let d='';process.stdin.resume();process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const b=JSON.parse(d);console.log('r32:',b.r32?.length,'r16:',b.r16?.length,'qf:',b.qf?.length,'sf:',b.sf?.length,'final:',b.final?.length)})"
```

Expected: `r32: 16 r16: 8 qf: 4 sf: 2 final: 1`

- [ ] **Step 9: Commit**

```bash
git add src/types/index.ts src/lib/bracket.ts src/lib/bracket.test.ts src/pages/api/bracket.ts
git commit -m "feat: rewrite bracket API to return grouped knockout fixtures with TBD padding"
```

---

### Task 5: Update `BracketView.tsx`

**Files:**
- Modify: `src/components/islands/BracketView.tsx`

**Interfaces:**
- Consumes: `GET /api/bracket` → `BracketData` (from `src/types/index.ts`)
- Consumes: `TEAM_BY_CODE` from `src/lib/teams.ts`
- No unit tests — verified visually in browser

- [ ] **Step 1: Replace `src/components/islands/BracketView.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TEAM_BY_CODE } from '../../lib/teams';
import { supabase } from '../../lib/supabase';
import type { Fixture, BracketData } from '../../types';

const ROUND_LABELS: Array<[keyof BracketData, string]> = [
  ['r32', 'Round of 32'],
  ['r16', 'Round of 16'],
  ['qf', 'Quarter-finals'],
  ['sf', 'Semi-finals'],
  ['final', 'Final'],
];

function isTbd(f: Fixture) {
  return f.fixture.id === -1;
}

function teamDisplay(name: string) {
  if (name === 'TBD' || !name) {
    return { code: '?', name: 'TBD', kitPrimary: '#1a1f2a', kitAccent: '#3d4a5c', flag: '' };
  }
  for (const t of TEAM_BY_CODE.values()) {
    if (t.name === name) return t;
  }
  return { code: name.slice(0, 3).toUpperCase(), name, kitPrimary: '#222', kitAccent: '#fff', flag: '' };
}

interface BracketCardProps {
  match: Fixture;
  favCodes: Set<string>;
  kitCode: string;
  size?: 'sm' | 'md';
}

function BracketCard({ match, favCodes, kitCode, size = 'sm' }: BracketCardProps) {
  const tbd = isTbd(match);
  const home = teamDisplay(match.teams.home.name);
  const away = teamDisplay(match.teams.away.name);
  const done = match.fixture.status.short === 'FT';
  const homeWon = done && (match.goals.home ?? 0) > (match.goals.away ?? 0);
  const awayWon = done && (match.goals.away ?? 0) > (match.goals.home ?? 0);
  const homeThemed = !tbd && home.code === kitCode;
  const awayThemed = !tbd && away.code === kitCode;
  const homeFav = !tbd && favCodes.has(home.code);
  const awayFav = !tbd && favCodes.has(away.code);
  const highlighted = homeThemed || awayThemed;

  function rowStyle(themed: boolean, eliminated: boolean) {
    return {
      display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px',
      background: themed ? 'var(--kit-soft)' : 'transparent',
      opacity: eliminated ? 0.4 : 1,
      transition: 'background .15s',
    };
  }

  function nameColor(themed: boolean, fav: boolean) {
    if (tbd) return '#3d4a5c';
    if (themed) return 'var(--kit)';
    if (fav) return '#e9edf2';
    return '#aeb8c6';
  }

  function chipStyle(team: ReturnType<typeof teamDisplay>) {
    return {
      width: 30, height: 22, borderRadius: 4, flexShrink: 0 as const,
      display: 'grid', placeItems: 'center',
      font: "700 9.5px/1 'JetBrains Mono',monospace",
      background: tbd ? '#1a1f2a' : team.kitPrimary,
      color: tbd ? '#3d4a5c' : team.kitAccent,
    };
  }

  return (
    <motion.div
      whileHover={tbd ? {} : { y: -2 }}
      onClick={() => !tbd && (window.location.href = `/match/${match.fixture.id}`)}
      style={{
        borderRadius: 12, overflow: 'hidden',
        background: 'rgba(18,23,32,.9)',
        cursor: tbd ? 'default' : 'pointer',
        transition: 'transform .15s, border-color .15s',
        border: `1px solid ${highlighted ? 'var(--kit)' : (homeFav || awayFav) ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.07)'}`,
        boxShadow: highlighted ? '0 0 24px -10px var(--kit-glow)' : undefined,
        minWidth: size === 'md' ? 236 : 214,
      }}
    >
      <div style={rowStyle(homeThemed, done && !homeWon)}>
        <div style={chipStyle(home)}>{tbd ? '?' : home.code}</div>
        <span style={{ font: "600 15px/1 'Barlow Condensed',sans-serif", letterSpacing: '.3px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: nameColor(homeThemed, homeFav) }}>
          {home.name}
        </span>
        {!tbd && <span style={{ font: "700 16px/1 'Barlow Condensed',sans-serif", fontVariantNumeric: 'tabular-nums', color: homeWon ? 'var(--kit)' : '#6b7888' }}>{match.goals.home ?? ''}</span>}
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,.06)' }} />
      <div style={rowStyle(awayThemed, done && !awayWon)}>
        <div style={chipStyle(away)}>{tbd ? '?' : away.code}</div>
        <span style={{ font: "600 15px/1 'Barlow Condensed',sans-serif", letterSpacing: '.3px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: nameColor(awayThemed, awayFav) }}>
          {away.name}
        </span>
        {!tbd && <span style={{ font: "700 16px/1 'Barlow Condensed',sans-serif", fontVariantNumeric: 'tabular-nums', color: awayWon ? 'var(--kit)' : '#6b7888' }}>{match.goals.away ?? ''}</span>}
      </div>
    </motion.div>
  );
}

export default function BracketView() {
  const [data, setData] = useState<BracketData | null>(null);
  const [error, setError] = useState(false);
  const [favCodes, setFavCodes] = useState<Set<string>>(new Set());
  const [kitCode, setKitCode] = useState('');

  useEffect(() => {
    fetch('/api/bracket')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('user_favorites').select('*').eq('user_id', user.id).then(({ data: favData }) => {
        if (!favData) return;
        const codes = new Set(
          favData.map((f: any) => [...TEAM_BY_CODE.values()].find(t => t.id === f.team_id)?.code ?? '').filter(Boolean)
        ) as Set<string>;
        setFavCodes(codes);
        if (codes.size > 0) setKitCode([...codes][0]);
      });
    });
  }, []);

  const roundLabel = {
    color: '#6b7888',
    font: "700 11px/1 'JetBrains Mono',monospace",
    letterSpacing: '1.4px',
    textTransform: 'uppercase' as const,
    marginBottom: 14,
  };

  if (error) {
    return (
      <div style={{ padding: '40px 26px', color: '#5e6b7d', font: "500 13px/1.5 'Hanken Grotesk'" }}>
        Bracket data unavailable — try again shortly.
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '24px 26px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 40, minWidth: 1300 }}>
          {[4, 4, 4, 2, 1].map((skeletonCount, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 214 }}>
              <div style={{ height: 14, width: 90, borderRadius: 4, background: 'rgba(255,255,255,.07)', animation: 'blink 1.3s infinite' }} />
              {Array.from({ length: skeletonCount }).map((_, j) => (
                <div key={j} style={{ height: 66, borderRadius: 12, background: 'rgba(18,23,32,.9)', border: '1px solid rgba(255,255,255,.07)', animation: 'blink 1.3s infinite' }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section style={{ padding: '24px 0 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 26px 18px', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, font: "700 16px/1 'Barlow Condensed',sans-serif", letterSpacing: '1.4px', textTransform: 'uppercase', color: '#cdd6e2' }}>Knockout Stage</h2>
        <span style={{ font: "500 12px/1 'Hanken Grotesk'", color: '#5e6b7d' }}>Round of 32 → Final · scroll →</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, font: "500 11px/1 'Hanken Grotesk'", color: '#7c8a9c' }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--kit)', boxShadow: '0 0 10px -1px var(--kit-glow)', display: 'inline-block' }} />Your team
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, font: "500 11px/1 'Hanken Grotesk'", color: '#7c8a9c' }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(255,255,255,.07)', display: 'inline-block' }} />TBD
        </div>
      </div>

      <div style={{ overflowX: 'auto', padding: '6px 26px 20px' }}>
        <div style={{ display: 'flex', gap: 40, alignItems: 'stretch', minWidth: 1300, minHeight: 900 }}>
          {ROUND_LABELS.map(([key, label]) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', minWidth: key === 'final' ? 236 : 214 }}>
              <div style={{ ...roundLabel, color: key === 'final' ? 'var(--kit)' : '#6b7888' }}>{label}</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 12 }}>
                {data[key].map((f, i) => (
                  <BracketCard
                    key={f.fixture.id === -1 ? `tbd-${key}-${i}` : f.fixture.id}
                    match={f}
                    favCodes={favCodes}
                    kitCode={kitCode}
                    size={key === 'final' ? 'md' : 'sm'}
                  />
                ))}
                {key === 'final' && (
                  <div style={{ marginTop: 14, padding: 15, borderRadius: 12, border: '1px solid var(--kit)', background: 'var(--kit-soft)', textAlign: 'center' }}>
                    <div style={{ font: "700 9px/1 'JetBrains Mono',monospace", letterSpacing: '1.4px', color: 'var(--kit)', textTransform: 'uppercase' }}>Champions</div>
                    <div style={{ font: "600 22px/1 'Barlow Condensed',sans-serif", color: '#e9edf2', marginTop: 7 }}>To be decided</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify in the browser**

Navigate to `http://localhost:4321/bracket`.

Check all of:
- 5 columns render in order: Round of 32, Round of 16, QF, SF, Final
- R32 shows real team matchups for played matches; unset slots show `?` chip and muted "TBD" name
- TBD cards do not navigate when clicked
- Real match cards navigate to `/match/{id}` when clicked
- Error state: temporarily change `/api/bracket` to `/api/bracket-broken` in the `fetch()` call, confirm the error message renders, then revert

- [ ] **Step 3: Commit**

```bash
git add src/components/islands/BracketView.tsx
git commit -m "feat: replace static bracket data with live knockout fixtures"
```

---

### Task 6: Update `YourTeams.tsx` — real next match

**Files:**
- Modify: `src/components/islands/YourTeams.tsx`

**Interfaces:**
- Consumes: `GET /api/team-fixtures/:id` → `Fixture[]`
- No unit tests — verified visually in browser

- [ ] **Step 1: Replace `src/components/islands/YourTeams.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { supabase, getFavorites } from '../../lib/supabase';
import { TEAM_MAP } from '../../lib/teams';
import type { UserFavorite } from '../../lib/supabase';
import type { Fixture } from '../../types';

function formatMatchDate(dateStr: string): string {
  const d = new Date(dateStr);
  const datePart = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const timePart = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

function NextMatch({ teamId, kitAccent }: { teamId: number; kitAccent: string }) {
  const [next, setNext] = useState<Fixture | null | 'loading'>('loading');

  useEffect(() => {
    fetch(`/api/team-fixtures/${teamId}`)
      .then(r => r.json())
      .then((fixtures: Fixture[]) => {
        if (!Array.isArray(fixtures)) { setNext(null); return; }
        const upcoming = fixtures
          .filter(f => f.fixture.status.short === 'NS')
          .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());
        setNext(upcoming[0] ?? null);
      })
      .catch(() => setNext(null));
  }, [teamId]);

  const rowStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '9px 11px', borderRadius: 9, background: 'rgba(0,0,0,.25)',
  };

  if (next === 'loading') {
    return (
      <div style={rowStyle}>
        <div style={{ height: 13, width: 110, borderRadius: 4, background: 'rgba(255,255,255,.07)', animation: 'blink 1.3s infinite' }} />
      </div>
    );
  }

  if (!next) {
    return (
      <div style={rowStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ font: "600 8.5px/1 'JetBrains Mono',monospace", letterSpacing: '1px', color: '#6b7888', textTransform: 'uppercase' }}>Next match</span>
          <span style={{ font: "500 13px/1.1 'Hanken Grotesk'", color: '#cdd6e2' }}>—</span>
        </div>
      </div>
    );
  }

  const opp = next.teams.home.id === teamId ? next.teams.away.name : next.teams.home.name;
  return (
    <div style={rowStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ font: "600 8.5px/1 'JetBrains Mono',monospace", letterSpacing: '1px', color: '#6b7888', textTransform: 'uppercase' }}>Next match</span>
        <span style={{ font: "500 13px/1.1 'Hanken Grotesk'", color: '#cdd6e2' }}>vs {opp}</span>
      </div>
      <span style={{ font: "600 11px/1.2 'JetBrains Mono',monospace", color: kitAccent, textAlign: 'right' }}>
        {formatMatchDate(next.fixture.date)}
      </span>
    </div>
  );
}

export default function YourTeams() {
  const [favs, setFavs] = useState<UserFavorite[]>([]);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setAuthed(false); return; }
      setAuthed(true);
      getFavorites(user.id).then(setFavs).catch(() => {});
    });
  }, []);

  if (!authed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ padding: '20px 16px', borderRadius: 16, background: 'linear-gradient(160deg,rgba(22,28,38,.95),rgba(14,18,25,.95))', border: '1px solid rgba(255,255,255,.08)', textAlign: 'center' }}>
          <div style={{ font: "600 16px/1.3 'Barlow Condensed',sans-serif", letterSpacing: '.3px', marginBottom: 8, color: '#cdd6e2' }}>Pin your teams</div>
          <div style={{ font: "500 12px/1.5 'Hanken Grotesk'", color: '#5e6b7d', marginBottom: 14 }}>Sign in to save up to 5 national teams — Pitch repaints in their kit every match day.</div>
          <a href="/auth" style={{ display: 'block', padding: '11px 16px', borderRadius: 10, background: 'var(--kit)', color: 'var(--kit-contrast)', font: "700 13px/1 'Hanken Grotesk'", textDecoration: 'none', textAlign: 'center' }}>
            Sign in to save teams
          </a>
        </div>
      </div>
    );
  }

  if (!favs.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <a href="/auth" style={{ padding: 13, borderRadius: 13, border: '1px dashed rgba(255,255,255,.16)', color: '#7c8a9c', font: "600 12px/1 'Hanken Grotesk'", letterSpacing: '.3px', textDecoration: 'none', display: 'block', textAlign: 'center', transition: 'all .15s' }}>
          + Pin your first team
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {favs.map(fav => {
        const team = TEAM_MAP.get(fav.team_id);
        const isActive = team?.kitAccent === getComputedStyle(document.documentElement).getPropertyValue('--kit').trim();
        return (
          <div
            key={fav.id}
            style={{
              padding: '15px 16px', borderRadius: 16,
              background: 'linear-gradient(160deg,rgba(22,28,38,.95),rgba(14,18,25,.95))',
              transition: 'transform .16s',
              border: isActive ? '1px solid var(--kit)' : '1px solid rgba(255,255,255,.08)',
              boxShadow: isActive ? '0 0 30px -10px var(--kit-glow)' : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 13 }}>
              <div style={{ width: 42, height: 31, borderRadius: 6, flexShrink: 0, display: 'grid', placeItems: 'center', font: "700 12px/1 'JetBrains Mono',monospace", background: fav.kit_primary, color: fav.kit_accent }}>
                {team?.code ?? '?'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ font: "600 21px/1 'Barlow Condensed',sans-serif", letterSpacing: '.3px' }}>{fav.team_name}</div>
                <div style={{ font: "600 10px/1 'JetBrains Mono',monospace", color: '#6b7888', marginTop: 3, letterSpacing: '.5px' }}>GROUP {team?.group ?? '–'}</div>
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: isActive ? 'var(--kit)' : 'rgba(255,255,255,.2)', display: 'inline-block', boxShadow: isActive ? '0 0 14px 1px var(--kit-glow)' : undefined }} />
            </div>
            <NextMatch teamId={fav.team_id} kitAccent={fav.kit_accent} />
          </div>
        );
      })}
      <a href="/auth" style={{ padding: 13, borderRadius: 13, border: '1px dashed rgba(255,255,255,.16)', color: '#7c8a9c', font: "600 12px/1 'Hanken Grotesk'", letterSpacing: '.3px', display: 'block', textAlign: 'center', textDecoration: 'none', transition: 'all .15s' }}>
        + Pin another team
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Verify in the browser**

Navigate to `http://localhost:4321` (home page). Sign in if needed and pin a team.

Check all of:
- Team card renders immediately (name, group, kit chip visible)
- "Next match" row shows a skeleton, then resolves to `vs [Opponent] · [Day D Mon · HH:MM]`
- Times are in your local timezone (not UTC)
- If a team has no upcoming NS fixture, row shows `—`
- Unauthenticated state shows "Pin your teams" CTA (unchanged)
- No pinned teams shows "Pin your first team" link (unchanged)

- [ ] **Step 3: Run all tests one final time**

```bash
npm test
```

Expected: 11 passing tests (4 cache + 7 bracket).

- [ ] **Step 4: Commit**

```bash
git add src/components/islands/YourTeams.tsx
git commit -m "feat: show real next match in YourTeams from live fixture data"
```
