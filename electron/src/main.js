// src/main.js
require('dotenv').config();
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const { exec, execSync, spawn } = require('child_process');
const path = require('path');
const fetch = require('node-fetch');
const fs = require('fs');

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
    
    // Store the refresh token for future use
    if (data.refresh_token) {
      console.log('[Token Exchange] Storing refresh token for future use');
      spotifyCredentials.refreshToken = data.refresh_token;
    }
    
    return data;
  } catch (error) {
    console.error('[Token Exchange] Error exchanging auth code:', error);
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
    }
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
    show: false // Don't show until setup is done
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

// Add function to check and setup venv
async function setupPythonEnvironment() {
  return new Promise((resolve, reject) => {
    console.log('Setting up Python environment...');
    
    // Determine paths based on whether the app is packaged or in development
    let setupScriptPath, requirementsPath;
    
    if (app.isPackaged) {
      // When packaged, use resources directory
      setupScriptPath = path.join(process.resourcesPath, 'scripts', 'setup_venv.sh');
      requirementsPath = path.join(process.resourcesPath, 'scripts', 'requirements.txt');
    } else {
      // In development, use relative paths
      setupScriptPath = path.join(__dirname, '..', 'python', 'setup_venv.sh');
      requirementsPath = path.join(__dirname, '..', 'python', 'requirements.txt');
    }
    
    console.log('Setup script path:', setupScriptPath);
    console.log('Requirements path:', requirementsPath);

    // Check if setup script exists
    if (!fs.existsSync(setupScriptPath)) {
      const errorMessage = `Setup script not found at: ${setupScriptPath}`;
      console.error(errorMessage);
      if (splashWindow) {
        splashWindow.webContents.send('setup-progress', {
          status: 'Setup Error',
          progress: 0,
          message: errorMessage
        });
      }
      if (mainWindow) {
        mainWindow.webContents.send('python-env-setup-error', errorMessage);
      }
      reject(new Error(errorMessage));
      return;
    }

    // Check if requirements file exists
    if (!fs.existsSync(requirementsPath)) {
      const errorMessage = `Requirements file not found at: ${requirementsPath}`;
      console.error(errorMessage);
      if (splashWindow) {
        splashWindow.webContents.send('setup-progress', {
          status: 'Setup Error',
          progress: 0,
          message: errorMessage
        });
      }
      if (mainWindow) {
        mainWindow.webContents.send('python-env-setup-error', errorMessage);
      }
      reject(new Error(errorMessage));
      return;
    }

    if (mainWindow) {
      mainWindow.webContents.send('python-env-setup-progress', 'Starting Python environment setup...');
    }
    
    // Create an organized folder structure
    // In packaged app, use the user data directory which has write permissions
    // In development, use the project directory
    const userDataDir = app.getPath('userData');
    const appRoot = app.isPackaged 
      ? userDataDir
      : path.resolve(__dirname, '../..');
    
    // Create a dedicated spotwire data directory
    const spotWireDataDir = app.isPackaged
      ? path.join(userDataDir, 'spotwire_data')
      : path.resolve(__dirname, '../..', 'spotwire_data');
    
    // Create the spotwire data directory if it doesn't exist
    if (!fs.existsSync(spotWireDataDir)) {
      try {
        fs.mkdirSync(spotWireDataDir, { recursive: true });
        console.log('Created spotwire data directory:', spotWireDataDir);
      } catch (error) {
        console.error('Failed to create spotwire data directory:', error);
        reject(error);
        return;
      }
    }
    
    // Create dedicated directories for different components
    const venvDir = path.join(spotWireDataDir, 'venv');
    const pythonDir = path.join(spotWireDataDir, 'python');
    
    // Store paths in global variables for later use
    global.spotWireDataDir = spotWireDataDir;
    global.venvPath = venvDir;
    
    console.log('Spotwire data directory:', spotWireDataDir);
    console.log('Virtual environment path:', venvDir);
    console.log('Python directory:', pythonDir);
    
    // Create python directory if it doesn't exist
    if (!fs.existsSync(pythonDir)) {
      try {
        fs.mkdirSync(pythonDir, { recursive: true });
        console.log('Created python directory:', pythonDir);
      } catch (error) {
        console.error('Failed to create python directory:', error);
        reject(error);
        return;
      }
    }

    // Make setup script executable
    try {
      fs.chmodSync(setupScriptPath, '755');
    } catch (error) {
      console.error('Failed to make setup script executable:', error);
      // Continue anyway, as it might already be executable
    }
    
    // Create environment variables with adjusted paths
    const setupEnv = { 
      ...process.env, 
      PYTHONUNBUFFERED: '1',
      VENV_PATH: global.venvPath  // Pass the venv path to the script
    };
    
    // For Windows, we need a different approach
    if (process.platform === 'win32') {
      try {
        // On Windows, create the virtual environment using Python directly
        console.log('Creating virtual environment on Windows...');
        
        if (splashWindow) {
          splashWindow.webContents.send('setup-progress', {
            status: 'Installing required components...',
            progress: 20,
            message: 'Creating virtual environment...'
          });
        }
        
        // First make sure Python is available
        execSync('python --version', { stdio: 'ignore' });
        
        // Create the virtual environment
        execSync(`python -m venv "${venvDir}"`, { stdio: 'pipe' });
        
        if (splashWindow) {
          splashWindow.webContents.send('setup-progress', {
            status: 'Installing required components...',
            progress: 40,
            message: 'Installing packages...'
          });
        }
        
        // Install required packages
        const pipPath = path.join(venvDir, 'Scripts', 'pip.exe');
        execSync(`"${pipPath}" install --upgrade pip`, { stdio: 'pipe' });
        execSync(`"${pipPath}" install --upgrade wheel setuptools`, { stdio: 'pipe' });
        
        if (splashWindow) {
          splashWindow.webContents.send('setup-progress', {
            status: 'Installing required components...',
            progress: 60,
            message: 'Installing spotdl and dependencies...'
          });
        }
        
        execSync(`"${pipPath}" install -r "${requirementsPath}"`, { stdio: 'pipe' });
        
        console.log('Virtual environment setup completed successfully');
        
        if (splashWindow) {
          splashWindow.webContents.send('setup-progress', {
            status: 'Setup Complete!',
            progress: 100,
            message: 'Starting app...'
          });
        }
        
        // Short delay to show completion before closing splash
        setTimeout(() => {
          resolve();
        }, 1000);
        
        return;
      } catch (error) {
        console.error('Error setting up Python environment on Windows:', error);
        
        if (splashWindow) {
          splashWindow.webContents.send('setup-progress', {
            status: 'Setup Failed',
            progress: 0,
            message: `Error: ${error.message}`
          });
        }
        
        dialog.showErrorBox(
          'Python Environment Setup Failed',
          `Failed to set up the Python environment on Windows.\n\n${error.message}\n\nPlease make sure Python is installed properly.`
        );
        
        reject(error);
        return;
      }
    }
    
    // For macOS and Linux, use the bash script
    // Execute setup script with the requirements file path
    const setupProcess = spawn('bash', [setupScriptPath, requirementsPath], {
      cwd: pythonDir,
      env: setupEnv
    });
    
    let output = '';
    let errorOutput = '';
    let setupProgress = 10;
    
    // Handle stdout data
    setupProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log('Setup output:', text);
      
      // Update progress based on output
      if (text.includes('Creating virtual environment')) {
        setupProgress = 20;
      } else if (text.includes('Installing required packages')) {
        setupProgress = 40;
      } else if (text.includes('pip install --upgrade pip')) {
        setupProgress = 60;
      } else if (text.includes('Installing wheel and setuptools')) {
        setupProgress = 70;
      } else if (text.includes('pip install -r')) {
        setupProgress = 80;
      }
      
      // Update splash screen
      if (splashWindow) {
        splashWindow.webContents.send('setup-progress', {
          status: 'Installing required components...',
          progress: setupProgress,
          message: text.trim()
        });
      }
    });
    
    // Handle stderr data
    setupProcess.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      console.error('Setup error:', text);
      
      // Also send stderr to the splash screen for visibility
      if (splashWindow) {
        splashWindow.webContents.send('setup-progress', {
          status: 'Installing required components...',
          progress: setupProgress,
          message: `Error: ${text.trim()}`
        });
      }
    });
    
    // Handle completion
    setupProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Setup completed successfully');
        
        // Update splash screen
        if (splashWindow) {
          splashWindow.webContents.send('setup-progress', {
            status: 'Setup Complete!',
            progress: 100,
            message: 'Starting app...'
          });
        }
        
        // Short delay to show completion before closing splash
        setTimeout(() => {
          resolve();
        }, 1000);
      } else {
        const errorMsg = `Setup failed with code ${code}. Check for Python 3.12 compatibility issues.\n\nError output: ${errorOutput}`;
        console.error(errorMsg);
        
        if (splashWindow) {
          splashWindow.webContents.send('setup-progress', {
            status: 'Setup Failed',
            progress: 0,
            message: errorMsg
          });
        }
        
        // Show a dialog with more detailed error information
        dialog.showErrorBox(
          'Python Environment Setup Failed',
          `The application failed to set up the Python environment.\n\n${errorMsg}\n\nPlease check that Python 3.9-3.11 is installed on your system.`
        );
        
        reject(new Error(errorMsg));
      }
    });
    
    // Handle errors
    setupProcess.on('error', (err) => {
      const errorMsg = `Failed to start setup process: ${err.message}`;
      console.error(errorMsg);
      
      if (splashWindow) {
        splashWindow.webContents.send('setup-progress', {
          status: 'Setup Error',
          progress: 0,
          message: errorMsg
        });
      }
      
      dialog.showErrorBox(
        'Python Environment Setup Error',
        `Failed to start the Python environment setup process.\n\n${errorMsg}\n\nPlease check that bash and Python 3 are available on your system.`
      );
      
      reject(err);
    });
  });
}

