// src/components/Profile.js

const { useState, useEffect } = React;

function Profile() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState("playlists"); // Track active view
  const [playlistsOffset, setPlaylistsOffset] = useState(0);
  const [hasMorePlaylists, setHasMorePlaylists] = useState(false);
  const [totalPlaylists, setTotalPlaylists] = useState(0);
  const accessToken = localStorage.getItem("spotify_access_token");
  const LIMIT = 50; // Maximum allowed by Spotify API

  function handleTokenExpiration() {
    // Use the global handler instead of local implementation
    window.handleTokenExpiration();
  }

  useEffect(() => {
    fetchInitialPlaylists();
  }, [accessToken]);

  const fetchInitialPlaylists = () => {
    if (accessToken) {
      setLoading(true);
      fetch(`https://api.spotify.com/v1/me/playlists?limit=${LIMIT}&offset=0`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => {
          if (!res.ok) {
            if (res.status === 401) handleTokenExpiration();
            throw new Error("Failed to fetch playlists");
          }
          return res.json();
        })
        .then((data) => {
          setPlaylists(data.items || []);
          setTotalPlaylists(data.total);
          setHasMorePlaylists(data.next !== null);
          setPlaylistsOffset(data.items?.length || 0);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching playlists", err);
          setLoading(false);
        });
    }
  };

  const loadMorePlaylists = () => {
    if (!accessToken || loadingMore) return;
    
    setLoadingMore(true);
    fetch(`https://api.spotify.com/v1/me/playlists?limit=${LIMIT}&offset=${playlistsOffset}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) handleTokenExpiration();
          throw new Error("Failed to fetch more playlists");
        }
        return res.json();
      })
      .then((data) => {
        setPlaylists(prev => [...prev, ...(data.items || [])]);
        setHasMorePlaylists(data.next !== null);
        setPlaylistsOffset(prev => prev + (data.items?.length || 0));
        setLoadingMore(false);
      })
      .catch((err) => {
        console.error("Error fetching more playlists", err);
        setLoadingMore(false);
      });
  };

  const filteredPlaylists = playlists.filter((playlist) =>
    playlist.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function handlePlaylistClick(playlistId) {
    window.location.hash = `#playlist/${playlistId}`;
  }

  function handleSettingsClick() {
    window.location.hash = "#settings";
  }

  function handleViewLikedSongs() {
    // For now, just set the active view
    // Later this will navigate to the liked songs component
    setActiveView("likedSongs");
    window.location.hash = "#liked-songs";
  }

  function handleViewPlaylists() {
    setActiveView("playlists");
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1 className="profile-title">your spotify profile</h1>
        <span
          className="settings-icon"
          title="Settings"
          onClick={handleSettingsClick}
        >
          ⚙️
        </span>
      </div>

      <div className="profile-nav">
        <button 
          className={`nav-button ${activeView === "playlists" ? "active" : ""}`}
          onClick={handleViewPlaylists}
        >
          View Playlists
        </button>
        <button 
          className={`nav-button ${activeView === "likedSongs" ? "active" : ""}`}
          onClick={handleViewLikedSongs}
        >
          View Liked Songs
        </button>
      </div>

      {activeView === "playlists" && (
        <>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search playlists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="playlist-stats">
            <p>Showing {playlists.length} of {totalPlaylists} playlists</p>
          </div>

          {loading ? (
            <p>Loading playlists...</p>
          ) : filteredPlaylists.length > 0 ? (
            <>
              <div className="playlist-grid">
                {filteredPlaylists.map((playlist) => {
                  const imageUrl =
                    playlist.images && playlist.images.length > 0
                      ? playlist.images[0].url
                      : "https://via.placeholder.com/300?text=No+Image";
                  return (
                    <div
                      key={playlist.id}
                      className="playlist-card"
                      onClick={() => handlePlaylistClick(playlist.id)}
                      title="Click to view tracks"
                    >
                      <img
                        src={imageUrl}
                        alt={playlist.name}
                        className="playlist-image"
                      />
                      <div className="playlist-name">{playlist.name}</div>
                    </div>
                  );
                })}
              </div>
              
              {hasMorePlaylists && (
                <div className="load-more-container">
                  <button 
                    className="load-more-button" 
                    onClick={loadMorePlaylists}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading..." : `Load All Playlists (${totalPlaylists} total)`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <p>No playlists found.</p>
          )}
        </>
      )}
    </div>
  );
}

// Expose the Profile component globally
window.Profile = Profile;
