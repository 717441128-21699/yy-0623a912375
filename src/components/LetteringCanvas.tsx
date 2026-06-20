import { useRef, useEffect, useState, useCallback } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { TextBox, TextBoxStyle } from '../types'
import { ZoomIn, ZoomOut, Move, MousePointer2 } from 'lucide-react'
import './LetteringCanvas.css'

type ToolMode = 'select' | 'pan' | 'create'

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
  } = useProjectStore()

  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [toolMode, setToolMode] = useState<ToolMode>('select')
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [resizeState, setResizeState] = useState<ResizeState | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  const currentPage = pages[currentPageIndex]
  const currentPageTextBoxes = textBoxes.filter((t) => t.pageIndex === currentPageIndex)

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
    return {
      x: (screenX - offsetX) / scale,
      y: (screenY - offsetY) / scale,
    }
  }, [offsetX, offsetY, scale])

  const imageToScreenCoords = useCallback((imgX: number, imgY: number) => {
    return {
      x: imgX * scale + offsetX,
      y: imgY * scale + offsetY,
    }
  }, [offsetX, offsetY, scale])

  const drawText = useCallback((
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    style: TextBoxStyle
  ) => {
    if (style.isVertical) {
      drawVerticalText(ctx, text, x, y, width, height, style)
    } else {
      drawHorizontalText(ctx, text, x, y, width, height, style)
    }
  }, [])

  const drawHorizontalText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    style: TextBoxStyle
  ) => {
    const { fontFamily, fontSize, lineHeight, strokeWidth, strokeColor, fillColor, bold, italic } = style
    const fontStyle = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`
    ctx.font = fontStyle

    const lines = wrapText(ctx, text, width)
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

  const drawVerticalText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    style: TextBoxStyle
  ) => {
    const { fontFamily, fontSize, lineHeight, strokeWidth, strokeColor, fillColor, bold, italic } = style
    const fontStyle = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`
    ctx.font = fontStyle

    const chars = text.split('')
    const charHeight = fontSize
    const lineHeight_ = fontSize * lineHeight

    const totalWidth = Math.ceil(chars.length / Math.floor(height / charHeight)) * lineHeight_
    const startX = x + (width - totalWidth) / 2 + lineHeight_ / 2

    let col = 0
    let row = 0
    const maxRows = Math.floor(height / charHeight)

    chars.forEach((char) => {
      if (row >= maxRows) {
        row = 0
        col++
      }

      const charX = startX - col * lineHeight_ - fontSize / 2
      const charY = y + row * charHeight + (height - maxRows * charHeight) / 2

      if (strokeWidth > 0) {
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = strokeWidth * 2
        ctx.lineJoin = 'round'
        ctx.strokeText(char, charX, charY)
      }

      ctx.fillStyle = fillColor
      ctx.fillText(char, charX, charY)

      row++
    })
  }

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
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
    const imgScreenW = img.width * scale
    const imgScreenH = img.height * scale

    ctx.drawImage(img, offsetX, offsetY, imgScreenW, imgScreenH)

    currentPageTextBoxes.forEach((textBox) => {
      const screenPos = imageToScreenCoords(textBox.x, textBox.y)
      const screenW = textBox.width * scale
      const screenH = textBox.height * scale

      if (textBox.id === selectedTextBoxId) {
        ctx.strokeStyle = '#0e639c'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.strokeRect(screenPos.x, screenPos.y, screenW, screenH)
        ctx.setLineDash([])

        const handleSize = 8
        ctx.fillStyle = '#ffffff'
        ctx.strokeStyle = '#0e639c'
        ctx.lineWidth = 1

        const handles = [
          { x: screenPos.x, y: screenPos.y, cursor: 'nw' },
          { x: screenPos.x + screenW / 2, y: screenPos.y, cursor: 'n' },
          { x: screenPos.x + screenW, y: screenPos.y, cursor: 'ne' },
          { x: screenPos.x + screenW, y: screenPos.y + screenH / 2, cursor: 'e' },
          { x: screenPos.x + screenW, y: screenPos.y + screenH, cursor: 'se' },
          { x: screenPos.x + screenW / 2, y: screenPos.y + screenH, cursor: 's' },
          { x: screenPos.x, y: screenPos.y + screenH, cursor: 'sw' },
          { x: screenPos.x, y: screenPos.y + screenH / 2, cursor: 'w' },
        ]

        handles.forEach((handle) => {
          ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
          ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
        })
      }

      ctx.save()
      ctx.beginPath()
      ctx.rect(screenPos.x, screenPos.y, screenW, screenH)
      ctx.clip()

      const scaledStyle: TextBoxStyle = {
        ...textBox.style,
        fontSize: textBox.style.fontSize * scale,
        strokeWidth: textBox.style.strokeWidth * scale,
      }

      drawText(ctx, textBox.text, screenPos.x, screenPos.y, screenW, screenH, scaledStyle)
      ctx.restore()
    })
  }, [
    currentPage,
    currentPageTextBoxes,
    selectedTextBoxId,
    scale,
    offsetX,
    offsetY,
    canvasSize,
    drawText,
    imageToScreenCoords,
  ])

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

    if (toolMode === 'create') {
      const imgCoords = screenToImageCoords(mouseX, mouseY)
      const selectedLine = dialogueLines.find((l) => l.id === selectedLineId)
      
      const textBoxId = addTextBox({
        pageIndex: currentPageIndex,
        x: imgCoords.x - 75,
        y: imgCoords.y - 30,
        width: 150,
        height: 60,
        text: selectedLine?.text || '新台词',
        style: { ...defaultStyle },
      })

      if (selectedLine && !selectedLine.textBoxId) {
        updateDialogueLine(selectedLine.id, { textBoxId })
        setDialogueStatus(selectedLine.id, 'embedded')
      }

      selectTextBox(textBoxId)
      setToolMode('select')
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
      if (line) {
        selectLine(line.id)
      }

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
    } else {
      selectTextBox(null)
    }
  }

  const getResizeHandle = (mouseX: number, mouseY: number, textBox: TextBox): string | null => {
    const screenPos = imageToScreenCoords(textBox.x, textBox.y)
    const screenW = textBox.width * scale
    const screenH = textBox.height * scale
    const handleSize = 12

    const handles = [
      { name: 'nw', x: screenPos.x, y: screenPos.y },
      { name: 'n', x: screenPos.x + screenW / 2, y: screenPos.y },
      { name: 'ne', x: screenPos.x + screenW, y: screenPos.y },
      { name: 'e', x: screenPos.x + screenW, y: screenPos.y + screenH / 2 },
      { name: 'se', x: screenPos.x + screenW, y: screenPos.y + screenH },
      { name: 's', x: screenPos.x + screenW / 2, y: screenPos.y + screenH },
      { name: 'sw', x: screenPos.x, y: screenPos.y + screenH },
      { name: 'w', x: screenPos.x, y: screenPos.y + screenH / 2 },
    ]

    for (const handle of handles) {
      if (
        Math.abs(mouseX - handle.x) <= handleSize / 2 &&
        Math.abs(mouseY - handle.y) <= handleSize / 2
      ) {
        return handle.name
      }
    }
    return null
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

      if (handle.includes('e')) {
        newWidth = Math.max(20, resizeState.startWidth + dx)
      }
      if (handle.includes('w')) {
        newWidth = Math.max(20, resizeState.startWidth - dx)
        newX = resizeState.startTextBoxX + (resizeState.startWidth - newWidth)
      }
      if (handle.includes('s')) {
        newHeight = Math.max(20, resizeState.startHeight + dy)
      }
      if (handle.includes('n')) {
        newHeight = Math.max(20, resizeState.startHeight - dy)
        newY = resizeState.startTextBoxY + (resizeState.startHeight - newHeight)
      }

      updateTextBox(selectedTextBoxId, {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      })
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

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev * 1.2, 5))
  }

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev / 1.2, 0.1))
  }

  const handleFitScreen = () => {
    if (imageRef.current) {
      fitToScreen(imageRef.current.width, imageRef.current.height)
    }
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

  return (
    <div className="lettering-canvas-container">
      <div className="canvas-toolbar">
        <div className="tool-group">
          <button
            className={`tool-btn ${toolMode === 'select' ? 'active' : ''}`}
            onClick={() => setToolMode('select')}
            title="选择工具"
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
          <button
            className={`tool-btn ${toolMode === 'create' ? 'active' : ''}`}
            onClick={() => setToolMode('create')}
            title="创建文字框"
          >
            +T
          </button>
        </div>

        <div className="tool-group">
          <button className="tool-btn" onClick={handleZoomOut} title="缩小">
            <ZoomOut size={16} />
          </button>
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
          <button className="tool-btn" onClick={handleZoomIn} title="放大">
            <ZoomIn size={16} />
          </button>
          <button className="tool-btn" onClick={handleFitScreen} title="适应屏幕">
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
        style={{ cursor: toolMode === 'pan' || isPanning ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
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
