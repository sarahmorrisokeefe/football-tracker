const BASE = 'https://v3.football.api-sports.io';
const WC_LEAGUE = 1;
const WC_SEASON = 2026;

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
  return apiFetch('/fixtures', { live: 'all', league: WC_LEAGUE, season: WC_SEASON });
}

export async function getFixturesByDate(date: string) {
  return apiFetch('/fixtures', { date, league: WC_LEAGUE, season: WC_SEASON });
}

export async function getFixtureById(id: number) {
  return apiFetch('/fixtures', { id });
}

export async function getStandings(leagueId = WC_LEAGUE) {
  return apiFetch('/standings', { league: leagueId, season: WC_SEASON });
}

export async function getTeamInfo(teamId: number) {
  const [info, squad] = await Promise.all([
    apiFetch('/teams', { id: teamId }),
    apiFetch('/players/squads', { team: teamId }),
  ]);
  return { info: info[0], squad: squad[0] };
}

export async function getTeamFixtures(teamId: number) {
  return apiFetch('/fixtures', { team: teamId, league: WC_LEAGUE, season: WC_SEASON });
}

export async function getFixtureLineups(fixtureId: number) {
  return apiFetch('/fixtures/lineups', { fixture: fixtureId });
}

export async function getFixtureEvents(fixtureId: number) {
  return apiFetch('/fixtures/events', { fixture: fixtureId });
}

export async function getFixtureStats(fixtureId: number) {
  return apiFetch('/fixtures/statistics', { fixture: fixtureId });
}
