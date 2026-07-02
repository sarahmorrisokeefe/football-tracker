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
  // Don't cache empty arrays — a transient empty response would poison the cache
  // for the full TTL, hiding real data when it becomes available
  if (!Array.isArray(data) || data.length > 0) {
    _cache.set(key, { data, expires: Date.now() + ttlMs });
  }
  return data;
}

async function apiFetch(path: string, params: Record<string, string | number> = {}) {
  const key = import.meta.env.API_FOOTBALL_KEY;
  if (!key) throw new Error('API_FOOTBALL_KEY is not set — add it to your Vercel environment variables');
  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url.toString(), {
    headers: {
      'x-apisports-key': key,
      'x-rapidapi-key': key,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  if (!res.ok) {
    const err = new Error(`API-Football ${path} → ${res.status}`);
    console.error('[api-football]', err.message);
    throw err;
  }
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length) {
    const err = new Error(`API-Football error: ${JSON.stringify(json.errors)}`);
    console.error('[api-football]', err.message);
    throw err;
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
