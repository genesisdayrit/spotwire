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
    
    const pythonDir = path.join(__dirname, '..', 'python');

    // Make setup script executable
    try {
      fs.chmodSync(setupScriptPath, '755');
    } catch (error) {
      console.error('Failed to make setup script executable:', error);
      // Continue anyway, as it might already be executable
    }
    
    // Execute setup script with the requirements file path
    const setupProcess = spawn('bash', [setupScriptPath, requirementsPath], {
      cwd: pythonDir,
      env: { ...process.env, PYTHONUNBUFFERED: '1' }  // Ensure unbuffered Python output
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
  // Get the app's root directory
  const appRoot = app.isPackaged 
    ? path.dirname(app.getAppPath())
    : path.resolve(__dirname, '../..');
    
  // Path for virtual environment
  const venvPath = path.join(appRoot, 'venv');
  const venvActivatePath = path.join(venvPath, 'bin', 'activate');
  
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
  const command = `bash -c "source '${venvActivatePath}' && spotdl download '${trackUrl}' --output '${defaultFolder}'"`;
  
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
  
  // Close splash window after main window is shown
  if (splashWindow) {
    setTimeout(() => {
      splashWindow.close();
      splashWindow = null;
    }, 500);
  }
}

app.whenReady().then(async () => {
  // Register the custom protocol for OAuth callbacks.
  app.setAsDefaultProtocolClient('spotwire');
  
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
  console.log('Received URL:', url);
  
  // Extract the auth code from the callback URL.
  const urlObj = new URL(url);
  const authCode = urlObj.searchParams.get('code');
  console.log("Extracted auth code:", authCode);
  
  // Exchange the auth code for an access token.
  const tokenData = await exchangeAuthCodeForToken(authCode);
  console.log("Token data received:", !!tokenData);
  
  if (!tokenData) {
    console.error("Failed to exchange auth code for token");
    return;
  }
  
  const accessToken = tokenData.access_token;
  console.log("Access token received:", !!accessToken);
  
  // Send the access token to the renderer process via IPC.
  const [win] = BrowserWindow.getAllWindows();
  if (win && accessToken) {
    console.log("Sending access token to renderer");
    win.webContents.send('access-token', accessToken);
    
    // Focus the window to ensure the user sees the app after authentication
    win.focus();
  } else {
    console.error("No window found or no access token to send");
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
