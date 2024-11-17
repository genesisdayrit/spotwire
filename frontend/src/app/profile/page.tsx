'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Profile() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [likedSongs, setLikedSongs] = useState<any[]>([]);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('spotify_access_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token && showPlaylists) {
      fetch(`/api/get-playlists?token=${token}`)
        .then((res) => res.json())
        .then((data) => setPlaylists(data.items || []))
        .catch((err) => console.error('Error fetching playlists:', err));
    }
  }, [token, showPlaylists]);

  useEffect(() => {
    if (token && showLibrary) {
      fetch(`/api/get-liked-songs?token=${token}&limit=10`)
        .then((res) => res.json())
        .then((data) => setLikedSongs(data.items || []))
        .catch((err) => console.error('Error fetching liked songs:', err));
    }
  }, [token, showLibrary]);

  const handleLogout = () => {
    localStorage.removeItem('spotify_access_token');
    router.push('/');
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

      {/* Library Section with Toggle */}
      <div className="mb-10">
  <div className="flex items-center justify-between bg-gray-800 px-4 py-3 rounded-lg hover:bg-gray-700">
    {/* Clickable Library Text */}
    <Link href="/profile/library">
      <h2 className="text-xl font-bold cursor-pointer">Library</h2>
    </Link>
    {/* Toggle Button */}
    <span
      onClick={() => setShowLibrary(!showLibrary)}
      className={`transform transition-transform cursor-pointer ${
        showLibrary ? 'rotate-180' : ''
      }`}
    >
      ▼
    </span>
        </div>
        {showLibrary && (
          <div className="mt-4">
            {likedSongs.length > 0 ? (
              <table className="table-auto w-full bg-gray-800 rounded-lg text-left">
                <thead>
                  <tr>
                    <th className="px-4 py-2">Title</th>
                    <th className="px-4 py-2">Artist</th>
                    <th className="px-4 py-2">Album</th>
                  </tr>
                </thead>
                <tbody>
                  {likedSongs.map((item) => (
                    <tr key={item.track.id} className="hover:bg-gray-700">
                      <td className="px-4 py-2">{item.track.name || 'Unknown Title'}</td>
                      <td className="px-4 py-2">
                        {item.track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                      </td>
                      <td className="px-4 py-2">{item.track.album?.name || 'Unknown Album'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400">No liked songs found.</p>
            )}
          </div>
        )}
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

