import { TEAMS } from './teams';
import type { Fixture } from '../types';

const BASE = 'https://api.football-data.org/v4';
const WC = 'WC';

const LIVE_TTL = 60_000;
const FIXTURE_TTL = 1_800_000;

// Map football-data.org team names/codes → our internal api-football IDs.
// This preserves every downstream comparison: MapView next-match, MatchDetail kit lookup,
// getTeamFixtures filtering, and Supabase favorites (which store api-football IDs).
const NAME_TO_ID = new Map(TEAMS.map(t => [t.name, t.id]));
const CODE_TO_ID = new Map(TEAMS.map(t => [t.code, t.id]));

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
  // Don't cache empty arrays — a transient empty response would poison the cache
  // for the full TTL, hiding real data when it becomes available
  if (!Array.isArray(data) || data.length > 0) {
    _cache.set(key, { data, expires: Date.now() + ttlMs });
  }
  return data;
}

async function fdoFetch(path: string): Promise<any> {
  const key = import.meta.env.FOOTBALL_DATA_KEY;
  if (!key) throw new Error('FOOTBALL_DATA_KEY is not set — add it to your Vercel environment variables');

  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': key },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`football-data.org ${path} → ${res.status}: ${body}`);
    console.error('[football-data]', err.message);
    throw err;
  }
  return res.json();
}

function normalizeTeamId(name: string, tla: string, fdoId: number): number {
  return NAME_TO_ID.get(name) ?? CODE_TO_ID.get(tla) ?? fdoId;
}

function mapStatus(m: any): { long: string; short: string; elapsed: number | null } {
  const minute = m.minute ?? null;
  switch (m.status) {
    case 'TIMED':
    case 'SCHEDULED': return { long: 'Not Started', short: 'NS', elapsed: null };
    case 'IN_PLAY': {
      const half = (minute ?? 0) > 45 ? '2H' : '1H';
      return { long: half === '1H' ? 'First Half' : 'Second Half', short: half, elapsed: minute };
    }
    case 'PAUSED': return { long: 'Half Time', short: 'HT', elapsed: 45 };
    case 'EXTRA_TIME': return { long: 'Extra Time', short: 'ET', elapsed: minute };
    case 'PENALTY_SHOOTOUT': return { long: 'Penalty', short: 'P', elapsed: minute };
    case 'FINISHED': {
      const d = m.score?.duration ?? 'REGULAR';
      if (d === 'PENALTY_SHOOTOUT') return { long: 'Penalty', short: 'PEN', elapsed: null };
      if (d === 'EXTRA_TIME') return { long: 'Extra Time', short: 'AET', elapsed: null };
      return { long: 'Match Finished', short: 'FT', elapsed: null };
    }
    case 'POSTPONED': return { long: 'Postponed', short: 'PST', elapsed: null };
    case 'SUSPENDED': return { long: 'Suspended', short: 'SUSP', elapsed: null };
    case 'CANCELLED': return { long: 'Cancelled', short: 'CANC', elapsed: null };
    default: return { long: m.status ?? '', short: (m.status ?? '??').slice(0, 2), elapsed: null };
  }
}

function mapStage(stage: string, group: string | null): string {
  switch (stage) {
    case 'GROUP_STAGE': return group ? `Group ${group}` : 'Group Stage';
    case 'ROUND_OF_32': return 'Round of 32';
    case 'ROUND_OF_16': return 'Round of 16';
    case 'QUARTER_FINALS': return 'Quarter-finals';
    case 'SEMI_FINALS': return 'Semi-finals';
    case 'THIRD_PLACE': return 'Third Place';
    case 'FINAL': return 'Final';
    default: return stage ?? '';
  }
}

function mapMatch(m: any): Fixture {
  const homeId = normalizeTeamId(m.homeTeam?.name ?? '', m.homeTeam?.tla ?? '', m.homeTeam?.id ?? -1);
  const awayId = normalizeTeamId(m.awayTeam?.name ?? '', m.awayTeam?.tla ?? '', m.awayTeam?.id ?? -1);
  const winner = m.score?.winner;

  return {
    fixture: {
      id: m.id,
      date: m.utcDate,
      status: mapStatus(m),
      venue: { name: m.venue ?? '', city: '' },
    },
    league: {
      id: 2000,
      name: 'FIFA World Cup',
      round: mapStage(m.stage ?? 'GROUP_STAGE', m.group ?? null),
    },
    teams: {
      home: {
        id: homeId,
        name: m.homeTeam?.name ?? 'TBD',
        logo: m.homeTeam?.crest ?? '',
        winner: winner === 'HOME_TEAM' ? true : winner === 'AWAY_TEAM' ? false : null,
      },
      away: {
        id: awayId,
        name: m.awayTeam?.name ?? 'TBD',
        logo: m.awayTeam?.crest ?? '',
        winner: winner === 'AWAY_TEAM' ? true : winner === 'HOME_TEAM' ? false : null,
      },
    },
    goals: {
      home: m.score?.fullTime?.home ?? null,
      away: m.score?.fullTime?.away ?? null,
    },
    score: {
      halftime: {
        home: m.score?.halfTime?.home ?? null,
        away: m.score?.halfTime?.away ?? null,
      },
      fulltime: {
        home: m.score?.fullTime?.home ?? null,
        away: m.score?.fullTime?.away ?? null,
      },
    },
  };
}

