"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
let mainWindow = null;
let nextServer = null;
const isDev = process.env.NODE_ENV === 'development';
// Set database path for production
if (!isDev) {
    const userDataPath = electron_1.app.getPath('userData');
    const dbPath = path.join(userDataPath, 'pos.db');
    process.env.DATABASE_URL = `file:${dbPath}`;
    // Ensure database directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    // Copy database if it doesn't exist
    if (!fs.existsSync(dbPath)) {
        const defaultDbPath = path.join(__dirname, '../prisma/pos.db');
        if (fs.existsSync(defaultDbPath)) {
            fs.copyFileSync(defaultDbPath, dbPath);
        }
    }
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    }
    else {
        // In production, we need to serve the Next.js app
        // For now, we'll use a simple approach - load from localhost
        // In a real deployment, you'd bundle Next.js properly
        const appPath = electron_1.app.getAppPath();
        const nextPath = path.join(appPath, '.next', 'standalone');
        // Try to start Next.js server if standalone exists
        const serverPath = path.join(nextPath, 'server.js');
        if (fs.existsSync(serverPath)) {
            nextServer = (0, child_process_1.spawn)('node', [serverPath], {
                cwd: nextPath,
                env: {
                    ...process.env,
                    PORT: '3000',
                    NODE_ENV: 'production',
                },
            });
            nextServer.stdout.on('data', (data) => {
                console.log(`Next.js: ${data.toString()}`);
            });
            nextServer.stderr.on('data', (data) => {
                console.error(`Next.js: ${data.toString()}`);
            });
            // Wait for server to start
            setTimeout(() => {
                mainWindow?.loadURL('http://localhost:3000');
            }, 3000);
        }
        else {
            // Fallback: try to load from built files
            mainWindow.loadURL('http://localhost:3000');
        }
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (nextServer) {
        nextServer.kill();
    }
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('before-quit', () => {
    if (nextServer) {
        nextServer.kill();
    }
});
