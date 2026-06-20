import { Page, TextBox, TextBoxStyle } from '../types'

export const renderPageToDataUrl = (page: Page, textBoxes: TextBox[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('无法创建 canvas 上下文'))
        return
      }

      ctx.drawImage(img, 0, 0)

      const pageTextBoxes = textBoxes.filter((t) => t.pageIndex === page.index)
      pageTextBoxes.forEach((textBox) => {
        ctx.save()
        ctx.beginPath()
        ctx.rect(textBox.x, textBox.y, textBox.width, textBox.height)
        ctx.clip()
        drawText(ctx, textBox.text, textBox.x, textBox.y, textBox.width, textBox.height, textBox.style)
        ctx.restore()
      })

      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      reject(new Error('图片加载失败'))
    }
    img.src = page.imageDataUrl
  })
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
  ctx.textAlign = 'left'

  const colWidth = fontSize * lineHeight
  const safeFontSize = Math.max(1, fontSize)
  const maxRows = Math.max(1, Math.floor(height / safeFontSize))
  const maxCols = Math.max(1, Math.floor(width / colWidth))

  const chars = text.replace(/\n/g, '').split('')
  const colsNeeded = Math.max(1, Math.ceil(chars.length / maxRows))
  const actualCols = Math.min(colsNeeded, maxCols)
  const totalWidth = actualCols * colWidth

  const contentStartX = x + (width - totalWidth) / 2
  const contentStartY = y

  let col = 0
  let row = 0

  for (const char of chars) {
    if (row >= maxRows) {
      row = 0
      col++
    }
    if (col >= actualCols) break

    const colXFromRight = actualCols - 1 - col
    const charX = contentStartX + colXFromRight * colWidth + (colWidth - safeFontSize) / 2
    const charY = contentStartY + row * safeFontSize

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
