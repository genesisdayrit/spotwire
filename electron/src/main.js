// src/main.js
require('dotenv').config();
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const { exec, execSync, spawn } = require('child_process');
const path = require('path');
const fetch = require('node-fetch');
const fs = require('fs');
// Import our Python setup module
const pythonSetup = require('./python-setup');

// Auto-updater configuration
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

// Store for Spotify credentials
let spotifyCredentials = {
  clientId: null,
  clientSecret: null,
  redirectUri: 'spotwire://callback'
};

// Add variables for main and splash windows
let mainWindow;
let splashWindow;
let isSetupComplete = false;

async function exchangeAuthCodeForToken(authCode) {
  const clientId = process.env.SPOTIFY_CLIENT_ID || spotifyCredentials.clientId;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || spotifyCredentials.clientSecret;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || spotifyCredentials.redirectUri || 'spotwire://callback';
  
  if (!clientId || !clientSecret) {
    console.error('Missing Spotify credentials for token exchange');
    return null;
  }
  
  console.log(`[Token Exchange] Using client ID: ${clientId.substring(0, 5)}... and redirect URI: ${redirectUri}`);
  
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: authCode,
    redirect_uri: redirectUri,
  });
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  try {
    console.log('[Token Exchange] Sending request to Spotify API');
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      console.error(`[Token Exchange] Error response from Spotify: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`[Token Exchange] Error body: ${errorText}`);
      return { error: true, error_description: `Spotify API error: ${response.status} ${response.statusText}` };
    }
    
    const data = await response.json();
    
    if (!data.access_token) {
      console.error('[Token Exchange] No access token in response', data);
      return { error: true, error_description: 'No access token received from Spotify' };
    }
    
    console.log('[Token Exchange] Successfully received token');
    
    return data;
  } catch (error) {
    console.error('[Token Exchange] Error exchanging auth code:', error);
    return { error: true, error_description: `Network error: ${error.message}` };
  }
}

// Add new function for refreshing tokens
async function refreshSpotifyToken(refreshToken) {
  const clientId = process.env.SPOTIFY_CLIENT_ID || spotifyCredentials.clientId;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || spotifyCredentials.clientSecret;
  
  if (!clientId || !clientSecret) {
    console.error('[Token Refresh] Missing Spotify credentials for token refresh');
    return { error: true, error_description: 'Missing Spotify credentials' };
  }
  
  console.log('[Token Refresh] Attempting to refresh token');
  
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      console.error(`[Token Refresh] Error response from Spotify: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`[Token Refresh] Error body: ${errorText}`);
      return { error: true, error_description: `Spotify API error: ${response.status} ${response.statusText}` };
    }
    
    const data = await response.json();
    
    if (!data.access_token) {
      console.error('[Token Refresh] No access token in response', data);
      return { error: true, error_description: 'No access token received from Spotify' };
    }
    
    console.log('[Token Refresh] Successfully refreshed token');
    
    // Note: The refresh token response doesn't include a new refresh token unless rotation is enabled
    // Make sure to retain the existing refresh token when saving this response
    return data;
  } catch (error) {
    console.error('[Token Refresh] Error refreshing token:', error);
    return { error: true, error_description: `Network error: ${error.message}` };
  }
}

// Create splash window function
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 300,
    transparent: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets/spotwire_logo_v1.png')
  });
  
  splashWindow.loadFile('src/splash.html');
  
  // Don't show the splash window in taskbar
  splashWindow.setSkipTaskbar(true);
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    show: false, // Don't show until setup is done
    icon: path.join(__dirname, 'assets/spotwire_logo_v1.png')
  });
  
  mainWindow.loadFile('src/index.html');
  
  // Check for updates after the app loads
  autoUpdater.checkForUpdatesAndNotify();
  
  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    if (isSetupComplete) {
      mainWindow.show();
      if (splashWindow) {
        splashWindow.close();
      }
    }
  });
}

