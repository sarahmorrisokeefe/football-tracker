import type { APIRoute } from 'astro';
import {
  getFixtureById,
  getFixtureLineups,
  getFixtureEvents,
  getFixtureStats,
} from '../../../lib/api-football';

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!id) return new Response('Not found', { status: 404 });

  try {
    const [fixtures, lineups, events, stats] = await Promise.all([
      getFixtureById(id),
      getFixtureLineups(id),
      getFixtureEvents(id),
      getFixtureStats(id),
    ]);

    return new Response(
      JSON.stringify({ fixture: fixtures[0], lineups, events, stats }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=30',
        },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
