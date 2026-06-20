import { ProjectState } from '../types'

const RECENT_KEY = 'lettering_workbench:recent_projects'
const BACKUP_KEY = 'lettering_workbench:last_backup'
const MAX_RECENT = 8

export interface RecentProject {
  name: string
  path: string | null
  pageCount: number
  lineCount: number
  lastOpen: number
  thumb?: string
}

export const getRecentProjects = (): RecentProject[] => {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as RecentProject[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export const addRecentProject = (
  project: Pick<RecentProject, 'name' | 'path' | 'pageCount' | 'lineCount' | 'thumb'>
): void => {
  try {
    const list = getRecentProjects()
    const existing = list.findIndex(
      (r) => (project.path && r.path === project.path) || r.name === project.name
    )
    const newEntry: RecentProject = {
      ...project,
      lastOpen: Date.now(),
    }
    if (existing >= 0) {
      list[existing] = newEntry
    } else {
      list.unshift(newEntry)
    }
    list.sort((a, b) => b.lastOpen - a.lastOpen)
    const trimmed = list.slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed))
  } catch {
    /* ignore */
  }
}

export const removeRecentProject = (nameOrPath: string): void => {
  try {
    const list = getRecentProjects().filter(
      (r) => (r.path && r.path === nameOrPath) || r.name === nameOrPath
    )
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export const clearRecentProjects = (): void => {
  try {
    localStorage.removeItem(RECENT_KEY)
  } catch {
    /* ignore */
  }
}

export const getLastBackup = (): ProjectState | null => {
  try {
    const raw = localStorage.getItem(BACKUP_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ProjectState
  } catch {
    return null
  }
}

export const saveBackup = (state: ProjectState): void => {
  try {
    const data = JSON.stringify(state)
    localStorage.setItem(BACKUP_KEY, data)
    localStorage.setItem(`${BACKUP_KEY}_time`, String(Date.now()))
  } catch {
    /* ignore quota errors */
  }
}

export const getLastBackupTime = (): number => {
  try {
    const raw = localStorage.getItem(`${BACKUP_KEY}_time`)
    return raw ? parseInt(raw, 10) : 0
  } catch {
    return 0
  }
}

export const clearBackup = (): void => {
  try {
    localStorage.removeItem(BACKUP_KEY)
    localStorage.removeItem(`${BACKUP_KEY}_time`)
  } catch {
    /* ignore */
  }
}