// Add function to check if ffmpeg is installed
function checkFFmpeg() {
  try {
    // First check for the bundled ffmpeg binary
    const appRoot = app.isPackaged 
      ? path.dirname(app.getAppPath())
      : path.resolve(__dirname, '../..');
      
    // In packaged app, ffmpeg is at different locations depending on platform
    let ffmpegPath;
    
    if (app.isPackaged) {
      if (process.platform === 'darwin') {
        // On macOS, resources are in the .app bundle
        ffmpegPath = path.join(process.resourcesPath, 'ffmpeg');
      } else if (process.platform === 'win32') {
        // On Windows, resources are in the resources directory
        ffmpegPath = path.join(process.resourcesPath, 'ffmpeg.exe');
      } else {
        // On Linux, resources are in the resources directory
        ffmpegPath = path.join(process.resourcesPath, 'ffmpeg');
      }
    } else {
      // In development, use the binary from the python/bin directory
      ffmpegPath = path.join(appRoot, 'electron', 'python', 'bin', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    }
    
    console.log('Checking for FFmpeg at:', ffmpegPath);
    
    if (fs.existsSync(ffmpegPath)) {
      console.log('Found bundled FFmpeg');
      
      // Test if the binary is executable
      fs.chmodSync(ffmpegPath, '755');
      execSync(`"${ffmpegPath}" -version`, { stdio: 'ignore' });
      
      // Store the path for later use when running spotdl
      global.ffmpegPath = ffmpegPath;
      return true;
    }
    
    // Fall back to system ffmpeg if bundled one is not found
    console.log('Bundled FFmpeg not found, checking system installation');
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.error('FFmpeg check failed:', error.message);
    return false;
  }
}

// Add function to check Python version compatibility
function checkPythonVersion() {
  try {
    const versionOutput = execSync('python3 --version', { encoding: 'utf8' });
    const versionMatch = versionOutput.match(/Python (\d+)\.(\d+)\.\d+/);
    
    if (versionMatch) {
      const major = parseInt(versionMatch[1], 10);
      const minor = parseInt(versionMatch[2], 10);
      
      console.log(`Detected Python ${major}.${minor}`);
      
      // spotdl works best with Python 3.9-3.11
      if (major === 3 && minor >= 9 && minor <= 11) {
        return { compatible: true, version: `${major}.${minor}` };
      } else if (major === 3 && minor === 12) {
        // Python 3.12 may have compatibility issues with some packages
        return { 
          compatible: false, 
          version: `${major}.${minor}`,
          message: 'Python 3.12 may have compatibility issues with some required packages. Consider installing Python 3.11 for best compatibility.'
        };
      } else if (major === 3 && minor < 9) {
        return { 
          compatible: false, 
          version: `${major}.${minor}`,
          message: 'Python version is too old. spotdl requires Python 3.9 or newer.'
        };
      } else {
        return { 
          compatible: false, 
          version: `${major}.${minor}`,
          message: `Detected Python ${major}.${minor}. spotdl works best with Python 3.9-3.11.`
        };
      }
    } else {
      return { 
        compatible: false,
        version: 'unknown',
        message: 'Unable to determine Python version.'
      };
    }
  } catch (error) {
    console.error('Error checking Python version:', error);
    return { 
      compatible: false,
      version: 'not found',
      message: 'Python 3 not found or not accessible. Please install Python 3.9-3.11.'
    };
  }
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

// Add a function to refresh expired tokens
async function refreshAccessToken(refreshToken) {
  const clientId = process.env.SPOTIFY_CLIENT_ID || spotifyCredentials.clientId;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || spotifyCredentials.clientSecret;
  
  if (!clientId || !clientSecret) {
    console.error('[Token Refresh] Missing Spotify credentials');
    return null;
  }
  
  if (!refreshToken) {
    console.error('[Token Refresh] No refresh token provided');
    return null;
  }
  
  console.log('[Token Refresh] Attempting to refresh access token');
  
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
      return null;
    }
    
    const data = await response.json();
    console.log('[Token Refresh] Successfully refreshed access token');
    
    // Update the refresh token if a new one is provided
    if (data.refresh_token) {
      console.log('[Token Refresh] Updating stored refresh token');
      spotifyCredentials.refreshToken = data.refresh_token;
    }
    
    return data;
  } catch (error) {
    console.error('[Token Refresh] Error refreshing token:', error);
    return null;
  }
}

