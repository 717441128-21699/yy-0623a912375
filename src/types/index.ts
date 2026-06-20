export type LineStatus = 'unembedded' | 'embedded' | 'needs_rework'

export interface TextBoxStyle {
  fontFamily: string
  fontSize: number
  lineHeight: number
  isVertical: boolean
  strokeWidth: number
  strokeColor: string
  fillColor: string
  bold: boolean
  italic: boolean
}

export interface TextBox {
  id: string
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
  text: string
  style: TextBoxStyle
}

export interface DialogueLine {
  id: string
  pageIndex: number
  order: number
  text: string
  status: LineStatus
  textBoxId: string | null
}

export interface Page {
  index: number
  imageDataUrl: string
  imagePath: string
  fileName: string
}

export interface ProjectState {
  pages: Page[]
  currentPageIndex: number
  dialogueLines: DialogueLine[]
  textBoxes: TextBox[]
  selectedLineId: string | null
  selectedTextBoxId: string | null
  projectPath: string | null
  projectName: string
  defaultStyle: TextBoxStyle
}
