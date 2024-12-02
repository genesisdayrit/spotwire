(function() {
  // Redirect to profile if a Spotify access token is already stored
  const storedToken = localStorage.getItem("spotify_access_token");
  if (storedToken) {
    window.location.href = "profile.html";
  }

  // Function to generate Spotify login URL (similar to your Next.js utility)
  function generateSpotifyLoginUrl() {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '5a4ca85ac79743198371996e8207024b';
    const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || 'http://localhost:3000/callback';
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
      scope: scope.join(" ")
    });
    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  // Set the login URL for the Spotify button
  document.getElementById("spotify-login").href = generateSpotifyLoginUrl();
})();

