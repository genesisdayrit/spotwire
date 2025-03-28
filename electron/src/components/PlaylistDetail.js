// src/components/PlaylistDetail.js

const { useState, useEffect } = React;

function PlaylistDetail({ playlistId }) {
  const [tracks, setTracks] = useState([]);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const accessToken = localStorage.getItem("spotify_access_token");
  const { downloads, addDownload } = useDownloads();

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

  useEffect(() => {
    if (accessToken && playlistId) {
      const initialUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
      fetchTracks(initialUrl);
    }
  }, [accessToken, playlistId]);

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
      <div className="profile-header">
        <h1 className="profile-title">Playlist Tracks</h1>
        <span className="button" onClick={() => (window.location.hash = "#profile")}>
          Back to Profile
        </span>
      </div>
      <div className="search-container" style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          className="search-input"
          placeholder="Search tracks or artists..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
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

