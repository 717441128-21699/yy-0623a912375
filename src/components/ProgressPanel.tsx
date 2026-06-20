import { useProjectStore } from '../store/useProjectStore'
import { X, CheckCircle, Circle, AlertCircle, BarChart3, ChevronRight } from 'lucide-react'
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
  } = useProjectStore()

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

  return (
    <div className="progress-panel-overlay" onClick={onClose}>
      <div className="progress-panel" onClick={(e) => e.stopPropagation()}>
        <div className="progress-panel-header">
          <div className="panel-title">
            <BarChart3 size={16} />
            <span>嵌字进度</span>
          </div>
          <button className="close-btn" onClick={onClose} title="关闭">
            <X size={16} />
          </button>
        </div>

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
        </div>

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
      </div>
    </div>
  )
}
