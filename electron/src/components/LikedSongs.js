// src/components/LikedSongs.js

const { useState, useEffect, useRef } = React;

function LikedSongs() {
  // Use the global liked songs context instead of local state
  const { 
    likedSongs, 
    nextUrl, 
    isLoading, 
    loadingProgress,
    loadingAllSongs,
    loadThousandMore,
    loadAllSongs
  } = window.useLikedSongs();
  
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);
  
  // Add the downloads context
  const { downloads, addDownload, updateDownload } = window.useDownloads();
  
  // Check if a track is currently downloading - from downloads context
  const isDownloading = (trackId) =>
    downloads.some(
      (dl) =>
        dl.trackId === trackId &&
        (dl.status === "Started" || dl.status === "In Progress")
    );

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

  function handleLoadThousandMore() {
    if (nextUrl) {
      loadThousandMore();
    }
  }

  function handleLoadAll() {
    if (nextUrl) {
      loadAllSongs();
    }
  }

  function handleBackToProfile() {
    window.location.hash = "#profile";
  }

  async function handleDownload(track) {
    try {
      const defaultFolder = localStorage.getItem("default_downloads_folder");
      if (!defaultFolder) {
        alert("No default download folder set. Please set it in Settings.");
        return;
      }
      
      if (!track.external_urls || !track.external_urls.spotify) {
        alert("Track URL not available.");
        return;
      }
      
      const downloadId = `${track.id}-${Date.now()}`;
      const trackUrl = track.external_urls.spotify;
      
      // Add to the downloads context
      addDownload({
        downloadId,
        trackId: track.id,
        trackName: track.name,
        artist: track.artists.map((a) => a.name).join(", "),
        status: "Started",
        startTime: Date.now(),
        elapsed: null,
      });
      
      // Send the download command to the main process
      ipcRenderer.send("execute-download-command", { 
        downloadId, 
        trackUrl, 
        defaultFolder 
      });
    } catch (error) {
      console.error("Download failed:", error);
      alert("Download failed. Please try again later.");
    }
  }

  function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  return (
    <div className="liked-songs-container" ref={containerRef}>
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
                          disabled={isDownloading(track.id)}
                        >
                          {isDownloading(track.id) ? "Downloading..." : "Download"}
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
              <p>
                {loadingAllSongs ? 
                  `Loading all songs... ${likedSongs.length} loaded so far` : 
                  `Loading more songs... ${loadingProgress > 0 ? `${loadingProgress}%` : ''}`} 
              </p>
              {loadingProgress > 0 && !loadingAllSongs && (
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: `${loadingProgress}%` }}></div>
                </div>
              )}
            </div>
          )}

          {nextUrl && !isLoading && (
            <div className="load-options-container">
              <button 
                className="load-option-button load-thousand-button"
                onClick={handleLoadThousandMore}
                disabled={isLoading}
              >
                Load 1000 More
              </button>
              
              <button 
                className="load-option-button load-all-button"
                onClick={handleLoadAll}
                disabled={isLoading}
              >
                Load All Songs
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
