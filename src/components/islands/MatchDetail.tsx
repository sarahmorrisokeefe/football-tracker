import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { TEAM_BY_CODE, TEAMS } from '../../lib/teams';

function useInterval(cb: () => void, delay: number | null) {
  const saved = useRef(cb);
  useEffect(() => { saved.current = cb; }, [cb]);
  useEffect(() => {
    if (!delay) return;
    const tick = () => { if (document.visibilityState !== 'hidden') saved.current(); };
    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}

interface MatchDetailProps { id: string; }

export default function MatchDetail({ id }: MatchDetailProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const reduced = useReducedMotion();

  async function fetchMatch() {
    try {
      const r = await fetch(`/api/match/${id}`);
      const json = await r.json();
      setData(json);
    } catch { /* keep last data */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMatch(); }, [id]);

  const isLive = data?.fixture?.status?.short === 'LIVE' || data?.fixture?.status?.short === '1H' || data?.fixture?.status?.short === 'HT' || data?.fixture?.status?.short === '2H' || data?.fixture?.status?.short === 'ET' || data?.fixture?.status?.short === 'P';
  useInterval(fetchMatch, isLive ? 30000 : null);

  if (loading) return (
    <div style={{ padding: '40px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {[100, 160, 200].map(w => (
        <div key={w} style={{ height: 18, borderRadius: 6, background: 'rgba(255,255,255,.06)', width: w, animation: 'blink 1.4s ease-in-out infinite' }} />
      ))}
    </div>
  );

  if (!data?.fixture) return (
    <div style={{ padding: '60px 26px', textAlign: 'center', color: '#6b7888', font: "500 14px/1 'Hanken Grotesk'" }}>Match not found.</div>
  );

  const { fixture, teams, goals, events = [], lineups = [], statistics = [] } = data;
  const statusLabel = fixture.status?.long ?? fixture.status?.short ?? '';
  const minute = fixture.status?.elapsed;
  const homeTeam = TEAMS.find(t => t.id === teams?.home?.id) ?? null;
  const awayTeam = TEAMS.find(t => t.id === teams?.away?.id) ?? null;

  const homeGoals = goals?.home ?? 0;
  const awayGoals = goals?.away ?? 0;

  return (
    <div style={{ padding: '0 0 60px' }}>
      {/* Score header */}
      <div style={{
        background: 'rgba(12,16,23,.95)', padding: '36px 26px 28px',
        borderBottom: '1px solid rgba(255,255,255,.07)',
        display: 'flex', flexDirection: 'column', gap: 24,
      }}>
        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          {isLive && (
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e', display: 'inline-block', boxShadow: '0 0 8px 2px rgba(244,63,94,.5)', animation: 'blink 1s ease-in-out infinite' }} />
          )}
          <span style={{ font: "700 11px/1 'JetBrains Mono',monospace", letterSpacing: '1.2px', color: isLive ? '#f43f5e' : '#6b7888', textTransform: 'uppercase' }}>
            {isLive ? `${minute ?? 'LIVE'}'` : statusLabel}
          </span>
        </div>

        {/* Teams + score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, justifyContent: 'center' }}>
          <TeamBlock team={homeTeam} name={teams.home.name} score={homeGoals} side="home" />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 80, padding: '0 8px' }}>
            <span style={{ font: "700 48px/1 'Barlow Condensed',sans-serif", letterSpacing: '-1px', color: '#e9edf2', fontVariantNumeric: 'tabular-nums' }}>
              {homeGoals} – {awayGoals}
            </span>
            {fixture.venue?.name && (
              <span style={{ font: "500 11px/1 'Hanken Grotesk'", color: '#5e6b7d', textAlign: 'center', maxWidth: 160 }}>{fixture.venue.name}</span>
            )}
          </div>
          <TeamBlock team={awayTeam} name={teams.away.name} score={awayGoals} side="away" />
        </div>
      </div>

      <div style={{ padding: '24px 26px', display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
        {/* Events timeline */}
        {events.length > 0 && (
          <section>
            <div style={{ font: "700 10px/1 'JetBrains Mono',monospace", letterSpacing: '1.4px', color: '#6b7888', textTransform: 'uppercase', marginBottom: 14 }}>Match Events</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <AnimatePresence>
                {events.map((ev: any, i: number) => (
                  <motion.div
                    key={i}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.025 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                      borderRadius: 9, background: 'rgba(18,23,32,.7)',
                    }}
                  >
                    <span style={{ font: "700 11px/1 'JetBrains Mono',monospace", color: '#5e6b7d', minWidth: 28, textAlign: 'right' }}>{ev.time?.elapsed ?? '–'}'</span>
                    <EventIcon type={ev.type} detail={ev.detail} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ font: "500 13px/1 'Hanken Grotesk'", color: '#cdd6e2' }}>{ev.player?.name ?? '—'}</span>
                      {ev.assist?.name && <span style={{ font: "500 11px/1 'Hanken Grotesk'", color: '#6b7888', marginLeft: 6 }}>({ev.assist.name})</span>}
                    </div>
                    <span style={{ font: "600 10px/1 'JetBrains Mono',monospace", color: '#5e6b7d', whiteSpace: 'nowrap' }}>
                      {ev.team?.name === teams.home.name ? teams.home.name.split(' ').slice(-1)[0] : teams.away.name.split(' ').slice(-1)[0]}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* Lineups */}
        {lineups.length === 2 && (
          <section>
            <div style={{ font: "700 10px/1 'JetBrains Mono',monospace", letterSpacing: '1.4px', color: '#6b7888', textTransform: 'uppercase', marginBottom: 14 }}>Lineups</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {lineups.map((lineup: any, li: number) => (
                <div key={li}>
                  <div style={{ font: "700 11px/1 'JetBrains Mono',monospace", color: 'var(--kit)', marginBottom: 10, letterSpacing: '.5px' }}>
                    {lineup.team?.name}
                  </div>
                  <div style={{ font: "500 11px/1 'Hanken Grotesk'", color: '#6b7888', marginBottom: 8 }}>{lineup.formation}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {lineup.startXI?.map((entry: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 7, background: 'rgba(18,23,32,.7)' }}>
                        <span style={{ font: "700 10px/1 'JetBrains Mono',monospace", color: '#5e6b7d', minWidth: 20 }}>{entry.player?.number}</span>
                        <span style={{ font: "500 12px/1 'Hanken Grotesk'", color: '#cdd6e2' }}>{entry.player?.name}</span>
                        <span style={{ font: "500 10px/1 'Hanken Grotesk'", color: '#5e6b7d', marginLeft: 'auto' }}>{entry.player?.pos}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Statistics */}
        {statistics.length === 2 && (
          <section>
            <div style={{ font: "700 10px/1 'JetBrains Mono',monospace", letterSpacing: '1.4px', color: '#6b7888', textTransform: 'uppercase', marginBottom: 14 }}>Statistics</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {statistics[0]?.statistics?.slice(0, 10).map((stat: any, i: number) => {
                const awayStat = statistics[1]?.statistics?.find((s: any) => s.type === stat.type);
                const hVal = parseFloat(stat.value) || 0;
                const aVal = parseFloat(awayStat?.value) || 0;
                const total = hVal + aVal || 1;
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', font: "500 11px/1 'Hanken Grotesk'", color: '#7c8a9c', marginBottom: 5 }}>
                      <span>{stat.value ?? 0}</span>
                      <span style={{ color: '#5e6b7d', fontSize: 10 }}>{stat.type}</span>
                      <span>{awayStat?.value ?? 0}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.07)', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${(hVal / total) * 100}%`, background: 'var(--kit)', borderRadius: 2 }} />
                      <div style={{ width: `${(aVal / total) * 100}%`, background: 'rgba(255,255,255,.2)', borderRadius: 2, marginLeft: 'auto' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function TeamBlock({ team, name, score, side }: { team: any; name: string; score: number; side: 'home' | 'away' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: side === 'home' ? 'flex-end' : 'flex-start', gap: 8, flex: 1, maxWidth: 200 }}>
      <div style={{
        width: 56, height: 40, borderRadius: 10, display: 'grid', placeItems: 'center',
        font: "700 14px/1 'JetBrains Mono',monospace",
        background: team?.kitPrimary ?? '#222', color: team?.kitAccent ?? '#fff',
      }}>
        {team?.code ?? name?.substring(0, 3).toUpperCase()}
      </div>
      <span style={{ font: "700 16px/1 'Barlow Condensed',sans-serif", letterSpacing: '.4px', color: '#cdd6e2', textAlign: side === 'home' ? 'right' : 'left' }}>{name}</span>
    </div>
  );
}

function EventIcon({ type, detail }: { type: string; detail: string }) {
  if (type === 'Goal') return <span style={{ fontSize: 14 }}>⚽</span>;
  if (type === 'Card') {
    if (detail?.toLowerCase().includes('yellow')) return <span style={{ width: 10, height: 13, borderRadius: 2, background: '#fbbf24', display: 'inline-block', flexShrink: 0 }} />;
    return <span style={{ width: 10, height: 13, borderRadius: 2, background: '#f43f5e', display: 'inline-block', flexShrink: 0 }} />;
  }
  if (type === 'subst') return <span style={{ fontSize: 12 }}>↔</span>;
  return <span style={{ font: "500 11px/1 'Hanken Grotesk'", color: '#6b7888' }}>{type?.[0] ?? '•'}</span>;
}
