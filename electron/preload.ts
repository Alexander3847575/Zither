import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('storage', {
  set: async (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
  get: async (key: string) => ipcRenderer.invoke('store:get', key),
});