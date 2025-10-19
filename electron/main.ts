import { app, BrowserWindow, screen } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";

if (started) {
  app.quit();
}

import { ipcMain } from 'electron';
import fs from 'node:fs/promises';
import { PythonAPIManager } from './pythonAPIManager';

// Initialize Python API Manager
const pythonAPI = new PythonAPIManager();

// Add a handler to read local files. It restricts reads to either the app's userData or the app directory.
// This avoids exposing arbitrary system files to renderer code.
ipcMain.handle('file:read', async (event, requestedPath: string) => {
  if (typeof requestedPath !== 'string' || requestedPath.length === 0) {
    throw new Error('invalid_path');
  }

  // Resolve and normalize paths
  const appUserData = app.getPath('userData');
  const appRoot = import.meta.dirname; // current project directory for these sources

  const resolved = path.resolve(requestedPath);

  try {
    const data = await fs.readFile(resolved, { encoding: 'utf8' });
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
});

// Add Python API handlers
ipcMain.handle('python-api:start', async () => {
  try {
    const success = await pythonAPI.startAPI();
    return { success, status: pythonAPI.getStatus() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('python-api:stop', async () => {
  try {
    await pythonAPI.stopAPI();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('python-api:cluster-tabs', async (event, tabs) => {
  try {
    const result = await pythonAPI.clusterTabs(tabs);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('python-api:status', async () => {
  return pythonAPI.getStatus();
});

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: screen.getPrimaryDisplay().workAreaSize.width,
    height: screen.getPrimaryDisplay().workAreaSize.height,
    frame: false,
    webPreferences: {
      preload: path.join(import.meta.dirname, 'preload.js'),
    },
  });


  mainWindow.maximize();

  mainWindow.on("resize", function () {
    var size = mainWindow.getSize();
    var width = size[0];
    var height = size[1];
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.on("did-frame-finish-load", () => {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    });
  } else {
    mainWindow.loadFile(
      path.join(
        import.meta.dirname,
        `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`,
      ),
    );
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
  createWindow();
  
  // Try to start Python API automatically
  try {
    await pythonAPI.startAPI();
    // Success message is already logged by pythonAPI.startAPI()
  } catch (error) {
    console.log('Python API failed to start automatically:', error.message);
    // Don't fail the app startup, just log the error
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", async () => {
  // Stop Python API when app closes
  await pythonAPI.stopAPI();
  
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
