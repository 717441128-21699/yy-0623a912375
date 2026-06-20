import { useCallback, useEffect, useRef, useState } from 'react'
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
  History,
  Clock,
  X,
  ChevronDown,
  RefreshCw,
  Check,
} from 'lucide-react'
import { RecentProject, getRecentProjects, addRecentProject, removeRecentProject, saveBackup, getLastBackup, getLastBackupTime, clearBackup } from '../utils/projectUtils'
import './Header.css'

interface HeaderProps {
  onOpenProgress: () => void
  onOpenReview: () => void
}

export default function Header({ onOpenProgress, onOpenReview }: HeaderProps) {
  const {
    pages,
    currentPageIndex,
    projectName,
    setCurrentPage,
    addPages,
    projectPath,
    dialogueLines,
    textBoxes,
    setProjectPath,
    loadProject,
    defaultStyle,
    stylePresets,
  } = useProjectStore()

  const [isExporting, setIsExporting] = useState(false)
  const [showRecent, setShowRecent] = useState(false)
  const [recentList, setRecentList] = useState<RecentProject[]>([])
  const [lastSavedAt, setLastSavedAt] = useState<number>(0)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showRestoreTip, setShowRestoreTip] = useState(false)
  const [backupInfo, setBackupInfo] = useState<{
    state: ProjectState
    time: number
    pageCount: number
    lineCount: number
  } | null>(null)

  const timerRef = useRef<number | null>(null)
  const recentBtnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setRecentList(getRecentProjects())
  }, [])

  useEffect(() => {
    if (!showRecent) return
    const handler = (e: MouseEvent) => {
      if (recentBtnRef.current && !recentBtnRef.current.contains(e.target as Node)) {
        setShowRecent(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showRecent])

  useEffect(() => {
    if (pages.length > 0 || dialogueLines.length > 0) {
      addRecentProject({
        name: projectName,
        path: projectPath,
        pageCount: pages.length,
        lineCount: dialogueLines.length,
        thumb: pages[0]?.imageDataUrl?.slice(0, 200) + '...',
      })
    }
  }, [projectName, projectPath, pages.length, dialogueLines.length])

  useEffect(() => {
    if (pages.length === 0 && dialogueLines.length === 0 && textBoxes.length === 0) {
      const backup = getLastBackup()
      const backupTime = getLastBackupTime()
      const STALE_MS = 7 * 24 * 60 * 60 * 1000
      if (backup && backupTime && Date.now() - backupTime < STALE_MS) {
        const hasContent = backup.pages.length > 0 || backup.dialogueLines.length > 0
        if (hasContent) {
          setBackupInfo({
            state: backup,
            time: backupTime,
            pageCount: backup.pages.length,
            lineCount: backup.dialogueLines.length,
          })
          setShowRestoreTip(true)
        }
      }
    }
  }, [])

  useEffect(() => {
    const hasContent = pages.length > 0 || dialogueLines.length > 0 || textBoxes.length > 0
    if (!hasContent) return

    const triggerSave = () => {
      setSaveStatus('saving')
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
        stylePresets: state.stylePresets,
      }
      saveBackup(projectData)
      setLastSavedAt(Date.now())
      setTimeout(() => setSaveStatus('saved'), 150)
      setTimeout(() => setSaveStatus('idle'), 2000)
    }

    const scheduleSave = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = window.setTimeout(triggerSave, 5000)
    }

    scheduleSave()

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [pages, dialogueLines, textBoxes, defaultStyle, stylePresets])

  const formatTime = (ts: number) => {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatRelative = (ts: number) => {
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins} 分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} 小时前`
    return `${Math.floor(hours / 24)} 天前`
  }

  const handleRestoreBackup = () => {
    if (!backupInfo) return
    loadProject(backupInfo.state)
    setShowRestoreTip(false)
    setBackupInfo(null)
    clearBackup()
  }

  const handleDiscardBackup = () => {
    setShowRestoreTip(false)
    setBackupInfo(null)
    clearBackup()
  }

  const handleOpenRecent = (recent: RecentProject) => {
    setShowRecent(false)
    if (recent.path) {
      loadProjectFile(recent.path).then((data) => {
        if (data) {
          try {
            const projectData = JSON.parse(data) as ProjectState
            loadProject(projectData)
            setProjectPath(recent.path)
          } catch {
            alert('项目文件已丢失或格式错误')
          }
        }
      })
    }
  }

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
      stylePresets: state.stylePresets,
    }
    const json = JSON.stringify(projectData, null, 2)

    if (projectPath) {
      // In browser mode, we always download a new file
    }

    const success = await saveProjectFile(json, `${projectName}.json`)
    if (success) {
      addRecentProject({
        name: projectName,
        path: projectPath,
        pageCount: pages.length,
        lineCount: dialogueLines.length,
      })
      setRecentList(getRecentProjects())
      setLastSavedAt(Date.now())
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }, [projectPath, projectName, pages.length, dialogueLines.length])

  const handleLoadProject = useCallback(async () => {
    const data = await loadProjectFile()
    if (data) {
      try {
        const projectData = JSON.parse(data) as ProjectState
        const state = useProjectStore.getState()
        state.loadProject(projectData)
        addRecentProject({
          name: projectData.projectName,
          path: projectData.projectPath,
          pageCount: projectData.pages.length,
          lineCount: projectData.dialogueLines.length,
        })
        setRecentList(getRecentProjects())
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
      {showRestoreTip && backupInfo && (
        <div className="restore-tip-bar">
          <div className="restore-tip-info">
            <RefreshCw size={14} />
            <span>
              检测到未保存的备份（{formatRelative(backupInfo.time)}）：
              <strong>{backupInfo.pageCount}</strong> 页，
              <strong>{backupInfo.lineCount}</strong> 条台词
            </span>
          </div>
          <div className="restore-tip-actions">
            <button className="restore-btn" onClick={handleRestoreBackup}>
              恢复上次状态
            </button>
            <button className="restore-btn cancel" onClick={handleDiscardBackup}>
              <X size={12} />
              丢弃
            </button>
          </div>
        </div>
      )}

      <div className="header-left">
        <div className="project-name">
          <FileText size={16} />
          <span>{projectName}</span>
        </div>
        <div className="autosave-status" title={lastSavedAt ? `上次保存 ${formatTime(lastSavedAt)}` : '尚未保存'}>
          {saveStatus === 'saving' && (
            <>
              <span className="save-indicator saving">
                <RefreshCw size={10} />
                自动保存中...
              </span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <span className="save-indicator saved">
                <Check size={10} />
                已保存 {formatTime(lastSavedAt)}
              </span>
            </>
          )}
          {saveStatus === 'idle' && lastSavedAt > 0 && (
            <>
              <span className="save-indicator idle">
                <Clock size={10} />
                自动保存 {formatRelative(lastSavedAt)}
              </span>
            </>
          )}
        </div>
        <div className="recent-projects-wrapper" ref={recentBtnRef}>
          <button
            className="recent-toggle-btn"
            onClick={() => {
              setRecentList(getRecentProjects())
              setShowRecent(!showRecent)
            }}
            title="最近打开的项目"
          >
            <History size={14} />
            最近项目
            <ChevronDown size={12} className={`chev ${showRecent ? 'open' : ''}`} />
          </button>
          {showRecent && (
            <div className="recent-dropdown">
              <div className="recent-dropdown-header">最近打开的项目</div>
              {recentList.length === 0 ? (
                <div className="recent-empty">暂无最近项目</div>
              ) : (
                recentList.map((recent, idx) => (
                  <div
                    key={`${recent.path || recent.name}-${idx}`}
                    className="recent-item"
                  >
                    <button
                      className="recent-item-btn"
                      onClick={() => handleOpenRecent(recent)}
                      title={recent.path || recent.name}
                    >
                      <div className="recent-item-main">
                        <span className="recent-item-name">{recent.name}</span>
                        <div className="recent-item-meta">
                          {recent.pageCount} 页 · {recent.lineCount} 条
                        </div>
                      </div>
                      <span className="recent-item-time">{formatRelative(recent.lastOpen)}</span>
                    </button>
                    <button
                      className="recent-item-remove"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeRecentProject(recent.path || recent.name)
                        setRecentList(getRecentProjects())
                      }}
                      title="从列表移除"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
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
            <button onClick={onOpenReview} disabled={isExporting}>
              <AlertTriangle size={14} />
              整话检查后导出
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
