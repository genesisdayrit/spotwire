// src/components/Home.js

const { useEffect } = React;

function Home() {
  useEffect(() => {
    const token = localStorage.getItem('spotify_access_token');
    if (token) {
      // You might show a logged-in message or perform another action
      console.log("Token found, user is logged in.");
    }
  }, []);

  function handleLogin() {
    const clientId = process.env.SPOTIFY_CLIENT_ID || 'YOUR_SPOTIFY_CLIENT_ID';
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'spotwire://callback';
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
    
    if (window.require) {
      const { shell } = window.require('electron');
      shell.openExternal(loginUrl);
    } else {
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

