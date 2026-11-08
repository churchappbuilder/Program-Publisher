'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getPaperCatalog: () => ipcRenderer.invoke('paper:catalog')
});
