import { useState, useMemo, useRef, useEffect } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { LineStatus } from '../types'
import {
  Plus,
  Trash2,
  GripVertical,
  CheckCircle,
  AlertCircle,
  Circle,
  Type,
  ListPlus,
  ArrowUpToLine,
  ArrowDownToLine,
  Search,
  X,
} from 'lucide-react'
import './DialogueList.css'

const statusConfig: Record<LineStatus, { icon: typeof Circle; color: string; label: string }> = {
  unembedded: { icon: Circle, color: '#888', label: '未嵌入' },
  embedded: { icon: CheckCircle, color: '#4caf50', label: '已嵌入' },
  needs_rework: { icon: AlertCircle, color: '#ff9800', label: '需重修' },
}

const PAGE_SEP_RE = /^---+\s*(?:第?\s*\d+\s*页|p(?:age)?\s*\d+|page\s*\d+)?\s*$/i

export default function DialogueList() {
  const {
    currentPageIndex,
    pages,
    dialogueLines,
    selectedLineId,
    selectLine,
    addDialogueLine,
    addDialogueLines,
    addDialogueLinesMultiPage,
    updateDialogueLine,
    removeDialogueLine,
    setDialogueStatus,
    selectTextBox,
    textBoxes,
    moveLinesToPage,
    setCurrentPage,
  } = useProjectStore()

  const [batchInput, setBatchInput] = useState('')
  const [showBatchInput, setShowBatchInput] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<LineStatus | 'all'>('all')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentPageLines = dialogueLines
    .filter((l) => l.pageIndex === currentPageIndex)
    .sort((a, b) => a.order - b.order)

  const pageLineCounts = pages.map((_, i) =>
    dialogueLines.filter((l) => l.pageIndex === i).length
  )

  const filteredLines = useMemo(() => {
    const lowerSearch = searchText.trim().toLowerCase()
    return dialogueLines
      .filter((l) => {
        if (statusFilter !== 'all' && l.status !== statusFilter) return false
        if (lowerSearch && !l.text.toLowerCase().includes(lowerSearch)) return false
        return true
      })
      .sort((a, b) => {
        if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex
        return a.order - b.order
      })
  }, [dialogueLines, searchText, statusFilter])

  const isFiltering = searchText.trim() !== '' || statusFilter !== 'all'

  useEffect(() => {
    if (showBatchInput && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [showBatchInput])

  const currentPage = pages[currentPageIndex]

  const handleAddLine = () => {
    if (!currentPage) return
    addDialogueLine(currentPageIndex, '')
  }

  const handleBatchAdd = () => {
    if (!currentPage || !batchInput.trim()) return

    const sections = batchInput.split('\n').reduce<{ pageIndex: number; lines: string[] }[]>((acc, rawLine) => {
      const trimmed = rawLine.trim()
      if (PAGE_SEP_RE.test(trimmed) && pages.length > 0) {
        const pageNumMatch = trimmed.match(/\d+/)
        if (pageNumMatch) {
          const pageNum = parseInt(pageNumMatch[0]) - 1
          if (pageNum >= 0 && pageNum < pages.length) {
            acc.push({ pageIndex: pageNum, lines: [] })
            return acc
          }
        }
        const nextIdx = acc.length > 0 ? Math.min(acc[acc.length - 1].pageIndex + 1, pages.length - 1) : 0
        acc.push({ pageIndex: nextIdx, lines: [] })
        return acc
      }
      if (trimmed.length > 0) {
        if (acc.length === 0) {
          acc.push({ pageIndex: currentPageIndex, lines: [] })
        }
        acc[acc.length - 1].lines.push(trimmed)
      }
      return acc
    }, [])

    if (sections.length === 1 && sections[0].pageIndex === currentPageIndex) {
      addDialogueLines(currentPageIndex, sections[0].lines)
    } else if (sections.length > 0) {
      const validSections = sections.filter((s) => s.lines.length > 0).map((s) => ({ pageIndex: s.pageIndex, texts: s.lines }))
      if (validSections.length > 0) {
        addDialogueLinesMultiPage(validSections)
      }
    }

    setBatchInput('')
    setShowBatchInput(false)
  }

  const handleTextChange = (id: string, text: string) => {
    updateDialogueLine(id, { text })
  }

  const handleStatusClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const line = dialogueLines.find((l) => l.id === id)
    if (!line) return
    const statuses: LineStatus[] = ['unembedded', 'embedded', 'needs_rework']
    const currentIdx = statuses.indexOf(line.status)
    const nextStatus = statuses[(currentIdx + 1) % statuses.length]
    setDialogueStatus(id, nextStatus)
  }

  const handleLineClick = (line: typeof dialogueLines[0]) => {
    if (line.pageIndex !== currentPageIndex) {
      setCurrentPage(line.pageIndex)
    }
    selectLine(line.id)
    if (line.textBoxId) {
      selectTextBox(line.textBoxId)
    } else {
      selectTextBox(null)
    }
  }

  const handleDeleteLine = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeDialogueLine(id)
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      return
    }

    const lineIds = currentPageLines.map((l) => l.id)
    const draggedIdx = lineIds.indexOf(draggedId)
    const targetIdx = lineIds.indexOf(targetId)
    if (draggedIdx < 0 || targetIdx < 0) {
      setDraggedId(null)
      return
    }

    const newIds = [...lineIds]
    newIds.splice(draggedIdx, 1)
    newIds.splice(targetIdx, 0, draggedId)

    const { reorderLines } = useProjectStore.getState()
    reorderLines(currentPageIndex, newIds)
    setDraggedId(null)
  }

  const getLineTextBox = (lineId: string) => {
    const line = dialogueLines.find((l) => l.id === lineId)
    if (!line?.textBoxId) return null
    return textBoxes.find((t) => t.id === line.textBoxId) || null
  }

  if (!currentPage) {
    return (
      <div className="dialogue-list empty">
        <div className="empty-state">
          <Type size={48} opacity={0.3} />
          <p>请先导入漫画图片</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dialogue-list">
      <div className="panel-header">
        <h3>台词清单</h3>
        <div className="header-actions">
          <button className="icon-btn" onClick={handleAddLine} title="添加台词">
            <Plus size={16} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowBatchInput(!showBatchInput)}
            title="批量粘贴"
          >
            <ListPlus size={16} />
          </button>
        </div>
      </div>

      <div className="search-bar">
        <div className="search-input-wrapper">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索台词内容..."
          />
          {searchText && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchText('')}
              title="清除搜索"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="filter-bar">
        <button
          className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
          title="显示全部"
        >
          全部
        </button>
        <button
          className={`filter-btn ${statusFilter === 'unembedded' ? 'active' : ''}`}
          onClick={() => setStatusFilter('unembedded')}
          title="只显示未嵌入"
        >
          <Circle size={10} />
          未嵌入
        </button>
        <button
          className={`filter-btn ${statusFilter === 'embedded' ? 'active' : ''}`}
          onClick={() => setStatusFilter('embedded')}
          title="只显示已嵌入"
        >
          <CheckCircle size={10} />
          已嵌入
        </button>
        <button
          className={`filter-btn ${statusFilter === 'needs_rework' ? 'active' : ''}`}
          onClick={() => setStatusFilter('needs_rework')}
          title="只显示需重修"
        >
          <AlertCircle size={10} />
          需重修
        </button>
      </div>

      {isFiltering && (
        <div className="filter-info">
          找到 <strong>{filteredLines.length}</strong> 条结果
          {searchText && <> · 关键词: <em>"{searchText.trim()}"</em></>}
          {statusFilter !== 'all' && <> · 状态: <em>{statusConfig[statusFilter].label}</em></>}
        </div>
      )}

      <div className="stats-bar">
        <span className="stat">
          <Circle size={12} color="#888" />
          未嵌入: {currentPageLines.filter((l) => l.status === 'unembedded').length}
        </span>
        <span className="stat">
          <CheckCircle size={12} color="#4caf50" />
          已嵌入: {currentPageLines.filter((l) => l.status === 'embedded').length}
        </span>
        <span className="stat">
          <AlertCircle size={12} color="#ff9800" />
          需重修: {currentPageLines.filter((l) => l.status === 'needs_rework').length}
        </span>
      </div>

      {showBatchInput && (
        <div className="batch-input">
          <textarea
            ref={textareaRef}
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value)}
            placeholder={`每行一条台词。支持多页粘贴，用 --- 或 --- 第N页 --- 分隔不同页\n例如:\n第一页台词1\n第一页台词2\n---\n第二页台词1\n第二页台词2`}
            rows={8}
          />
          <div className="batch-actions">
            <button className="btn btn-primary" onClick={handleBatchAdd}>
              确认添加
            </button>
            <button className="btn" onClick={() => setShowBatchInput(false)}>
              取消
            </button>
          </div>
        </div>
      )}

      {!isFiltering && (
        <div className="page-move-bar">
          <span className="page-line-count">
            第{currentPageIndex + 1}页: {pageLineCounts[currentPageIndex]}条
          </span>
          <div className="page-move-btns">
            <button
              className="move-page-btn"
              onClick={() => moveLinesToPage(currentPageIndex, currentPageIndex - 1)}
              disabled={currentPageIndex <= 0 || pageLineCounts[currentPageIndex] === 0}
              title="将本页所有台词移到上一页"
            >
              <ArrowUpToLine size={14} />
              上移
            </button>
            <button
              className="move-page-btn"
              onClick={() => moveLinesToPage(currentPageIndex, currentPageIndex + 1)}
              disabled={currentPageIndex >= pages.length - 1 || pageLineCounts[currentPageIndex] === 0}
              title="将本页所有台词移到下一页"
            >
              下移
              <ArrowDownToLine size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="lines-container">
        {isFiltering ? (
          filteredLines.length === 0 ? (
            <div className="empty-lines">
              <p>没有匹配的台词</p>
              <p className="hint">尝试修改搜索词或筛选条件</p>
            </div>
          ) : (
            filteredLines.map((line) => {
              const StatusIcon = statusConfig[line.status].icon
              const textBox = getLineTextBox(line.id)
              const isOtherPage = line.pageIndex !== currentPageIndex
              return (
                <div
                  key={line.id}
                  className={`line-item ${selectedLineId === line.id ? 'selected' : ''} ${isOtherPage ? 'other-page' : ''}`}
                  onClick={() => handleLineClick(line)}
                >
                  <div className="line-number search-mode">
                    {isOtherPage ? (
                      <span className="line-page-badge">
                        P{line.pageIndex + 1}·{line.order + 1}
                      </span>
                    ) : (
                      line.order + 1
                    )}
                  </div>
                  <button
                    className="status-btn"
                    onClick={(e) => handleStatusClick(line.id, e)}
                    title={`${statusConfig[line.status].label}（点击切换）`}
                  >
                    <StatusIcon size={16} color={statusConfig[line.status].color} />
                  </button>
                  <div className="line-content">
                    <textarea
                      value={line.text}
                      onChange={(e) => handleTextChange(line.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="输入台词..."
                      rows={2}
                    />
                    {textBox && (
                      <div className="line-textbox-info">
                        位置: ({Math.round(textBox.x)}, {Math.round(textBox.y)})
                      </div>
                    )}
                  </div>
                  <button
                    className="delete-btn"
                    onClick={(e) => handleDeleteLine(line.id, e)}
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })
          )
        ) : (
          currentPageLines.length === 0 ? (
            <div className="empty-lines">
              <p>暂无台词</p>
              <p className="hint">点击 + 添加或批量粘贴</p>
            </div>
          ) : (
            currentPageLines.map((line, index) => {
              const StatusIcon = statusConfig[line.status].icon
              const textBox = getLineTextBox(line.id)
              return (
                <div
                  key={line.id}
                  className={`line-item ${selectedLineId === line.id ? 'selected' : ''} ${draggedId === line.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, line.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, line.id)}
                  onClick={() => handleLineClick(line)}
                >
                  <div className="line-drag-handle">
                    <GripVertical size={14} />
                  </div>
                  <div className="line-number">{index + 1}</div>
                  <button
                    className="status-btn"
                    onClick={(e) => handleStatusClick(line.id, e)}
                    title={`${statusConfig[line.status].label}（点击切换）`}
                  >
                    <StatusIcon size={16} color={statusConfig[line.status].color} />
                  </button>
                  <div className="line-content">
                    <textarea
                      value={line.text}
                      onChange={(e) => handleTextChange(line.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="输入台词..."
                      rows={2}
                    />
                    {textBox && (
                      <div className="line-textbox-info">
                        位置: ({Math.round(textBox.x)}, {Math.round(textBox.y)})
                      </div>
                    )}
                  </div>
                  <button
                    className="delete-btn"
                    onClick={(e) => handleDeleteLine(line.id, e)}
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })
          )
        )}
      </div>
    </div>
  )
}
