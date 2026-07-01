import type { APIRoute } from 'astro';
import { getStandings } from '../../lib/api-football';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const league = Number(url.searchParams.get('league') ?? '1');

  try {
    const data = await getStandings(league);
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
