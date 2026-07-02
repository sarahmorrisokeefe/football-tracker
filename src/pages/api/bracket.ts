import type { APIRoute } from 'astro';
import { getAllFixtures } from '../../lib/api-football';
import { groupKnockoutFixtures } from '../../lib/bracket';

export const GET: APIRoute = async () => {
  try {
    const fixtures = await getAllFixtures();
    const data = groupKnockoutFixtures(fixtures);
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=1800',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
