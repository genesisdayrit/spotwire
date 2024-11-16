import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me/tracks?limit=5', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching liked songs:', error);
    return NextResponse.json({ error: 'Failed to fetch liked songs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { url, token } = await req.json();

  if (!url || !token) {
    return NextResponse.json({ error: 'Missing URL or token' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching liked songs:', error);
    return NextResponse.json({ error: 'Failed to fetch liked songs' }, { status: 500 });
  }
}

