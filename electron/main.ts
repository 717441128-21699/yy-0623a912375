import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: '漫画嵌字工作台',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
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
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('open-image-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }],
  })
  return result.filePaths
})

ipcMain.handle('open-folder-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  })
  return result.filePaths[0] || null
})

ipcMain.handle('save-file-dialog', async (_event, defaultName: string) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'PNG Image', extensions: ['png'] }],
  })
  return result.filePath
})

ipcMain.handle('read-image-as-dataurl', async (_event, filePath: string) => {
  try {
    const data = fs.readFileSync(filePath)
    const ext = path.extname(filePath).slice(1).toLowerCase()
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`
    return `data:${mimeType};base64,${data.toString('base64')}`
  } catch (error) {
    console.error('Failed to read image:', error)
    return null
  }
})

ipcMain.handle('save-image', async (_event, dataUrl: string, filePath: string) => {
  try {
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '')
    const dataBuffer = Buffer.from(base64Data, 'base64')
    fs.writeFileSync(filePath, dataBuffer)
    return true
  } catch (error) {
    console.error('Failed to save image:', error)
    return false
  }
})

ipcMain.handle('save-project', async (_event, projectData: string, filePath: string) => {
  try {
    fs.writeFileSync(filePath, projectData, 'utf-8')
    return true
  } catch (error) {
    console.error('Failed to save project:', error)
    return false
  }
})

ipcMain.handle('load-project', async (_event, filePath: string) => {
  try {
    const data = fs.readFileSync(filePath, 'utf-8')
    return data
  } catch (error) {
    console.error('Failed to load project:', error)
    return null
  }
})

ipcMain.handle('open-project-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Project Files', extensions: ['json'] }],
  })
  return result.filePaths[0] || null
})

ipcMain.handle('export-all-pages', async (_event, pagesData: Array<{ dataUrl: string; fileName: string }>) => {
  try {
    const folderPath = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择导出文件夹',
    })
    
    if (folderPath.canceled || !folderPath.filePaths[0]) {
      return false
    }
    
    const outputDir = folderPath.filePaths[0]
    
    for (const page of pagesData) {
      const base64Data = page.dataUrl.replace(/^data:image\/\w+;base64,/, '')
      const dataBuffer = Buffer.from(base64Data, 'base64')
      const filePath = path.join(outputDir, page.fileName)
      fs.writeFileSync(filePath, dataBuffer)
    }
    
    return true
  } catch (error) {
    console.error('Failed to export pages:', error)
    return false
  }
})
