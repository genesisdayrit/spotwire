'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function PlaylistDetails() {
  const { id } = useParams(); // Get the playlist ID from the route
  const router = useRouter(); // Initialize the router
  const [token, setToken] = useState<string | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [playlistName, setPlaylistName] = useState<string>('');

  useEffect(() => {
    // Retrieve the token from localStorage
    const storedToken = localStorage.getItem('spotify_access_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token && id) {
      // Fetch tracks for the selected playlist
      fetch(`/api/get-playlist-tracks?id=${id}&token=${token}`)
        .then((res) => res.json())
        .then((data) => {
          setPlaylistName(data.name); // Set playlist name
          setTracks(data.tracks.items || []); // Set tracks
        })
        .catch((err) => console.error('Error fetching playlist tracks:', err));
    }
  }, [token, id]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    });
  };

  const handleDownloadPlaylist = () => {
    const playlistUrl = `https://open.spotify.com/playlist/${id}`;
    const downloadCommand = `spotdl download ${playlistUrl}`;
    navigator.clipboard.writeText(downloadCommand).then(() => {
      alert('Playlist download command copied to clipboard!');
    });
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p>Please log in to view playlist details.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen relative">
      {/* Header Section */}
      <div className="flex items-center justify-center relative mb-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/profile')} // Navigate back to /profile
          className="absolute left-0 bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          ← Back
        </button>

        {/* Playlist Title */}
        <h1 className="text-3xl font-semibold">{playlistName}</h1>
      </div>

      {/* Download Playlist Button */}
      <div className="mb-6">
        <button
          onClick={handleDownloadPlaylist}
          className="px-6 py-2 bg-green-500 text-black rounded-lg hover:bg-green-600"
        >
          Download Playlist
        </button>
      </div>

      <table className="table-auto w-full text-left border-collapse border border-gray-700">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="px-4 py-2 border border-gray-700">#</th>
            <th className="px-4 py-2 border border-gray-700">Title</th>
            <th className="px-4 py-2 border border-gray-700">Artist</th>
            <th className="px-4 py-2 border border-gray-700">Album</th>
            <th className="px-4 py-2 border border-gray-700">Duration</th>
            <th className="px-4 py-2 border border-gray-700">spotdl</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((track, index) => {
            const songUrl = track.track.external_urls.spotify;
            const downloadCommand = `spotdl download ${songUrl}`;
            return (
              <tr key={track.track.id} className="hover:bg-gray-800">
                <td className="px-4 py-2 border border-gray-700">{index + 1}</td>
                <td className="px-4 py-2 border border-gray-700">{track.track.name}</td>
                <td className="px-4 py-2 border border-gray-700">
                  {track.track.artists.map((artist) => artist.name).join(', ')}
                </td>
                <td className="px-4 py-2 border border-gray-700">{track.track.album.name}</td>
                <td className="px-4 py-2 border border-gray-700">
                  {Math.floor(track.track.duration_ms / 60000)}:
                  {String(Math.floor((track.track.duration_ms % 60000) / 1000)).padStart(2, '0')}
                </td>
                <td className="px-4 py-2 border border-gray-700">
                  <button
                    onClick={() => handleCopy(downloadCommand)}
                    className="bg-green-500 text-black px-3 py-1 rounded hover:bg-green-600"
                  >
                    Copy
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