// Function to create the main window
function createMainWindow() {
  if (!mainWindow) {
    createWindow();
  }
  
  // Check if ffmpeg is installed and show warning if not
  if (!pythonSetup.checkFFmpeg()) {
    dialog.showMessageBox({
      type: 'warning',
      title: 'FFmpeg Missing',
      message: 'FFmpeg is required for audio downloads.',
      detail: 'We were unable to find or use FFmpeg either bundled with the application or installed on your system.\n\nPlease install FFmpeg using your system\'s package manager:\n\nmacOS: brew install ffmpeg\nWindows: Download from ffmpeg.org\nLinux: sudo apt install ffmpeg',
      buttons: ['OK']
    });
  } else if (global.ffmpegPath) {
    console.log(`Using bundled FFmpeg from: ${global.ffmpegPath}`);
  }
  
  // Show main window
  if (mainWindow) {
    isSetupComplete = true;
    mainWindow.show();
  }
  
  // Store a reference to splash window to safely close it
  const splashWindowToClose = splashWindow;
  
  // Clear the global reference first to prevent any new operations on it
  splashWindow = null;
  
  // Close splash window after main window is shown
  if (splashWindowToClose && !splashWindowToClose.isDestroyed()) {
    try {
      splashWindowToClose.close();
    } catch (error) {
      console.error('Error closing splash window:', error);
    }
  }
}

// Register the custom protocol handler immediately for macOS
if (process.platform === 'darwin') {
  app.setAsDefaultProtocolClient('spotwire');
}

app.whenReady().then(async () => {
  // Register the custom protocol for OAuth callbacks on Windows and Linux
  if (process.platform !== 'darwin') {
    app.setAsDefaultProtocolClient('spotwire');
  }
  
  // Set the dock icon on macOS
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, 'assets/spotwire_logo_v1.png'));
  }
  
  createSplashWindow();
  
  try {
    // First, check Python version compatibility
    const pythonCheck = pythonSetup.checkPythonVersion();
    if (!pythonCheck.compatible) {
      console.warn(`Python version check: ${pythonCheck.message}`);
      
      if (splashWindow) {
        splashWindow.webContents.send('setup-progress', {
          status: 'Python Version Warning',
          progress: 5,
          message: pythonCheck.message
        });
      }
      
      // If running on macOS 24.3.0 or newer with Python 3.12, show a specific warning
      if (process.platform === 'darwin' && 
          pythonCheck.version === '3.12' && 
          process.getSystemVersion() >= '24.0.0') {
        dialog.showMessageBox({
          type: 'warning',
          title: 'Python Version Warning',
          message: 'macOS 24 comes with Python 3.12 which may have compatibility issues with some audio libraries.',
          detail: 'For best results, consider installing Python 3.11 alongside the system Python.\n\nWe will attempt to continue with the setup, but you may experience issues.',
          buttons: ['Continue Anyway', 'Exit'],
          defaultId: 0
        }).then(({ response }) => {
          if (response === 1) {
            app.quit();
            return;
          }
        });
      }
    }
    
    // Check if ffmpeg is installed
    const ffmpegInstalled = pythonSetup.checkFFmpeg();
    if (!ffmpegInstalled) {
      console.warn('FFmpeg not found');
      if (splashWindow) {
        splashWindow.webContents.send('setup-progress', {
          status: 'Missing Dependency',
          progress: 5,
          message: 'FFmpeg not found. It will be required for audio conversion.'
        });
      }
    }
    
    // Setup Python environment
    await pythonSetup.setupPythonEnvironment(splashWindow ? splashWindow.webContents : null);
    
    createMainWindow();
  } catch (error) {
    console.error('Setup failed:', error);
    createMainWindow(); // Create the main window anyway so user can see error messages
  }
});

