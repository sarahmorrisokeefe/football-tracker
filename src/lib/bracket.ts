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
