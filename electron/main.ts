import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { spawn, fork } from 'child_process'

let mainWindow: BrowserWindow | null = null
let nextServer: any = null
const isDev = process.env.NODE_ENV === 'development'

/**
 * Get the Node.js executable path for spawning child processes
 * In development, uses system Node.js
 * In production, finds Electron's bundled Node.js
 */
function getNodeExecutable(): string {
  if (isDev) {
    return 'node'
  }

  // In production, Electron bundles Node.js
  // Try to find it in the app resources
  const appPath = app.getAppPath()
  const resourcesPath = process.resourcesPath || path.dirname(appPath)
  
  // Electron doesn't bundle Node.js separately by default
  // We need to look for it in various possible locations
  const execDir = path.dirname(process.execPath)
  const appDir = path.dirname(appPath.replace('app.asar', ''))
  
  // Common locations for bundled Node.js in Electron apps
  const possiblePaths = [
    // Windows - check in resources or app directory
    path.join(resourcesPath, 'node.exe'),
    path.join(execDir, 'node.exe'),
    path.join(appDir, 'node.exe'),
    // Try app.asar unpacked location (if files are unpacked)
    path.join(appPath.replace('app.asar', 'app.asar.unpacked'), 'node.exe'),
    // Linux/Mac
    path.join(resourcesPath, 'node'),
    path.join(execDir, 'node'),
    path.join(appDir, 'node'),
    path.join(appPath.replace('app.asar', 'app.asar.unpacked'), 'node'),
  ]

  for (const nodePath of possiblePaths) {
    if (fs.existsSync(nodePath)) {
      console.log(`Found Node.js at: ${nodePath}`)
      return nodePath
    }
  }

  // If Node.js is not bundled, we need to use system Node.js
  // This requires Node.js to be installed on the system
  // For production, we should bundle Node.js or use a different approach
  console.warn('Node.js not found in app bundle. Will try system Node.js (may fail if not installed)')
  return process.platform === 'win32' ? 'node.exe' : 'node'
}

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
      const nodeExecutable = getNodeExecutable()
      
      // Verify Node.js executable exists before spawning
      if (!fs.existsSync(nodeExecutable) && nodeExecutable !== 'node') {
        console.error(`Node.js executable not found at: ${nodeExecutable}`)
        const errorHtml = `data:text/html,${encodeURIComponent(`
          <html>
            <body style="font-family: Arial; padding: 20px;">
              <h1>Error Starting Application</h1>
              <p>Could not find Node.js executable required to start the server.</p>
              <p>Please ensure Node.js is installed and try again.</p>
            </body>
          </html>
        `)}`
        mainWindow?.loadURL(errorHtml)
        return
      }

      console.log(`Starting Next.js server with: ${nodeExecutable} ${serverPath}`)
      
      try {
        // Try fork first (uses current Node.js process), fallback to spawn
        // Fork doesn't work with standalone server, so we use spawn
        // But we need to ensure Node.js is available
        nextServer = spawn(nodeExecutable, [serverPath], {
          cwd: nextPath,
          env: {
            ...process.env,
            PORT: '3000',
            NODE_ENV: 'production',
            DATABASE_URL: process.env.DATABASE_URL,
          },
          shell: process.platform === 'win32', // Use shell on Windows to find node.exe in PATH
        })

        nextServer.stdout.on('data', (data: Buffer) => {
          console.log(`Next.js: ${data.toString()}`)
        })

        nextServer.stderr.on('data', (data: Buffer) => {
          console.error(`Next.js: ${data.toString()}`)
        })

        nextServer.on('error', (error: Error) => {
          console.error('Failed to start Next.js server:', error)
          const errorHtml = `data:text/html,${encodeURIComponent(`
            <html>
              <body style="font-family: Arial; padding: 20px;">
                <h1>Error Starting Server</h1>
                <p>Failed to start Next.js server: ${error.message}</p>
                <p>Node executable: ${nodeExecutable}</p>
                <p>Server path: ${serverPath}</p>
              </body>
            </html>
          `)}`
          mainWindow?.loadURL(errorHtml)
        })

        // Wait for server to start
        setTimeout(() => {
          mainWindow?.loadURL('http://localhost:3000')
        }, 3000)
      } catch (error: any) {
        console.error('Error spawning Next.js server:', error)
        const errorHtml = `data:text/html,${encodeURIComponent(`
          <html>
            <body style="font-family: Arial; padding: 20px;">
              <h1>Error Starting Application</h1>
              <p>Failed to start Next.js server: ${error.message}</p>
            </body>
          </html>
        `)}`
        mainWindow?.loadURL(errorHtml)
      }
    } else {
      // Fallback: try to load from built files
      console.warn(`Next.js server not found at: ${serverPath}`)
      const errorHtml = `data:text/html,${encodeURIComponent(`
        <html>
          <body style="font-family: Arial; padding: 20px;">
            <h1>Error: Next.js Server Not Found</h1>
            <p>Could not find Next.js standalone server at: ${serverPath}</p>
            <p>Please rebuild the application.</p>
          </body>
        </html>
      `)}`
      mainWindow.loadURL(errorHtml)
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

