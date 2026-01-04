// src/components/PlaylistDetail.js

const { useState, useEffect } = React;

function PlaylistDetail({ playlistId }) {
  const [tracks, setTracks] = useState([]);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [playlistName, setPlaylistName] = useState(""); // to store playlist name

  // New state to track the full playlist download
  const [playlistDownloadInProgress, setPlaylistDownloadInProgress] = useState(false);
  const [playlistDownloadId, setPlaylistDownloadId] = useState(null);
  
  // Add state for custom dialog
  const [showDialog, setShowDialog] = useState(false);

  const accessToken = localStorage.getItem("spotify_access_token");
  const { downloads, addDownload, updateDownload } = window.useDownloads();

  const isDownloading = (trackId) =>
    downloads.some(
      (dl) =>
        dl.trackId === trackId &&
        (dl.status === "Started" || dl.status === "In Progress")
    );

  function handleTokenExpiration() {
    // Use the global handler instead of local implementation
    window.handleTokenExpiration();
  }

  // Fetch playlist info (for name) and tracks
  useEffect(() => {
    if (accessToken && playlistId) {
      // 1) Fetch the playlist to get its name
      fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => {
          if (!res.ok) {
            if (res.status === 401) handleTokenExpiration();
            throw new Error("Failed to fetch playlist details");
          }
          return res.json();
        })
        .then((data) => {
          setPlaylistName(data.name || "Playlist");
        })
        .catch((err) => {
          console.error("Error fetching playlist details", err);
        });

      // 2) Fetch the tracks
      const initialUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
      fetchTracks(initialUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, playlistId]);

  const fetchTracks = (url, append = false) => {
    fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) handleTokenExpiration();
          throw new Error("Failed to fetch tracks");
        }
        return res.json();
      })
      .then((data) => {
        setTracks((prev) =>
          append ? [...prev, ...(data.items || [])] : data.items || []
        );
        setNextPageUrl(data.next);
        setLoading(false);
        setLoadingMore(false);
      })
      .catch((err) => {
        console.error("Error fetching tracks", err);
        setLoading(false);
        setLoadingMore(false);
      });
  };

  const loadMore = () => {
    if (nextPageUrl) {
      setLoadingMore(true);
      fetchTracks(nextPageUrl, true);
    }
  };

  function handleDownload(track) {
    const defaultFolder = localStorage.getItem("default_downloads_folder");
    if (!defaultFolder) {
      setShowDialog(true);
      return;
    }
    if (!track.external_urls || !track.external_urls.spotify) {
      alert("Track URL not available.");
      return;
    }
    const downloadId = `${track.id}-${Date.now()}`;
    const trackUrl = track.external_urls.spotify;
    addDownload({
      downloadId,
      trackId: track.id,
      trackName: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      status: "Started",
      startTime: Date.now(),
      elapsed: null,
    });
    ipcRenderer.send("execute-download-command", { downloadId, trackUrl, defaultFolder });
  }

  // Handler for full playlist download
  function handleDownloadPlaylist() {
    const defaultFolder = localStorage.getItem("default_downloads_folder");
    if (!defaultFolder) {
      setShowDialog(true);
      return;
    }
    // If not already in progress, start the download
    if (!playlistDownloadInProgress) {
      const playlistUrl = `https://open.spotify.com/playlist/${playlistId}`;
      const downloadId = `playlist-${playlistId}-${Date.now()}`;
      setPlaylistDownloadId(downloadId);
      setPlaylistDownloadInProgress(true);
      // Add an aggregated download entry with the playlist title
      addDownload({
        downloadId,
        trackId: null,
        trackName: `Playlist: ${playlistName}`,
        artist: "",
        status: "Started",
        startTime: Date.now(),
        elapsed: null,
        isPlaylist: true,
      });
      ipcRenderer.send("execute-download-command", {
        downloadId,
        trackUrl: playlistUrl,
        defaultFolder,
        isPlaylist: true,
      });
    } else {
      // Cancel the download (UI-only cancellation)
      updateDownload(playlistDownloadId, { status: "Canceled" });
      setPlaylistDownloadInProgress(false);
    }
  }

  function handleBackToProfile() {
    window.location.hash = "#profile";
  }

  function handleGoToSettings() {
    setShowDialog(false);
    window.location.hash = "#settings";
  }

  function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  function copyCliCommand(track) {
    const defaultFolder = localStorage.getItem("default_downloads_folder");
    if (!defaultFolder) {
      setShowDialog(true);
      return;
    }
    const trackUrl = track.external_urls?.spotify;
    if (!trackUrl) {
      alert("Track URL not available.");
      return;
    }
    const command = `bash -c "source '$HOME/Library/Application Support/spotwire/spotwire_data/venv/bin/activate' && spotdl download '${trackUrl}' --output '${defaultFolder}'"`;
    navigator.clipboard.writeText(command).then(() => {
      // Brief visual feedback could be added here
    });
  }

  const filteredTracks = tracks.filter((item) => {
    const track = item.track;
    if (!track) return false;
    const lowerCaseQuery = searchTerm.toLowerCase();
    const trackNameMatches = track.name.toLowerCase().includes(lowerCaseQuery);
    const artistMatches = track.artists.some((artist) =>
      artist.name.toLowerCase().includes(lowerCaseQuery)
    );
    return trackNameMatches || artistMatches;
  });

  return (
    <div className="liked-songs-container">
      {showDialog && (
        <div className="custom-dialog-overlay">
          <div className="custom-dialog">
            <h3>No Default Download Folder</h3>
            <p>No default download folder set. Please set it in Settings.</p>
            <div className="dialog-buttons">
              <button onClick={() => setShowDialog(false)} className="secondary-button">
                Cancel
              </button>
              <button onClick={handleGoToSettings} className="primary-button">
                Go to Settings
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="liked-songs-header">
        <button className="back-button" onClick={handleBackToProfile}>
          &larr; Back to Profile
        </button>
        <h1 className="liked-songs-title">{playlistName}</h1>
        <div style={{ marginLeft: "auto" }}>
          <button 
            className="download-button" 
            onClick={handleDownloadPlaylist}
            style={{ 
              padding: '0.6rem 1.2rem', 
              fontSize: '0.9rem', 
              backgroundColor: playlistDownloadInProgress ? '#4b5563' : '#22c55e' 
            }}
          >
            {playlistDownloadInProgress ? "Cancel Download" : "Download Full Playlist"}
          </button>
        </div>
      </div>
      
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search tracks or artists..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading && tracks.length === 0 ? (
        <div className="loading-container">
          <p>Loading tracks...</p>
        </div>
      ) : filteredTracks.length > 0 ? (
        <>
          <div className="tracks-count">
            Showing {filteredTracks.length} {filteredTracks.length === 1 ? 'track' : 'tracks'}
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
                {filteredTracks.map((item, index) => {
                  const track = item.track;
                  if (!track) return null;
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
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            className="copy-cli-button"
                            onClick={() => copyCliCommand(track)}
                            title="Copy CLI command"
                            style={{
                              padding: '6px 8px',
                              background: 'transparent',
                              border: '1px solid #4b5563',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>
                          <button
                            className="download-button"
                            onClick={() => handleDownload(track)}
                            disabled={isDownloading(track.id)}
                          >
                            {isDownloading(track.id) ? "Downloading..." : "Download"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {loadingMore && (
            <div className="loading-more-indicator">
              <p>Loading more tracks...</p>
            </div>
          )}

          {nextPageUrl && !loadingMore && (
            <div className="load-options-container">
              <button 
                className="load-option-button load-all-button"
                onClick={loadMore}
                disabled={loadingMore}
              >
                Load All Tracks
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <p>No tracks found{searchTerm && ' matching your search'}.</p>
        </div>
      )}
    </div>
  );
}

// Expose the PlaylistDetail component globally
window.PlaylistDetail = PlaylistDetail;
