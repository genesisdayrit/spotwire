import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { code } = await req.json();

  if (!code) {
    console.error('Error: Missing authorization code.');
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI || '', // Backend variable
    client_id: process.env.SPOTIFY_CLIENT_ID || '', // Backend variable
    client_secret: process.env.SPOTIFY_CLIENT_SECRET || '', // Backend variable
  });

  console.log('SPOTIFY_CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID);
  console.log('SPOTIFY_CLIENT_SECRET:', process.env.SPOTIFY_CLIENT_SECRET);

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();

    console.log('Spotify API Response:', data);

    if (!response.ok) {
      console.error('Error from Spotify API:', data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching token:', error);
    return NextResponse.json({ error: 'Failed to fetch token' }, { status: 500 });
  }
}

