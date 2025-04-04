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

  const accessToken = localStorage.getItem("spotify_access_token");
  const { downloads, addDownload, updateDownload } = window.useDownloads();

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
      alert("No default download folder set. Please set it in Settings.");
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
      alert("No default download folder set. Please set it in Settings.");
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
    <div className="profile-container">
      {/* Header row with back arrow, playlist name, and new downloads button */}
      <div className="profile-header">
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* Back arrow to return to profile */}
          <span
            style={{ marginRight: "1rem", cursor: "pointer", fontSize: "1.5rem" }}
            onClick={() => (window.location.hash = "#profile")}
          >
            ←
          </span>
          {/* Display the playlist name */}
          <h1 className="profile-title" style={{ margin: 0 }}>
            {playlistName}
          </h1>
        </div>
        {/* New downloads button for full playlist download */}
        <button className="button" onClick={handleDownloadPlaylist}>
          {playlistDownloadInProgress ? "Cancel Download" : "Download Full Playlist"}
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-container" style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          className="search-input"
          placeholder="Search tracks or artists..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Track List */}
      {loading && tracks.length === 0 ? (
        <p>Loading tracks...</p>
      ) : filteredTracks.length > 0 ? (
        <>
          <table>
            <thead>
              <tr>
                <th>Track Name</th>
                <th>Artist</th>
                <th>Album</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {filteredTracks.map((item, index) => {
                const track = item.track;
                if (!track) return null;
                return (
                  <tr key={track.id || index}>
                    <td>{track.name}</td>
                    <td>{track.artists.map((artist) => artist.name).join(", ")}</td>
                    <td>{track.album.name}</td>
                    <td>
                      {isDownloading(track.id) ? (
                        <button className="button" disabled>
                          Downloading...
                        </button>
                      ) : (
                        <button className="button" onClick={() => handleDownload(track)}>
                          Download
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Load More Button */}
          {nextPageUrl && (
            <div style={{ margin: "1rem", textAlign: "center" }}>
              <button className="button" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      ) : (
        <p>No tracks found for this playlist.</p>
      )}
    </div>
  );
}

// Expose the PlaylistDetail component globally
window.PlaylistDetail = PlaylistDetail;

