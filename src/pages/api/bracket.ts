import type { APIRoute } from 'astro';
import { getFixturesByDate, getStandings } from '../../lib/api-football';

// Returns all WC fixtures grouped by round for the bracket view
export const GET: APIRoute = async () => {
  try {
    // Fetch all fixtures without date filter by querying broadly
    const standings = await getStandings(1);

    return new Response(JSON.stringify({ standings }), {
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
