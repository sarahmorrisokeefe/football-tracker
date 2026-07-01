import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TEAM_BY_CODE } from '../../lib/teams';
import { supabase } from '../../lib/supabase';

// Static 2026 WC bracket (will be replaced by real API data once tournament starts)
const R16 = [
  { id: 'r16-1', home: 'GER', away: 'SUI', hg: 3, ag: 0, done: true },
  { id: 'r16-2', home: 'ESP', away: 'URU', hg: 2, ag: 1, done: true },
  { id: 'r16-3', home: 'FRA', away: 'POR', hg: 2, ag: 1, done: true },
  { id: 'r16-4', home: 'BRA', away: 'KOR', hg: 4, ag: 1, done: true },
  { id: 'r16-5', home: 'ARG', away: 'NGA', hg: 2, ag: 0, done: true },
  { id: 'r16-6', home: 'ENG', away: 'SEN', hg: 1, ag: 0, done: true },
  { id: 'r16-7', home: 'NED', away: 'MEX', hg: 3, ag: 2, done: true },
  { id: 'r16-8', home: 'CRO', away: 'USA', hg: 2, ag: 1, done: true },
];
const QF = [
  { id: 'qf-1', home: 'GER', away: 'ESP', hg: 2, ag: 1, done: true },
  { id: 'qf-2', home: 'BRA', away: 'FRA', hg: 1, ag: 0, done: true },
  { id: 'qf-3', home: 'ARG', away: 'ENG', hg: 2, ag: 1, done: true },
  { id: 'qf-4', home: 'NED', away: 'CRO', hg: 1, ag: 0, done: true },
];
const SF = [
  { id: 'sf-1', home: 'GER', away: 'BRA', hg: 1, ag: 0, done: true },
  { id: 'sf-2', home: 'ARG', away: 'NED', hg: 3, ag: 2, done: true },
];
const FINAL = [{ id: 'final', home: 'GER', away: 'ARG', hg: null, ag: null, done: false }];

function teamDisplay(code: string) {
  return TEAM_BY_CODE.get(code) ?? { code, name: code, kitPrimary: '#222', kitAccent: '#fff', flag: '' };
}

interface MatchCardProps {
  match: { id: string; home: string; away: string; hg: number | null; ag: number | null; done: boolean };
  favCodes: Set<string>;
  kitCode: string;
  size?: 'sm' | 'md';
}

