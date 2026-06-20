import { useRef, useEffect, useState, useCallback } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { TextBox, TextBoxStyle } from '../types'
import { renderPageToDataUrl } from '../utils/exportUtils'
import { exportImage } from '../utils/fileUtils'
import { ZoomIn, ZoomOut, Move, MousePointer2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import './LetteringCanvas.css'

type ToolMode = 'select' | 'pan' | 'lettering'

interface DragState {
  isDragging: boolean
  startX: number
  startY: number
  textBoxStartX: number
  textBoxStartY: number
}

interface ResizeState {
  isResizing: boolean
  handle: string
  startX: number
  startY: number
  startWidth: number
  startHeight: number
  startTextBoxX: number
  startTextBoxY: number
}

function drawHorizontalText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  style: TextBoxStyle
) {
  const { fontFamily, fontSize, lineHeight, strokeWidth, strokeColor, fillColor, bold, italic } = style
  const fontStyle = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`
  ctx.font = fontStyle
  ctx.textBaseline = 'top'

  const lines = wrapText(ctx, text, Math.max(width, fontSize))
  const totalHeight = lines.length * fontSize * lineHeight
  const startY = y + (height - totalHeight) / 2

  lines.forEach((line, i) => {
    const lineY = startY + i * fontSize * lineHeight
    const lineWidth = ctx.measureText(line).width
    const lineX = x + (width - lineWidth) / 2

    if (strokeWidth > 0) {
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = strokeWidth * 2
      ctx.lineJoin = 'round'
      ctx.strokeText(line, lineX, lineY)
    }
    ctx.fillStyle = fillColor
    ctx.fillText(line, lineX, lineY)
  })
}

function drawVerticalText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  style: TextBoxStyle
) {
  const { fontFamily, fontSize, lineHeight, strokeWidth, strokeColor, fillColor, bold, italic } = style
  const fontStyle = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`
  ctx.font = fontStyle
  ctx.textBaseline = 'top'

  const colWidth = fontSize * lineHeight
  const maxCols = Math.max(1, Math.floor(width / colWidth))
  const maxRows = Math.max(1, Math.floor(height / fontSize))

  const chars = text.replace(/\n/g, '').split('')
  const totalCols = Math.ceil(chars.length / maxRows)
  const actualTotalWidth = totalCols * colWidth
  const startOffsetX = (width - actualTotalWidth) / 2

  let col = 0
  let row = 0
  const centerX = x + width / 2

  for (const char of chars) {
    if (row >= maxRows) {
      row = 0
      col++
    }
    if (col >= maxCols) break

    const charX = centerX + startOffsetX + (maxCols - 1 - col) * colWidth + (colWidth - fontSize) / 2
    const charY = y + row * fontSize

    if (strokeWidth > 0) {
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = strokeWidth * 2
      ctx.lineJoin = 'round'
      ctx.strokeText(char, charX, charY)
    }
    ctx.fillStyle = fillColor
    ctx.fillText(char, charX, charY)

    row++
  }
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  style: TextBoxStyle
) {
  if (style.isVertical) {
    drawVerticalText(ctx, text, x, y, width, height, style)
  } else {
    drawHorizontalText(ctx, text, x, y, width, height, style)
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  const paragraphs = text.split('\n')

  paragraphs.forEach((paragraph) => {
    if (paragraph === '') {
      lines.push('')
      return
    }

    let currentLine = ''
    const chars = paragraph.split('')

    chars.forEach((char) => {
      const testLine = currentLine + char
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine)
        currentLine = char
      } else {
        currentLine = testLine
      }
    })

    if (currentLine) {
      lines.push(currentLine)
    }
  })

  return lines
}

