// main.js
require('dotenv').config();
const { app, BrowserWindow, ipcMain, dialog } = require('electron'); // Added 'dialog'
const { exec } = require('child_process');
const path = require('path');

// Uncomment the following if you need node-fetch:
// const fetch = require('node-fetch');

async function exchangeAuthCodeForToken(authCode) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'spotwire://callback';

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
    return data; // Contains access_token, refresh_token, etc.
  } catch (error) {
    console.error('Error exchanging auth code:', error);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // For simplicity in this demo. In production, use a preload script and enable contextIsolation.
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  win.loadFile('index.html');
}

// Handle folder selection via IPC
ipcMain.handle('select-download-folder', async (event) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (canceled || filePaths.length === 0) {
    return null; // User canceled or didn't select anything
  }
  return filePaths[0];
});

// Listen for the download command execution IPC message
ipcMain.on('execute-download-command', (event, { downloadId, trackUrl, defaultFolder }) => {
  // Compute the relative path to the virtual environment activation script.
  const venvActivatePath = path.join(__dirname, '..', 'venv', 'bin', 'activate');
  // Construct the command using the relative path.
  const command = `bash -c "source ${venvActivatePath} && spotdl download ${trackUrl} --output '${defaultFolder}'"`;
  
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
  const accessToken = tokenData.access_token;

  // Send the access token to the renderer process via IPC.
  const [win] = BrowserWindow.getAllWindows();
  if (win && accessToken) {
    win.webContents.send('access-token', accessToken);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

