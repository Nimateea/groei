import { contextBridge, ipcRenderer } from 'electron';

const browserBridge = {
  navigate: (url) => ipcRenderer.invoke('browser:navigate', url),
  search: (query) => ipcRenderer.invoke('browser:search', query),
  readPage: () => ipcRenderer.invoke('browser:readPage'),
  click: (elementId) => ipcRenderer.invoke('browser:click', elementId),
  type: (elementId, text) => ipcRenderer.invoke('browser:type', elementId, text),
  scroll: (direction, amount) => ipcRenderer.invoke('browser:scroll', direction, amount),
  goBack: () => ipcRenderer.invoke('browser:goBack'),
  goForward: () => ipcRenderer.invoke('browser:goForward'),
  refresh: () => ipcRenderer.invoke('browser:refresh'),
  openTab: (url) => ipcRenderer.invoke('browser:openTab', url),
  switchTab: (tabId) => ipcRenderer.invoke('browser:switchTab', tabId),
  closeTab: (tabId) => ipcRenderer.invoke('browser:closeTab', tabId),
  findOnPage: (text) => ipcRenderer.invoke('browser:findOnPage', text),
};

contextBridge.exposeInMainWorld('browserBridge', browserBridge);

contextBridge.exposeInMainWorld('groeiBridge', {
  getCurrentUrl: async () => browserBridge.readPage().then((page) => page.url),
  getCurrentTitle: async () => browserBridge.readPage().then((page) => page.title),
});
