const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  startSession: (payload) => ipcRenderer.invoke('start-session', payload),
  stopSession: () => ipcRenderer.invoke('stop-session'),
  runCommand: (payload) => ipcRenderer.invoke('run-command', payload),
  loadAppData: () => ipcRenderer.sendSync('load-app-data'),
  saveAppData: (data) => ipcRenderer.invoke('save-app-data', data)
});