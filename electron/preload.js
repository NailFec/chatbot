const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  toggleTheme: () => ipcRenderer.invoke('app:toggle-theme'),
  hideWindow: () => ipcRenderer.invoke('app:hide'),
  // Streaming API
  stream: (payload) => ipcRenderer.send('ai:stream', payload),
  onChunk: (cb) => {
    const handler = (_e, chunk) => cb(chunk);
    ipcRenderer.on('ai:chunk', handler);
    return () => ipcRenderer.removeListener('ai:chunk', handler);
  },
  onceDone: (cb) => ipcRenderer.once('ai:done', cb),
  onceError: (cb) => ipcRenderer.once('ai:error', (_e, err) => cb(err)),
  clearContext: () => ipcRenderer.send('ai:clear'),
  // UI signals from main
  onUIClear: (cb) => ipcRenderer.on('ui:clear', () => cb()),
  onUIFocus: (cb) => ipcRenderer.on('ui:focus-input', () => cb()),
});