// Map football-data.org goal/booking/substitution arrays → api-football event format
// so MatchDetail's EventIcon (Goal / Card / subst) and player-name fields work unchanged.
function mapEvents(m: any): any[] {
  const events: any[] = [];

  for (const g of m.goals ?? []) {
    events.push({
      time: { elapsed: g.minute },
      type: 'Goal',
      detail: g.type === 'OWN_GOAL' ? 'Own Goal' : 'Normal Goal',
      player: { name: g.scorer?.name ?? '?' },
      assist: g.assist ? { name: g.assist.name } : null,
      team: { name: g.team?.name ?? '' },
    });
  }

  for (const b of m.bookings ?? []) {
    events.push({
      time: { elapsed: b.minute },
      type: 'Card',
      detail: b.card === 'YELLOW_CARD' ? 'Yellow Card' : 'Red Card',
      player: { name: b.player?.name ?? '?' },
      assist: null,
      team: { name: b.team?.name ?? '' },
    });
  }

  for (const s of m.substitutions ?? []) {
    events.push({
      time: { elapsed: s.minute },
      type: 'subst',
      detail: '',
      player: { name: s.playerOut?.name ?? '?' },
      assist: { name: s.playerIn?.name ?? '?' },
      team: { name: s.team?.name ?? '' },
    });
  }

  return events.sort((a, b) => (a.time?.elapsed ?? 0) - (b.time?.elapsed ?? 0));
}

// Cache the raw football-data.org match response so getFixtureById and
// getFixtureEvents both call the API at most once per match per TTL window.
async function fetchRawMatch(id: number): Promise<any> {
  return cachedFetch(`raw-match-${id}`, () => fdoFetch(`/matches/${id}`), LIVE_TTL);
}

export async function getLiveFixtures(): Promise<Fixture[]> {
  return cachedFetch('live', async () => {
    const json = await fdoFetch(`/competitions/${WC}/matches?status=IN_PLAY,PAUSED,EXTRA_TIME,PENALTY_SHOOTOUT`);
    return (json.matches ?? []).map(mapMatch);
  }, LIVE_TTL);
}

export async function getFixturesByDate(date: string): Promise<Fixture[]> {
  return cachedFetch(`fixtures-date-${date}`, async () => {
    const json = await fdoFetch(`/competitions/${WC}/matches?dateFrom=${date}&dateTo=${date}`);
    return (json.matches ?? []).map(mapMatch);
  }, LIVE_TTL);
}

export async function getAllFixtures(): Promise<Fixture[]> {
  return cachedFetch('all-fixtures', async () => {
    const json = await fdoFetch(`/competitions/${WC}/matches`);
    return (json.matches ?? []).map(mapMatch);
  }, FIXTURE_TTL);
}

// Returns a single-element array for backward compat with /api/match/[id].ts
export async function getFixtureById(id: number): Promise<Fixture[]> {
  const m = await fetchRawMatch(id);
  return [mapMatch(m)];
}

// Events come from the single-match endpoint — no extra API call (shared cache key)
export async function getFixtureEvents(id: number): Promise<any[]> {
  const m = await fetchRawMatch(id);
  return mapEvents(m);
}

// football-data.org free tier does not include lineups
export async function getFixtureLineups(_id: number): Promise<any[]> {
  return [];
}

// football-data.org free tier does not include match statistics
export async function getFixtureStats(_id: number): Promise<any[]> {
  return [];
}

// Filter from cached all-fixtures — team IDs are normalized to api-football IDs in mapMatch,
// so this filter works correctly with Supabase-stored api-football team IDs.
export async function getTeamFixtures(teamId: number): Promise<Fixture[]> {
  const all = await getAllFixtures();
  return all.filter(f => f.teams.home.id === teamId || f.teams.away.id === teamId);
}

// football-data.org team/squad info requires their own team IDs (different from api-football).
// Squad section in MapView is already gated on squad.length > 0, so returning null is safe.
export async function getTeamInfo(_teamId: number): Promise<{ info: null; squad: null }> {
  return { info: null, squad: null };
}

export async function getStandings(_leagueId?: number): Promise<any[]> {
  return cachedFetch('standings', async () => {
    const json = await fdoFetch(`/competitions/${WC}/standings`);
    return json.standings ?? [];
  }, FIXTURE_TTL);
}
