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