function BracketCard({ match, favCodes, kitCode, size = 'sm' }: MatchCardProps) {
  const home = teamDisplay(match.home);
  const away = teamDisplay(match.away);
  const homeWon = match.done && match.hg !== null && match.ag !== null && match.hg > match.ag;
  const awayWon = match.done && match.hg !== null && match.ag !== null && match.ag > match.hg;
  const homeThemed = match.home === kitCode;
  const awayThemed = match.away === kitCode;
  const homeFav = favCodes.has(match.home);
  const awayFav = favCodes.has(match.away);
  const highlighted = homeThemed || awayThemed;

  function rowStyle(themed: boolean, fav: boolean, elim: boolean) {
    return {
      display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px',
      background: themed ? 'var(--kit-soft)' : 'transparent',
      opacity: elim ? 0.4 : 1,
      transition: 'background .15s',
    };
  }

  function nameColor(themed: boolean, fav: boolean) {
    if (themed) return 'var(--kit)';
    if (fav) return '#e9edf2';
    return '#aeb8c6';
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={() => window.location.href = `/match/${match.id}`}
      style={{
        borderRadius: 12, overflow: 'hidden',
        background: 'rgba(18,23,32,.9)', cursor: 'pointer',
        transition: 'transform .15s, border-color .15s',
        border: `1px solid ${highlighted ? 'var(--kit)' : (homeFav || awayFav) ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.07)'}`,
        boxShadow: highlighted ? '0 0 24px -10px var(--kit-glow)' : undefined,
        minWidth: size === 'md' ? 236 : 214,
      }}
    >
      {/* Home */}
      <div style={rowStyle(homeThemed, homeFav, match.done && !homeWon)}>
        <div style={{ width: 30, height: 22, borderRadius: 4, flexShrink: 0, display: 'grid', placeItems: 'center', font: "700 9.5px/1 'JetBrains Mono',monospace", background: home.kitPrimary, color: home.kitAccent }}>{home.code}</div>
        <span style={{ font: "600 15px/1 'Barlow Condensed',sans-serif", letterSpacing: '.3px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: nameColor(homeThemed, homeFav) }}>{home.name}</span>
        <span style={{ font: "700 16px/1 'Barlow Condensed',sans-serif", fontVariantNumeric: 'tabular-nums', color: homeWon ? 'var(--kit)' : '#6b7888' }}>{match.hg ?? ''}</span>
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,.06)' }} />
      {/* Away */}
      <div style={rowStyle(awayThemed, awayFav, match.done && !awayWon)}>
        <div style={{ width: 30, height: 22, borderRadius: 4, flexShrink: 0, display: 'grid', placeItems: 'center', font: "700 9.5px/1 'JetBrains Mono',monospace", background: away.kitPrimary, color: away.kitAccent }}>{away.code}</div>
        <span style={{ font: "600 15px/1 'Barlow Condensed',sans-serif", letterSpacing: '.3px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: nameColor(awayThemed, awayFav) }}>{away.name}</span>
        <span style={{ font: "700 16px/1 'Barlow Condensed',sans-serif", fontVariantNumeric: 'tabular-nums', color: awayWon ? 'var(--kit)' : '#6b7888' }}>{match.ag ?? ''}</span>
      </div>
    </motion.div>
  );
}

export default function BracketView() {
  const [favCodes, setFavCodes] = useState<Set<string>>(new Set());
  const [kitCode, setKitCode] = useState('GER');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('user_favorites').select('*').eq('user_id', user.id).then(({ data }) => {
        if (data) {
          const codes = new Set(data.map((f: any) => {
            // map team_id back to code
            const entry = [...TEAM_BY_CODE.values()].find(t => t.id === f.team_id);
            return entry?.code ?? '';
          }).filter(Boolean));
          setFavCodes(codes);
          if (codes.size > 0) setKitCode([...codes][0]);
        }
      });
    });
  }, []);

  const roundLabel = { color: '#6b7888', font: "700 11px/1 'JetBrains Mono',monospace", letterSpacing: '1.4px', textTransform: 'uppercase' as const, marginBottom: 14 };

  return (
    <section style={{ padding: '24px 0 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 26px 18px' }}>
        <h2 style={{ margin: 0, font: "700 16px/1 'Barlow Condensed',sans-serif", letterSpacing: '1.4px', textTransform: 'uppercase', color: '#cdd6e2' }}>Knockout Stage</h2>
        <span style={{ font: "500 12px/1 'Hanken Grotesk'", color: '#5e6b7d' }}>Round of 16 → Final · scroll →</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, font: "500 11px/1 'Hanken Grotesk'", color: '#7c8a9c' }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--kit)', boxShadow: '0 0 10px -1px var(--kit-glow)', display: 'inline-block' }} />Your team
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, font: "500 11px/1 'Hanken Grotesk'", color: '#7c8a9c' }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(255,255,255,.14)', display: 'inline-block' }} />Eliminated
        </div>
      </div>

      <div style={{ overflowX: 'auto', padding: '6px 26px 20px' }}>
        <div style={{ display: 'flex', gap: 40, alignItems: 'stretch', minWidth: 1000, minHeight: 660 }}>

          {/* R16 */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 214 }}>
            <div style={roundLabel}>Round of 16</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
              {R16.map(m => <BracketCard key={m.id} match={m} favCodes={favCodes} kitCode={kitCode} />)}
            </div>
          </div>

          {/* QF */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 214 }}>
            <div style={roundLabel}>Quarter-finals</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 12 }}>
              {QF.map(m => <BracketCard key={m.id} match={m} favCodes={favCodes} kitCode={kitCode} />)}
            </div>
          </div>

          {/* SF */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 214 }}>
            <div style={roundLabel}>Semi-finals</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 12 }}>
              {SF.map(m => <BracketCard key={m.id} match={m} favCodes={favCodes} kitCode={kitCode} />)}
            </div>
          </div>

          {/* Final */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 236 }}>
            <div style={{ ...roundLabel, color: 'var(--kit)' }}>Final</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
              <div>
                <div style={{ textAlign: 'center', font: "700 10px/1 'JetBrains Mono',monospace", letterSpacing: '1.4px', color: '#6b7888', marginBottom: 10 }}>JUL 19 · METLIFE STADIUM</div>
                <BracketCard match={FINAL[0]} favCodes={favCodes} kitCode={kitCode} size="md" />
                <div style={{ marginTop: 14, padding: 15, borderRadius: 12, border: '1px solid var(--kit)', background: 'var(--kit-soft)', textAlign: 'center' }}>
                  <div style={{ font: "700 9px/1 'JetBrains Mono',monospace", letterSpacing: '1.4px', color: 'var(--kit)', textTransform: 'uppercase' }}>Champions</div>
                  <div style={{ font: "600 22px/1 'Barlow Condensed',sans-serif", color: '#e9edf2', marginTop: 7 }}>To be decided</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
