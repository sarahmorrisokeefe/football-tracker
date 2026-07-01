import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Fixture } from '../../types';
import { TEAM_BY_CODE } from '../../lib/teams';

function teamInfo(name: string) {
  for (const t of TEAM_BY_CODE.values()) {
    if (t.name === name) return t;
  }
  return null;
}

function teamCode(name: string) {
  const t = teamInfo(name);
  return t?.code ?? name.slice(0, 3).toUpperCase();
}

function statusLabel(f: Fixture) {
  const s = f.fixture.status.short;
  if (['1H', '2H', 'HT', 'LIVE'].includes(s)) return `LIVE ${f.fixture.status.elapsed}'`;
  if (s === 'FT') return 'FT';
  if (s === 'NS') return new Date(f.fixture.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return s;
}

function statusColor(f: Fixture) {
  const s = f.fixture.status.short;
  if (['1H', '2H', 'HT', 'LIVE'].includes(s)) return '#ff8486';
  if (s === 'FT') return '#7c8a9c';
  return 'var(--kit)';
}

export default function TodayFeed() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const date = new Date().toISOString().slice(0, 10);
    fetch(`/api/fixtures?date=${date}`)
      .then(r => r.json())
      .then(data => setFixtures(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 72, borderRadius: 13, background: 'rgba(20,26,35,.7)', border: '1px solid rgba(255,255,255,.06)', animation: 'blink 1.3s infinite' }} />
        ))}
      </div>
    );
  }

  if (!fixtures.length) {
    return (
      <div style={{ padding: 30, borderRadius: 14, border: '1px dashed rgba(255,255,255,.1)', textAlign: 'center', font: "500 13px/1.5 'Hanken Grotesk'", color: '#6b7888' }}>
        No matches scheduled today.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {fixtures.map(f => {
        const ht = teamInfo(f.teams.home.name);
        const at = teamInfo(f.teams.away.name);
        const hc = teamCode(f.teams.home.name);
        const ac = teamCode(f.teams.away.name);
        const isLive = ['1H', '2H', 'HT', 'LIVE'].includes(f.fixture.status.short);

        return (
          <motion.div
            key={f.fixture.id}
            whileHover={{ borderColor: 'var(--kit)', background: 'rgba(26,33,44,.9)' }}
            onClick={() => window.location.href = `/match/${f.fixture.id}`}
            style={{
              display: 'grid', gridTemplateColumns: '96px minmax(0,1fr) 60px',
              alignItems: 'center', gap: 16, padding: '13px 18px',
              borderRadius: 13, background: 'rgba(20,26,35,.7)',
              border: '1px solid rgba(255,255,255,.06)', cursor: 'pointer', transition: 'all .15s',
            }}
          >
            <span style={{ font: `700 11px/1.3 'JetBrains Mono',monospace`, textAlign: 'center', color: statusColor(f) }}>
              {statusLabel(f)}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                  <div style={{ width: 30, height: 22, borderRadius: 4, flexShrink: 0, display: 'grid', placeItems: 'center', font: "700 10px/1 'JetBrains Mono',monospace", background: ht?.kitPrimary ?? '#222', color: ht?.kitAccent ?? '#fff' }}>{hc}</div>
                  <span style={{ font: "600 17px/1 'Barlow Condensed',sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.teams.home.name}</span>
                </div>
                <span style={{ font: "700 19px/1 'Barlow Condensed',sans-serif", color: f.goals.home != null && f.goals.away != null && f.goals.home > f.goals.away ? 'var(--kit)' : '#e9edf2', fontVariantNumeric: 'tabular-nums' }}>
                  {f.goals.home ?? '–'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                  <div style={{ width: 30, height: 22, borderRadius: 4, flexShrink: 0, display: 'grid', placeItems: 'center', font: "700 10px/1 'JetBrains Mono',monospace", background: at?.kitPrimary ?? '#222', color: at?.kitAccent ?? '#fff' }}>{ac}</div>
                  <span style={{ font: "600 17px/1 'Barlow Condensed',sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.teams.away.name}</span>
                </div>
                <span style={{ font: "700 19px/1 'Barlow Condensed',sans-serif", color: f.goals.away != null && f.goals.home != null && f.goals.away > f.goals.home ? 'var(--kit)' : '#e9edf2', fontVariantNumeric: 'tabular-nums' }}>
                  {f.goals.away ?? '–'}
                </span>
              </div>
            </div>
            <span style={{ font: "500 10px/1.3 'Hanken Grotesk'", color: '#5e6b7d', textAlign: 'right' }}>{f.fixture.venue.city}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
