// src/components/LikedSongs.js

const { useState, useEffect } = React;

function LikedSongs() {
  // Use the global liked songs context instead of local state
  const { 
    likedSongs, 
    nextUrl, 
    isLoading, 
    loadingProgress, 
    loadMoreSongs 
  } = window.useLikedSongs();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingTrack, setDownloadingTrack] = useState(null);

  function handleTokenExpiration() {
    localStorage.removeItem("spotify_access_token");
    window.location.hash = "";
  }

  const filteredSongs = likedSongs.filter((item) =>
    item.track.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.track.artists.some(artist => 
      artist.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  function handleLoadMore() {
    if (nextUrl) {
      loadMoreSongs();
    }
  }

  function handleBackToProfile() {
    window.location.hash = "#profile";
  }

  async function handleDownload(track) {
    try {
      setDownloadingTrack(track.id);
      
      // This is a placeholder - in a real implementation, you would:
      // 1. Use a legitimate source for the track (purchased or with proper rights)
      // 2. Handle the download through a proper server-side implementation
      // 3. Respect copyright and licensing restrictions
      
      // For demo purposes only - just simulate a download delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Display success notification
      alert(`Download complete: ${track.name}`);
      setDownloadingTrack(null);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Download failed. Please try again later.");
      setDownloadingTrack(null);
    }
  }

  function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  return (
    <div className="liked-songs-container">
      <div className="liked-songs-header">
        <button className="back-button" onClick={handleBackToProfile}>
          &larr; Back to Profile
        </button>
        <h1 className="liked-songs-title">your liked songs</h1>
      </div>
      
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search liked songs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading && likedSongs.length === 0 ? (
        <div className="loading-container">
          <p>Loading your liked songs... {loadingProgress > 0 ? `${loadingProgress}%` : ''}</p>
          {loadingProgress > 0 && (
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${loadingProgress}%` }}></div>
            </div>
          )}
        </div>
      ) : filteredSongs.length > 0 ? (
        <>
          <div className="tracks-count">
            Showing {filteredSongs.length} {filteredSongs.length === 1 ? 'song' : 'songs'}
            {searchTerm && ' matching your search'}
          </div>
          <div className="tracks-table-container">
            <table className="tracks-table">
              <thead>
                <tr>
                  <th className="track-number">#</th>
                  <th className="track-title-header">Title</th>
                  <th className="track-album">Album</th>
                  <th className="track-duration">Duration</th>
                  <th className="track-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSongs.map((item, index) => {
                  const { track } = item;
                  return (
                    <tr key={track.id} className="track-row">
                      <td className="track-number">{index + 1}</td>
                      <td className="track-title">
                        <div className="track-title-container">
                          {track.album.images && track.album.images.length > 0 ? (
                            <img
                              src={track.album.images[track.album.images.length - 1].url}
                              alt={track.album.name}
                              className="track-image"
                            />
                          ) : (
                            <div className="track-image-placeholder"></div>
                          )}
                          <div className="track-info">
                            <div className="track-name">{track.name}</div>
                            <div className="track-artist">
                              {track.artists.map(artist => artist.name).join(", ")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="track-album">{track.album.name}</td>
                      <td className="track-duration">{formatDuration(track.duration_ms)}</td>
                      <td className="track-actions">
                        <button 
                          className="download-button"
                          onClick={() => handleDownload(track)}
                          disabled={downloadingTrack === track.id}
                        >
                          {downloadingTrack === track.id ? "Downloading..." : "Download"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {isLoading && (
            <div className="loading-more-indicator">
              <p>Loading more songs... {loadingProgress > 0 ? `${loadingProgress}%` : ''}</p>
              {loadingProgress > 0 && (
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: `${loadingProgress}%` }}></div>
                </div>
              )}
            </div>
          )}

          {nextUrl && !isLoading && (
            <div className="load-more-container">
              <button 
                className="load-more-button"
                onClick={handleLoadMore}
                disabled={isLoading}
              >
                Load more songs
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <p>You don't have any liked songs yet, or none match your search.</p>
        </div>
      )}
    </div>
  );
}

// Expose the LikedSongs component globally
window.LikedSongs = LikedSongs;
