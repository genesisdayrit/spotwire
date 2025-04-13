// src/components/Home.js

const { useEffect } = React;

function Home() {
  useEffect(() => {
    const token = localStorage.getItem('spotify_access_token');
    
    if (token) {
      // Log if token exists, but don't redirect automatically
      console.log("[Home] Token found, but waiting for user to click login button.");
    } else {
      console.log("[Home] No token found in localStorage");
    }
  }, []);

  function handleLogin() {
    const clientId = localStorage.getItem('spotify_client_id');
    const token = localStorage.getItem('spotify_access_token');
    
    console.log("[Home] Login clicked - clientId exists:", !!clientId, "token exists:", !!token);
    
    // Redirect to config if credentials are missing
    if (!clientId) {
      console.log("[Home] No client ID, redirecting to config");
      window.location.hash = '#spotify-config';
      return;
    }
    
    // If we already have a token, go directly to profile
    if (token) {
      console.log("[Home] Token exists, redirecting to profile");
      window.location.hash = '#profile';
      return;
    }
    
    // Otherwise, start the OAuth flow
    console.log("[Home] Starting OAuth flow");
    
    // Make sure to use the correct redirect URI for the packaged app
    const redirectUri = 'spotwire://callback';
    localStorage.setItem('spotify_redirect_uri', redirectUri);
    
    const scope = [
      "ugc-image-upload",
      "user-read-playback-state",
      "user-modify-playback-state",
      "user-read-currently-playing",
      "streaming",
      "app-remote-control",
      "playlist-read-private",
      "playlist-read-collaborative",
      "playlist-modify-private",
      "playlist-modify-public",
      "user-follow-modify",
      "user-follow-read",
      "user-read-playback-position",
      "user-top-read",
      "user-read-recently-played",
      "user-library-modify",
      "user-library-read",
      "user-read-email",
      "user-read-private"
    ];
    
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: scope.join(" "),
    });
    
    const loginUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    console.log("[Home] Generated login URL with redirect URI:", redirectUri);
    
    if (window.require) {
      try {
        const { shell } = window.require('electron');
        console.log("[Home] Opening URL with Electron shell.openExternal");
        shell.openExternal(loginUrl);
      } catch (error) {
        console.error("[Home] Error opening URL with Electron:", error);
        // Fall back to window.open as a last resort
        window.open(loginUrl, '_blank');
      }
    } else {
      console.log("[Home] Opening URL with window.open");
      window.open(loginUrl, '_blank');
    }
  }

  return (
    <div className="container">
      <h1 className="title">spotwire</h1>
      <button onClick={handleLogin} className="button">Log in with Spotify</button>
      <a href="#instructions" className="button">Instructions</a>
    </div>
  );
}

// Attach Home to the global window object so it can be accessed from index.html
window.Home = Home;

