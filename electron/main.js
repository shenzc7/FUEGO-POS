/**
 * Fuego POS — Electron Main Process
 *
 * Spawns the local Fastify/SQLite backend then opens the POS window.
 * Works in both dev (npm run dev:pos) and production (packaged installer).
 */

import { app, BrowserWindow, dialog } from 'electron';
import { spawn } from 'child_process';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

let serverProcess = null;
let mainWindow = null;

// ── Path resolution ──────────────────────────────────────────────────────────

function getServerDir() {
  if (isDev) {
    // Running from project root during development
    return path.join(__dirname, '..', 'server');
  }
  // electron-builder copies server/ to resources/server/ (see electron-builder.yml)
  return path.join(process.resourcesPath, 'server');
}

// ── Port availability check ───────────────────────────────────────────────────

function waitForPort(port, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;

    function check() {
      const sock = new net.Socket();
      sock.setTimeout(300);
      sock.on('connect', () => {
        sock.destroy();
        resolve();
      });
      sock.on('timeout', () => {
        sock.destroy();
        retry();
      });
      sock.on('error', () => {
        sock.destroy();
        retry();
      });
      sock.connect(port, '127.0.0.1');
    }

    function retry() {
      if (Date.now() >= deadline) {
        reject(new Error(`Fuego backend did not respond on port ${port} within ${timeoutMs / 1000}s.`));
      } else {
        setTimeout(check, 400);
      }
    }

    check();
  });
}

// ── Backend server ────────────────────────────────────────────────────────────

async function startBackend() {
  const serverDir = getServerDir();
  const serverFile = path.join(serverDir, 'index.js');

  serverProcess = spawn(process.execPath, [serverFile], {
    cwd: serverDir,
    // In the packaged app, NODE_PATH points to the app's node_modules so the
    // server can resolve better-sqlite3, fastify, etc. (compiled for Electron).
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NODE_PATH: isDev ? undefined : path.join(app.getAppPath(), 'node_modules'),
    },
    // 'ignore' stdio so the subprocess doesn't interfere with Electron's
    // own stdout/stderr — logs still appear via process.stdout in dev.
    stdio: isDev ? 'inherit' : 'ignore',
  });

  serverProcess.on('error', (err) => {
    dialog.showErrorBox('Fuego Backend Error', `Could not start the database server:\n\n${err.message}`);
    app.quit();
  });

  serverProcess.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`Backend exited with code ${code} (signal: ${signal})`);
    }
  });

  await waitForPort(3001);
}

// ── Browser window ────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,           // reveal only once fully loaded (prevents white flash)
    autoHideMenuBar: true, // keep the menu bar out of sight on Windows
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Fuego POS',
  });

  if (isDev) {
    // In dev, the Vite dev server serves the frontend
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the pre-built frontend directly from the file system.
    // vite.config.js sets base: './' so all asset paths are relative.
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  try {
    await startBackend();
    createWindow();
  } catch (err) {
    dialog.showErrorBox('Fuego Startup Error', err.message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
  // On macOS, apps conventionally stay open until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // macOS: re-open window when clicking on dock icon
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
});
