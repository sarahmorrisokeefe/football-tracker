import type { APIRoute } from 'astro';
import { getLiveFixtures } from '../../lib/api-football';

export const GET: APIRoute = async () => {
  try {
    const data = await getLiveFixtures();
    return new Response(JSON.stringify(data), {
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
