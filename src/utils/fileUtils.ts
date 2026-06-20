export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).electronAPI
}

export const openImageFiles = async (): Promise<{ path: string; dataUrl: string; fileName: string }[]> => {
  if (isElectron()) {
    const filePaths = await window.electronAPI.openImageDialog()
    const images = await Promise.all(
      filePaths.map(async (path) => {
        const dataUrl = await window.electronAPI.readImageAsDataUrl(path)
        const fileName = path.split(/[/\\]/).pop() || ''
        return { path, dataUrl: dataUrl || '', fileName }
      })
    )
    return images.filter((img) => img.dataUrl)
  } else {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.multiple = true
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files
        if (!files) {
          resolve([])
          return
        }
        const results: { path: string; dataUrl: string; fileName: string }[] = []
        let loaded = 0
        Array.from(files).forEach((file) => {
          const reader = new FileReader()
          reader.onload = () => {
            results.push({
              path: file.name,
              dataUrl: reader.result as string,
              fileName: file.name,
            })
            loaded++
            if (loaded === files.length) {
              results.sort((a, b) => a.fileName.localeCompare(b.fileName))
              resolve(results)
            }
          }
          reader.readAsDataURL(file)
        })
      }
      input.click()
    })
  }
}

export const saveProjectFile = async (projectData: string, defaultName: string): Promise<boolean> => {
  if (isElectron()) {
    let savePath = await window.electronAPI.saveFileDialog(defaultName)
    if (!savePath) return false
    return await window.electronAPI.saveProject(projectData, savePath)
  } else {
    const blob = new Blob([projectData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = defaultName
    a.click()
    URL.revokeObjectURL(url)
    return true
  }
}

export const loadProjectFile = async (filePath?: string): Promise<string | null> => {
  if (isElectron()) {
    const path = filePath || (await window.electronAPI.openProjectDialog())
    if (!path) return null
    return await window.electronAPI.loadProject(path)
  } else {
    if (filePath) {
      return null
    }
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) {
          resolve(null)
          return
        }
        const reader = new FileReader()
        reader.onload = () => {
          resolve(reader.result as string)
        }
        reader.readAsText(file)
      }
      input.click()
    })
  }
}

export const exportImage = async (dataUrl: string, fileName: string): Promise<boolean> => {
  if (isElectron()) {
    const filePath = await window.electronAPI.saveFileDialog(fileName)
    if (!filePath) return false
    return await window.electronAPI.saveImage(dataUrl, filePath)
  } else {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = fileName
    a.click()
    return true
  }
}

export const exportAllImages = async (pagesData: Array<{ dataUrl: string; fileName: string }>): Promise<boolean> => {
  if (isElectron()) {
    return await window.electronAPI.exportAllPages(pagesData)
  } else {
    for (let i = 0; i < pagesData.length; i++) {
      const page = pagesData[i]
      const a = document.createElement('a')
      a.href = page.dataUrl
      a.download = page.fileName
      a.click()
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
    return true
  }
}
