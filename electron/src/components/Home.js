// src/components/Home.js

const { useEffect, useState } = React;

function Home() {
  const [authState, setAuthState] = useState('loading');
  
  useEffect(() => {
    // Check authentication state using the Auth service
    if (window.AuthService) {
      const state = window.AuthService.getAuthState();
      setAuthState(state);
      console.log(`[Home] Auth state: ${state}`);
    } else {
      // Fallback if AuthService is not available
      const token = localStorage.getItem('spotify_access_token');
      const clientId = localStorage.getItem('spotify_client_id');
      
      if (!clientId) {
        setAuthState('needs_config');
      } else if (token) {
        setAuthState('authenticated');
        console.log("[Home] Token found, but waiting for user to click login button.");
      } else {
        setAuthState('needs_login');
        console.log("[Home] No token found in localStorage");
      }
    }
  }, []);

  async function handleLogin() {
    if (window.AuthService) {
      console.log("[Home] Using AuthService for login flow");
      
      const authState = window.AuthService.getAuthState();
      
      if (authState === 'needs_config') {
        // No client ID, redirect to config
        console.log("[Home] No client ID, redirecting to config");
        window.location.hash = '#spotify-config';
        return;
      }
      
      if (authState === 'authenticated') {
        // Token exists and is valid or can be refreshed
        try {
          // Try to get a valid token (this will refresh if needed)
          const token = await window.AuthService.getAccessToken();
          if (token) {
            console.log("[Home] Valid token obtained, redirecting to profile");
            window.location.hash = '#profile';
            return;
          }
        } catch (error) {
          console.error("[Home] Error getting token:", error);
        }
      }
      
      // If we get here, we need to start the OAuth flow
      console.log("[Home] Starting OAuth flow");
      window.AuthService.startOAuthFlow();
    } else {
      // Fallback if AuthService is not available
      const clientId = localStorage.getItem('spotify_client_id');
      const token = localStorage.getItem('spotify_access_token');
      
      console.log("[Home] Legacy login - clientId exists:", !!clientId, "token exists:", !!token);
      
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
      console.log("[Home] Starting OAuth flow (legacy)");
      
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
  }

  return (
    <div className="container">
      <h1 className="title">spotwire</h1>
      <button onClick={handleLogin} className="button">Log in with Spotify</button>
    </div>
  );
}

// Attach Home to the global window object so it can be accessed from index.html
window.Home = Home;