// Listen for custom protocol calls (OAuth callback)
app.on('open-url', async (event, url) => {
  event.preventDefault();
  console.log('[open-url] Received URL:', url);

  // Extract the auth code from the callback URL.
  const urlObj = new URL(url);
  const authCode = urlObj.searchParams.get('code');
  
  if (!authCode) {
    console.error('[open-url] Failed to extract auth code from URL:', url);
    return;
  }
  console.log("[open-url] Extracted auth code:", authCode.substring(0, 10) + "...");

  // Check if credentials are available
  if (!spotifyCredentials.clientId || !spotifyCredentials.clientSecret) {
    console.error('[open-url] Missing Spotify credentials - redirecting to config page');
    
    // Find a window to redirect
    let targetWindow = mainWindow;
    if (!targetWindow || targetWindow.isDestroyed() || !targetWindow.isVisible()) {
      targetWindow = BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && w.isVisible());
    }
    
    if (targetWindow) {
      // Redirect to the config page instead of showing an error
      console.log('[open-url] Redirecting to Spotify config page');
      targetWindow.webContents.executeJavaScript("window.location.hash = '#spotify-config';");
      targetWindow.focus();
    } else {
      // If no window is available, still need to show an error
      dialog.showErrorBox('Configuration Required', 
        'Spotify API credentials are required. Please restart the application and configure your Spotify credentials.');
    }
    return;
  }

  // Log the current client ID and secret state (redacted for security)
  console.log("[open-url] Current credentials state - Client ID exists:", !!spotifyCredentials.clientId, 
              "Client Secret exists:", !!spotifyCredentials.clientSecret);
  
  // Exchange the auth code for an access token.
  let tokenData;
  try {
    tokenData = await exchangeAuthCodeForToken(authCode);
  } catch (error) {
    console.error('[open-url] Error during exchangeAuthCodeForToken:', error);
    
    // Find a window to redirect
    let targetWindow = mainWindow;
    if (!targetWindow || targetWindow.isDestroyed() || !targetWindow.isVisible()) {
      targetWindow = BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && w.isVisible());
    }
    
    if (targetWindow) {
      // Redirect to the config page
      console.log('[open-url] Error exchanging token - redirecting to Spotify config page');
      targetWindow.webContents.executeJavaScript("window.location.hash = '#spotify-config';");
      targetWindow.focus();
    } else {
      dialog.showErrorBox('Authentication Error', `Failed to exchange authorization code for token: ${error.message}`);
    }
    return;
  }
  
  // Handle error response from token exchange
  if (tokenData && tokenData.error) {
    console.error(`[open-url] Token exchange returned error: ${tokenData.error_description}`);
    
    // Find a window to redirect
    let targetWindow = mainWindow;
    if (!targetWindow || targetWindow.isDestroyed() || !targetWindow.isVisible()) {
      targetWindow = BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && w.isVisible());
    }
    
    if (targetWindow) {
      // Redirect to the config page
      console.log('[open-url] Token exchange error - redirecting to Spotify config page');
      targetWindow.webContents.executeJavaScript("window.location.hash = '#spotify-config';");
      targetWindow.focus();
    } else {
      dialog.showErrorBox('Authentication Failed', tokenData.error_description);
    }
    return;
  }
  
  console.log("[open-url] Token data received:", !!tokenData);

  if (!tokenData || !tokenData.access_token) {
    const errorMessage = 'Failed to exchange auth code for token. Response did not contain access_token.';
    console.error(`[open-url] ${errorMessage}`);
    
    // Find a window to redirect
    let targetWindow = mainWindow;
    if (!targetWindow || targetWindow.isDestroyed() || !targetWindow.isVisible()) {
      targetWindow = BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && w.isVisible());
    }
    
    if (targetWindow) {
      // Redirect to the config page
      console.log('[open-url] No access token - redirecting to Spotify config page');
      targetWindow.webContents.executeJavaScript("window.location.hash = '#spotify-config';");
      targetWindow.focus();
    } else {
      // Check credentials and show more specific error if needed
      if (!spotifyCredentials.clientId || !spotifyCredentials.clientSecret) {
        dialog.showErrorBox('Authentication Failed', 
          'Spotify API credentials are missing. Please go to the Spotify Configuration page and enter valid credentials.');
      } else {
        dialog.showErrorBox('Authentication Failed', errorMessage);
      }
    }
    return;
  }

  const accessToken = tokenData.access_token;
  console.log("[open-url] Access token received:", accessToken.substring(0, 10) + "...");
  
  // Send the access token to the renderer process via IPC.
  // Try to find the main window more reliably
  let targetWindow = mainWindow;
  
  if (!targetWindow || targetWindow.isDestroyed() || !targetWindow.isVisible()) {
    console.log("[open-url] Main window reference not valid, searching for an alternative window");
    targetWindow = BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && w.isVisible());
  }

  if (targetWindow) {
    console.log("[open-url] Found target window. Sending access token to renderer...");
    // Send the full token data object instead of just the access token
    targetWindow.webContents.send('access-token', tokenData);

    // Focus the window to ensure the user sees the app after authentication
    targetWindow.focus();
  } else {
    console.error("[open-url] No suitable window found to send access token to.");
    // Create a temporary window to show the error message if no window is found
    dialog.showErrorBox('Application Error', 'Could not find the main application window to complete login.');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Expose the function to get the default downloads folder
ipcMain.handle('get-default-downloads-folder', async () => {
  return pythonSetup.getDefaultDownloadsFolder();
});

// IPC handler for testing Spotify credentials
ipcMain.handle('test-spotify-credentials', async (event, credentials) => {
  try {
    const { clientId, clientSecret } = credentials;
    
    // Test credentials by attempting to get an access token using client credentials flow
    const tokenUrl = 'https://accounts.spotify.com/api/token';
    const params = new URLSearchParams({
      grant_type: 'client_credentials'
    });
    
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    const data = await response.json();
    
    if (data.access_token) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: data.error_description || 'Failed to obtain access token'
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Network error occurred'
    };
  }
});

