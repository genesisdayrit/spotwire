import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  try {
    // Construct the correct URL for top tracks
    const url = 'https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=12';

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Log raw response for debugging
    console.log('Spotify API Response Status:', response.status);
    const data = await response.json();

    if (!response.ok) {
      console.error('Spotify API Error:', data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    return NextResponse.json({ error: 'Failed to fetch top tracks' }, { status: 500 });
  }
}

