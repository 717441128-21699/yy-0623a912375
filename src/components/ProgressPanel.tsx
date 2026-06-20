import { useProjectStore } from '../store/useProjectStore'
import { X, CheckCircle, Circle, AlertCircle, BarChart3, ChevronRight, Play, Square, SkipForward, ChevronLeft, Check } from 'lucide-react'
import { useState, useMemo } from 'react'
import './ProgressPanel.css'

interface ProgressPanelProps {
  onClose: () => void
}

export default function ProgressPanel({ onClose }: ProgressPanelProps) {
  const {
    pages,
    dialogueLines,
    currentPageIndex,
    setCurrentPage,
    selectLine,
    setDialogueStatus,
  } = useProjectStore()

  const [isReworkMode, setIsReworkMode] = useState(false)
  const [reworkIndex, setReworkIndex] = useState(0)
  const [processedCount, setProcessedCount] = useState(0)

  const reworkQueue = useMemo(() => {
    return pages
      .sort((a, b) => a.index - b.index)
      .flatMap((p) =>
        dialogueLines
          .filter((l) => l.pageIndex === p.index && l.status === 'needs_rework')
          .sort((a, b) => a.order - b.order)
          .map((l) => ({ lineId: l.id, pageIndex: p.index, text: l.text, order: l.order }))
      )
  }, [pages, dialogueLines])

  const pageStats = pages.map((p) => {
    const lines = dialogueLines.filter((l) => l.pageIndex === p.index)
    return {
      pageIndex: p.index,
      fileName: p.fileName,
      total: lines.length,
      unembedded: lines.filter((l) => l.status === 'unembedded').length,
      embedded: lines.filter((l) => l.status === 'embedded').length,
      needs_rework: lines.filter((l) => l.status === 'needs_rework').length,
      reworkLines: lines.filter((l) => l.status === 'needs_rework').sort((a, b) => a.order - b.order),
    }
  })

  const totalStats = {
    total: pageStats.reduce((s, p) => s + p.total, 0),
    unembedded: pageStats.reduce((s, p) => s + p.unembedded, 0),
    embedded: pageStats.reduce((s, p) => s + p.embedded, 0),
    needs_rework: pageStats.reduce((s, p) => s + p.needs_rework, 0),
  }

  const handleJumpToLine = (pageIndex: number, lineId: string) => {
    setCurrentPage(pageIndex)
    selectLine(lineId)
  }

  const handleStartRework = () => {
    if (reworkQueue.length === 0) return
    setIsReworkMode(true)
    setReworkIndex(0)
    setProcessedCount(0)
    handleJumpToLine(reworkQueue[0].pageIndex, reworkQueue[0].lineId)
  }

  const handleStopRework = () => {
    setIsReworkMode(false)
  }

  const handleReworkComplete = () => {
    if (reworkQueue[reworkIndex]) {
      setDialogueStatus(reworkQueue[reworkIndex].lineId, 'embedded')
      setProcessedCount((c) => c + 1)
    }
    handleNextRework()
  }

  const handleSkipRework = () => {
    handleNextRework()
  }

  const handlePrevRework = () => {
    if (reworkIndex > 0) {
      const nextIdx = reworkIndex - 1
      setReworkIndex(nextIdx)
      handleJumpToLine(reworkQueue[nextIdx].pageIndex, reworkQueue[nextIdx].lineId)
    }
  }

  const handleNextRework = () => {
    const nextIdx = reworkIndex + 1
    if (nextIdx < reworkQueue.length) {
      setReworkIndex(nextIdx)
      handleJumpToLine(reworkQueue[nextIdx].pageIndex, reworkQueue[nextIdx].lineId)
    }
  }

  const currentReworkItem = reworkQueue[reworkIndex]

  return (
    <div className="progress-panel-overlay" onClick={onClose}>
      <div className="progress-panel" onClick={(e) => e.stopPropagation()}>
        <div className="progress-panel-header">
          <div className="panel-title">
            <BarChart3 size={16} />
            <span>{isReworkMode ? '返修扫稿模式' : '嵌字进度'}</span>
          </div>
          <button className="close-btn" onClick={onClose} title="关闭">
            <X size={16} />
          </button>
        </div>

        {isReworkMode && currentReworkItem && (
          <div className="rework-mode-bar">
            <div className="rework-mode-status">
              <span className="rework-counter">
                {reworkIndex + 1} / {reworkQueue.length}
              </span>
              <span className="rework-session-stats">
                本次已处理 <strong>{processedCount}</strong> 条
                {reworkQueue.length > 0 && <>，还剩 <strong>{reworkQueue.length}</strong> 条</>}
              </span>
            </div>
            <div className="rework-mode-nav">
              <button
                className="rework-nav-btn"
                onClick={handlePrevRework}
                disabled={reworkIndex === 0}
                title="上一条"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="rework-nav-btn complete-btn"
                onClick={handleReworkComplete}
                title="完成本条并下一条"
              >
                <Check size={16} />
                完成
              </button>
              <button
                className="rework-nav-btn skip-btn"
                onClick={handleSkipRework}
                disabled={reworkIndex >= reworkQueue.length - 1}
                title="跳过本条"
              >
                <SkipForward size={16} />
              </button>
              <button
                className="rework-nav-btn"
                onClick={handleNextRework}
                disabled={reworkIndex >= reworkQueue.length - 1}
                title="下一条"
              >
                <ChevronRight size={16} />
              </button>
              <button
                className="rework-nav-btn stop-btn"
                onClick={handleStopRework}
                title="退出返修模式"
              >
                <Square size={14} />
              </button>
            </div>
            <div className="rework-current-line">
              <span className="rework-line-loc">
                第 {currentReworkItem.pageIndex + 1} 页 · #{currentReworkItem.order + 1}
              </span>
              <span className="rework-line-text">{currentReworkItem.text}</span>
            </div>
          </div>
        )}

        {isReworkMode && reworkQueue.length === 0 && (
          <div className="rework-finished">
            <div className="rework-finished-icon">
              <CheckCircle size={48} />
            </div>
            <h3>🎉 返修扫稿完成！</h3>
            <p className="rework-finished-stats">
              本次共处理 <strong>{processedCount}</strong> 条，所有需重修的台词都已扫完
            </p>
            <button className="rework-exit-btn" onClick={handleStopRework}>
              返回进度面板
            </button>
          </div>
        )}

        <div className="progress-summary">
          <div className="summary-item">
            <span className="summary-label">合计</span>
            <span className="summary-value">{totalStats.total}</span>
          </div>
          <div className="summary-item unembedded">
            <Circle size={12} />
            <span className="summary-label">未嵌入</span>
            <span className="summary-value">{totalStats.unembedded}</span>
          </div>
          <div className="summary-item embedded">
            <CheckCircle size={12} />
            <span className="summary-label">已嵌入</span>
            <span className="summary-value">{totalStats.embedded}</span>
          </div>
          <div className="summary-item needs_rework">
            <AlertCircle size={12} />
            <span className="summary-label">需重修</span>
            <span className="summary-value">{totalStats.needs_rework}</span>
          </div>
          {!isReworkMode && totalStats.needs_rework > 0 && (
            <button className="start-rework-btn" onClick={handleStartRework}>
              <Play size={12} />
              开始返修扫稿
            </button>
          )}
        </div>

        {!isReworkMode && (
          <div className="progress-list">
            {pageStats.length === 0 ? (
              <div className="progress-empty">暂无页面，请先导入图片</div>
            ) : (
              pageStats.map((ps) => (
                <div
                  key={ps.pageIndex}
                  className={`progress-page-item ${currentPageIndex === ps.pageIndex ? 'active' : ''}`}
                >
                  <div
                    className="page-item-header"
                    onClick={() => setCurrentPage(ps.pageIndex)}
                    title="跳转到此页"
                  >
                    <span className="page-no">第 {ps.pageIndex + 1} 页</span>
                    <span className="page-name" title={ps.fileName}>
                      {ps.fileName}
                    </span>
                    <span className="page-count">{ps.total} 条</span>
                  </div>

                  {ps.total > 0 && (
                    <>
                      <div className="page-stats-bar">
                        {ps.unembedded > 0 && (
                          <div
                            className="bar-segment bar-unembedded"
                            style={{ width: `${(ps.unembedded / ps.total) * 100}%` }}
                            title={`未嵌入 ${ps.unembedded} 条`}
                          />
                        )}
                        {ps.embedded > 0 && (
                          <div
                            className="bar-segment bar-embedded"
                            style={{ width: `${(ps.embedded / ps.total) * 100}%` }}
                            title={`已嵌入 ${ps.embedded} 条`}
                          />
                        )}
                        {ps.needs_rework > 0 && (
                          <div
                            className="bar-segment bar-rework"
                            style={{ width: `${(ps.needs_rework / ps.total) * 100}%` }}
                            title={`需重修 ${ps.needs_rework} 条`}
                          />
                        )}
                      </div>

                      <div className="page-stat-numbers">
                        {ps.unembedded > 0 && (
                          <span className="stat-num stat-unembedded">
                            <Circle size={10} />{ps.unembedded}
                          </span>
                        )}
                        {ps.embedded > 0 && (
                          <span className="stat-num stat-embedded">
                            <CheckCircle size={10} />{ps.embedded}
                          </span>
                        )}
                        {ps.needs_rework > 0 && (
                          <span className="stat-num stat-rework">
                            <AlertCircle size={10} />{ps.needs_rework}
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  {ps.reworkLines.length > 0 && (
                    <div className="rework-lines">
                      <div className="rework-lines-label">需返修条目：</div>
                      <div className="rework-lines-list">
                        {ps.reworkLines.map((line) => (
                          <button
                            key={line.id}
                            className="rework-line-btn"
                            onClick={() => handleJumpToLine(ps.pageIndex, line.id)}
                            title={line.text}
                          >
                            <ChevronRight size={12} />
                            <span>#{line.order + 1}</span>
                            <span className="rework-line-text">{line.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
