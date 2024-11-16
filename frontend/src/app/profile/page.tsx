'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Profile() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [likedSongs, setLikedSongs] = useState<any[]>([]);
  const [showPlaylists, setShowPlaylists] = useState(false); // Toggle for playlists

  useEffect(() => {
    const storedToken = localStorage.getItem('spotify_access_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token && showPlaylists) {
      // Fetch playlists if the section is toggled
      fetch(`/api/get-playlists?token=${token}`)
        .then((res) => res.json())
        .then((data) => setPlaylists(data.items || []))
        .catch((err) => console.error('Error fetching playlists:', err));
    }
  }, [token, showPlaylists]); // Refetch data when toggle changes

  const handleLogout = () => {
    localStorage.removeItem('spotify_access_token'); // Clear token from storage
    router.push('/'); // Redirect to home page
  };

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl">Your Profile</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      {/* Library Section with Route */}
      <div className="mb-10">
        <Link href="/profile/library">
          <div className="flex items-center justify-between cursor-pointer bg-gray-800 px-4 py-3 rounded-lg hover:bg-gray-700">
            <h2 className="text-xl font-bold">Library</h2>
            <span className="transform transition-transform">➔</span>
          </div>
        </Link>
      </div>

      {/* Playlists Section with Toggle */}
      <div>
        <div
          onClick={() => setShowPlaylists(!showPlaylists)}
          className="flex items-center justify-between cursor-pointer bg-gray-800 px-4 py-3 rounded-lg hover:bg-gray-700"
        >
          <h2 className="text-xl font-bold">Playlists</h2>
          <span className={`transform transition-transform ${showPlaylists ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>

        {/* Playlists Grid */}
        {showPlaylists && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-4">
            {playlists.length > 0 ? (
              playlists.map((playlist) => (
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
              ))
            ) : (
              <p className="text-gray-400 col-span-full">No playlists found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

