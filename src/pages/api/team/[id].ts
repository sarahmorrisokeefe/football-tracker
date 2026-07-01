import type { APIRoute } from 'astro';
import { getTeamInfo, getTeamFixtures } from '../../../lib/api-football';

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!id) return new Response('Not found', { status: 404 });

  try {
    const [teamData, fixtures] = await Promise.all([
      getTeamInfo(id),
      getTeamFixtures(id),
    ]);

    return new Response(JSON.stringify({ ...teamData, fixtures }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=30',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
