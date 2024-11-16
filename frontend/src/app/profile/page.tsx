'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Profile() {
  const [token, setToken] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);

  useEffect(() => {
    const storedToken = localStorage.getItem('spotify_access_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetch(`/api/get-playlists?token=${token}`)
        .then((res) => res.json())
        .then((data) => setPlaylists(data.items || []))
        .catch((err) => console.error('Error fetching playlists:', err));
    }
  }, [token]);

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p>Please log in to view your playlists.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl mb-6">Your Playlists</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {playlists.map((playlist) => (
          <Link
            key={playlist.id}
            href={`/profile/playlists/${playlist.id}`}
            className="bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:scale-105 transition-transform"
          >
            <img
              src={playlist.images[0]?.url || ''}
              alt={playlist.name}
              className="w-full h-40 object-cover"
            />
            <div className="p-4">
              <h2 className="text-lg font-bold truncate">{playlist.name}</h2>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

