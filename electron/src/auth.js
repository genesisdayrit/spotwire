// auth.js - Centralized authentication service for Spotify API

// Get electron's ipcRenderer if available in this context
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

/**
 * Auth service for Spotify API
 * Handles token storage, validation, refresh, and OAuth flow
 */
const AuthService = {
  /**
   * Get stored credentials from localStorage
   */
  getCredentials() {
    return {
      clientId: localStorage.getItem('spotify_client_id'),
      clientSecret: localStorage.getItem('spotify_client_secret'),
      redirectUri: localStorage.getItem('spotify_redirect_uri') || 'spotwire://callback'
    };
  },

  /**
   * Check if client ID is configured
   */
  hasClientId() {
    return !!localStorage.getItem('spotify_client_id');
  },

  /**
   * Store token data in localStorage with expiration
   * @param {Object} tokenData - The token data from Spotify API
   */
  storeTokenData(tokenData) {
    if (!tokenData || !tokenData.access_token) {
      console.error('[Auth] Cannot store invalid token data');
      return false;
    }

    const expiresAt = Date.now() + (tokenData.expires_in * 1000);
    
    localStorage.setItem('spotify_access_token', tokenData.access_token);
    
    // Store the refresh token if provided
    if (tokenData.refresh_token) {
      localStorage.setItem('spotify_refresh_token', tokenData.refresh_token);
    }
    
    // Store the expiration timestamp
    localStorage.setItem('spotify_token_expires_at', expiresAt.toString());
    
    console.log(`[Auth] Token stored, expires in ${tokenData.expires_in} seconds`);
    return true;
  },

  /**
   * Check if the current token is valid and not expired
   */
  hasValidToken() {
    const token = localStorage.getItem('spotify_access_token');
    const expiresAt = localStorage.getItem('spotify_token_expires_at');
    
    if (!token || !expiresAt) {
      return false;
    }
    
    // Add a 60-second buffer to account for network delays
    return Date.now() < (parseInt(expiresAt) - (60 * 1000));
  },

  /**
   * Get a valid access token, refreshing if necessary
   * @returns {Promise<string|null>} The access token or null if unavailable
   */
  async getAccessToken() {
    // If token is valid, return it immediately
    if (this.hasValidToken()) {
      return localStorage.getItem('spotify_access_token');
    }
    
    // If we have a refresh token, try to refresh
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    if (refreshToken) {
      try {
        const newTokenData = await this.refreshAccessToken(refreshToken);
        if (newTokenData && newTokenData.access_token) {
          this.storeTokenData(newTokenData);
          return newTokenData.access_token;
        }
      } catch (error) {
        console.error('[Auth] Error refreshing token:', error);
      }
    }
    
    // If we get here, we couldn't get a valid token
    console.warn('[Auth] No valid token available, user needs to login again');
    return null;
  },

  /**
   * Refresh the access token using the refresh token
   * @param {string} refreshToken - The refresh token
   * @returns {Promise<Object|null>} New token data or null if failed
   */
  async refreshAccessToken(refreshToken) {
    if (!ipcRenderer) {
      console.error('[Auth] Cannot refresh token: ipcRenderer not available');
      return null;
    }
    
    try {
      console.log('[Auth] Attempting to refresh access token');
      const result = await ipcRenderer.invoke('refresh-spotify-token', { refreshToken });
      
      if (result && result.access_token) {
        console.log('[Auth] Successfully refreshed access token');
        return result;
      } else {
        console.error('[Auth] Failed to refresh token:', result.error || 'Unknown error');
        return null;
      }
    } catch (error) {
      console.error('[Auth] Error refreshing token:', error);
      return null;
    }
  },

  /**
   * Start the OAuth flow
   * @returns {boolean} Whether the flow was started successfully
   */
  startOAuthFlow() {
    const { clientId, redirectUri } = this.getCredentials();
    
    if (!clientId) {
      console.error('[Auth] Cannot start OAuth flow: missing client ID');
      return false;
    }
    
    console.log('[Auth] Starting OAuth flow');
    
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
    console.log('[Auth] Generated login URL with redirect URI:', redirectUri);
    
    try {
      if (window.require) {
        const { shell } = window.require('electron');
        console.log('[Auth] Opening URL with Electron shell.openExternal');
        shell.openExternal(loginUrl);
        return true;
      } else {
        console.log('[Auth] Opening URL with window.open');
        window.open(loginUrl, '_blank');
        return true;
      }
    } catch (error) {
      console.error('[Auth] Error opening login URL:', error);
      return false;
    }
  },

  /**
   * Handle authentication state and redirects
   * @returns {string} The current auth state: 'needs_config', 'needs_login', or 'authenticated'
   */
  getAuthState() {
    const clientId = this.hasClientId();
    
    if (!clientId) {
      return 'needs_config';
    }
    
    // Use getAccessToken to check and refresh token if needed
    const hasToken = this.hasValidToken() || localStorage.getItem('spotify_refresh_token');
    
    if (!hasToken) {
      return 'needs_login';
    }
    
    return 'authenticated';
  },

  /**
   * Logout - Clear all authentication data
   */
  logout() {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expires_at');
    console.log('[Auth] User logged out');
  }
};

// Expose auth service globally
window.AuthService = AuthService; 