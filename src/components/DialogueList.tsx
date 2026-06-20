import { useState, useRef, useEffect } from 'react'
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
} from 'lucide-react'
import './DialogueList.css'

const statusConfig: Record<LineStatus, { icon: typeof Circle; color: string; label: string }> = {
  unembedded: { icon: Circle, color: '#888', label: '未嵌入' },
  embedded: { icon: CheckCircle, color: '#4caf50', label: '已嵌入' },
  needs_rework: { icon: AlertCircle, color: '#ff9800', label: '需重修' },
}

export default function DialogueList() {
  const {
    currentPageIndex,
    pages,
    dialogueLines,
    selectedLineId,
    selectLine,
    addDialogueLine,
    addDialogueLines,
    updateDialogueLine,
    removeDialogueLine,
    setDialogueStatus,
    selectTextBox,
    textBoxes,
  } = useProjectStore()

  const [batchInput, setBatchInput] = useState('')
  const [showBatchInput, setShowBatchInput] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentPageLines = dialogueLines
    .filter((l) => l.pageIndex === currentPageIndex)
    .sort((a, b) => a.order - b.order)

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
    const lines = batchInput
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
    if (lines.length > 0) {
      addDialogueLines(currentPageIndex, lines)
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
            placeholder="每行一条台词，粘贴后点击确认..."
            rows={6}
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

      <div className="lines-container">
        {currentPageLines.length === 0 ? (
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
        )}
      </div>
    </div>
  )
}
