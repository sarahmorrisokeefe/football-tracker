import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { TEAM_MAP, kitVars } from '../../lib/teams';
import type { TeamKit } from '../../types';

function hexToRgba(hex: string, a: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export default function KitThemeProvider() {
  const [activeTeam, setActiveTeam] = useState<TeamKit | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (data?.[0]) {
        const fav = data[0];
        const team = TEAM_MAP.get(fav.team_id) ?? null;
        if (team) applyKit(team);
      }
    }
    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) load();
    });
    return () => subscription.unsubscribe();
  }, []);

  function applyKit(team: TeamKit) {
    setActiveTeam(team);
    const root = document.documentElement;
    root.style.setProperty('--kit', team.kitAccent);
    root.style.setProperty('--kit-contrast', team.kitPrimary);
    root.style.setProperty('--kit-glow', hexToRgba(team.kitAccent, 0.5));
    root.style.setProperty('--kit-soft', hexToRgba(team.kitAccent, 0.14));
  }

  // Expose for other islands to call
  useEffect(() => {
    (window as any).__pitchApplyKit = applyKit;
    (window as any).__pitchActiveTeam = activeTeam;
  }, [activeTeam]);

  return null;
}
