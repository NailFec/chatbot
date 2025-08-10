const { app, BrowserWindow, globalShortcut, ipcMain, nativeTheme } = require('electron');
const { generateStreamingText } = require('./ai');
const path = require('path');

let mainWindow = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,
    frame: false,
    transparent: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../public/index.html'));

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function registerHotkey() {
  const accelerator = 'Super+Shift+D';
  const fallback = 'Control+Shift+D';

  const tryRegister = (accel) => {
    try {
      return globalShortcut.register(accel, () => {
        if (!mainWindow) return;
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      });
    } catch (_) {
      return false;
    }
  };

  if (!tryRegister(accelerator)) {
    tryRegister(fallback);
  }

  // Quit app
  globalShortcut.register('Alt+Shift+Q', () => {
    isQuitting = true;
    app.quit();
  });
}

function setupAutoLaunch() {
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true,
  });
}

app.on('ready', () => {
  createWindow();
  registerHotkey();
  setupAutoLaunch();
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  } else {
    createWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.handle('app:toggle-theme', () => {
  nativeTheme.themeSource = nativeTheme.themeSource === 'dark' ? 'light' : 'dark';
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

ipcMain.handle('ai:generate', async (_evt, text) => {
  return await generateStreamingText(String(text || ''));
});


