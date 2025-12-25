import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { spawn } from 'child_process'

let mainWindow: BrowserWindow | null = null
let nextServer: any = null
const isDev = process.env.NODE_ENV === 'development'

// Set database path for production
if (!isDev) {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'pos.db')
  process.env.DATABASE_URL = `file:${dbPath}`
  
  // Ensure database directory exists
  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  
  // Copy database template if it doesn't exist
  // This ensures schema is already initialized
  if (!fs.existsSync(dbPath)) {
    // Try to copy from template database (if bundled)
    const templateDbPath = path.join(__dirname, '../prisma/pos-template.db')
    const defaultDbPath = path.join(__dirname, '../prisma/pos.db')
    
    if (fs.existsSync(templateDbPath)) {
      fs.copyFileSync(templateDbPath, dbPath)
      console.log('Database template copied from template file')
    } else if (fs.existsSync(defaultDbPath)) {
      fs.copyFileSync(defaultDbPath, dbPath)
      console.log('Database copied from default file')
    } else {
      // Database will be created by Prisma on first connection
      // Schema will be initialized via API call
      console.log('Database will be created on first connection')
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    // In production, we need to serve the Next.js app
    // For now, we'll use a simple approach - load from localhost
    // In a real deployment, you'd bundle Next.js properly
    const appPath = app.getAppPath()
    const nextPath = path.join(appPath, '.next', 'standalone')
    
    // Try to start Next.js server if standalone exists
    const serverPath = path.join(nextPath, 'server.js')
    if (fs.existsSync(serverPath)) {
      nextServer = spawn('node', [serverPath], {
        cwd: nextPath,
        env: {
          ...process.env,
          PORT: '3000',
          NODE_ENV: 'production',
        },
      })

      nextServer.stdout.on('data', (data: Buffer) => {
        console.log(`Next.js: ${data.toString()}`)
      })

      nextServer.stderr.on('data', (data: Buffer) => {
        console.error(`Next.js: ${data.toString()}`)
      })

      // Wait for server to start
      setTimeout(() => {
        mainWindow?.loadURL('http://localhost:3000')
      }, 3000)
    } else {
      // Fallback: try to load from built files
      mainWindow.loadURL('http://localhost:3000')
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill()
  }
})