// IPC handler for storing Spotify credentials
ipcMain.on('set-spotify-credentials', (event, credentials) => {
  spotifyCredentials = {
    ...spotifyCredentials,
    ...credentials
  };
  console.log('[Main] Spotify credentials updated:', 
    `clientId: ${spotifyCredentials.clientId ? 'set' : 'not set'}, ` +
    `clientSecret: ${spotifyCredentials.clientSecret ? 'set' : 'not set'}, ` +
    `refreshToken: ${spotifyCredentials.refreshToken ? 'set' : 'not set'}`
  );
});

ipcMain.handle('select-download-folder', async () => {
  const defaultFolder = getDefaultDownloadsFolder();
  
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
  }, 30000); // 30 seconds

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

// Function to create the main window
function createMainWindow() {
  if (!mainWindow) {
    createWindow();
  }
  
  // Check if ffmpeg is installed and show warning if not
  if (!checkFFmpeg()) {
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
  
  createSplashWindow();
  
  try {
    // First, check Python version compatibility
    const pythonCheck = checkPythonVersion();
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
    const ffmpegInstalled = checkFFmpeg();
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
    await setupPythonEnvironment();
    
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
  
  // Store refresh token for future use if available
  if (tokenData.refresh_token) {
    console.log("[open-url] Refresh token received, storing for future use");
    spotifyCredentials.refreshToken = tokenData.refresh_token;
  }

  // Send the access token to the renderer process via IPC.
  // Try to find the main window more reliably
  let targetWindow = mainWindow;
  
  if (!targetWindow || targetWindow.isDestroyed() || !targetWindow.isVisible()) {
    console.log("[open-url] Main window reference not valid, searching for an alternative window");
    targetWindow = BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && w.isVisible());
  }

  if (targetWindow) {
    console.log("[open-url] Found target window. Sending access token to renderer...");
    targetWindow.webContents.send('access-token', accessToken);

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

// Function to get or create the default downloads folder
function getDefaultDownloadsFolder() {
  // Use the spotwire data directory or create a new path
  const spotWireDataDir = global.spotWireDataDir || (
    app.isPackaged 
      ? path.join(app.getPath('userData'), 'spotwire_data')
      : path.resolve(__dirname, '../..', 'spotwire_data')
  );
  
  // Create a downloads folder within the data directory
  const downloadsFolder = path.join(spotWireDataDir, 'downloads');
  
  // Create it if it doesn't exist
  if (!fs.existsSync(downloadsFolder)) {
    try {
      fs.mkdirSync(downloadsFolder, { recursive: true });
      console.log('Created downloads directory:', downloadsFolder);
    } catch (error) {
      console.error('Failed to create downloads directory:', error);
      // Fall back to user's downloads folder if we can't create our own
      return app.getPath('downloads');
    }
  }
  
  return downloadsFolder;
}

// Expose the function to get the default downloads folder
ipcMain.handle('get-default-downloads-folder', async () => {
  return getDefaultDownloadsFolder();
});

// IPC handler for refreshing an expired token
ipcMain.handle('refresh-access-token', async () => {
  console.log('[IPC] Refresh access token request received');
  
  if (!spotifyCredentials.refreshToken) {
    console.error('[IPC] Cannot refresh token: No refresh token available');
    return { 
      success: false, 
      error: 'No refresh token available. Please log in again.' 
    };
  }
  
  try {
    const refreshedData = await refreshAccessToken(spotifyCredentials.refreshToken);
    
    if (!refreshedData || !refreshedData.access_token) {
      console.error('[IPC] Token refresh failed: No access token received');
      return { 
        success: false, 
        error: 'Failed to refresh access token. Please log in again.' 
      };
    }
    
    console.log('[IPC] Token refreshed successfully');
    return {
      success: true,
      accessToken: refreshedData.access_token,
      expiresIn: refreshedData.expires_in
    };
  } catch (error) {
    console.error('[IPC] Error refreshing token:', error);
    return {
      success: false,
      error: `Error refreshing token: ${error.message}`
    };
  }
});
