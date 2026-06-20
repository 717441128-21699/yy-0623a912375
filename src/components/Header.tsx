import { useCallback, useEffect, useState } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { ProjectState } from '../types'
import { renderPageToDataUrl } from '../utils/exportUtils'
import { openImageFiles, saveProjectFile, loadProjectFile, exportImage, exportAllImages } from '../utils/fileUtils'
import {
  FolderOpen,
  Save,
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  Layers,
  AlertTriangle,
  BarChart3,
} from 'lucide-react'
import './Header.css'

interface HeaderProps {
  onOpenProgress: () => void
}

export default function Header({ onOpenProgress }: HeaderProps) {
  const {
    pages,
    currentPageIndex,
    projectName,
    setCurrentPage,
    addPages,
    projectPath,
    dialogueLines,
    textBoxes,
  } = useProjectStore()

  const [isExporting, setIsExporting] = useState(false)

  const handleImportImages = useCallback(async () => {
    const images = await openImageFiles()
    if (images.length > 0) {
      addPages(images)
    }
  }, [addPages])

  const handleSaveProject = useCallback(async () => {
    const state = useProjectStore.getState()
    const projectData: ProjectState = {
      pages: state.pages,
      currentPageIndex: state.currentPageIndex,
      dialogueLines: state.dialogueLines,
      textBoxes: state.textBoxes,
      selectedLineId: null,
      selectedTextBoxId: null,
      projectPath: state.projectPath,
      projectName: state.projectName,
      defaultStyle: state.defaultStyle,
    }
    const json = JSON.stringify(projectData, null, 2)
    
    if (projectPath) {
      // In browser mode, we always download a new file
    }
    
    const success = await saveProjectFile(json, `${projectName}.json`)
    if (success) {
      // In browser mode, we can't track the saved path
    }
  }, [projectPath, projectName])

  const handleLoadProject = useCallback(async () => {
    const data = await loadProjectFile()
    if (data) {
      try {
        const projectData = JSON.parse(data) as ProjectState
        useProjectStore.getState().loadProject(projectData)
      } catch (e) {
        alert('项目文件格式错误')
      }
    }
  }, [])

  const handleExportCurrent = useCallback(async () => {
    const state = useProjectStore.getState()
    const page = state.pages[state.currentPageIndex]
    if (!page) return
    try {
      const dataUrl = await renderPageToDataUrl(page, state.textBoxes)
      const fileName = `page_${String(state.currentPageIndex + 1).padStart(3, '0')}.png`
      await exportImage(dataUrl, fileName)
    } catch (e) {
      alert('导出失败')
    }
  }, [])

  const handlePrevPage = useCallback(() => {
    if (currentPageIndex > 0) {
      setCurrentPage(currentPageIndex - 1)
    }
  }, [currentPageIndex, setCurrentPage])

  const handleNextPage = useCallback(() => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPage(currentPageIndex + 1)
    }
  }, [currentPageIndex, pages.length, setCurrentPage])

  const handleExportAll = useCallback(async () => {
    if (pages.length === 0) return
    
    setIsExporting(true)
    try {
      const pagesData: Array<{ dataUrl: string; fileName: string }> = []
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const dataUrl = await renderPageToDataUrl(page, textBoxes)
        const fileName = `page_${String(i + 1).padStart(3, '0')}.png`
        pagesData.push({ dataUrl, fileName })
      }
      
      const success = await exportAllImages(pagesData)
      if (success) {
        alert(`成功导出 ${pages.length} 页`)
      } else {
        alert('导出失败')
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('导出失败')
    } finally {
      setIsExporting(false)
    }
  }, [pages, textBoxes])

  const handleCheckMissing = useCallback(() => {
    const pageLines = dialogueLines.filter((l) => l.pageIndex === currentPageIndex)
    const unembeddedLines = pageLines.filter((l) => l.status === 'unembedded')
    const needsReworkLines = pageLines.filter((l) => l.status === 'needs_rework')
    
    let message = `第 ${currentPageIndex + 1} 页检查结果:\n`
    message += `总台词数: ${pageLines.length}\n`
    message += `已嵌入: ${pageLines.length - unembeddedLines.length - needsReworkLines.length}\n`
    message += `未嵌入: ${unembeddedLines.length}\n`
    message += `需重修: ${needsReworkLines.length}\n`
    
    if (unembeddedLines.length > 0 || needsReworkLines.length > 0) {
      const unfinished = unembeddedLines.concat(needsReworkLines)
      message += `\n未完成的台词:\n`
      unfinished.slice(0, 5).forEach((line, i) => {
        const text = line.text.length > 20 ? line.text.slice(0, 20) + '...' : line.text
        message += `${i + 1}. [${line.status === 'unembedded' ? '未嵌入' : '需重修'}] ${text || '(空)'}\n`
      })
      if (unfinished.length > 5) {
        message += `...还有 ${unfinished.length - 5} 条`
      }
    } else {
      message += '\n🎉 本页所有台词都已嵌入完成！'
    }
    
    alert(message)
  }, [currentPageIndex, dialogueLines])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault()
            handleSaveProject()
            break
          case 'o':
            e.preventDefault()
            handleLoadProject()
            break
          case 'b':
            e.preventDefault()
            handleImportImages()
            break
        }
      } else {
        switch (e.key) {
          case 'ArrowLeft':
          case 'PageUp':
            e.preventDefault()
            handlePrevPage()
            break
          case 'ArrowRight':
          case 'PageDown':
            e.preventDefault()
            handleNextPage()
            break
          case ' ':
            e.preventDefault()
            handleCheckMissing()
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSaveProject, handleLoadProject, handleImportImages, handlePrevPage, handleNextPage, handleCheckMissing])

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="project-name">
          <FileText size={16} />
          <span>{projectName}</span>
        </div>
      </div>

      <div className="header-center">
        <button className="nav-btn" onClick={handlePrevPage} disabled={pages.length === 0 || currentPageIndex === 0}>
          <ChevronLeft size={18} />
        </button>
        <div className="page-info">
          {pages.length > 0 ? `${currentPageIndex + 1} / ${pages.length}` : '0 / 0'}
        </div>
        <button className="nav-btn" onClick={handleNextPage} disabled={pages.length === 0 || currentPageIndex === pages.length - 1}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="header-right">
        <button className="action-btn" onClick={handleImportImages} title="导入漫画图片 (Ctrl+B)">
          <Plus size={16} />
          <span>导入图片</span>
        </button>
        <button className="action-btn" onClick={handleCheckMissing} title="检查漏嵌 (空格)" disabled={pages.length === 0}>
          <AlertTriangle size={16} />
          <span>检查</span>
        </button>
        <button className="action-btn" onClick={onOpenProgress} title="查看嵌字进度 (Shift+P)" disabled={pages.length === 0}>
          <BarChart3 size={16} />
          <span>进度</span>
        </button>
        <button className="action-btn" onClick={handleLoadProject} title="打开项目 (Ctrl+O)">
          <FolderOpen size={16} />
          <span>打开</span>
        </button>
        <button className="action-btn primary" onClick={handleSaveProject} title="保存项目 (Ctrl+S)">
          <Save size={16} />
          <span>保存</span>
        </button>
        <div className="export-dropdown">
          <button className="action-btn" title="导出" disabled={pages.length === 0 || isExporting}>
            <Download size={16} />
            <span>{isExporting ? '导出中...' : '导出'}</span>
          </button>
          <div className="export-menu">
            <button onClick={handleExportCurrent}>导出当前页</button>
            <button onClick={handleExportAll} disabled={isExporting}>
              <Layers size={14} />
              批量导出全部
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