export default function LetteringCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const {
    pages,
    currentPageIndex,
    textBoxes,
    selectedTextBoxId,
    selectTextBox,
    updateTextBox,
    addTextBox,
    selectedLineId,
    dialogueLines,
    updateDialogueLine,
    defaultStyle,
    setDialogueStatus,
    selectLine,
    selectNextUnembeddedLine,
    selectPrevLine,
  } = useProjectStore()

  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [toolMode, setToolMode] = useState<ToolMode>('lettering')
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [resizeState, setResizeState] = useState<ResizeState | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  const currentPage = pages[currentPageIndex]
  const currentPageTextBoxes = textBoxes.filter((t) => t.pageIndex === currentPageIndex)
  const currentPageLines = dialogueLines
    .filter((l) => l.pageIndex === currentPageIndex)
    .sort((a, b) => a.order - b.order)
  const selectedLine = dialogueLines.find((l) => l.id === selectedLineId)
  const selectedLineIndex = currentPageLines.findIndex((l) => l.id === selectedLineId)

  useEffect(() => {
    if (!currentPage) return
    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      fitToScreen(img.width, img.height)
    }
    img.src = currentPage.imageDataUrl
  }, [currentPageIndex, currentPage?.imageDataUrl])

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setCanvasSize({ width: rect.width, height: rect.height })
        canvasRef.current.width = rect.width
        canvasRef.current.height = rect.height
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const fitToScreen = useCallback((imgWidth: number, imgHeight: number) => {
    if (!containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const scaleX = containerRect.width / imgWidth
    const scaleY = containerRect.height / imgHeight
    const newScale = Math.min(scaleX, scaleY, 1) * 0.9
    setScale(newScale)
    setOffsetX((containerRect.width - imgWidth * newScale) / 2)
    setOffsetY((containerRect.height - imgHeight * newScale) / 2)
  }, [])

  const screenToImageCoords = useCallback((screenX: number, screenY: number) => {
    return { x: (screenX - offsetX) / scale, y: (screenY - offsetY) / scale }
  }, [offsetX, offsetY, scale])

  const imageToScreenCoords = useCallback((imgX: number, imgY: number) => {
    return { x: imgX * scale + offsetX, y: imgY * scale + offsetY }
  }, [offsetX, offsetY, scale])

  const estimateTextBoxSize = useCallback((text: string, style: TextBoxStyle): { w: number; h: number } => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return { w: 150, h: 60 }
    const fontStyle = `${style.italic ? 'italic ' : ''}${style.bold ? 'bold ' : ''}${style.fontSize}px ${style.fontFamily}`
    ctx.font = fontStyle

    if (style.isVertical) {
      const maxRows = Math.max(1, Math.floor(200 / style.fontSize))
      const totalCols = Math.ceil(text.replace(/\n/g, '').length / maxRows)
      const w = Math.max(totalCols * style.fontSize * style.lineHeight, style.fontSize * style.lineHeight)
      const h = Math.max(maxRows * style.fontSize, style.fontSize * 2)
      return { w, h }
    } else {
      const lines = wrapText(ctx, text, 200)
      const maxLineWidth = Math.max(...lines.map((l) => ctx.measureText(l).width), 40)
      const w = Math.max(maxLineWidth + style.fontSize, 60)
      const h = Math.max(lines.length * style.fontSize * style.lineHeight, style.fontSize * 2)
      return { w, h }
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (!imageRef.current || !currentPage) return
    const img = imageRef.current
    ctx.drawImage(img, offsetX, offsetY, img.width * scale, img.height * scale)

    currentPageTextBoxes.forEach((textBox) => {
      const sp = imageToScreenCoords(textBox.x, textBox.y)
      const sw = textBox.width * scale
      const sh = textBox.height * scale

      ctx.save()
      ctx.beginPath()
      ctx.rect(sp.x, sp.y, sw, sh)
      ctx.clip()

      const scaledStyle: TextBoxStyle = {
        ...textBox.style,
        fontSize: textBox.style.fontSize * scale,
        strokeWidth: textBox.style.strokeWidth * scale,
      }
      drawText(ctx, textBox.text, sp.x, sp.y, sw, sh, scaledStyle)
      ctx.restore()

      const linkedLine = dialogueLines.find((l) => l.textBoxId === textBox.id)
      const isSelected = textBox.id === selectedTextBoxId || linkedLine?.id === selectedLineId

      if (isSelected) {
        ctx.strokeStyle = '#0e639c'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.strokeRect(sp.x, sp.y, sw, sh)
        ctx.setLineDash([])

        const hs = 8
        const handles = [
          { hx: sp.x, hy: sp.y },
          { hx: sp.x + sw / 2, hy: sp.y },
          { hx: sp.x + sw, hy: sp.y },
          { hx: sp.x + sw, hy: sp.y + sh / 2 },
          { hx: sp.x + sw, hy: sp.y + sh },
          { hx: sp.x + sw / 2, hy: sp.y + sh },
          { hx: sp.x, hy: sp.y + sh },
          { hx: sp.x, hy: sp.y + sh / 2 },
        ]
        ctx.fillStyle = '#ffffff'
        ctx.strokeStyle = '#0e639c'
        ctx.lineWidth = 1
        handles.forEach(({ hx, hy }) => {
          ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs)
          ctx.strokeRect(hx - hs / 2, hy - hs / 2, hs, hs)
        })
      } else if (linkedLine && linkedLine.status === 'needs_rework') {
        ctx.strokeStyle = '#ff9800'
        ctx.lineWidth = 2
        ctx.setLineDash([3, 3])
        ctx.strokeRect(sp.x, sp.y, sw, sh)
        ctx.setLineDash([])
      }
    })
  }, [currentPage, currentPageTextBoxes, selectedTextBoxId, selectedLineId, scale, offsetX, offsetY, canvasSize, imageToScreenCoords, dialogueLines])

  const getResizeHandle = (mouseX: number, mouseY: number, textBox: TextBox): string | null => {
    const sp = imageToScreenCoords(textBox.x, textBox.y)
    const sw = textBox.width * scale
    const sh = textBox.height * scale
    const hs = 12
    const handles = [
      { name: 'nw', hx: sp.x, hy: sp.y },
      { name: 'n', hx: sp.x + sw / 2, hy: sp.y },
      { name: 'ne', hx: sp.x + sw, hy: sp.y },
      { name: 'e', hx: sp.x + sw, hy: sp.y + sh / 2 },
      { name: 'se', hx: sp.x + sw, hy: sp.y + sh },
      { name: 's', hx: sp.x + sw / 2, hy: sp.y + sh },
      { name: 'sw', hx: sp.x, hy: sp.y + sh },
      { name: 'w', hx: sp.x, hy: sp.y + sh / 2 },
    ]
    for (const h of handles) {
      if (Math.abs(mouseX - h.hx) <= hs / 2 && Math.abs(mouseY - h.hy) <= hs / 2) {
        return h.name
      }
    }
    return null
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    if (toolMode === 'pan') {
      setIsPanning(true)
      setPanStart({ x: mouseX - offsetX, y: mouseY - offsetY })
      return
    }

    const imgCoords = screenToImageCoords(mouseX, mouseY)
    const clickedTextBox = [...currentPageTextBoxes].reverse().find((tb) => {
      return (
        imgCoords.x >= tb.x &&
        imgCoords.x <= tb.x + tb.width &&
        imgCoords.y >= tb.y &&
        imgCoords.y <= tb.y + tb.height
      )
    })

    if (clickedTextBox) {
      selectTextBox(clickedTextBox.id)
      const line = dialogueLines.find((l) => l.textBoxId === clickedTextBox.id)
      if (line) selectLine(line.id)

      const handle = getResizeHandle(mouseX, mouseY, clickedTextBox)
      if (handle) {
        setResizeState({
          isResizing: true,
          handle,
          startX: mouseX,
          startY: mouseY,
          startWidth: clickedTextBox.width,
          startHeight: clickedTextBox.height,
          startTextBoxX: clickedTextBox.x,
          startTextBoxY: clickedTextBox.y,
        })
      } else {
        setDragState({
          isDragging: true,
          startX: mouseX,
          startY: mouseY,
          textBoxStartX: clickedTextBox.x,
          textBoxStartY: clickedTextBox.y,
        })
      }
      return
    }

    if (toolMode === 'lettering' && selectedLine) {
      const { w, h } = estimateTextBoxSize(selectedLine.text, defaultStyle)
      if (selectedLine.textBoxId) {
        const existingBox = textBoxes.find((t) => t.id === selectedLine.textBoxId)
        if (existingBox) {
          updateTextBox(existingBox.id, {
            x: imgCoords.x - existingBox.width / 2,
            y: imgCoords.y - existingBox.height / 2,
          })
          selectTextBox(existingBox.id)
        }
      } else {
        const textBoxId = addTextBox({
          pageIndex: currentPageIndex,
          x: imgCoords.x - w / 2,
          y: imgCoords.y - h / 2,
          width: w,
          height: h,
          text: selectedLine.text,
          style: { ...defaultStyle },
        })
        updateDialogueLine(selectedLine.id, { textBoxId })
        setDialogueStatus(selectedLine.id, 'embedded')
        selectTextBox(textBoxId)
      }
      selectNextUnembeddedLine()
      return
    }

    if (toolMode === 'select' && selectedLine && !selectedLine.textBoxId) {
      const { w, h } = estimateTextBoxSize(selectedLine.text, defaultStyle)
      const textBoxId = addTextBox({
        pageIndex: currentPageIndex,
        x: imgCoords.x - w / 2,
        y: imgCoords.y - h / 2,
        width: w,
        height: h,
        text: selectedLine.text,
        style: { ...defaultStyle },
      })
      updateDialogueLine(selectedLine.id, { textBoxId })
      setDialogueStatus(selectedLine.id, 'embedded')
      selectTextBox(textBoxId)
      selectNextUnembeddedLine()
      return
    }

    selectTextBox(null)
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    if (isPanning) {
      setOffsetX(mouseX - panStart.x)
      setOffsetY(mouseY - panStart.y)
      return
    }

    if (dragState?.isDragging && selectedTextBoxId) {
      const dx = (mouseX - dragState.startX) / scale
      const dy = (mouseY - dragState.startY) / scale
      updateTextBox(selectedTextBoxId, {
        x: dragState.textBoxStartX + dx,
        y: dragState.textBoxStartY + dy,
      })
    }

    if (resizeState?.isResizing && selectedTextBoxId) {
      const dx = (mouseX - resizeState.startX) / scale
      const dy = (mouseY - resizeState.startY) / scale
      const handle = resizeState.handle
      let newX = resizeState.startTextBoxX
      let newY = resizeState.startTextBoxY
      let newWidth = resizeState.startWidth
      let newHeight = resizeState.startHeight

      if (handle.includes('e')) newWidth = Math.max(20, resizeState.startWidth + dx)
      if (handle.includes('w')) {
        newWidth = Math.max(20, resizeState.startWidth - dx)
        newX = resizeState.startTextBoxX + (resizeState.startWidth - newWidth)
      }
      if (handle.includes('s')) newHeight = Math.max(20, resizeState.startHeight + dy)
      if (handle.includes('n')) {
        newHeight = Math.max(20, resizeState.startHeight - dy)
        newY = resizeState.startTextBoxY + (resizeState.startHeight - newHeight)
      }

      updateTextBox(selectedTextBoxId, { x: newX, y: newY, width: newWidth, height: newHeight })
    }
  }

  const handleCanvasMouseUp = () => {
    setIsPanning(false)
    setDragState(null)
    setResizeState(null)
  }

  const handleCanvasWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.min(Math.max(scale * delta, 0.1), 5)
    const imgX = (mouseX - offsetX) / scale
    const imgY = (mouseY - offsetY) / scale
    setScale(newScale)
    setOffsetX(mouseX - imgX * newScale)
    setOffsetY(mouseY - imgY * newScale)
  }

  const handleExportCurrent = async () => {
    if (!currentPage) return
    const dataUrl = await renderPageToDataUrl(currentPage, textBoxes)
    const fileName = `page_${String(currentPageIndex + 1).padStart(3, '0')}.png`
    await exportImage(dataUrl, fileName)
  }

  if (!currentPage) {
    return (
      <div className="lettering-canvas-container empty">
        <div className="empty-state">
          <p>请导入漫画图片开始嵌字</p>
        </div>
      </div>
    )
  }

  const cursorStyle = toolMode === 'pan' || isPanning
    ? (isPanning ? 'grabbing' : 'grab')
    : toolMode === 'lettering' && selectedLine
      ? 'crosshair'
      : 'default'

  return (
    <div className="lettering-canvas-container">
      <div className="canvas-toolbar">
        <div className="tool-group">
          <button
            className={`tool-btn ${toolMode === 'lettering' ? 'active' : ''}`}
            onClick={() => setToolMode('lettering')}
            title="嵌字模式：点击画布放置文字框"
          >
            嵌字
          </button>
          <button
            className={`tool-btn ${toolMode === 'select' ? 'active' : ''}`}
            onClick={() => setToolMode('select')}
            title="选择/移动工具"
          >
            <MousePointer2 size={16} />
          </button>
          <button
            className={`tool-btn ${toolMode === 'pan' ? 'active' : ''}`}
            onClick={() => setToolMode('pan')}
            title="平移工具"
          >
            <Move size={16} />
          </button>
        </div>

        {toolMode === 'lettering' && currentPageLines.length > 0 && (
          <div className="lettering-stepper">
            <button
              className="stepper-btn"
              onClick={selectPrevLine}
              disabled={selectedLineIndex <= 0}
              title="上一条"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="stepper-info">
              {selectedLineIndex >= 0 ? `${selectedLineIndex + 1}` : '-'}/{currentPageLines.length}
              {selectedLine && (
                <span className={`stepper-status status-${selectedLine.status}`}>
                  {selectedLine.status === 'unembedded' ? '未嵌入' : selectedLine.status === 'embedded' ? '已嵌入' : '需重修'}
                </span>
              )}
            </span>
            <button
              className="stepper-btn"
              onClick={() => selectNextUnembeddedLine()}
              title="下一条"
            >
              <ChevronRight size={16} />
            </button>
            {selectedLine && (
              <button
                className="stepper-btn rework-btn"
                onClick={() => {
                  const newStatus = selectedLine.status === 'needs_rework' ? 'unembedded' : 'needs_rework'
                  setDialogueStatus(selectedLine.id, newStatus)
                }}
                title="标记需重修"
              >
                <AlertCircle size={14} />
              </button>
            )}
            <button
              className="stepper-btn export-btn"
              onClick={handleExportCurrent}
              title="导出当前页（原图尺寸）"
            >
              导出
            </button>
          </div>
        )}

        <div className="tool-group">
          <button className="tool-btn" onClick={() => setScale((prev) => Math.max(prev / 1.2, 0.1))} title="缩小">
            <ZoomOut size={16} />
          </button>
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
          <button className="tool-btn" onClick={() => setScale((prev) => Math.min(prev * 1.2, 5))} title="放大">
            <ZoomIn size={16} />
          </button>
          <button className="tool-btn" onClick={() => { if (imageRef.current) fitToScreen(imageRef.current.width, imageRef.current.height) }} title="适应屏幕">
            适应
          </button>
        </div>

        <div className="page-info-bar">
          {currentPage.fileName}
        </div>
      </div>

      <div
        ref={containerRef}
        className="canvas-wrapper"
        style={{ cursor: cursorStyle }}
      >
        <canvas
          id="lettering-canvas"
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onWheel={handleCanvasWheel}
        />
      </div>
    </div>
  )
}
