import { useProjectStore } from '../store/useProjectStore'
import { X, AlertTriangle, FileText, Box, Maximize2, CheckCircle, Play, Layers, ChevronRight } from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'
import { renderPageToDataUrl } from '../utils/exportUtils'
import { exportAllImages } from '../utils/fileUtils'
import './ReviewPanel.css'

interface ReviewPanelProps {
  onClose: () => void
}

type IssueType = 'empty_text' | 'missing_textbox' | 'out_of_bounds'

interface IssueItem {
  type: IssueType
  pageIndex: number
  lineId?: string
  textBoxId?: string
  description: string
  location: string
}

export default function ReviewPanel({ onClose }: ReviewPanelProps) {
  const { pages, dialogueLines, textBoxes, setCurrentPage, selectLine, selectTextBox } = useProjectStore()

  const [isChecking, setIsChecking] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [issues, setIssues] = useState<IssueItem[]>([])
  const [selectedType, setSelectedType] = useState<IssueType | 'all'>('all')

  const loadPageDimensions = useCallback(async () => {
    const dims: Record<number, { width: number; height: number }> = {}
    for (const page of pages) {
      const { width, height } = await getImageSize(page.imageDataUrl)
      dims[page.index] = { width, height }
    }
    return dims
  }, [pages])

  const getImageSize = (dataUrl: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = document.createElement('img')
      img.onload = () => {
        resolve({ width: img.width, height: img.height })
      }
      img.onerror = () => {
        resolve({ width: 0, height: 0 })
      }
      img.src = dataUrl
    })
  }

  const runCheck = useCallback(async () => {
    setIsChecking(true)
    setIssues([])

    const dims = await loadPageDimensions()

    const foundIssues: IssueItem[] = []

    for (const line of dialogueLines) {
      if (line.text.trim() === '') {
        foundIssues.push({
          type: 'empty_text',
          pageIndex: line.pageIndex,
          lineId: line.id,
          description: '台词文本为空',
          location: `第${line.pageIndex + 1}页 · #${line.order + 1}`,
        })
      }

      if (line.status !== 'unembedded' && !line.textBoxId) {
        foundIssues.push({
          type: 'missing_textbox',
          pageIndex: line.pageIndex,
          lineId: line.id,
          description: `${line.status === 'needs_rework' ? '需重修' : '已嵌入'}台词但没有关联文字框`,
          location: `第${line.pageIndex + 1}页 · #${line.order + 1}`,
        })
      }

      if (line.textBoxId) {
        const textBox = textBoxes.find((t) => t.id === line.textBoxId)
        if (!textBox) {
          foundIssues.push({
            type: 'missing_textbox',
            pageIndex: line.pageIndex,
            lineId: line.id,
            description: '关联的文字框已被删除',
            location: `第${line.pageIndex + 1}页 · #${line.order + 1}`,
          })
        } else if (dims[line.pageIndex]) {
          const { width, height } = dims[line.pageIndex]
          const tolerance = 2
          const isOutOfBounds =
            textBox.x < -tolerance ||
            textBox.y < -tolerance ||
            textBox.x + textBox.width > width + tolerance ||
            textBox.y + textBox.height > height + tolerance
          if (isOutOfBounds) {
            const outInfo: string[] = []
            if (textBox.x < -tolerance) outInfo.push(`左边超出${Math.abs(Math.round(textBox.x))}px`)
            if (textBox.y < -tolerance) outInfo.push(`上边超出${Math.abs(Math.round(textBox.y))}px`)
            if (textBox.x + textBox.width > width + tolerance)
              outInfo.push(`右边超出${Math.round(textBox.x + textBox.width - width)}px`)
            if (textBox.y + textBox.height > height + tolerance)
              outInfo.push(`下边超出${Math.round(textBox.y + textBox.height - height)}px`)
            foundIssues.push({
              type: 'out_of_bounds',
              pageIndex: line.pageIndex,
              lineId: line.id,
              textBoxId: textBox.id,
              description: `文字框超出原图边界（${outInfo.join('，')}）`,
              location: `第${line.pageIndex + 1}页 · #${line.order + 1}`,
            })
          }
        }
      }
    }

    setIssues(foundIssues)
    setIsChecking(false)
  }, [dialogueLines, textBoxes, loadPageDimensions])

  useEffect(() => {
    runCheck()
  }, [runCheck])

  const handleJumpToIssue = (issue: IssueItem) => {
    setCurrentPage(issue.pageIndex)
    if (issue.lineId) {
      selectLine(issue.lineId)
    }
    if (issue.textBoxId) {
      selectTextBox(issue.textBoxId)
    }
  }

  const handleExportAll = async () => {
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
        onClose()
      } else {
        alert('导出失败')
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('导出失败')
    } finally {
      setIsExporting(false)
    }
  }

  const filteredIssues = selectedType === 'all' ? issues : issues.filter((i) => i.type === selectedType)

  const issueTypeConfig: Record<IssueType, { label: string; icon: typeof AlertTriangle; color: string }> = {
    empty_text: { label: '空文本', icon: FileText, color: '#ff9800' },
    missing_textbox: { label: '缺少文字框', icon: Box, color: '#f44336' },
    out_of_bounds: { label: '超出边界', icon: Maximize2, color: '#e91e63' },
  }

  const summary = {
    empty_text: issues.filter((i) => i.type === 'empty_text').length,
    missing_textbox: issues.filter((i) => i.type === 'missing_textbox').length,
    out_of_bounds: issues.filter((i) => i.type === 'out_of_bounds').length,
  }

  return (
    <div className="review-panel-overlay" onClick={onClose}>
      <div className="review-panel" onClick={(e) => e.stopPropagation()}>
        <div className="review-panel-header">
          <div className="panel-title">
            <AlertTriangle size={16} />
            <span>整话检查</span>
          </div>
          <button className="close-btn" onClick={onClose} title="关闭">
            <X size={16} />
          </button>
        </div>

        <div className="review-summary">
          {!isChecking && issues.length === 0 ? (
            <div className="review-all-clear">
              <CheckCircle size={32} />
              <div>
                <h3>🎉 检查通过</h3>
                <p>所有 {dialogueLines.length} 条台词均未发现问题</p>
              </div>
            </div>
          ) : (
            <>
              <div className="summary-stats">
                <div className={`stat-item ${summary.empty_text > 0 ? 'has-issue' : ''}`}>
                  <FileText size={14} />
                  <span className="stat-label">空文本</span>
                  <span className="stat-count">{summary.empty_text}</span>
                </div>
                <div className={`stat-item ${summary.missing_textbox > 0 ? 'has-issue' : ''}`}>
                  <Box size={14} />
                  <span className="stat-label">缺少文字框</span>
                  <span className="stat-count">{summary.missing_textbox}</span>
                </div>
                <div className={`stat-item ${summary.out_of_bounds > 0 ? 'has-issue' : ''}`}>
                  <Maximize2 size={14} />
                  <span className="stat-label">超出边界</span>
                  <span className="stat-count">{summary.out_of_bounds}</span>
                </div>
              </div>
              <div className="summary-actions">
                <button className="btn-refresh" onClick={runCheck} disabled={isChecking}>
                  <Play size={12} />
                  {isChecking ? '检查中...' : '重新检查'}
                </button>
              </div>
            </>
          )}
        </div>

        {issues.length > 0 && (
          <>
            <div className="review-filter-bar">
              <button
                className={`filter-chip ${selectedType === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedType('all')}
              >
                全部 ({issues.length})
              </button>
              {(Object.keys(issueTypeConfig) as IssueType[]).map((type) => {
                const count = issues.filter((i) => i.type === type).length
                if (count === 0) return null
                const Icon = issueTypeConfig[type].icon
                return (
                  <button
                    key={type}
                    className={`filter-chip ${selectedType === type ? 'active' : ''}`}
                    onClick={() => setSelectedType(type)}
                  >
                    <Icon size={12} color={issueTypeConfig[type].color} />
                    {issueTypeConfig[type].label} ({count})
                  </button>
                )
              })}
            </div>

            <div className="review-issues-list">
              {filteredIssues.length === 0 ? (
                <div className="no-issues">当前筛选下没有问题</div>
              ) : (
                filteredIssues.map((issue, idx) => {
                  const Icon = issueTypeConfig[issue.type].icon
                  return (
                    <div
                      key={`${issue.type}-${issue.lineId || issue.textBoxId}-${idx}`}
                      className="issue-item"
                      onClick={() => handleJumpToIssue(issue)}
                    >
                      <div className="issue-icon" style={{ color: issueTypeConfig[issue.type].color }}>
                        <Icon size={18} />
                      </div>
                      <div className="issue-content">
                        <div className="issue-description">{issue.description}</div>
                        <div className="issue-location">{issue.location}</div>
                        {issue.lineId && (
                          <div className="issue-text">
                            原文："{dialogueLines.find((l) => l.id === issue.lineId)?.text || '(空)'}"
                          </div>
                        )}
                      </div>
                      <ChevronRight size={16} className="issue-arrow" />
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}

        <div className="review-footer">
          <div className="footer-hint">
            {issues.length > 0
              ? '点击问题项可直接定位，修复后请重新检查'
              : '所有检查项均通过，可以安全导出'}
          </div>
          <button
            className="btn-export-all"
            onClick={handleExportAll}
            disabled={isExporting}
          >
            <Layers size={14} />
            {isExporting ? '导出中...' : '确认无误，批量导出'}
          </button>
        </div>
      </div>
    </div>
  )
}
