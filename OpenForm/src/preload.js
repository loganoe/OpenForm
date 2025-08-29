const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  generateSCAD: (description) => ipcRenderer.invoke('generate-scad', description),
  saveSCADFile: (code, filename) => ipcRenderer.invoke('save-scad-file', code, filename),
  renderModel: (scadCode) => ipcRenderer.invoke('render-model', scadCode),
  checkOpenSCAD: () => ipcRenderer.invoke('check-openscad')
});