// IPC handler for storing Spotify credentials
ipcMain.on('set-spotify-credentials', (event, credentials) => {
  spotifyCredentials = {
    ...spotifyCredentials,
    ...credentials
  };
  console.log('[Main] Spotify credentials updated:', 
    `clientId: ${spotifyCredentials.clientId ? 'set' : 'not set'}, ` +
    `clientSecret: ${spotifyCredentials.clientSecret ? 'set' : 'not set'}`
  );
});

ipcMain.handle('select-download-folder', async () => {
  const defaultFolder = pythonSetup.getDefaultDownloadsFolder();
  
  const { canceled, filePaths } = await dialog.showOpenDialog({
    defaultPath: defaultFolder,
    properties: ['openDirectory']
  });
  if (canceled || filePaths.length === 0) {
    return null;
  }
  return filePaths[0];
});

// Listen for the download command execution IPC message
ipcMain.on('execute-download-command', (event, { downloadId, trackUrl, defaultFolder, isPlaylist }) => {
  // Get the venv path from global variable or calculate it
  const venvPath = global.venvPath || (
    app.isPackaged 
      ? path.join(app.getPath('userData'), 'spotwire_data', 'venv') 
      : path.resolve(__dirname, '../..', 'spotwire_data', 'venv')
  );
    
  const venvActivatePath = path.join(venvPath, 'bin', 'activate');
  
  console.log('Using virtual environment at:', venvPath);
  
  // Check if venv exists
  if (!fs.existsSync(venvActivatePath)) {
    console.error(`Virtual environment not found at: ${venvActivatePath}`);
    
    // Check if the venv directory exists but is incomplete
    if (fs.existsSync(venvPath)) {
      // Try to recreate the environment
      dialog.showMessageBox({
        type: 'warning',
        title: 'Python Environment Issue',
        message: 'The Python environment appears to be incomplete. Would you like to recreate it?',
        buttons: ['Yes', 'No'],
        defaultId: 0
      }).then(({ response }) => {
        if (response === 0) {
          // User chose to recreate the environment
          try {
            // Remove existing venv directory
            fs.rmSync(venvPath, { recursive: true, force: true });
            
            // Notify user
            dialog.showMessageBox({
              type: 'info',
              title: 'Environment Reset',
              message: 'Python environment has been reset. Please restart the application to complete setup.'
            }).then(() => {
              app.quit();
            });
          } catch (error) {
            console.error('Failed to remove venv directory:', error);
            dialog.showErrorBox(
              'Error',
              `Failed to reset the Python environment: ${error.message}\nPlease restart the application and try again.`
            );
          }
        }
      });
    } else {
      dialog.showErrorBox(
        'Python Environment Not Found',
        'The Python virtual environment is missing. Please restart the application to set up the environment.'
      );
    }
    
    event.reply('download-command-result', {
      downloadId,
      startTime: Date.now(),
      success: false,
      output: '',
      error: `Virtual environment not found. Please restart the app to set up the environment.`
    });
    return;
  }
  
  // Construct the command to use the virtual environment
  let command;
  
  if (process.platform === 'win32') {
    // Windows requires a different approach to activate the virtual environment
    const venvPythonPath = path.join(venvPath, 'Scripts', 'python.exe');
    const spotdlModulePath = path.join(venvPath, 'Lib', 'site-packages', 'spotdl', '__main__.py');
    
    if (fs.existsSync(venvPythonPath) && fs.existsSync(spotdlModulePath)) {
      command = `"${venvPythonPath}" -m spotdl download "${trackUrl}" --output "${defaultFolder}"`;
    } else {
      command = `"${venvPythonPath}" -m spotdl download "${trackUrl}" --output "${defaultFolder}"`;
    }
  } else {
    // macOS and Linux
    command = `bash -c "source '${venvActivatePath}' && spotdl download '${trackUrl}' --output '${defaultFolder}'"`;
  }
  
  console.log("Executing command:", command);
  
  // Record the start time of the command
  const startTime = Date.now();
  
  // Set up environment variables for the command
  const env = {...process.env};
  
  // Add FFmpeg to PATH if we have a bundled version
  if (global.ffmpegPath && fs.existsSync(global.ffmpegPath)) {
    const ffmpegDir = path.dirname(global.ffmpegPath);
    console.log('Using bundled FFmpeg from:', ffmpegDir);
    
    // Prepend ffmpeg directory to PATH
    env.PATH = ffmpegDir + path.delimiter + env.PATH;
  }
  
  // Execute the command with the modified environment
  const downloadProcess = exec(command, {env}, (error, stdout, stderr) => {
    if (error) {
      console.error(`Download command execution error: ${error.message}`);
      
      // Check if this is a Python-related error
      if (stderr.includes('ModuleNotFoundError') || stderr.includes('ImportError')) {
        dialog.showMessageBox({
          type: 'warning',
          title: 'Python Module Error',
          message: 'There appears to be an issue with the Python modules. Would you like to rebuild the environment?',
          buttons: ['Yes', 'No'],
          defaultId: 0
        }).then(({ response }) => {
          if (response === 0) {
            // User chose to rebuild
            try {
              // Remove existing venv directory
              fs.rmSync(venvPath, { recursive: true, force: true });
              
              // Notify user
              dialog.showMessageBox({
                type: 'info',
                title: 'Environment Reset',
                message: 'Python environment has been reset. Please restart the application to complete setup.'
              }).then(() => {
                app.quit();
              });
            } catch (error) {
              console.error('Failed to remove venv directory:', error);
            }
          }
        });
      }
    }
    
    const result = {
      downloadId,
      startTime,
      success: !error,
      output: stdout,
      error: error ? `${error.message}\n${stderr}` : null
    };
    event.reply('download-command-result', result);
  });
  
  // Handle timeout or large downloads
  const timeout = setTimeout(() => {
    if (downloadProcess && !downloadProcess.killed) {
      console.log('Long-running download detected, sending progress notification');
      event.reply('download-progress-update', {
        downloadId,
        message: 'Download in progress... This may take a while for large files or playlists.'
      });
    }
  }, 900000); // 15 minutes

  // Clean up the timeout when done
  downloadProcess.on('exit', () => {
    clearTimeout(timeout);
  });
});

// Add auto-update event listeners
ipcMain.on('check-for-updates', () => {
  autoUpdater.checkForUpdatesAndNotify();
});

// Auto-updater events
autoUpdater.on('update-available', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-available');
  }
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded');
  }
});

autoUpdater.on('error', (err) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-error', err);
  }
});

// In your ipcMain setup section, add this handler:
ipcMain.handle('refresh-spotify-token', async (event, { refreshToken }) => {
  if (!refreshToken) {
    console.error('[IPC] Missing refresh token in request');
    return { error: true, error_description: 'Missing refresh token' };
  }
  
  try {
    return await refreshSpotifyToken(refreshToken);
  } catch (error) {
    console.error('[IPC] Error during token refresh:', error);
    return { error: true, error_description: `Error: ${error.message}` };
  }
});
