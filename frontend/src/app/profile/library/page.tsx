'use client';

import { useEffect, useState } from 'react';

export default function Library() {
  const [token, setToken] = useState<string | null>(null);
  const [likedSongs, setLikedSongs] = useState<any[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [nextPage, setNextPage] = useState<string | null>(null); // For pagination
  const [isFetchingAll, setIsFetchingAll] = useState(false); // State to track "Fetch All"
  const [showBackToTop, setShowBackToTop] = useState(false); // State for back-to-top button

  useEffect(() => {
    const storedToken = localStorage.getItem('spotify_access_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token && !isFetchingAll) {
      fetchLikedSongs(`https://api.spotify.com/v1/me/tracks?limit=50`);
    }
  }, [token, isFetchingAll]);

  const fetchLikedSongs = (url: string) => {
    fetch('/api/get-liked-songs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, token }),
    })
      .then((res) => res.json())
      .then((data) => {
        setLikedSongs((prev) => [...prev, ...data.items]); // Add new songs to the list
        setFilteredSongs((prev) => [...prev, ...data.items]); // Update filtered list
        setNextPage(data.next); // Update the next page URL
      })
      .catch((err) => console.error('Error fetching liked songs:', err));
  };

  const fetchAllLikedSongs = async () => {
    setIsFetchingAll(true); // Set the "fetching all" state
    let url = `https://api.spotify.com/v1/me/tracks?limit=50`;

    while (url) {
      const response = await fetch('/api/get-liked-songs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, token }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Error fetching liked songs:', data);
        break;
      }

      setLikedSongs((prev) => [...prev, ...data.items]); // Add new batch of songs
      setFilteredSongs((prev) => [...prev, ...data.items]); // Update filtered list
      url = data.next; // Update the next page URL
    }

    setIsFetchingAll(false); // Reset "fetching all" state
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    setFilteredSongs(
      likedSongs.filter((song) =>
        song.track.name.toLowerCase().includes(query) ||
        song.track.artists.some((artist) => artist.name.toLowerCase().includes(query))
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
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl mb-6">Your Library</h1>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search liked songs..."
          className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Fetch All Songs Button */}
      {!isFetchingAll && nextPage && (
        <div className="mb-6">
          <button
            onClick={fetchAllLikedSongs}
            className="px-6 py-2 bg-green-500 text-black rounded-lg hover:bg-green-600"
          >
            Fetch All Songs
          </button>
        </div>
      )}

      {isFetchingAll && (
        <p className="mb-6 text-green-400">Fetching all liked songs... This may take a while.</p>
      )}

      {/* Songs Table */}
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
          {filteredSongs.map((song, index) => {
            const songUrl = song.track.external_urls.spotify;
            const downloadCommand = `spotdl download ${songUrl}`;
            return (
              <tr key={`${song.track.id}-${index}`} className="hover:bg-gray-800">
                <td className="px-4 py-2 border border-gray-700">{index + 1}</td>
                <td className="px-4 py-2 border border-gray-700">
                  <a
                    href={songUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:underline"
                  >
                    {song.track.name}
                  </a>
                </td>
                <td className="px-4 py-2 border border-gray-700">
                  {song.track.artists.map((artist) => artist.name).join(', ')}
                </td>
                <td className="px-4 py-2 border border-gray-700">{song.track.album.name}</td>
                <td className="px-4 py-2 border border-gray-700">
                  {Math.floor(song.track.duration_ms / 60000)}:
                  {String(Math.floor((song.track.duration_ms % 60000) / 1000)).padStart(2, '0')}
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

      {/* Load More Button */}
      {nextPage && !isFetchingAll && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => fetchLikedSongs(nextPage)}
            className="px-6 py-2 bg-green-500 text-black rounded-lg hover:bg-green-600"
          >
            Load More
          </button>
        </div>
      )}

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

