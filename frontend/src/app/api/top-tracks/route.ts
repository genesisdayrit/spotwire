import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const limit = Math.min(parseInt(searchParams.get('limit') || '12', 10), 200); // Default to 12, max 200

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  try {
    const allTracks = [];
    let url = `https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=50`;
    let fetchedTracks = 0;

    while (url && fetchedTracks < limit) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json(errorData, { status: response.status });
      }

      const data = await response.json();
      allTracks.push(...data.items);
      fetchedTracks += data.items.length;

      // If more tracks are needed and there is a next page, continue fetching
      url = data.next && fetchedTracks < limit ? data.next : null;
    }

    // Return only the number of tracks requested (up to the limit)
    return NextResponse.json({ items: allTracks.slice(0, limit) });
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    return NextResponse.json({ error: 'Failed to fetch top tracks' }, { status: 500 });
  }
}

