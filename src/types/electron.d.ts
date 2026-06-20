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

export {}
