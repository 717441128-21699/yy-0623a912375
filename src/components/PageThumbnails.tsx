import { useProjectStore } from '../store/useProjectStore'
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import './PageThumbnails.css'

export default function PageThumbnails() {
  const { pages, currentPageIndex, setCurrentPage } = useProjectStore()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const [thumbnails, setThumbnails] = useState<{ index: number; dataUrl: string }[]>([])

  useEffect(() => {
    const generateThumbnails = async () => {
      const thumbs: { index: number; dataUrl: string }[] = []
      for (const page of pages) {
        const thumb = await generateThumbnail(page.imageDataUrl)
        thumbs.push({ index: page.index, dataUrl: thumb })
      }
      setThumbnails(thumbs)
    }
    generateThumbnails()
  }, [pages])

  const generateThumbnail = (imageDataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = document.createElement('img')
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxWidth = 120
        const scale = maxWidth / img.width
        canvas.width = maxWidth
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/jpeg', 0.7))
        } else {
          resolve(imageDataUrl)
        }
      }
      img.src = imageDataUrl
    })
  }

  useEffect(() => {
    if (containerRef.current && pages.length > 0) {
      const activeItem = containerRef.current.querySelector('.thumbnail-item.active')
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [currentPageIndex, pages.length])

  if (isCollapsed) {
    return (
      <div className="page-thumbnails collapsed">
        <button
          className="toggle-btn"
          onClick={() => setIsCollapsed(false)}
          title="展开页面列表"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="page-thumbnails" ref={containerRef}>
      <div className="thumbnails-header">
        <span className="title">
          <ImageIcon size={14} />
          页面 ({pages.length})
        </span>
        <button
          className="toggle-btn"
          onClick={() => setIsCollapsed(true)}
          title="收起页面列表"
        >
          <ChevronLeft size={16} />
        </button>
      </div>
      <div className="thumbnails-list">
        {pages.length === 0 ? (
          <div className="empty-thumbnails">
            <p>暂无页面</p>
            <p className="hint">点击顶部"导入图片"添加</p>
          </div>
        ) : (
          pages.map((page, index) => {
            const thumb = thumbnails.find((t) => t.index === index)
            return (
              <div
                key={index}
                className={`thumbnail-item ${currentPageIndex === index ? 'active' : ''}`}
                onClick={() => setCurrentPage(index)}
              >
                <div className="thumbnail-image">
                  {thumb ? (
                    <img src={thumb.dataUrl} alt={`第 ${index + 1} 页`} />
                  ) : (
                    <div className="thumbnail-placeholder">
                      <ImageIcon size={24} />
                    </div>
                  )}
                </div>
                <div className="thumbnail-info">
                  <span className="page-number">第 {index + 1} 页</span>
                  <span className="page-name" title={page.fileName}>
                    {page.fileName}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
