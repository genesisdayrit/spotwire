'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TopTracks() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Fetch token from local storage on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('spotify_access_token');
    if (storedToken) {
      setToken(storedToken);
    } else {
      router.push('/'); // Redirect to login if no token is found
    }
  }, [router]);

  // Fetch Top Tracks
  useEffect(() => {
    if (token) {
      fetch(`/api/top-tracks?token=${token}&limit=150`) // Adjust the limit to fetch more tracks
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch top tracks: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          setTopTracks(data.items || []); // Update topTracks with all fetched tracks
          setFilteredTracks(data.items || []); // Initialize filtered tracks
        })
        .catch((err) => console.error('Error fetching top tracks:', err));
    }
  }, [token]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    setFilteredTracks(
      topTracks.filter((track) =>
        track.name.toLowerCase().includes(query) ||
        track.artists.some((artist) => artist.name.toLowerCase().includes(query))
      )
    );
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 200); // Show button after scrolling down 200px
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen relative">
      {/* Back Button */}
      <button
        onClick={() => router.push('/profile')} // Navigate back to /profile
        className="absolute top-6 left-6 bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700"
      >
        ← Back
      </button>

      <h1 className="text-3xl mb-6 text-center">Your Top Tracks</h1>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search top tracks..."
          className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Tracks Table */}
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
          {filteredTracks.map((track, index) => {
            const trackUrl = track.external_urls.spotify;
            const downloadCommand = `spotdl download ${trackUrl}`;
            return (
              <tr key={`${track.id}-${index}`} className="hover:bg-gray-800">
                <td className="px-4 py-2 border border-gray-700">{index + 1}</td>
                <td className="px-4 py-2 border border-gray-700">
                  <a
                    href={trackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:underline"
                  >
                    {track.name}
                  </a>
                </td>
                <td className="px-4 py-2 border border-gray-700">
                  {track.artists.map((artist) => artist.name).join(', ')}
                </td>
                <td className="px-4 py-2 border border-gray-700">{track.album.name}</td>
                <td className="px-4 py-2 border border-gray-700">
                  {Math.floor(track.duration_ms / 60000)}:
                  {String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}
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

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-green-500 text-black px-4 py-2 rounded-full shadow-lg hover:bg-green-600"
        >
          ↑ Top
        </button>
      )}
    </div>
  );
}

