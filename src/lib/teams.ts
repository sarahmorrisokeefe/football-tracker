import type { TeamKit } from '../types';

// API-Football team IDs for WC 2026 nations (confirmed via /teams?league=1&season=2026)
// kitPrimary = jersey background, kitAccent = glowing accent colour shown in UI
export const TEAMS: TeamKit[] = [
  { id: 10,   code: 'GER', name: 'Germany',       flag: '🇩🇪', kitPrimary: '#17191e', kitAccent: '#FFCC00', group: 'E', lon: 10.4,   lat: 51.2 },
  { id: 35,   code: 'JPN', name: 'Japan',          flag: '🇯🇵', kitPrimary: '#1b2a6b', kitAccent: '#4D7BFF', group: 'E', lon: 138,    lat: 37 },
  { id: 6,    code: 'BRA', name: 'Brazil',         flag: '🇧🇷', kitPrimary: '#0aa64b', kitAccent: '#00D26A', group: 'G', lon: -51,    lat: -10 },
  { id: 15,   code: 'SUI', name: 'Switzerland',    flag: '🇨🇭', kitPrimary: '#d52b1e', kitAccent: '#FF4A4A', group: 'G', lon: 8.4,    lat: 46.6 },
  { id: 2,    code: 'FRA', name: 'France',         flag: '🇫🇷', kitPrimary: '#20347d', kitAccent: '#3B72FF', group: 'D', lon: 1.8,    lat: 46.8 },
  { id: 31,   code: 'SEN', name: 'Senegal',        flag: '🇸🇳', kitPrimary: '#00853f', kitAccent: '#19D38C', group: 'D', lon: -14.5,  lat: 14.7 },
  { id: 26,   code: 'ARG', name: 'Argentina',      flag: '🇦🇷', kitPrimary: '#73b6e6', kitAccent: '#5DB3F2', group: 'C', lon: -65,    lat: -37 },
  { id: 16,   code: 'MEX', name: 'Mexico',         flag: '🇲🇽', kitPrimary: '#0c7c43', kitAccent: '#19C37D', group: 'A', lon: -102,   lat: 23.5 },
  { id: 8,    code: 'ENG', name: 'England',        flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', kitPrimary: '#e8e8ec', kitAccent: '#F23A3C', group: 'F', lon: -2.5,   lat: 53.4 },
  { id: 1,    code: 'NED', name: 'Netherlands',    flag: '🇳🇱', kitPrimary: '#f36c21', kitAccent: '#FF7A1A', group: 'B', lon: 5.7,    lat: 52.7 },
  { id: 9,    code: 'ESP', name: 'Spain',          flag: '🇪🇸', kitPrimary: '#c60b1e', kitAccent: '#FF3B5C', group: 'H', lon: -3.7,   lat: 40.2 },
  { id: 27,   code: 'POR', name: 'Portugal',       flag: '🇵🇹', kitPrimary: '#0a6b2e', kitAccent: '#2FD08A', group: 'H', lon: -9.5,   lat: 39.6 },
  { id: 2088, code: 'USA', name: 'USA',            flag: '🇺🇸', kitPrimary: '#2a4b9b', kitAccent: '#3B82F6', group: 'A', lon: -99,    lat: 39 },
  { id: 101,  code: 'CAN', name: 'Canada',         flag: '🇨🇦', kitPrimary: '#d52b1e', kitAccent: '#FF4D4D', group: 'B', lon: -110,   lat: 58 },
  { id: 3,    code: 'CRO', name: 'Croatia',        flag: '🇭🇷', kitPrimary: '#c8102e', kitAccent: '#E94B5A', group: 'F', lon: 16.4,   lat: 45.3 },
  { id: 21,   code: 'URU', name: 'Uruguay',        flag: '🇺🇾', kitPrimary: '#5ca9dd', kitAccent: '#6FB6FF', group: 'C', lon: -56,    lat: -33 },
  { id: 11,   code: 'COL', name: 'Colombia',       flag: '🇨🇴', kitPrimary: '#f7d417', kitAccent: '#FFD23B', group: 'J', lon: -74,    lat: 4.5 },
  { id: 17,   code: 'KOR', name: 'South Korea',    flag: '🇰🇷', kitPrimary: '#c8102e', kitAccent: '#FF455A', group: 'I', lon: 127.9,  lat: 36.3 },
  { id: 34,   code: 'NGA', name: 'Nigeria',        flag: '🇳🇬', kitPrimary: '#0a8a4f', kitAccent: '#27CE8C', group: 'K', lon: 8.5,    lat: 9.5 },
  { id: 32,   code: 'MAR', name: 'Morocco',        flag: '🇲🇦', kitPrimary: '#c1272d', kitAccent: '#E23B4A', group: 'L', lon: -7,     lat: 31.8 },
  { id: 4,    code: 'BEL', name: 'Belgium',        flag: '🇧🇪', kitPrimary: '#e30613', kitAccent: '#FFC23B', group: 'J', lon: 3.6,    lat: 50.9 },
  { id: 2096, code: 'CRC', name: 'Costa Rica',     flag: '🇨🇷', kitPrimary: '#002b7f', kitAccent: '#4D8DFF', group: 'A', lon: -84,    lat: 9.6 },
  { id: 25,   code: 'AUS', name: 'Australia',      flag: '🇦🇺', kitPrimary: '#f4c500', kitAccent: '#FFD23B', group: 'I', lon: 134,    lat: -25 },
  { id: 33,   code: 'GHA', name: 'Ghana',          flag: '🇬🇭', kitPrimary: '#157a3e', kitAccent: '#FFB23B', group: 'K', lon: -1.2,   lat: 7.9 },
  { id: 29,   code: 'CMR', name: 'Cameroon',       flag: '🇨🇲', kitPrimary: '#0a8a5e', kitAccent: '#1FC987', group: 'L', lon: 12.5,   lat: 5.7 },
  { id: 5,    code: 'DEN', name: 'Denmark',        flag: '🇩🇰', kitPrimary: '#c8102e', kitAccent: '#FF5B6B', group: 'B', lon: 10,     lat: 56.4 },
  { id: 20,   code: 'IRN', name: 'Iran',           flag: '🇮🇷', kitPrimary: '#239f40', kitAccent: '#1FBE6A', group: 'I', lon: 53.5,   lat: 32.5 },
  { id: 36,   code: 'KSA', name: 'Saudi Arabia',   flag: '🇸🇦', kitPrimary: '#0a6c35', kitAccent: '#16B36A', group: 'C', lon: 45.5,   lat: 24 },
  { id: 7,    code: 'ECU', name: 'Ecuador',        flag: '🇪🇨', kitPrimary: '#f7c700', kitAccent: '#FFCB2E', group: 'J', lon: -78.5,  lat: -1.5 },
  { id: 22,   code: 'QAT', name: 'Qatar',          flag: '🇶🇦', kitPrimary: '#8a1538', kitAccent: '#D24D7E', group: 'D', lon: 51.2,   lat: 25.3 },
];

export const TEAM_MAP = new Map(TEAMS.map(t => [t.id, t]));
export const TEAM_BY_CODE = new Map(TEAMS.map(t => [t.code, t]));

export function getKit(teamId: number) {
  return TEAM_MAP.get(teamId) ?? TEAMS[0];
}

export function kitVars(team: TeamKit) {
  const hex = (h: string, a: number) => {
    const n = parseInt(h.replace('#', ''), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  return {
    '--kit': team.kitAccent,
    '--kit-contrast': team.kitPrimary,
    '--kit-glow': hex(team.kitAccent, 0.5),
    '--kit-soft': hex(team.kitAccent, 0.14),
  };
}
