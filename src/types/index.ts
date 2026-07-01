export interface Fixture {
  fixture: {
    id: number;
    date: string;
    status: { long: string; short: string; elapsed: number | null };
    venue: { name: string; city: string };
  };
  league: { id: number; name: string; round: string };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
  };
}

export interface FixtureEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string };
  player: { id: number; name: string };
  assist: { id: number | null; name: string | null };
  type: string;
  detail: string;
  comments: string | null;
}

export interface Standing {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  group: string;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
}

export interface TeamKit {
  id: number;
  name: string;
  flag: string;
  code: string;
  kitPrimary: string;
  kitAccent: string;
  group?: string;
  lon?: number;
  lat?: number;
}

export interface UserFav {
  teamId: number;
  teamName: string;
  kitPrimary: string;
  kitAccent: string;
}
