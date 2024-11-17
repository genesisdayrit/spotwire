'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('spotify_access_token');
    if (storedToken) {
      router.push('/profile'); // Redirect to profile if logged in
    }
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-5xl font-bold mb-10">spotwire</h1>
      <a
        href={`https://accounts.spotify.com/authorize?client_id=${process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI}&scope=playlist-read-private playlist-read-collaborative user-library-read`}
        className="px-6 py-3 bg-green-500 rounded-lg text-lg font-medium hover:bg-green-600 transition duration-200"
      >
        Log in with Spotify
      </a>
    </div>
  );
}

