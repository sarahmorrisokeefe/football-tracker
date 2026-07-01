import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TEAMS } from '../../lib/teams';
import { supabase, addFavorite, removeFavorite, getFavorites } from '../../lib/supabase';

export default function TeamPicker() {
  const [favIds, setFavIds] = useState<Set<number>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [flash, setFlash] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      getFavorites(user.id).then(favs => {
        setFavIds(new Set(favs.map(f => f.team_id)));
      });
    });
  }, []);

  async function toggle(teamId: number) {
    if (!userId) return;
    const team = TEAMS.find(t => t.id === teamId);
    if (!team) return;
    setSaving(teamId);
    try {
      if (favIds.has(teamId)) {
        await removeFavorite(userId, teamId);
        setFavIds(prev => { const n = new Set(prev); n.delete(teamId); return n; });
      } else {
        if (favIds.size >= 5) return;
        await addFavorite(userId, { id: team.id, name: team.name, flag: team.flag, kitPrimary: team.kitPrimary, kitAccent: team.kitAccent });
        setFavIds(prev => new Set([...prev, teamId]));
        setFlash(teamId);
        setTimeout(() => setFlash(null), 600);
      }
    } finally {
      setSaving(null);
    }
  }

  if (done) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ font: "700 32px/1 'Barlow Condensed',sans-serif", color: '#e9edf2' }}>You're set ✓</div>
      <div style={{ font: "500 14px/1.5 'Hanken Grotesk'", color: '#6b7888' }}>Pitch is now painted in your kit.</div>
      <a href="/" style={{ padding: '12px 28px', borderRadius: 10, background: 'var(--kit)', color: 'var(--kit-contrast)', font: "700 13px/1 'Hanken Grotesk'", textDecoration: 'none' }}>
        Go to dashboard →
      </a>
    </div>
  );

  const groups = [...new Set(TEAMS.map(t => t.group))].filter(Boolean).sort();

  return (
    <div style={{ padding: '24px 0 60px' }}>
      {/* Header */}
      <div style={{ padding: '0 26px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ font: "700 26px/1 'Barlow Condensed',sans-serif", letterSpacing: '.4px', color: '#e9edf2' }}>Pin your teams</div>
          <div style={{ font: "500 12px/1.5 'Hanken Grotesk'", color: '#6b7888', marginTop: 4 }}>Pick up to 5 — Pitch repaints in their kit every match day.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < favIds.size ? 'var(--kit)' : 'rgba(255,255,255,.12)', boxShadow: i < favIds.size ? '0 0 8px -1px var(--kit-glow)' : undefined, transition: 'all .2s' }} />
            ))}
          </div>
          <span style={{ font: "500 12px/1 'Hanken Grotesk'", color: '#6b7888' }}>{favIds.size}/5</span>
          {favIds.size > 0 && (
            <button
              onClick={() => setDone(true)}
              style={{ padding: '9px 18px', borderRadius: 9, background: 'var(--kit)', color: 'var(--kit-contrast)', font: "700 12px/1 'Hanken Grotesk'", border: 'none', cursor: 'pointer', letterSpacing: '.3px' }}
            >
              Done
            </button>
          )}
        </div>
      </div>

      {/* Grid by group */}
      {groups.map(group => (
        <div key={group} style={{ marginBottom: 28, padding: '0 26px' }}>
          <div style={{ font: "700 10px/1 'JetBrains Mono',monospace", letterSpacing: '1.4px', color: '#6b7888', textTransform: 'uppercase', marginBottom: 12 }}>Group {group}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
            {TEAMS.filter(t => t.group === group).map(team => {
              const selected = favIds.has(team.id);
              const isFlash = flash === team.id;
              const disabled = !selected && favIds.size >= 5;
              return (
                <motion.button
                  key={team.id}
                  onClick={() => !disabled && toggle(team.id)}
                  whileHover={disabled ? {} : { y: -2 }}
                  whileTap={disabled ? {} : { scale: 0.97 }}
                  style={{
                    padding: '14px 14px', borderRadius: 13, cursor: disabled ? 'not-allowed' : 'pointer',
                    background: selected ? (isFlash ? 'var(--kit)' : 'var(--kit-soft)') : 'rgba(18,23,32,.8)',
                    border: `1px solid ${selected ? 'var(--kit)' : 'rgba(255,255,255,.08)'}`,
                    boxShadow: selected ? '0 0 20px -8px var(--kit-glow)' : undefined,
                    opacity: disabled ? 0.4 : 1,
                    transition: 'all .15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ width: 42, height: 30, borderRadius: 6, display: 'grid', placeItems: 'center', font: "700 12px/1 'JetBrains Mono',monospace", background: team.kitPrimary, color: team.kitAccent, flexShrink: 0 }}>
                    {team.code}
                  </div>
                  <div>
                    <div style={{ font: "600 16px/1 'Barlow Condensed',sans-serif", color: selected ? 'var(--kit)' : '#cdd6e2', letterSpacing: '.3px' }}>{team.name}</div>
                    <div style={{ font: "600 9px/1 'JetBrains Mono',monospace", color: '#5e6b7d', marginTop: 3, letterSpacing: '.5px' }}>{team.flag}</div>
                  </div>
                  {selected && (
                    <div style={{ font: "700 9px/1 'JetBrains Mono',monospace", color: 'var(--kit)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      {saving === team.id ? '...' : 'Pinned ★'}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Footer CTA */}
      {favIds.size > 0 && (
        <div style={{ padding: '0 26px', marginTop: 8 }}>
          <button
            onClick={() => setDone(true)}
            style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'var(--kit)', color: 'var(--kit-contrast)', font: "700 14px/1 'Hanken Grotesk'", border: 'none', cursor: 'pointer' }}
          >
            Done — go to dashboard →
          </button>
        </div>
      )}
    </div>
  );
}
