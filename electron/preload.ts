import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openImageDialog: () => ipcRenderer.invoke('open-image-dialog'),
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  saveFileDialog: (defaultName: string) => ipcRenderer.invoke('save-file-dialog', defaultName),
  readImageAsDataUrl: (filePath: string) => ipcRenderer.invoke('read-image-as-dataurl', filePath),
  saveImage: (dataUrl: string, filePath: string) => ipcRenderer.invoke('save-image', dataUrl, filePath),
  saveProject: (projectData: string, filePath: string) => ipcRenderer.invoke('save-project', projectData, filePath),
  loadProject: (filePath: string) => ipcRenderer.invoke('load-project', filePath),
  openProjectDialog: () => ipcRenderer.invoke('open-project-dialog'),
  exportAllPages: (pagesData: Array<{ dataUrl: string; fileName: string }>) => ipcRenderer.invoke('export-all-pages', pagesData),
})

export interface ElectronAPI {
  openImageDialog: () => Promise<string[]>
  openFolderDialog: () => Promise<string | null>
  saveFileDialog: (defaultName: string) => Promise<string | null>
  readImageAsDataUrl: (filePath: string) => Promise<string | null>
  saveImage: (dataUrl: string, filePath: string) => Promise<boolean>
  saveProject: (projectData: string, filePath: string) => Promise<boolean>
  loadProject: (filePath: string) => Promise<string | null>
  openProjectDialog: () => Promise<string | null>
  exportAllPages: (pagesData: Array<{ dataUrl: string; fileName: string }>) => Promise<boolean>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
