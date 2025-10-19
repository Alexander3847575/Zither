const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('storage', {
  set: async (key, value) => ipcRenderer.invoke('store:set', key, value),
  get: async (key) => ipcRenderer.invoke('store:get', key),
});

// Expose a secure file-read API that delegates to the main process.
// Usage in renderer: window.api.readLocalFile(relativePathOrAbsolute)
contextBridge.exposeInMainWorld('api', {
  readLocalFile: async (filePath) => {
    // minimal validation: ensure a non-empty string
    if (typeof filePath !== 'string' || filePath.length === 0) {
      throw new Error('invalid_path');
    }
    return ipcRenderer.invoke('file:read', filePath);
  }
});