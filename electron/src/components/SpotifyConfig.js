const { useState } = React;
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

function SpotifyConfig() {
  const [clientId, setClientId] = useState(localStorage.getItem('spotify_client_id') || '');
  const [clientSecret, setClientSecret] = useState(localStorage.getItem('spotify_client_secret') || '');
  const [validationStatus, setValidationStatus] = useState({
    tested: false,
    valid: false,
    loading: false,
    message: ''
  });
  
  // Default redirect URI (hidden from UI)
  const redirectUri = 'spotwire://callback';

  async function testAndSaveCredentials() {
    if (!ipcRenderer) {
      setValidationStatus({
        tested: true,
        valid: false,
        loading: false,
        message: 'IPC not available in this environment'
      });
      return;
    }

    // If already validated, save and navigate to login
    if (validationStatus.valid) {
      saveAndLogin();
      return;
    }

    // Clear previous message and set loading state without showing error styling
    setValidationStatus({ 
      tested: false, 
      valid: false, 
      loading: true, 
      message: 'Testing credentials...' 
    });
    
    try {
      // Send to main process to test API connection
      const result = await ipcRenderer.invoke('test-spotify-credentials', {
        clientId,
        clientSecret,
        redirectUri
      });
      
      if (result.success) {
        setValidationStatus({ 
          tested: true, 
          valid: true, 
          loading: false, 
          message: 'Credentials verified successfully!' 
        });
      } else {
        setValidationStatus({ 
          tested: true, 
          valid: false, 
          loading: false, 
          message: `Validation failed: ${result.error}` 
        });
      }
    } catch (error) {
      setValidationStatus({ 
        tested: true, 
        valid: false, 
        loading: false, 
        message: `Error testing credentials: ${error.message}` 
      });
    }
  }

  function saveAndLogin() {
    console.log('[SpotifyConfig] Saving Spotify credentials to localStorage and main process');
    
    // Save credentials
    localStorage.setItem('spotify_client_id', clientId);
    localStorage.setItem('spotify_client_secret', clientSecret);
    localStorage.setItem('spotify_redirect_uri', redirectUri);
    
    // Send to main process
    if (ipcRenderer) {
      try {
        console.log('[SpotifyConfig] Sending credentials to main process');
        ipcRenderer.send('set-spotify-credentials', {
          clientId,
          clientSecret,
          redirectUri
        });
      } catch (error) {
        console.error('[SpotifyConfig] Error sending credentials to main process:', error);
      }
    } else {
      console.warn('[SpotifyConfig] IPC not available, credentials not sent to main process');
    }
    
    // Add a small delay to ensure credentials are saved before proceeding
    setTimeout(() => {
      // Check if we already have a token
      const token = localStorage.getItem('spotify_access_token');
      
      if (token) {
        // If token exists, go directly to profile
        console.log('[SpotifyConfig] Token exists, navigating to profile');
        window.location.hash = '#profile';
      } else {
        // Start OAuth flow directly without going to home page
        console.log('[SpotifyConfig] No token found, starting OAuth flow');
        startOAuthFlow();
      }
    }, 300);
  }
  
  function startOAuthFlow() {
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
    console.log('[SpotifyConfig] Generated OAuth URL with redirect URI:', redirectUri);
    
    try {
      if (window.require) {
        const { shell } = window.require('electron');
        console.log('[SpotifyConfig] Opening URL with Electron shell');
        shell.openExternal(loginUrl);
      } else {
        console.log('[SpotifyConfig] Opening URL with window.open');
        window.open(loginUrl, '_blank');
      }
    } catch (error) {
      console.error('[SpotifyConfig] Error opening OAuth URL:', error);
      // Show error to user
      setValidationStatus({
        tested: true,
        valid: false,
        loading: false,
        message: `Error starting login process: ${error.message}`
      });
    }
  }

  return (
    <div className="settings-container">
      <div className="settings-main">
        <div className="settings-header-row">
          <button 
            onClick={() => window.location.hash = '#'} 
            className="settings-back-button"
          >
            ←
          </button>
          <h1 className="settings-title">Spotify Configuration</h1>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">Spotify API Credentials</h2>
          
          <div className="settings-input-group">
            <label>Client ID</label>
            <input 
              type="text" 
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              placeholder="Enter your Spotify Client ID"
              className="settings-input"
            />
          </div>
          
          <div className="settings-input-group">
            <label>Client Secret</label>
            <input 
              type="password" 
              value={clientSecret}
              onChange={e => setClientSecret(e.target.value)}
              placeholder="Enter your Spotify Client Secret"
              className="settings-input"
            />
          </div>
          
          {validationStatus.message && (
            <div className={`validation-message ${validationStatus.tested ? (validationStatus.valid ? 'valid-message' : 'invalid-message') : 'neutral-message'}`}>
              {validationStatus.message}
            </div>
          )}

          <div className="settings-buttons-container">
            <button 
              className="button" 
              onClick={testAndSaveCredentials}
              disabled={!clientId || !clientSecret || validationStatus.loading}
            >
              {validationStatus.loading ? 'Testing...' : 
                validationStatus.valid ? 'Save Credentials and Login' : 'Test and Save Credentials'}
            </button>
          </div>
          
          <p className="settings-description">
            You need to register your application in the Spotify Developer Dashboard to get these credentials.
            <a href="https://developer.spotify.com/documentation/web-api/tutorials/getting-started" target="_blank" rel="noopener noreferrer" className="link"> Follow the official guide</a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Attach the component to the global object
window.SpotifyConfig = SpotifyConfig; 