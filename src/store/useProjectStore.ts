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
  updateDialogueLine: (id: string, updates: Partial<DialogueLine>) => void
  removeDialogueLine: (id: string) => void
  setDialogueStatus: (id: string, status: LineStatus) => void
  selectLine: (id: string | null) => void
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

  selectLine: (id) => set({ selectedLineId: id }),

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

  reorderLines: (pageIndex, lineIds) =>
    set((state) => ({
      dialogueLines: state.dialogueLines.map((l) => {
        if (l.pageIndex !== pageIndex) return l
        const newOrder = lineIds.indexOf(l.id)
        return newOrder >= 0 ? { ...l, order: newOrder } : l
      }),
    })),
}))
