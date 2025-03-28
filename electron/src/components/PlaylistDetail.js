// src/components/PlaylistDetail.js

const { useState, useEffect, useRef } = React;

function PlaylistDetail({ playlistId }) {
  const [tracks, setTracks] = useState([]);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [playlistName, setPlaylistName] = useState("");

  // New state to track the full playlist download
  const [playlistDownloadInProgress, setPlaylistDownloadInProgress] = useState(false);
  const [playlistDownloadId, setPlaylistDownloadId] = useState(null);

  // State and ref for track previewing
  const [currentlyPlayingTrackId, setCurrentlyPlayingTrackId] = useState(null);
  const audioRef = useRef(null);

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

  // Fetch playlist info (name) and tracks
  useEffect(() => {
    if (accessToken && playlistId) {
      // Fetch playlist details for the name
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

      // Fetch the tracks
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
    if (!playlistDownloadInProgress) {
      const playlistUrl = `https://open.spotify.com/playlist/${playlistId}`;
      const downloadId = `playlist-${playlistId}-${Date.now()}`;
      setPlaylistDownloadId(downloadId);
      setPlaylistDownloadInProgress(true);
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
      updateDownload(playlistDownloadId, { status: "Canceled" });
      setPlaylistDownloadInProgress(false);
    }
  }

  // Cleanup any playing audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Handler for previewing tracks (only tracks now)
  const handlePreviewClick = (track) => {
    console.log("Preview button clicked for:", track.name);
    const previewUrl = track.preview_url;
    // Check for a valid preview URL (only checking if it exists)
    if (!previewUrl) {
      console.warn("No preview URL available for", track.name);
      return;
    }
    // If this track is already playing, stop it.
    if (currentlyPlayingTrackId === track.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setCurrentlyPlayingTrackId(null);
      return;
    }
    // Stop any other playing preview.
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    const audio = new Audio(previewUrl);
    audio
      .play()
      .then(() => {
        console.log("Audio started playing for:", track.name);
        setCurrentlyPlayingTrackId(track.id);
        audioRef.current = audio;
      })
      .catch((error) => {
        console.error("Error playing audio preview:", error);
      });
    audio.onended = () => {
      console.log("Audio ended for:", track.name);
      setCurrentlyPlayingTrackId(null);
      audioRef.current = null;
    };
  };

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

  // Base style for the preview button
  const previewButtonBaseStyle = {
    border: "none",
    borderRadius: "50%",
    width: "30px",
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    marginRight: "0.5rem"
  };

  return (
    <div className="profile-container">
      {/* Header row with back arrow, playlist name, and full playlist download button */}
      <div className="profile-header">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{ marginRight: "1rem", cursor: "pointer", fontSize: "1.5rem" }}
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
                setCurrentlyPlayingTrackId(null);
              }
              window.location.hash = "#profile";
            }}
          >
            ←
          </span>
          <h1 className="profile-title" style={{ margin: 0 }}>
            {playlistName}
          </h1>
        </div>
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
        <table>
          <thead>
            <tr>
              {/* Column for the preview/play button */}
              <th style={{ width: "40px" }}></th>
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
              const previewUrl = track.preview_url;
              // Check if a preview is available based solely on its existence
              const isPreviewAvailable = !!previewUrl;
              const previewButtonStyle = {
                ...previewButtonBaseStyle,
                backgroundColor: isPreviewAvailable ? "#28a745" : "#6c757d",
                cursor: isPreviewAvailable ? "pointer" : "default"
              };
              return (
                <tr key={track.id || index}>
                  <td>
                    <button
                      onClick={() => handlePreviewClick(track)}
                      style={previewButtonStyle}
                      title={isPreviewAvailable ? "Play Preview" : "No Preview Available"}
                    >
                      {currentlyPlayingTrackId === track.id ? (
                        <svg width="16" height="16" viewBox="0 0 16 16">
                          <rect x="4" y="4" width="8" height="8" fill="white" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16">
                          <polygon points="4,3 12,8 4,13" fill="white" />
                        </svg>
                      )}
                    </button>
                  </td>
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
      ) : (
        <p>No tracks found for this playlist.</p>
      )}

      {/* Load More Button */}
      {nextPageUrl && (
        <div style={{ margin: "1rem", textAlign: "center" }}>
          <button className="button" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}

window.PlaylistDetail = PlaylistDetail;

