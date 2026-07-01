import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Fixture } from '../../types';
import { TEAM_BY_CODE } from '../../lib/teams';

function useInterval(cb: () => void, delay: number) {
  const savedCb = useRef(cb);
  useEffect(() => { savedCb.current = cb; }, [cb]);
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'hidden') savedCb.current();
    };
    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}

function teamCode(name: string) {
  for (const [code, t] of TEAM_BY_CODE) {
    if (t.name === name) return code;
  }
  return name.slice(0, 3).toUpperCase();
}

function teamStyle(name: string) {
  for (const t of TEAM_BY_CODE.values()) {
    if (t.name === name) return { bg: t.kitPrimary, on: t.kitAccent };
  }
  return { bg: '#222', on: '#fff' };
}

interface MatchCardProps {
  f: Fixture;
  isFav: boolean;
  onOpen: (id: number) => void;
  reduced: boolean | null;
}

function MatchCard({ f, isFav, onOpen, reduced }: MatchCardProps) {
  const isLive = f.fixture.status.short === '1H' || f.fixture.status.short === '2H' ||
    f.fixture.status.short === 'LIVE' || f.fixture.status.short === 'HT';
  const minute = f.fixture.status.elapsed ? `${f.fixture.status.elapsed}'` : f.fixture.status.short;
  const hs = teamStyle(f.teams.home.name);
  const as_ = teamStyle(f.teams.away.name);
  const hc = teamCode(f.teams.home.name);
  const ac = teamCode(f.teams.away.name);

  const borderStyle = isFav
    ? '1px solid var(--kit)'
    : isLive
    ? '1px solid rgba(255,77,79,.35)'
    : '1px solid rgba(255,255,255,.08)';

  const animation = isFav && isLive && !reduced ? 'kitpulse 1.7s ease-in-out infinite' : undefined;

  return (
    <motion.div
      whileHover={reduced ? {} : { y: -3 }}
      onClick={() => onOpen(f.fixture.id)}
      style={{
        flexShrink: 0,
        width: 300,
        padding: '16px 17px',
        borderRadius: 16,
        background: 'linear-gradient(180deg,rgba(22,28,38,.92),rgba(15,19,26,.92))',
        cursor: 'pointer',
        border: borderStyle,
        animation,
        boxShadow: isFav ? '0 0 26px -8px var(--kit-glow)' : undefined,
        transition: 'transform .16s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
        <span style={{ font: "700 9.5px/1 'JetBrains Mono',monospace", letterSpacing: '1px', color: '#6b7888' }}>
          {f.league.round}
        </span>
        {isLive && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, font: "700 12px/1 'JetBrains Mono',monospace", color: '#ff8486' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff4d4f', display: 'inline-block', animation: 'blink 1.3s infinite' }} />
            {minute}
          </span>
        )}
      </div>

      {/* Home team */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 9 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <div style={{ width: 34, height: 25, borderRadius: 5, flexShrink: 0, display: 'grid', placeItems: 'center', font: "700 11px/1 'JetBrains Mono',monospace", background: hs.bg, color: hs.on }}>{hc}</div>
          <span style={{ font: "600 21px/1 'Barlow Condensed',sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.teams.home.name}</span>
        </div>
        <span style={{ font: "700 27px/1 'Barlow Condensed',sans-serif", color: (f.goals.home ?? 0) > (f.goals.away ?? 0) ? 'var(--kit)' : '#e9edf2', fontVariantNumeric: 'tabular-nums' }}>
          {f.goals.home ?? '–'}
        </span>
      </div>

      {/* Away team */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <div style={{ width: 34, height: 25, borderRadius: 5, flexShrink: 0, display: 'grid', placeItems: 'center', font: "700 11px/1 'JetBrains Mono',monospace", background: as_.bg, color: as_.on }}>{ac}</div>
          <span style={{ font: "600 21px/1 'Barlow Condensed',sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.teams.away.name}</span>
        </div>
        <span style={{ font: "700 27px/1 'Barlow Condensed',sans-serif", color: (f.goals.away ?? 0) > (f.goals.home ?? 0) ? 'var(--kit)' : '#e9edf2', fontVariantNumeric: 'tabular-nums' }}>
          {f.goals.away ?? '–'}
        </span>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 12, paddingTop: 11, borderTop: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ font: "500 11px/1 'Hanken Grotesk'", color: '#6b7888' }}>{f.fixture.venue.name}</span>
        {isFav && (
          <span style={{ font: "700 9px/1 'JetBrains Mono',monospace", letterSpacing: '1px', color: 'var(--kit)', background: 'var(--kit-soft)', padding: '4px 7px', borderRadius: 5 }}>
            YOUR TEAM
          </span>
        )}
        {isLive && !isFav && (
          <span style={{ font: "700 9px/1 'JetBrains Mono',monospace", letterSpacing: '1px', color: '#ff8486', background: 'rgba(255,77,79,.12)', padding: '4px 7px', borderRadius: 5 }}>
            LIVE
          </span>
        )}
      </div>
    </motion.div>
  );
}

interface Props {
  favTeamIds: number[];
}

export default function LiveMatchTicker({ favTeamIds }: Props) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const reduced = useReducedMotion();

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch('/api/live');
      const data: Fixture[] = await res.json();
      setFixtures(Array.isArray(data) ? data : []);
    } catch {
      // silently keep stale data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLive(); }, [fetchLive]);
  useInterval(fetchLive, 30_000);

  function openMatch(id: number) {
    window.location.href = `/match/${id}`;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', gap: 14, overflow: 'hidden', paddingBottom: 8, marginBottom: 30 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ flexShrink: 0, width: 300, height: 140, borderRadius: 16, background: 'rgba(22,28,38,.6)', border: '1px solid rgba(255,255,255,.08)', animation: 'blink 1.3s infinite' }} />
        ))}
      </div>
    );
  }

  if (!fixtures.length) {
    return (
      <div style={{ padding: '20px', borderRadius: 14, border: '1px dashed rgba(255,255,255,.1)', color: '#5e6b7d', font: "500 13px/1.5 'Hanken Grotesk'" }}>
        No live matches right now. Check back on match day.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8, marginBottom: 30 }}>
      {fixtures.map(f => (
        <MatchCard
          key={f.fixture.id}
          f={f}
          isFav={favTeamIds.includes(f.teams.home.id) || favTeamIds.includes(f.teams.away.id)}
          onOpen={openMatch}
          reduced={reduced}
        />
      ))}
    </div>
  );
}
