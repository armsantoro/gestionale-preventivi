import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    titleBarStyle: 'hiddenInset',
    title: 'Stella Filella - Gestionale Preventivi',
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('select-file', async (_event, options) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, options);
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('save-file', async (_event, options) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, options);
  if (result.canceled) return null;
  return result.filePath;
});

ipcMain.handle('read-file', async (_event, filePath: string) => {
  return fs.readFileSync(filePath);
});

ipcMain.handle('write-file', async (_event, filePath: string, data: Buffer) => {
  fs.writeFileSync(filePath, data);
  return true;
});
