const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

require('dotenv').config();
require('electron-reload')(path.join(__dirname), {
  electron: require(`${__dirname}/node_modules/electron`),
});


let mainWindow;

app.on('ready', async () => {
  const { default: Store } = await import('electron-store');
  const store = new Store();

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');

  ipcMain.handle('save-token', (event, token) => {
    store.set('spotify_access_token', token);
    return { success: true };
  });

  ipcMain.handle('get-token', () => {
    const token = store.get('spotify_access_token');
    return token;
  });
});

