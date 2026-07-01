import { useState, useEffect } from 'react';
import { supabase, getFavorites } from '../../lib/supabase';
import { TEAM_MAP } from '../../lib/teams';
import type { UserFavorite } from '../../lib/supabase';

export default function YourTeams() {
  const [favs, setFavs] = useState<UserFavorite[]>([]);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setAuthed(false); return; }
      setAuthed(true);
      getFavorites(user.id).then(setFavs).catch(() => {});
    });
  }, []);

  if (!authed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ padding: '20px 16px', borderRadius: 16, background: 'linear-gradient(160deg,rgba(22,28,38,.95),rgba(14,18,25,.95))', border: '1px solid rgba(255,255,255,.08)', textAlign: 'center' }}>
          <div style={{ font: "600 16px/1.3 'Barlow Condensed',sans-serif", letterSpacing: '.3px', marginBottom: 8, color: '#cdd6e2' }}>Pin your teams</div>
          <div style={{ font: "500 12px/1.5 'Hanken Grotesk'", color: '#5e6b7d', marginBottom: 14 }}>Sign in to save up to 5 national teams — Pitch repaints in their kit every match day.</div>
          <a href="/auth" style={{ display: 'block', padding: '11px 16px', borderRadius: 10, background: 'var(--kit)', color: 'var(--kit-contrast)', font: "700 13px/1 'Hanken Grotesk'", textDecoration: 'none', textAlign: 'center' }}>
            Sign in to save teams
          </a>
        </div>
      </div>
    );
  }

  if (!favs.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <a href="/auth" style={{ padding: 13, borderRadius: 13, border: '1px dashed rgba(255,255,255,.16)', color: '#7c8a9c', font: "600 12px/1 'Hanken Grotesk'", letterSpacing: '.3px', textDecoration: 'none', display: 'block', textAlign: 'center', transition: 'all .15s' }}>
          + Pin your first team
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {favs.map(fav => {
        const team = TEAM_MAP.get(fav.team_id);
        const isActive = team?.kitAccent === getComputedStyle(document.documentElement).getPropertyValue('--kit').trim();
        return (
          <div
            key={fav.id}
            style={{
              padding: '15px 16px', borderRadius: 16,
              background: 'linear-gradient(160deg,rgba(22,28,38,.95),rgba(14,18,25,.95))',
              cursor: 'pointer', transition: 'transform .16s',
              border: isActive ? '1px solid var(--kit)' : '1px solid rgba(255,255,255,.08)',
              boxShadow: isActive ? '0 0 30px -10px var(--kit-glow)' : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 13 }}>
              <div style={{ width: 42, height: 31, borderRadius: 6, flexShrink: 0, display: 'grid', placeItems: 'center', font: "700 12px/1 'JetBrains Mono',monospace", background: fav.kit_primary, color: fav.kit_accent }}>{team?.code ?? '?'}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ font: "600 21px/1 'Barlow Condensed',sans-serif", letterSpacing: '.3px' }}>{fav.team_name}</div>
                <div style={{ font: "600 10px/1 'JetBrains Mono',monospace", color: '#6b7888', marginTop: 3, letterSpacing: '.5px' }}>GROUP {team?.group ?? '–'}</div>
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: isActive ? 'var(--kit)' : 'rgba(255,255,255,.2)', display: 'inline-block', boxShadow: isActive ? '0 0 14px 1px var(--kit-glow)' : undefined }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 11px', borderRadius: 9, background: 'rgba(0,0,0,.25)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ font: "600 8.5px/1 'JetBrains Mono',monospace", letterSpacing: '1px', color: '#6b7888', textTransform: 'uppercase' }}>Next match</span>
                <span style={{ font: "500 13px/1.1 'Hanken Grotesk'", color: '#cdd6e2' }}>TBD</span>
              </div>
              <span style={{ font: "600 11px/1.2 'JetBrains Mono',monospace", color: 'var(--kit)', textAlign: 'right' }}>—</span>
            </div>
          </div>
        );
      })}
      <a href="/auth" style={{ padding: 13, borderRadius: 13, border: '1px dashed rgba(255,255,255,.16)', color: '#7c8a9c', font: "600 12px/1 'Hanken Grotesk'", letterSpacing: '.3px', display: 'block', textAlign: 'center', textDecoration: 'none', transition: 'all .15s' }}>
        + Pin another team
      </a>
    </div>
  );
}
