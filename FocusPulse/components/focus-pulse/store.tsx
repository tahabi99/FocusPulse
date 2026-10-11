'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type Task = { id: string; title: string; done: boolean }

const TASKS_STORAGE_KEY = 'focuspulse:tasks'

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false
  const t = value as Record<string, unknown>
  return typeof t.id === 'string' && typeof t.title === 'string' && typeof t.done === 'boolean'
}

export const DAILY_GOAL_MINUTES = 180
const STREAK_THRESHOLD_MINUTES = 15
const HISTORY_DAYS = 7 * 53

export function dateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function daysAgo(n: number) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d
}

function seededRandom(seed: number) {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function seedHistory(): Record<string, number> {
  const rand = seededRandom(42)
  const history: Record<string, number> = {}
  for (let i = HISTORY_DAYS - 1; i >= 1; i--) {
    const date = daysAgo(i)
    const weekend = date.getDay() === 0 || date.getDay() === 6
    const roll = rand()
    let minutes = 0
    if (roll > (weekend ? 0.45 : 0.18)) {
      minutes = Math.round((30 + rand() * (weekend ? 120 : 210)) / 5) * 5
    }
    history[dateKey(date)] = minutes
  }
  for (let i = 1; i <= 4; i++) {
    history[dateKey(daysAgo(i))] = Math.max(history[dateKey(daysAgo(i))], 60 + i * 20)
  }
  history[dateKey(daysAgo(5))] = 0
  history[dateKey(daysAgo(0))] = 75
  return history
}

const seedTasks: Task[] = [
  { id: 't1', title: 'Review linear algebra chapter 4', done: true },
  { id: 't2', title: 'Finish 20 Spanish flashcards', done: true },
  { id: 't3', title: 'Draft history essay outline', done: false },
  { id: 't4', title: 'Solve 5 physics practice problems', done: false },
]

type FocusPulseState = {
  history: Record<string, number>
  tasks: Task[]
  sessionsToday: number
  todayMinutes: number
  streak: number
  completionRate: number
  addFocusMinutes: (minutes: number) => void
  addTask: (title: string) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
}

const FocusPulseContext = createContext<FocusPulseState | null>(null)

export function FocusPulseProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState(seedHistory)
  const [tasks, setTasks] = useState<Task[]>(seedTasks)
  const [sessionsToday, setSessionsToday] = useState(3)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TASKS_STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) setTasks(parsed.filter(isTask))
      }
    } catch {
      localStorage.removeItem(TASKS_STORAGE_KEY)
    }
  }, [])

  // Persist inside the updater rather than an effect so the initial seed tasks
  // can never overwrite stored tasks before they have been loaded.
  const updateTasks = useCallback((updater: (prev: Task[]) => Task[]) => {
    setTasks((prev) => {
      const next = updater(prev)
      try {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Storage may be full or disabled (e.g. private mode); tasks still work in memory.
      }
      return next
    })
  }, [])

  const addFocusMinutes = useCallback((minutes: number) => {
    const key = dateKey(new Date())
    setHistory((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + minutes }))
    setSessionsToday((n) => n + 1)
  }, [])

  const addTask = useCallback(
    (title: string) => {
      const id = crypto.randomUUID()
      updateTasks((prev) => [...prev, { id, title, done: false }])
    },
    [updateTasks],
  )

  const toggleTask = useCallback(
    (id: string) => {
      updateTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
    },
    [updateTasks],
  )

  const deleteTask = useCallback(
    (id: string) => {
      updateTasks((prev) => prev.filter((t) => t.id !== id))
    },
    [updateTasks],
  )

  const value = useMemo<FocusPulseState>(() => {
    const todayMinutes = history[dateKey(new Date())] ?? 0
    let streak = 0
    let offset = todayMinutes >= STREAK_THRESHOLD_MINUTES ? 0 : 1
    while ((history[dateKey(daysAgo(offset))] ?? 0) >= STREAK_THRESHOLD_MINUTES) {
      streak++
      offset++
    }
    const completionRate = tasks.length
      ? Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100)
      : 0
    return {
      history,
      tasks,
      sessionsToday,
      todayMinutes,
      streak,
      completionRate,
      addFocusMinutes,
      addTask,
      toggleTask,
      deleteTask,
    }
  }, [history, tasks, sessionsToday, addFocusMinutes, addTask, toggleTask, deleteTask])

  return <FocusPulseContext.Provider value={value}>{children}</FocusPulseContext.Provider>
}

export function useFocusPulse() {
  const ctx = useContext(FocusPulseContext)
  if (!ctx) throw new Error('useFocusPulse must be used within FocusPulseProvider')
  return ctx
}

export function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
