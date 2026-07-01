import { useState, useRef, useEffect } from 'react';
import { TEAMS, kitVars } from '../../lib/teams';
import type { TeamKit } from '../../types';

interface Props {
  initialTeam?: TeamKit;
}

export default function KitDropdown({ initialTeam }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<TeamKit>(initialTeam ?? TEAMS[0]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selectTeam(team: TeamKit) {
    setActive(team);
    setOpen(false);
    // Apply kit vars globally
    const vars = kitVars(team);
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    // Notify KitThemeProvider
    if ((window as any).__pitchApplyKit) (window as any).__pitchApplyKit(team);
  }

  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'center', gap: 11, paddingLeft: 16, borderLeft: '1px solid rgba(255,255,255,.08)', position: 'relative' }}>
      <span style={{ font: "600 9px/1 'JetBrains Mono',monospace", letterSpacing: '1.5px', color: '#5e6b7d', textTransform: 'uppercase' }}>Your kit</span>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '7px 11px 7px 9px',
          borderRadius: 10, border: `1px solid ${open ? 'var(--kit)' : 'rgba(255,255,255,.12)'}`,
          background: 'rgba(20,26,35,.8)', cursor: 'pointer', transition: 'border-color .14s',
        }}
      >
        <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--kit)', boxShadow: '0 0 10px -1px var(--kit-glow)', flexShrink: 0 }} />
        <span style={{ font: "600 15px/1 'Barlow Condensed',sans-serif", letterSpacing: '.3px', color: '#e9edf2', whiteSpace: 'nowrap' }}>{active.name}</span>
        <span style={{ font: "400 9px/1 'Hanken Grotesk'", color: '#7c8a9c' }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 54, right: 0, width: 248,
          maxHeight: 420, overflowY: 'auto',
          background: 'rgba(11,14,20,.97)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,.12)', borderRadius: 13,
          boxShadow: '0 24px 60px -16px rgba(0,0,0,.8)',
          zIndex: 50, padding: 6, animation: 'dropin .16s ease',
        }}>
          <div style={{ font: "600 8.5px/1 'JetBrains Mono',monospace", letterSpacing: '1px', color: '#6b7888', textTransform: 'uppercase', padding: '9px 11px 7px' }}>
            Repaint Pitch in a team's kit
          </div>
          {TEAMS.map(t => (
            <button
              key={t.code}
              onClick={() => selectTeam(t)}
              style={{
                display: 'flex', alignItems: 'center', gap: 11, width: '100%',
                padding: '9px 12px', border: 0, borderRadius: 8,
                background: active.id === t.id ? 'var(--kit-soft)' : 'transparent',
                cursor: 'pointer', textAlign: 'left', transition: 'background .12s',
                color: 'inherit',
              }}
              onMouseEnter={e => { if (active.id !== t.id) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.06)'; }}
              onMouseLeave={e => { if (active.id !== t.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span style={{ width: 30, height: 22, borderRadius: 4, flexShrink: 0, display: 'grid', placeItems: 'center', font: "700 9px/1 'JetBrains Mono',monospace", background: t.kitPrimary, color: t.kitAccent }}>{t.code}</span>
              <span style={{ font: "600 15px/1 'Barlow Condensed',sans-serif", letterSpacing: '.3px', color: '#e9edf2', flex: 1 }}>{t.name}</span>
              <span style={{ width: 13, height: 13, borderRadius: '50%', background: t.kitAccent, flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
