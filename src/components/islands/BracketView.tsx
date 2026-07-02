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
  const done = ['FT', 'AET', 'PEN'].includes(match.fixture.status.short);
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
