import { create } from 'zustand'
import { ProjectState, Page, DialogueLine, TextBox, LineStatus, TextBoxStyle } from '../types'

const generateId = () => Math.random().toString(36).slice(2, 11)

const defaultStyle: TextBoxStyle = {
  fontFamily: 'Microsoft YaHei',
  fontSize: 18,
  lineHeight: 1.4,
  isVertical: false,
  strokeWidth: 2,
  strokeColor: '#000000',
  fillColor: '#ffffff',
  bold: true,
  italic: false,
}

export const useProjectStore = create<ProjectState & {
  addPages: (images: { path: string; dataUrl: string; fileName: string }[]) => void
  setCurrentPage: (index: number) => void
  removePage: (index: number) => void
  addDialogueLine: (pageIndex: number, text: string) => void
  addDialogueLines: (pageIndex: number, texts: string[]) => void
  addDialogueLinesMultiPage: (pagesTexts: { pageIndex: number; texts: string[] }[]) => void
  updateDialogueLine: (id: string, updates: Partial<DialogueLine>) => void
  removeDialogueLine: (id: string) => void
  setDialogueStatus: (id: string, status: LineStatus) => void
  selectLine: (id: string | null) => void
  selectNextPendingLine: () => void
  selectNextLine: () => void
  selectPrevLine: () => void
  moveLinesToPage: (fromPageIndex: number, toPageIndex: number) => void
  addTextBox: (textBox: Omit<TextBox, 'id'>) => string
  updateTextBox: (id: string, updates: Partial<TextBox>) => void
  removeTextBox: (id: string) => void
  selectTextBox: (id: string | null) => void
  setDefaultStyle: (style: Partial<TextBoxStyle>) => void
  setProjectName: (name: string) => void
  setProjectPath: (path: string | null) => void
  clearProject: () => void
  loadProject: (state: ProjectState) => void
  getCurrentPageLines: () => DialogueLine[]
  getCurrentPageTextBoxes: () => TextBox[]
  getPageStats: (pageIndex: number) => { total: number; unembedded: number; embedded: number; needs_rework: number }
  getAllPageStats: () => Array<{ pageIndex: number; total: number; unembedded: number; embedded: number; needs_rework: number }>
  findNeedsReworkLine: (fromPageIndex?: number, fromOrder?: number) => { pageIndex: number; lineId: string } | null
  reorderLines: (pageIndex: number, lineIds: string[]) => void
}>((set, get) => ({
  pages: [],
  currentPageIndex: 0,
  dialogueLines: [],
  textBoxes: [],
  selectedLineId: null,
  selectedTextBoxId: null,
  projectPath: null,
  projectName: '未命名项目',
  defaultStyle,

  addPages: (images) =>
    set((state) => {
      const startIndex = state.pages.length
      const newPages: Page[] = images.map((img, i) => ({
        index: startIndex + i,
        imageDataUrl: img.dataUrl,
        imagePath: img.path,
        fileName: img.fileName,
      }))
      return { pages: [...state.pages, ...newPages] }
    }),

  setCurrentPage: (index) => set({ currentPageIndex: index, selectedLineId: null, selectedTextBoxId: null }),

  removePage: (index) =>
    set((state) => {
      const newPages = state.pages.filter((_, i) => i !== index).map((p, i) => ({ ...p, index: i }))
      const newLines = state.dialogueLines
        .filter((l) => l.pageIndex !== index)
        .map((l) => ({ ...l, pageIndex: l.pageIndex > index ? l.pageIndex - 1 : l.pageIndex }))
      const newTextBoxes = state.textBoxes
        .filter((t) => t.pageIndex !== index)
        .map((t) => ({ ...t, pageIndex: t.pageIndex > index ? t.pageIndex - 1 : t.pageIndex }))
      const newCurrentIndex = Math.min(state.currentPageIndex, Math.max(0, newPages.length - 1))
      return {
        pages: newPages,
        dialogueLines: newLines,
        textBoxes: newTextBoxes,
        currentPageIndex: newCurrentIndex,
      }
    }),

  addDialogueLine: (pageIndex, text) =>
    set((state) => {
      const pageLines = state.dialogueLines.filter((l) => l.pageIndex === pageIndex)
      const newLine: DialogueLine = {
        id: generateId(),
        pageIndex,
        order: pageLines.length,
        text,
        status: 'unembedded',
        textBoxId: null,
      }
      return { dialogueLines: [...state.dialogueLines, newLine] }
    }),

  addDialogueLines: (pageIndex, texts) =>
    set((state) => {
      const pageLines = state.dialogueLines.filter((l) => l.pageIndex === pageIndex)
      const newLines: DialogueLine[] = texts.map((text, i) => ({
        id: generateId(),
        pageIndex,
        order: pageLines.length + i,
        text,
        status: 'unembedded',
        textBoxId: null,
      }))
      return { dialogueLines: [...state.dialogueLines, ...newLines] }
    }),

  addDialogueLinesMultiPage: (pagesTexts) =>
    set((state) => {
      const allNewLines: DialogueLine[] = []
      pagesTexts.forEach(({ pageIndex, texts }) => {
        const pageLines = state.dialogueLines.filter((l) => l.pageIndex === pageIndex).length
          + allNewLines.filter((l) => l.pageIndex === pageIndex).length
        texts.forEach((text, i) => {
          allNewLines.push({
            id: generateId(),
            pageIndex,
            order: pageLines + i,
            text,
            status: 'unembedded',
            textBoxId: null,
          })
        })
      })
      return { dialogueLines: [...state.dialogueLines, ...allNewLines] }
    }),

  updateDialogueLine: (id, updates) =>
    set((state) => ({
      dialogueLines: state.dialogueLines.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })),

  removeDialogueLine: (id) =>
    set((state) => {
      const line = state.dialogueLines.find((l) => l.id === id)
      const newLines = state.dialogueLines
        .filter((l) => l.id !== id)
        .map((l) =>
          l.pageIndex === line?.pageIndex && l.order > line.order
            ? { ...l, order: l.order - 1 }
            : l
        )
      const textBoxId = line?.textBoxId
      const newTextBoxes = textBoxId
        ? state.textBoxes.filter((t) => t.id !== textBoxId)
        : state.textBoxes
      return { dialogueLines: newLines, textBoxes: newTextBoxes }
    }),

  setDialogueStatus: (id, status) =>
    set((state) => ({
      dialogueLines: state.dialogueLines.map((l) => (l.id === id ? { ...l, status } : l)),
    })),

  selectLine: (id) => set((state) => {
    const line = state.dialogueLines.find((l) => l.id === id)
    return {
      selectedLineId: id,
      selectedTextBoxId: line?.textBoxId || null,
    }
  }),

  selectNextPendingLine: () =>
    set((state) => {
      const currentPageLines = state.dialogueLines
        .filter((l) => l.pageIndex === state.currentPageIndex)
        .sort((a, b) => a.order - b.order)

      const currentIdx = currentPageLines.findIndex((l) => l.id === state.selectedLineId)
      const searchStart = currentIdx >= 0 ? currentIdx + 1 : 0

      for (let i = searchStart; i < currentPageLines.length; i++) {
        if (currentPageLines[i].status === 'unembedded' || currentPageLines[i].status === 'needs_rework') {
          const nextLine = currentPageLines[i]
          return {
            selectedLineId: nextLine.id,
            selectedTextBoxId: nextLine.textBoxId || null,
          }
        }
      }

      for (let i = 0; i < searchStart; i++) {
        if (currentPageLines[i].status === 'unembedded' || currentPageLines[i].status === 'needs_rework') {
          const nextLine = currentPageLines[i]
          return {
            selectedLineId: nextLine.id,
            selectedTextBoxId: nextLine.textBoxId || null,
          }
        }
      }

      return {}
    }),

  selectNextLine: () =>
    set((state) => {
      const currentPageLines = state.dialogueLines
        .filter((l) => l.pageIndex === state.currentPageIndex)
        .sort((a, b) => a.order - b.order)

      const currentIdx = currentPageLines.findIndex((l) => l.id === state.selectedLineId)
      if (currentIdx < 0 || currentIdx >= currentPageLines.length - 1) return {}
      const nextLine = currentPageLines[currentIdx + 1]
      return {
        selectedLineId: nextLine.id,
        selectedTextBoxId: nextLine.textBoxId || null,
      }
    }),

  selectPrevLine: () =>
    set((state) => {
      const currentPageLines = state.dialogueLines
        .filter((l) => l.pageIndex === state.currentPageIndex)
        .sort((a, b) => a.order - b.order)

      const currentIdx = currentPageLines.findIndex((l) => l.id === state.selectedLineId)
      if (currentIdx <= 0) return {}
      const prevLine = currentPageLines[currentIdx - 1]
      return {
        selectedLineId: prevLine.id,
        selectedTextBoxId: prevLine.textBoxId || null,
      }
    }),

  moveLinesToPage: (fromPageIndex, toPageIndex) =>
    set((state) => {
      if (toPageIndex < 0 || toPageIndex >= state.pages.length) return state
      const linesToMove = state.dialogueLines.filter((l) => l.pageIndex === fromPageIndex)
      if (linesToMove.length === 0) return state

      const existingTargetLines = state.dialogueLines.filter((l) => l.pageIndex === toPageIndex)
      const maxOrder = existingTargetLines.length > 0
        ? Math.max(...existingTargetLines.map((l) => l.order)) + 1
        : 0

      const movedLines = linesToMove.map((l, i) => ({
        ...l,
        pageIndex: toPageIndex,
        order: maxOrder + i,
      }))

      const movedLineIds = new Set(movedLines.map((l) => l.id))
      const remainingLines = state.dialogueLines
        .filter((l) => !movedLineIds.has(l.id))
        .map((l) => {
          if (l.pageIndex !== fromPageIndex) return l
          return { ...l }
        })

      const movedTextBoxIds = new Set(
        movedLines.filter((l) => l.textBoxId).map((l) => l.textBoxId!)
      )
      const movedTextBoxes = state.textBoxes
        .filter((t) => movedTextBoxIds.has(t.id))
        .map((t) => ({ ...t, pageIndex: toPageIndex }))

      const otherTextBoxes = state.textBoxes.filter((t) => !movedTextBoxIds.has(t.id))

      return {
        dialogueLines: [...remainingLines, ...movedLines],
        textBoxes: [...otherTextBoxes, ...movedTextBoxes],
      }
    }),

  addTextBox: (textBox) => {
    const id = generateId()
    set((state) => ({
      textBoxes: [...state.textBoxes, { ...textBox, id }],
    }))
    return id
  },

  updateTextBox: (id, updates) =>
    set((state) => ({
      textBoxes: state.textBoxes.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  removeTextBox: (id) =>
    set((state) => {
      const newLines = state.dialogueLines.map((l) =>
        l.textBoxId === id ? { ...l, textBoxId: null, status: 'unembedded' as LineStatus } : l
      )
      return {
        textBoxes: state.textBoxes.filter((t) => t.id !== id),
        dialogueLines: newLines,
        selectedTextBoxId: state.selectedTextBoxId === id ? null : state.selectedTextBoxId,
      }
    }),

  selectTextBox: (id) => set({ selectedTextBoxId: id }),

  setDefaultStyle: (style) =>
    set((state) => ({
      defaultStyle: { ...state.defaultStyle, ...style },
    })),

  setProjectName: (name) => set({ projectName: name }),

  setProjectPath: (path) => set({ projectPath: path }),

  clearProject: () =>
    set({
      pages: [],
      currentPageIndex: 0,
      dialogueLines: [],
      textBoxes: [],
      selectedLineId: null,
      selectedTextBoxId: null,
      projectPath: null,
      projectName: '未命名项目',
    }),

  loadProject: (state) => set(state),

  getCurrentPageLines: () => {
    const state = get()
    return state.dialogueLines
      .filter((l) => l.pageIndex === state.currentPageIndex)
      .sort((a, b) => a.order - b.order)
  },

  getCurrentPageTextBoxes: () => {
    const state = get()
    return state.textBoxes.filter((t) => t.pageIndex === state.currentPageIndex)
  },

  getPageStats: (pageIndex) => {
    const state = get()
    const lines = state.dialogueLines.filter((l) => l.pageIndex === pageIndex)
    return {
      total: lines.length,
      unembedded: lines.filter((l) => l.status === 'unembedded').length,
      embedded: lines.filter((l) => l.status === 'embedded').length,
      needs_rework: lines.filter((l) => l.status === 'needs_rework').length,
    }
  },

  getAllPageStats: () => {
    const state = get()
    return state.pages.map((p) => {
      const lines = state.dialogueLines.filter((l) => l.pageIndex === p.index)
      return {
        pageIndex: p.index,
        total: lines.length,
        unembedded: lines.filter((l) => l.status === 'unembedded').length,
        embedded: lines.filter((l) => l.status === 'embedded').length,
        needs_rework: lines.filter((l) => l.status === 'needs_rework').length,
      }
    })
  },

  findNeedsReworkLine: (fromPageIndex, fromOrder) => {
    const state = get()
    const startPage = fromPageIndex ?? 0
    const startOrder = fromOrder ?? -1

    for (let p = startPage; p < state.pages.length; p++) {
      const pageLines = state.dialogueLines
        .filter((l) => l.pageIndex === p && l.status === 'needs_rework')
        .sort((a, b) => a.order - b.order)
      const found = p === startPage
        ? pageLines.find((l) => l.order > startOrder)
        : pageLines[0]
      if (found) return { pageIndex: p, lineId: found.id }
    }

    for (let p = 0; p <= startPage; p++) {
      const pageLines = state.dialogueLines
        .filter((l) => l.pageIndex === p && l.status === 'needs_rework')
        .sort((a, b) => a.order - b.order)
      if (pageLines.length > 0) return { pageIndex: p, lineId: pageLines[0].id }
    }

    return null
  },

  reorderLines: (pageIndex, lineIds) =>
    set((state) => ({
      dialogueLines: state.dialogueLines.map((l) => {
        if (l.pageIndex !== pageIndex) return l
        const newOrder = lineIds.indexOf(l.id)
        return newOrder >= 0 ? { ...l, order: newOrder } : l
      }),
    })),
}))
