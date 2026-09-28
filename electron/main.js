import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserRuntime } from './browser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let browserRuntime = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 980,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
      webviewTag: true,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:4174';
  if (app.isPackaged || process.env.GROEI_LOAD_DIST === '1') {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL(devServerUrl);
  }
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  browserRuntime = new BrowserRuntime(mainWindow);
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('browser:navigate', async (_event, url) => browserRuntime.navigate(url));
ipcMain.handle('browser:search', async (_event, query) => browserRuntime.search(query));
ipcMain.handle('browser:readPage', async () => browserRuntime.readPage());
ipcMain.handle('browser:click', async (_event, elementId) => browserRuntime.click(elementId));
ipcMain.handle('browser:type', async (_event, elementId, text) => browserRuntime.type(elementId, text));
ipcMain.handle('browser:scroll', async (_event, direction, amount) => browserRuntime.scroll(direction, amount));
ipcMain.handle('browser:goBack', async () => browserRuntime.goBack());
ipcMain.handle('browser:goForward', async () => browserRuntime.goForward());
ipcMain.handle('browser:refresh', async () => browserRuntime.refresh());
ipcMain.handle('browser:openTab', async (_event, url) => browserRuntime.openTab(url));
ipcMain.handle('browser:switchTab', async (_event, tabId) => browserRuntime.switchTab(tabId));
ipcMain.handle('browser:closeTab', async (_event, tabId) => browserRuntime.closeTab(tabId));
ipcMain.handle('browser:findOnPage', async (_event, text) => browserRuntime.findOnPage(text));
