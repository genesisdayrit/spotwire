'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Profile() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [likedSongs, setLikedSongs] = useState<any[]>([]);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  // Fetch token from local storage on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('spotify_access_token');
    if (storedToken) {
      setToken(storedToken);
    } else {
      console.warn('No token found, redirecting to login.');
      router.push('/'); // Redirect to login if no token is found
    }
  }, [router]);

  // Fetch data when token is available
  useEffect(() => {
    if (token) {
      console.log('Fetching data with token:', token);

      // Fetch Top Tracks
      fetch(`/api/top-tracks?token=${token}&limit=12`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch top tracks: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => setTopTracks(data.items || []))
        .catch((err) => console.error('Error fetching top tracks:', err));

      // Fetch Playlists
      fetch(`/api/get-playlists?token=${token}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch playlists: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          const validPlaylists = (data.items || []).filter(
            (playlist) => playlist !== null && playlist.name && playlist.images
          );
          console.log('Valid Playlists:', validPlaylists);
          setPlaylists(validPlaylists);
        })
        .catch((err) => console.error('Error fetching playlists:', err));

      // Fetch Liked Songs
      fetch(`/api/get-liked-songs?token=${token}&limit=10`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch liked songs: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => setLikedSongs(data.items || []))
        .catch((err) => console.error('Error fetching liked songs:', err));
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('spotify_access_token');
    console.log('Logged out, redirecting to login page.');
    router.push('/');
  };

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl">Your Profile</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      {/* Top Tracks Section */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-4">
          <a href="/profile/top-tracks" className="text-green-400 hover:underline">
            Top Tracks This Week
          </a>
        </h2>
        {topTracks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {topTracks.map((track) => (
              <div
                key={track.id}
                className="bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:scale-105 transition-transform"
              >
                {/* Album Cover */}
                <img
                  src={track.album.images[0]?.url || ''}
                  alt={track.name}
                  className="w-full h-40 object-cover"
                />

                {/* Track Details */}
                <div className="p-4">
                  <h3 className="text-lg font-bold truncate">{track.name}</h3>
                  <p className="text-sm text-gray-400">
                    {track.artists.map((artist) => artist.name).join(', ')}
                  </p>
                </div>

                {/* Optional Preview Button */}
                {track.preview_url && (
                  <div className="p-4">
                    <audio controls className="w-full">
                      <source src={track.preview_url} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No top tracks found.</p>
        )}
      </div>

      {/* Library Section */}
      <div className="mb-10">
        <div
          className="flex items-center justify-between bg-gray-800 px-4 py-3 rounded-lg hover:bg-gray-700 cursor-pointer"
          onClick={() => setShowLibrary(!showLibrary)}
        >
          <Link href="/profile/library">
            <h2 className="text-xl font-bold">Your Library</h2>
          </Link>
          <span
            className={`transform transition-transform ${
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

      {/* Playlists Section */}
      <div>
        <div
          onClick={() => setShowPlaylists(!showPlaylists)}
          className="flex items-center justify-between cursor-pointer bg-gray-800 px-4 py-3 rounded-lg hover:bg-gray-700"
        >
          <h2 className="text-xl font-bold">Your Playlists</h2>
          <span
            className={`transform transition-transform ${
              showPlaylists ? 'rotate-180' : ''
            }`}
          >
            ▼
          </span>
        </div>
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
                    src={playlist.images[0]?.url || '/placeholder-image.png'}
                    alt={playlist.name || 'Unknown Playlist'}
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-4">
                    <h2 className="text-lg font-bold truncate">
                      {playlist.name || 'Unnamed Playlist'}
                    </h2>
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
