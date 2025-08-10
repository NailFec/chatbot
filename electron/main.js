const { app, BrowserWindow, globalShortcut, ipcMain, nativeTheme, Tray, Menu, nativeImage } = require('electron');
const { streamChat } = require('./ai');
const path = require('path');

let mainWindow = null;
let isQuitting = false;
let tray = null;

// In-memory chat context for the current window
let conversationHistory = [];

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
      // Clear context when UI is closed
      conversationHistory = [];
      try { mainWindow.webContents.send('ui:clear'); } catch (_) {}
      mainWindow.hide();
    }
  });

  mainWindow.on('show', () => {
    try { mainWindow.webContents.send('ui:focus-input'); } catch (_) {}
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
          conversationHistory = [];
          try { mainWindow.webContents.send('ui:clear'); } catch (_) {}
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
          try { mainWindow.webContents.send('ui:focus-input'); } catch (_) {}
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
  // Respect current system setting; do not force enable here
  // Leave it configurable via Tray menu
}

function getAutoLaunchEnabled() {
  const settings = app.getLoginItemSettings();
  return Boolean(settings.openAtLogin);
}

function toggleAutoLaunch() {
  const next = !getAutoLaunchEnabled();
  app.setLoginItemSettings({ openAtLogin: next, openAsHidden: true });
  return next;
}

function setupTray() {
  // 16x16 white circle PNG (base64)
  const image = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAPElEQVQoz2P4//8/AyWYgYGRgRGJgRgYwhgYGBiG0YhJwCkGhwgE4mB0QFQbGJgEJwYgGJgYJgGAgQAAxq8Cqg9gOqUAAAAASUVORK5CYII='
  );
  tray = new Tray(image);
  tray.setToolTip('Chatbot');

  const buildContextMenu = () => {
    const autoLaunch = getAutoLaunchEnabled();
    return Menu.buildFromTemplate([
      { label: 'Show Window', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
      { type: 'separator' },
      { label: 'Start at login', type: 'checkbox', checked: autoLaunch, click: () => {
        const enabled = toggleAutoLaunch();
        tray.setContextMenu(buildContextMenu());
      } },
      { type: 'separator' },
      { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
    ]);
  };

  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  tray.setContextMenu(buildContextMenu());
}

app.on('ready', () => {
  createWindow();
  registerHotkey();
  setupAutoLaunch();
  setupTray();
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

// Hide window from renderer request (used by custom close button)
ipcMain.handle('app:hide', () => {
  if (mainWindow) {
    conversationHistory = [];
    try { mainWindow.webContents.send('ui:clear'); } catch (_) {}
    mainWindow.hide();
  }
  return true;
});

// Clear chat context (explicit)
ipcMain.on('ai:clear', () => {
  conversationHistory = [];
});

// Stream AI response with context
ipcMain.on('ai:stream', async (event, text) => {
  const userText = String(text || '');
  if (!userText) return;
  try {
    conversationHistory.push({ role: 'user', parts: [{ text: userText }] });
    let assistantText = '';
    await streamChat(conversationHistory, (delta) => {
      if (typeof delta === 'string' && delta.length > 0) {
        assistantText += delta;
        event.sender.send('ai:chunk', delta);
      }
    });
    conversationHistory.push({ role: 'model', parts: [{ text: assistantText }] });
    event.sender.send('ai:done');
  } catch (err) {
    event.sender.send('ai:error', String(err && err.message ? err.message : err));
  }
});


