const {app, BrowserWindow, shell} = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    icon: path.join(__dirname, '..', 'public', 'logo.png'),
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in the default browser instead of a new Electron window.
  mainWindow.webContents.setWindowOpenHandler(({url}) => {
    shell.openExternal(url);
    return {action: 'deny'};
  });

  if (isDev) {
    const devServerUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000/app.html';
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({mode: 'detach'});
  } else {
    // app.html is the hotel-management app; index.html is the public
    // download landing page and isn't meaningful inside the desktop shell.
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'app.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
