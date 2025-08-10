const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleTheme: () => ipcRenderer.invoke('app:toggle-theme'),
  generate: async (text) => ipcRenderer.invoke('ai:generate', text),
});


