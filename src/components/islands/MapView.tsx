import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { TEAMS } from '../../lib/teams';
import { supabase, addFavorite, removeFavorite, getFavorites } from '../../lib/supabase';
import type { TeamKit } from '../../types';

const MAPBOX_TOKEN = (import.meta as any).env?.PUBLIC_MAPBOX_TOKEN ?? '';

interface PanelData {
  team: TeamKit;
  isFav: boolean;
  info: any;
}

export default function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<PanelData | null>(null);
  const [favIds, setFavIds] = useState<Set<number>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [teamInfo, setTeamInfo] = useState<Record<number, any>>({});
  const reduced = useReducedMotion();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      getFavorites(user.id).then(favs => {
        setFavIds(new Set(favs.map(f => f.team_id)));
      });
    });
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamically import mapbox-gl so it only runs client-side
    import('mapbox-gl').then(mapboxgl => {
      (mapboxgl as any).default.accessToken = MAPBOX_TOKEN;
      const Mapbox = (mapboxgl as any).default;

      const map = new Mapbox.Map({
        container: mapRef.current!,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [0, 20],
        zoom: 1.5,
        projection: 'mercator',
      });
      mapInstanceRef.current = map;

      map.on('load', () => {
        // Override map colours for stadium-dark feel
        map.setPaintProperty('background', 'background-color', '#07090f');

        TEAMS.filter(t => t.lon !== undefined && t.lat !== undefined).forEach(team => {
          // Create a DOM element for the marker
          const el = document.createElement('div');
          const isFav = favIds.has(team.id);
          el.style.cssText = `
            width:27px;height:19px;border-radius:5px;display:grid;place-items:center;
            font:700 8px/1 'JetBrains Mono',monospace;cursor:pointer;
            background:${team.kitPrimary};color:${team.kitAccent};
            box-shadow:${isFav ? '0 0 0 1.5px var(--kit),0 0 13px -2px var(--kit-glow),0 0 0 3px rgba(0,0,0,.45)' : '0 0 0 1.5px rgba(255,255,255,.28),0 0 0 3.5px rgba(0,0,0,.5),0 2px 7px rgba(0,0,0,.6)'};
            transition:transform .14s;z-index:10;
          `;
          el.textContent = team.code;
          el.title = team.name;

          el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.18)'; });
          el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
          el.addEventListener('click', () => openPanel(team));

          const marker = new Mapbox.Marker({ element: el })
            .setLngLat([team.lon!, team.lat!])
            .addTo(map);

          markersRef.current.push({ marker, el, teamId: team.id });
        });
      });
    });

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Refresh marker styles when favs change
  useEffect(() => {
    markersRef.current.forEach(({ el, teamId }) => {
      const isFav = favIds.has(teamId);
      el.style.boxShadow = isFav
        ? '0 0 0 1.5px var(--kit),0 0 13px -2px var(--kit-glow),0 0 0 3px rgba(0,0,0,.45)'
        : '0 0 0 1.5px rgba(255,255,255,.28),0 0 0 3.5px rgba(0,0,0,.5),0 2px 7px rgba(0,0,0,.6)';
    });
  }, [favIds]);

  async function openPanel(team: TeamKit) {
    const isFav = favIds.has(team.id);
    let info = teamInfo[team.id];
    if (!info) {
      try {
        const r = await fetch(`/api/team/${team.id}`);
        info = await r.json();
        setTeamInfo(prev => ({ ...prev, [team.id]: info }));
      } catch { info = null; }
    }
    setSelectedTeam({ team, isFav, info });
  }

  async function toggleFav() {
    if (!selectedTeam || !userId) { window.location.href = '/auth'; return; }
    const { team } = selectedTeam;
    if (favIds.has(team.id)) {
      await removeFavorite(userId, team.id);
      setFavIds(prev => { const n = new Set(prev); n.delete(team.id); return n; });
      setSelectedTeam(s => s ? { ...s, isFav: false } : null);
    } else {
      if (favIds.size >= 5) return;
      await addFavorite(userId, { id: team.id, name: team.name, flag: team.flag, kitPrimary: team.kitPrimary, kitAccent: team.kitAccent });
      setFavIds(prev => new Set([...prev, team.id]));
      setSelectedTeam(s => s ? { ...s, isFav: true } : null);
    }
  }

  const squad = selectedTeam?.info?.squad?.players?.slice(0, 6) ?? [];

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,.07)', aspectRatio: '2/1', minHeight: 420 }}>
      <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />
      {/* Kit glow overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(720px 420px at 78% 12%,var(--kit-soft),transparent 60%)', pointerEvents: 'none', zIndex: 1 }} />

      {/* Team panel */}
      <AnimatePresence>
        {selectedTeam && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { x: 400, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { x: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'absolute', top: 0, right: 0, bottom: 0, width: 330,
              background: 'rgba(10,13,19,.94)', backdropFilter: 'blur(10px)',
              borderLeft: '1px solid rgba(255,255,255,.1)', padding: '22px 22px 24px',
              overflowY: 'auto', zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 54, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', font: "700 14px/1 'JetBrains Mono',monospace", background: selectedTeam.team.kitPrimary, color: selectedTeam.team.kitAccent }}>
                  {selectedTeam.team.code}
                </div>
                <div>
                  <div style={{ font: "600 23px/1 'Barlow Condensed',sans-serif", letterSpacing: '.3px' }}>{selectedTeam.team.name}</div>
                  <div style={{ font: "600 10px/1 'JetBrains Mono',monospace", color: '#6b7888', marginTop: 4, letterSpacing: '.5px' }}>GROUP {selectedTeam.team.group ?? '–'}</div>
                </div>
              </div>
              <button onClick={() => setSelectedTeam(null)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: '#9fb0c3', cursor: 'pointer', font: "400 18px/1 'Hanken Grotesk'" }}>×</button>
            </div>

            <button
              onClick={toggleFav}
              style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid var(--kit)', background: 'var(--kit-soft)', color: 'var(--kit)', font: "700 12px/1 'Hanken Grotesk'", letterSpacing: '.4px', cursor: 'pointer', marginBottom: 18 }}
            >
              {selectedTeam.isFav ? '★ Pinned — click to remove' : '+ Pin team'}
            </button>

            {squad.length > 0 && (
              <>
                <div style={{ font: "600 9px/1 'JetBrains Mono',monospace", letterSpacing: '1px', color: '#6b7888', textTransform: 'uppercase', marginBottom: 10 }}>Key squad</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {squad.map((p: any, i: number) => (
                    <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(20,26,35,.5)', font: "500 13px/1 'Hanken Grotesk'", color: '#cdd6e2' }}>
                      {p.player?.name ?? p.name ?? '—'}
                    </div>
                  ))}
                </div>
              </>
            )}

            {selectedTeam.info?.fixtures?.length > 0 && (
              <div style={{ marginTop: 16, padding: '10px 13px', borderRadius: 11, background: 'rgba(20,26,35,.7)', border: '1px solid rgba(255,255,255,.06)' }}>
                <div style={{ font: "600 8.5px/1 'JetBrains Mono',monospace", letterSpacing: '1px', color: '#6b7888', textTransform: 'uppercase', marginBottom: 5 }}>Next match</div>
                <div style={{ font: "500 13px/1.2 'Hanken Grotesk'", color: 'var(--kit)' }}>
                  {(() => {
                    const next = selectedTeam.info.fixtures.find((f: any) => f.fixture?.status?.short === 'NS');
                    if (!next) return 'TBD';
                    const opp = next.teams.home.id === selectedTeam.team.id ? next.teams.away.name : next.teams.home.name;
                    return `vs ${opp}`;
                  })()}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
