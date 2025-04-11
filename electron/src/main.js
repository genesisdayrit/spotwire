// src/main.js
require('dotenv').config();
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const { exec } = require('child_process');
const path = require('path');
const fetch = require('node-fetch');

// Auto-updater configuration
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

// Store for Spotify credentials
let spotifyCredentials = {
  clientId: null,
  clientSecret: null,
  redirectUri: 'spotwire://callback'
};

async function exchangeAuthCodeForToken(authCode) {
  const clientId = process.env.SPOTIFY_CLIENT_ID || spotifyCredentials.clientId;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || spotifyCredentials.clientSecret;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || spotifyCredentials.redirectUri || 'spotwire://callback';
  
  if (!clientId || !clientSecret) {
    console.error('Missing Spotify credentials');
    return null;
  }
  
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: authCode,
    redirect_uri: redirectUri,
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
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error exchanging auth code:', error);
  }
}

// Create main window
let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  mainWindow.loadFile('src/index.html');
  
  // Check for updates after the app loads
  autoUpdater.checkForUpdatesAndNotify();
}

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
  console.log('Spotify credentials updated');
});

ipcMain.handle('select-download-folder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (canceled || filePaths.length === 0) {
    return null;
  }
  return filePaths[0];
});

// Listen for the download command execution IPC message
ipcMain.on('execute-download-command', (event, { downloadId, trackUrl, defaultFolder, isPlaylist }) => {
  // Compute the relative path to the virtual environment activation script.
  const venvActivatePath = path.resolve(__dirname, '../../venv/bin/activate');
  console.log("Activating venv at path:", venvActivatePath);
  // Construct the command. For both track and playlist downloads the command is similar,
  // but we check for the isPlaylist flag for potential future modifications.
  const command = `bash -c "source '${venvActivatePath}' && spotdl download '${trackUrl}' --output '${defaultFolder}'"`;
  // Record the start time of the command
  const startTime = Date.now();
  exec(command, (error, stdout, stderr) => {
    const result = {
      downloadId,
      startTime,
      success: !error,
      output: stdout,
      error: error ? error.message : null
    };
    event.reply('download-command-result', result);
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

app.whenReady().then(() => {
  // Register the custom protocol for OAuth callbacks.
  app.setAsDefaultProtocolClient('spotwire');
  createWindow();
});

// Listen for custom protocol calls (OAuth callback)
app.on('open-url', async (event, url) => {
  event.preventDefault();
  console.log('Received URL:', url);
  // Extract the auth code from the callback URL.
  const urlObj = new URL(url);
  const authCode = urlObj.searchParams.get('code');
  console.log("Extracted auth code:", authCode);
  // Exchange the auth code for an access token.
  const tokenData = await exchangeAuthCodeForToken(authCode);
  console.log("Token data:", tokenData);
  const accessToken = tokenData?.access_token;
  // Send the access token to the renderer process via IPC.
  const [win] = BrowserWindow.getAllWindows();
  if (win && accessToken) {
    win.webContents.send('access-token', accessToken);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
