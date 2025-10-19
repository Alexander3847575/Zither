import { app, BrowserWindow, screen, ipcMain, BrowserView } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";

if (started) {
  app.quit();
}

import fs from 'node:fs/promises';

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
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
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

// BrowserView management for embedded pane web content
const views = new Map<string, BrowserView>();

function getMainWindow(): BrowserWindow | null {
  const wins = BrowserWindow.getAllWindows();
  return wins.length ? wins[0] : null;
}

ipcMain.handle('view:create', async (event, id: string, url: string, bounds: { x: number; y: number; width: number; height: number }) => {
  try {
    // destroy existing view with same id
    if (views.has(id)) {
      const existing = views.get(id)!;
      try { existing.webContents.close(); } catch {}
      views.delete(id);
    }

    const view = new BrowserView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      }
    });

    const main = getMainWindow();
    if (!main) throw new Error('no_main_window');

    main.addBrowserView(view);
    view.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
    // allow the view to navigate to the URL
    view.webContents.loadURL(url).catch((e) => console.warn('view load url failed', e));
    views.set(id, view);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
});

ipcMain.handle('view:update', async (event, id: string, bounds: { x: number; y: number; width: number; height: number }) => {
  try {
    const view = views.get(id);
    if (!view) throw new Error('view_not_found');
    view.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
});

ipcMain.handle('view:destroy', async (event, id: string) => {
  try {
    const view = views.get(id);
    if (!view) return { ok: true };
    const main = getMainWindow();
    if (main) main.removeBrowserView(view);
    try { view.webContents.close(); } catch {}
    views.delete(id);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
});
