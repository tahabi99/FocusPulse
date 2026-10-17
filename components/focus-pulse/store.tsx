'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  type StudyPlan,
  type ScheduledStudyTask,
  type SyllabusChapter,
  type StudyPreferences,
  type RescheduleResult,
  reschedulePlanTasks,
} from '@/lib/study-planner-engine'

export type {
  StudyPlan,
  ScheduledStudyTask,
  SyllabusChapter,
  StudyPreferences,
  RescheduleResult,
}

export type Task = { id: string; title: string; done: boolean }

export type UserAccount = {
  id: string
  name: string
  email: string
  title: string
  avatarColor: string
  createdAt: string
  password?: string
}

export type FocusSession = {
  id: string
  userId: string
  mode: 'focus' | 'break'
  targetDurationSeconds: number
  actualDurationSeconds: number // actual active focus elapsed seconds (excluding pause intervals)
  startedAt: string // ISO string
  completedAt: string // ISO string
  status: 'completed' | 'abandoned' | 'cancelled'
  dateKey: string // YYYY-MM-DD local timezone
}

export type DistractionCategory =
  | 'Phone / Social Media'
  | 'Notifications'
  | 'Noise / Environment'
  | 'Tiredness / Sleepiness'
  | 'Random Thoughts'
  | 'Hunger / Thirst'
  | 'Someone Interrupted Me'
  | 'Other'

export type DistractionIntensity = 'Low' | 'Medium' | 'High'

export type DistractionEntry = {
  id: string
  userId: string
  category: DistractionCategory
  note?: string
  intensity: DistractionIntensity
  returnedToStudying: boolean
  timestamp: string // ISO string
  dateKey: string // YYYY-MM-DD local timezone
  sessionId?: string | null // associated active focus session ID if available
}

export type StoredTimerState = {
  userId: string
  mode: 'focus' | 'break'
  focusMin: number
  breakMin: number
  targetSeconds: number
  sessionStartTime: number | null
  segmentStartTime: number | null
  accumulatedElapsed: number
  running: boolean
  lastUpdated: number
  currentSessionId?: string | null
}

const ACCOUNTS_STORAGE_KEY = 'focuspulse:accounts'
const CURRENT_USER_ID_KEY = 'focuspulse:current_user_id'

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false
  const t = value as Record<string, unknown>
  return typeof t.id === 'string' && typeof t.title === 'string' && typeof t.done === 'boolean'
}

function isFocusSession(value: unknown): value is FocusSession {
  if (!value || typeof value !== 'object') return false
  const s = value as Record<string, unknown>
  return (
    typeof s.id === 'string' &&
    typeof s.userId === 'string' &&
    (s.mode === 'focus' || s.mode === 'break') &&
    typeof s.targetDurationSeconds === 'number' &&
    typeof s.actualDurationSeconds === 'number' &&
    typeof s.completedAt === 'string'
  )
}

function isDistractionEntry(value: unknown): value is DistractionEntry {
  if (!value || typeof value !== 'object') return false
  const d = value as Record<string, unknown>
  return (
    typeof d.id === 'string' &&
    typeof d.userId === 'string' &&
    typeof d.category === 'string' &&
    typeof d.intensity === 'string' &&
    typeof d.returnedToStudying === 'boolean' &&
    typeof d.timestamp === 'string'
  )
}

export const DAILY_GOAL_MINUTES = 180
export const STREAK_THRESHOLD_MINUTES = 15

export function dateKey(date: Date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function daysAgo(n: number, base: Date = new Date()) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - n, 0, 0, 0, 0)
  return d
}

export function formatSecondsDetailed(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hrs = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}

export function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

type FocusPulseState = {
  currentUser: UserAccount | null
  accounts: UserAccount[]
  sessions: FocusSession[]
  history: Record<string, number>
  tasks: Task[]
  distractions: DistractionEntry[]

  // Real-time dynamic stats
  sessionsToday: number
  todayMinutes: number
  todayTotalSeconds: number
  streak: number
  completionRate: number

  // Distraction Journal dynamic metrics
  todayDistractionCount: number
  weeklyDistractionCount: number
  topDistractionCategory: string | null
  currentSessionId: string | null

  // Live Timer State (synchronized globally across all tabs and views)
  timerMode: 'focus' | 'break'
  timerRunning: boolean
  remainingSeconds: number
  activeElapsedSeconds: number
  focusMin: number
  breakMin: number
  targetSeconds: number

  // Timer Actions
  startTimer: () => void
  pauseTimer: () => void
  toggleTimer: () => void
  resetTimer: () => void
  logCurrentSession: () => void
  setTimerMode: (m: 'focus' | 'break') => void
  setTimerDuration: (m: 'focus' | 'break', minutes: number) => void

  // Distraction Journal Actions
  addDistraction: (data: {
    category: DistractionCategory
    note?: string
    intensity: DistractionIntensity
    returnedToStudying: boolean
  }) => DistractionEntry
  updateDistraction: (id: string, updates: Partial<Omit<DistractionEntry, 'id' | 'userId'>>) => void
  deleteDistraction: (id: string) => void

  // Adaptive Study Planner State & Actions
  studyPlans: StudyPlan[]
  activePlanId: string | null
  activeStudyTask: ScheduledStudyTask | null
  setActivePlanId: (id: string | null) => void
  saveStudyPlan: (plan: StudyPlan) => void
  updateStudyPlan: (id: string, updates: Partial<StudyPlan>) => void
  deleteStudyPlan: (id: string) => void
  completeScheduledTask: (planId: string, taskId: string) => void
  skipScheduledTask: (planId: string, taskId: string) => void
  postponeScheduledTask: (planId: string, taskId: string) => void
  editScheduledTask: (planId: string, taskId: string, updates: Partial<ScheduledStudyTask>) => void
  addUnscheduledTask: (
    planId: string,
    taskData: Omit<ScheduledStudyTask, 'id' | 'planId' | 'status' | 'orderInDay'>
  ) => void
  reschedulePlan: (
    planId: string,
    newPreferences?: Partial<StudyPreferences>
  ) => RescheduleResult | null
  startFocusForTask: (task: ScheduledStudyTask) => void
  clearActiveStudyTask: () => void

  // User & Data Actions
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>
  signup: (name: string, email: string, password?: string, title?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  switchAccount: (userId: string) => void
  updateProfile: (name: string, title: string) => void
  recordCompletedSession: (session: FocusSession) => void
  deleteSession: (id: string) => void
  addFocusMinutes: (minutes: number) => void
  addTask: (title: string) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
}

const FocusPulseContext = createContext<FocusPulseState | null>(null)

export function FocusPulseProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Real user data states
  const [sessions, setSessions] = useState<FocusSession[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [distractions, setDistractions] = useState<DistractionEntry[]>([])
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([])
  const [activePlanId, setActivePlanId] = useState<string | null>(null)
  const [activeStudyTask, setActiveStudyTask] = useState<ScheduledStudyTask | null>(null)
  const activeStudyTaskRef = useRef<ScheduledStudyTask | null>(null)
  activeStudyTaskRef.current = activeStudyTask

  // Global Timer States
  const [timerMode, setTimerModeState] = useState<'focus' | 'break'>('focus')
  const [focusMin, setFocusMin] = useState(25)
  const [breakMin, setBreakMin] = useState(5)
  const [timerRunning, setTimerRunning] = useState(false)
  const [activeElapsedSeconds, setActiveElapsedSeconds] = useState(0)
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  // Timer refs for high precision timestamp calculations
  const sessionStartTimeRef = useRef<number | null>(null)
  const segmentStartTimeRef = useRef<number | null>(null)
  const accumulatedElapsedRef = useRef<number>(0)
  const targetSecondsRef = useRef<number>(25 * 60)
  const timerModeRef = useRef<'focus' | 'break'>('focus')
  timerModeRef.current = timerMode
  const focusMinRef = useRef(focusMin)
  focusMinRef.current = focusMin
  const breakMinRef = useRef(breakMin)
  breakMinRef.current = breakMin
  const currentSessionIdRef = useRef<string | null>(null)
  currentSessionIdRef.current = currentSessionId
  const lastServerSyncRef = useRef<number>(0)

  // Storage key helpers
  const timerStorageKey = useMemo(
    () => `focuspulse:timer:${currentUserId || 'guest'}`,
    [currentUserId]
  )
  const sessionsStorageKey = useMemo(
    () => `focuspulse:sessions:${currentUserId || 'guest'}`,
    [currentUserId]
  )
  const tasksStorageKey = useMemo(
    () => `focuspulse:tasks:${currentUserId || 'guest'}`,
    [currentUserId]
  )
  const distractionsStorageKey = useMemo(
    () => `focuspulse:distractions:${currentUserId || 'guest'}`,
    [currentUserId]
  )
  const studyPlansStorageKey = useMemo(
    () => `focuspulse:study_plans:${currentUserId || 'guest'}`,
    [currentUserId]
  )

  // 1. Initial Load: Load accounts and restore authenticated user session
  useEffect(() => {
    try {
      const storedAccounts = localStorage.getItem(ACCOUNTS_STORAGE_KEY)
      let parsedAccounts: UserAccount[] = []
      if (storedAccounts) {
        const raw = JSON.parse(storedAccounts)
        if (Array.isArray(raw)) {
          parsedAccounts = raw.filter(
            (a: UserAccount) =>
              !a.id?.startsWith('u_alex') &&
              !a.id?.startsWith('u_maya') &&
              !a.id?.startsWith('u_liam') &&
              !a.email?.includes('study.edu') &&
              !a.email?.includes('med.edu') &&
              !a.email?.includes('tech.io')
          )
          setAccounts(parsedAccounts)
          localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(parsedAccounts))
        }
      }

      const activeId = localStorage.getItem(CURRENT_USER_ID_KEY)
      if (activeId && parsedAccounts.some((a) => a.id === activeId)) {
        setCurrentUserId(activeId)
      } else {
        setCurrentUserId(null)
        localStorage.removeItem(CURRENT_USER_ID_KEY)
      }
    } catch {
      // Storage unavailable
    } finally {
      setInitialized(true)
    }
  }, [])

  // Helper to persist current active timer state
  const persistActiveTimer = useCallback(
    (isRunning: boolean) => {
      try {
        const state: StoredTimerState = {
          userId: currentUserId || 'guest',
          mode: timerModeRef.current,
          focusMin: focusMinRef.current,
          breakMin: breakMinRef.current,
          targetSeconds: targetSecondsRef.current,
          sessionStartTime: sessionStartTimeRef.current,
          segmentStartTime: segmentStartTimeRef.current,
          accumulatedElapsed: accumulatedElapsedRef.current,
          running: isRunning,
          lastUpdated: Date.now(),
          currentSessionId: currentSessionIdRef.current,
        }
        localStorage.setItem(timerStorageKey, JSON.stringify(state))

        // Synchronize with server database every 4 seconds or on state change
        const now = Date.now()
        if (!isRunning || now - lastServerSyncRef.current > 4000) {
          lastServerSyncRef.current = now
          void fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUserId || 'guest',
              action: isRunning ? 'heartbeat' : 'pause',
              activeTimer: state,
            }),
          }).catch(() => {})
        }
      } catch {}
    },
    [currentUserId, timerStorageKey]
  )

  const clearPersistedTimer = useCallback(() => {
    try {
      localStorage.removeItem(timerStorageKey)
      void fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId || 'guest',
          action: 'clear_timer',
          activeTimer: null,
        }),
      }).catch(() => {})
    } catch {}
  }, [currentUserId, timerStorageKey])

  // Helper to record a completed session and synchronize to server database
  const recordCompletedSession = useCallback(
    (newSession: FocusSession) => {
      setSessions((prev) => {
        if (prev.some((s) => s.id === newSession.id)) return prev
        const updated = [newSession, ...prev]
        try {
          localStorage.setItem(sessionsStorageKey, JSON.stringify(updated))
        } catch {}

        void fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId || 'guest',
            action: 'save_session',
            newSession,
            sessions: updated,
          }),
        }).catch(() => {})

        return updated
      })

      // If a study task was active during this focus session, update its logged focus minutes!
      if (activeStudyTaskRef.current) {
        const curTask = activeStudyTaskRef.current
        const sessionMins = Math.max(1, Math.round(newSession.actualDurationSeconds / 60))

        setStudyPlans((prevPlans) => {
          const nextPlans = prevPlans.map((plan) => {
            if (plan.id !== curTask.planId) return plan

            const updatedTasks = plan.tasks.map((task) => {
              if (task.id === curTask.id) {
                return {
                  ...task,
                  focusMinutesLogged: (task.focusMinutesLogged || 0) + sessionMins,
                  status: task.status === 'pending' ? ('in_progress' as const) : task.status,
                }
              }
              return task
            })

            const updatedChapters = plan.chapters.map((chap) => {
              if (chap.id === curTask.chapterId) {
                return {
                  ...chap,
                  completedMinutes: (chap.completedMinutes || 0) + sessionMins,
                  status: chap.status === 'Not Started' ? ('In Progress' as const) : chap.status,
                }
              }
              return chap
            })

            return {
              ...plan,
              tasks: updatedTasks,
              chapters: updatedChapters,
              updatedAt: new Date().toISOString(),
            }
          })

          try {
            localStorage.setItem(studyPlansStorageKey, JSON.stringify(nextPlans))
          } catch {}

          void fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUserId || 'guest',
              action: 'update_study_plans',
              studyPlans: nextPlans,
            }),
          }).catch(() => {})

          return nextPlans
        })
      }
    },
    [currentUserId, sessionsStorageKey, studyPlansStorageKey]
  )

  // 2. Load user-specific sessions, tasks, distractions, study plans, and RESTORE active timer state
  useEffect(() => {
    if (!currentUserId) {
      setSessions([])
      setTasks([])
      setDistractions([])
      setStudyPlans([])
      setActivePlanId(null)
      setActiveStudyTask(null)
      return
    }

    try {
      // Load user study plans locally
      const rawPlans = localStorage.getItem(studyPlansStorageKey)
      if (rawPlans) {
        try {
          const parsed = JSON.parse(rawPlans)
          if (Array.isArray(parsed)) {
            setStudyPlans(parsed)
            if (parsed.length > 0) setActivePlanId(parsed[0].id)
          } else {
            setStudyPlans([])
          }
        } catch {
          setStudyPlans([])
        }
      } else {
        setStudyPlans([])
      }

      // Load user sessions locally
      const rawSessions = localStorage.getItem(sessionsStorageKey)
      if (rawSessions) {
        const parsed = JSON.parse(rawSessions)
        if (Array.isArray(parsed)) {
          setSessions(parsed.filter(isFocusSession))
        } else {
          setSessions([])
        }
      } else {
        setSessions([])
      }

      // Load user distractions locally
      const rawDistractions = localStorage.getItem(distractionsStorageKey)
      if (rawDistractions) {
        const parsed = JSON.parse(rawDistractions)
        if (Array.isArray(parsed)) {
          setDistractions(parsed.filter(isDistractionEntry))
        } else {
          setDistractions([])
        }
      } else {
        setDistractions([])
      }

      // Load user tasks locally
      const rawTasks = localStorage.getItem(tasksStorageKey)
      if (rawTasks) {
        const parsed = JSON.parse(rawTasks)
        if (Array.isArray(parsed)) setTasks(parsed.filter(isTask))
      } else {
        const starterTasks: Task[] = [
          { id: crypto.randomUUID(), title: 'Complete first Pomodoro focus session', done: false },
          { id: crypto.randomUUID(), title: 'Log any distractions in your Distraction Journal', done: false },
          { id: crypto.randomUUID(), title: 'Explore ambient soundscapes & Quran recitation', done: false },
        ]
        setTasks(starterTasks)
        localStorage.setItem(tasksStorageKey, JSON.stringify(starterTasks))
      }

      // RESTORE active timer state
      const rawTimer = localStorage.getItem(timerStorageKey)
      if (rawTimer) {
        const saved: StoredTimerState = JSON.parse(rawTimer)
        if (saved && saved.targetSeconds > 0) {
          setTimerModeState(saved.mode)
          timerModeRef.current = saved.mode
          setFocusMin(saved.focusMin)
          focusMinRef.current = saved.focusMin
          setBreakMin(saved.breakMin)
          breakMinRef.current = saved.breakMin
          targetSecondsRef.current = saved.targetSeconds
          sessionStartTimeRef.current = saved.sessionStartTime
          accumulatedElapsedRef.current = saved.accumulatedElapsed
          if (saved.currentSessionId) {
            setCurrentSessionId(saved.currentSessionId)
            currentSessionIdRef.current = saved.currentSessionId
          }

          if (saved.running && saved.segmentStartTime) {
            const elapsedInSegment = Math.max(0, Math.floor((Date.now() - saved.segmentStartTime) / 1000))
            const totalElapsed = saved.accumulatedElapsed + elapsedInSegment

            if (totalElapsed >= saved.targetSeconds) {
              if (saved.mode === 'focus') {
                const now = new Date()
                const started = new Date(saved.sessionStartTime || now.getTime() - saved.targetSeconds * 1000)
                recordCompletedSession({
                  id: saved.currentSessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  userId: currentUserId,
                  mode: 'focus',
                  targetDurationSeconds: saved.targetSeconds,
                  actualDurationSeconds: saved.targetSeconds,
                  startedAt: started.toISOString(),
                  completedAt: now.toISOString(),
                  status: 'completed',
                  dateKey: dateKey(now),
                })
              }
              accumulatedElapsedRef.current = 0
              sessionStartTimeRef.current = null
              segmentStartTimeRef.current = null
              setCurrentSessionId(null)
              currentSessionIdRef.current = null
              setActiveElapsedSeconds(0)
              setTimerRunning(false)
              setTimerModeState('break')
              timerModeRef.current = 'break'
              const breakTarget = saved.breakMin * 60
              targetSecondsRef.current = breakTarget
              setRemainingSeconds(breakTarget)
              clearPersistedTimer()
            } else {
              segmentStartTimeRef.current = saved.segmentStartTime
              setActiveElapsedSeconds(totalElapsed)
              setRemainingSeconds(saved.targetSeconds - totalElapsed)
              setTimerRunning(true)
            }
          } else {
            segmentStartTimeRef.current = null
            setActiveElapsedSeconds(saved.accumulatedElapsed)
            setRemainingSeconds(Math.max(0, saved.targetSeconds - saved.accumulatedElapsed))
            setTimerRunning(false)
          }
        }
      }
    } catch {
      // Memory fallback
    }

    // Server-Side Real-Time Sync on mount / account switch
    let active = true
    fetch(`/api/sync?userId=${encodeURIComponent(currentUserId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return
        if (Array.isArray(data.sessions) && data.sessions.length > 0) {
          setSessions((prev) => {
            const map = new Map<string, FocusSession>()
            for (const s of prev) if (s && s.id) map.set(s.id, s)
            for (const s of data.sessions) if (s && s.id) map.set(s.id, s)
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
            )
            try {
              localStorage.setItem(sessionsStorageKey, JSON.stringify(merged))
            } catch {}
            return merged
          })
        }
        if (Array.isArray(data.distractions) && data.distractions.length > 0) {
          setDistractions((prev) => {
            const map = new Map<string, DistractionEntry>()
            for (const d of prev) if (d && d.id) map.set(d.id, d)
            for (const d of data.distractions) if (d && d.id) map.set(d.id, d)
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )
            try {
              localStorage.setItem(distractionsStorageKey, JSON.stringify(merged))
            } catch {}
            return merged
          })
        }
        if (Array.isArray(data.studyPlans) && data.studyPlans.length > 0) {
          setStudyPlans((prev) => {
            const map = new Map<string, StudyPlan>()
            for (const p of prev) if (p && p.id) map.set(p.id, p)
            for (const p of data.studyPlans) if (p && p.id) map.set(p.id, p)
            const merged = Array.from(map.values())
            try {
              localStorage.setItem(studyPlansStorageKey, JSON.stringify(merged))
            } catch {}
            setActivePlanId((cur) => cur || (merged.length > 0 ? merged[0].id : null))
            return merged
          })
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [currentUserId, sessionsStorageKey, tasksStorageKey, timerStorageKey, distractionsStorageKey, recordCompletedSession, clearPersistedTimer])

  // Real-Time Global Timer Ticking Engine
  useEffect(() => {
    if (!timerRunning) return

    const tick = () => {
      if (!segmentStartTimeRef.current) return
      const now = Date.now()
      const segmentSeconds = Math.max(0, Math.floor((now - segmentStartTimeRef.current) / 1000))
      const totalElapsed = accumulatedElapsedRef.current + segmentSeconds
      const target = targetSecondsRef.current
      const left = Math.max(0, target - totalElapsed)

      setActiveElapsedSeconds(totalElapsed)
      setRemainingSeconds(left)

      persistActiveTimer(true)

      // Session finished
      if (left <= 0) {
        setTimerRunning(false)
        segmentStartTimeRef.current = null
        accumulatedElapsedRef.current = 0
        clearPersistedTimer()

        if (timerModeRef.current === 'focus') {
          const finishedAt = new Date()
          const startedAt = sessionStartTimeRef.current
            ? new Date(sessionStartTimeRef.current)
            : new Date(finishedAt.getTime() - totalElapsed * 1000)

          recordCompletedSession({
            id: currentSessionIdRef.current || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            userId: currentUserId || 'guest',
            mode: 'focus',
            targetDurationSeconds: target,
            actualDurationSeconds: Math.max(1, totalElapsed),
            startedAt: startedAt.toISOString(),
            completedAt: finishedAt.toISOString(),
            status: 'completed',
            dateKey: dateKey(finishedAt),
          })

          sessionStartTimeRef.current = null
          setCurrentSessionId(null)
          currentSessionIdRef.current = null
          setTimerModeState('break')
          timerModeRef.current = 'break'
          const breakTarget = breakMinRef.current * 60
          targetSecondsRef.current = breakTarget
          setRemainingSeconds(breakTarget)
          setActiveElapsedSeconds(0)
        } else {
          sessionStartTimeRef.current = null
          setCurrentSessionId(null)
          currentSessionIdRef.current = null
          setTimerModeState('focus')
          timerModeRef.current = 'focus'
          const focusTarget = focusMinRef.current * 60
          targetSecondsRef.current = focusTarget
          setRemainingSeconds(focusTarget)
          setActiveElapsedSeconds(0)
        }
      }
    }

    const intervalId = setInterval(tick, 200)
    document.addEventListener('visibilitychange', tick)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [timerRunning, currentUserId, recordCompletedSession, clearPersistedTimer, persistActiveTimer])

  // Timer Control: Start
  const startTimer = useCallback(() => {
    const now = Date.now()
    if (sessionStartTimeRef.current === null) {
      sessionStartTimeRef.current = now
    }
    if (!currentSessionIdRef.current) {
      const newSid = `sess_${now}_${Math.random().toString(36).substring(2, 7)}`
      setCurrentSessionId(newSid)
      currentSessionIdRef.current = newSid
    }
    segmentStartTimeRef.current = now
    setTimerRunning(true)
    persistActiveTimer(true)
  }, [persistActiveTimer])

  // Timer Control: Pause
  const pauseTimer = useCallback(() => {
    if (segmentStartTimeRef.current) {
      const segmentSeconds = Math.max(0, Math.floor((Date.now() - segmentStartTimeRef.current) / 1000))
      accumulatedElapsedRef.current += segmentSeconds
      segmentStartTimeRef.current = null
    }
    setTimerRunning(false)
    persistActiveTimer(false)
  }, [persistActiveTimer])

  // Timer Control: Toggle
  const toggleTimer = useCallback(() => {
    if (timerRunning) {
      pauseTimer()
    } else {
      startTimer()
    }
  }, [timerRunning, startTimer, pauseTimer])

  // CRITICAL RESET BUTTON: preserves focusing time in analytics & database
  const resetTimer = useCallback(() => {
    const now = Date.now()
    const segmentSeconds = segmentStartTimeRef.current
      ? Math.max(0, Math.floor((now - segmentStartTimeRef.current) / 1000))
      : 0
    const totalActive = accumulatedElapsedRef.current + segmentSeconds

    if (totalActive > 0 && timerModeRef.current === 'focus') {
      const finishedAt = new Date()
      const startedAt = sessionStartTimeRef.current
        ? new Date(sessionStartTimeRef.current)
        : new Date(finishedAt.getTime() - totalActive * 1000)

      recordCompletedSession({
        id: currentSessionIdRef.current || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUserId || 'guest',
        mode: 'focus',
        targetDurationSeconds: targetSecondsRef.current,
        actualDurationSeconds: totalActive,
        startedAt: startedAt.toISOString(),
        completedAt: finishedAt.toISOString(),
        status: 'completed',
        dateKey: dateKey(finishedAt),
      })
    }

    setTimerRunning(false)
    sessionStartTimeRef.current = null
    segmentStartTimeRef.current = null
    accumulatedElapsedRef.current = 0
    setCurrentSessionId(null)
    currentSessionIdRef.current = null
    clearPersistedTimer()
    setActiveElapsedSeconds(0)

    const target = (timerModeRef.current === 'focus' ? focusMinRef.current : breakMinRef.current) * 60
    targetSecondsRef.current = target
    setRemainingSeconds(target)
  }, [clearPersistedTimer, currentUserId, recordCompletedSession])

  // Finish & Log Session Immediately
  const logCurrentSession = useCallback(() => {
    const now = Date.now()
    const segmentSeconds = segmentStartTimeRef.current
      ? Math.max(0, Math.floor((now - segmentStartTimeRef.current) / 1000))
      : 0
    const totalElapsed = accumulatedElapsedRef.current + segmentSeconds

    if (totalElapsed > 0 && timerModeRef.current === 'focus') {
      const finishedAt = new Date()
      const startedAt = sessionStartTimeRef.current
        ? new Date(sessionStartTimeRef.current)
        : new Date(finishedAt.getTime() - totalElapsed * 1000)

      recordCompletedSession({
        id: currentSessionIdRef.current || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUserId || 'guest',
        mode: 'focus',
        targetDurationSeconds: targetSecondsRef.current,
        actualDurationSeconds: totalElapsed,
        startedAt: startedAt.toISOString(),
        completedAt: finishedAt.toISOString(),
        status: 'completed',
        dateKey: dateKey(finishedAt),
      })
    }

    setTimerRunning(false)
    sessionStartTimeRef.current = null
    segmentStartTimeRef.current = null
    accumulatedElapsedRef.current = 0
    setCurrentSessionId(null)
    currentSessionIdRef.current = null
    clearPersistedTimer()
    setActiveElapsedSeconds(0)
    const target = (timerModeRef.current === 'focus' ? focusMinRef.current : breakMinRef.current) * 60
    targetSecondsRef.current = target
    setRemainingSeconds(target)
  }, [clearPersistedTimer, currentUserId, recordCompletedSession])

  // Timer Mode Switcher
  const setTimerMode = useCallback(
    (m: 'focus' | 'break') => {
      const now = Date.now()
      const segmentSeconds = segmentStartTimeRef.current
        ? Math.max(0, Math.floor((now - segmentStartTimeRef.current) / 1000))
        : 0
      const totalActive = accumulatedElapsedRef.current + segmentSeconds

      if (totalActive > 0 && timerModeRef.current === 'focus') {
        const finishedAt = new Date()
        const startedAt = sessionStartTimeRef.current
          ? new Date(sessionStartTimeRef.current)
          : new Date(finishedAt.getTime() - totalActive * 1000)

        recordCompletedSession({
          id: currentSessionIdRef.current || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: currentUserId || 'guest',
          mode: 'focus',
          targetDurationSeconds: targetSecondsRef.current,
          actualDurationSeconds: totalActive,
          startedAt: startedAt.toISOString(),
          completedAt: finishedAt.toISOString(),
          status: 'completed',
          dateKey: dateKey(finishedAt),
        })
      }

      setTimerRunning(false)
      sessionStartTimeRef.current = null
      segmentStartTimeRef.current = null
      accumulatedElapsedRef.current = 0
      setCurrentSessionId(null)
      currentSessionIdRef.current = null
      clearPersistedTimer()
      setActiveElapsedSeconds(0)

      setTimerModeState(m)
      timerModeRef.current = m
      const target = (m === 'focus' ? focusMinRef.current : breakMinRef.current) * 60
      targetSecondsRef.current = target
      setRemainingSeconds(target)
    },
    [clearPersistedTimer, currentUserId, recordCompletedSession]
  )

  // Timer Duration Stepper
  const setTimerDuration = useCallback(
    (m: 'focus' | 'break', minutes: number) => {
      if (timerRunning) return
      if (m === 'focus') {
        setFocusMin(minutes)
        focusMinRef.current = minutes
      } else {
        setBreakMin(minutes)
        breakMinRef.current = minutes
      }
      if (m === timerModeRef.current) {
        const target = minutes * 60
        targetSecondsRef.current = target
        setRemainingSeconds(target)
        accumulatedElapsedRef.current = 0
        setActiveElapsedSeconds(0)
        sessionStartTimeRef.current = null
        segmentStartTimeRef.current = null
        clearPersistedTimer()
      }
    },
    [timerRunning, clearPersistedTimer]
  )

  // -------------------------------------------------------------
  // DISTRACTION JOURNAL ACTIONS
  // -------------------------------------------------------------
  const addDistraction = useCallback(
    (data: {
      category: DistractionCategory
      note?: string
      intensity: DistractionIntensity
      returnedToStudying: boolean
    }) => {
      const now = new Date()
      const newEntry: DistractionEntry = {
        id: `dist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUserId || 'guest',
        category: data.category,
        note: data.note?.trim() || undefined,
        intensity: data.intensity,
        returnedToStudying: data.returnedToStudying,
        timestamp: now.toISOString(),
        dateKey: dateKey(now),
        sessionId: timerRunning && timerMode === 'focus' ? currentSessionIdRef.current : null,
      }

      setDistractions((prev) => {
        const next = [newEntry, ...prev]
        try {
          localStorage.setItem(distractionsStorageKey, JSON.stringify(next))
        } catch {}

        void fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId || 'guest',
            action: 'save_distraction',
            newDistraction: newEntry,
            distractions: next,
          }),
        }).catch(() => {})

        return next
      })

      return newEntry
    },
    [currentUserId, distractionsStorageKey, timerRunning, timerMode]
  )

  const updateDistraction = useCallback(
    (id: string, updates: Partial<Omit<DistractionEntry, 'id' | 'userId'>>) => {
      setDistractions((prev) => {
        const next = prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
        try {
          localStorage.setItem(distractionsStorageKey, JSON.stringify(next))
        } catch {}

        void fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId || 'guest',
            action: 'update_distraction',
            distractions: next,
          }),
        }).catch(() => {})

        return next
      })
    },
    [currentUserId, distractionsStorageKey]
  )

  const deleteDistraction = useCallback(
    (id: string) => {
      setDistractions((prev) => {
        const next = prev.filter((d) => d.id !== id)
        try {
          localStorage.setItem(distractionsStorageKey, JSON.stringify(next))
        } catch {}

        void fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId || 'guest',
            action: 'delete_distraction',
            deleteDistractionId: id,
            distractions: next,
          }),
        }).catch(() => {})

        return next
      })
    },
    [currentUserId, distractionsStorageKey]
  )

  // -------------------------------------------------------------
  // ADAPTIVE STUDY PLANNER ACTIONS
  // -------------------------------------------------------------
  const saveStudyPlan = useCallback(
    (newPlan: StudyPlan) => {
      setStudyPlans((prev) => {
        const next = [newPlan, ...prev.filter((p) => p.id !== newPlan.id)]
        try {
          localStorage.setItem(studyPlansStorageKey, JSON.stringify(next))
        } catch {}

        void fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId || 'guest',
            action: 'save_study_plan',
            newStudyPlan: newPlan,
            studyPlans: next,
          }),
        }).catch(() => {})

        return next
      })
      setActivePlanId(newPlan.id)
    },
    [currentUserId, studyPlansStorageKey]
  )

  const updateStudyPlan = useCallback(
    (id: string, updates: Partial<StudyPlan>) => {
      setStudyPlans((prev) => {
        const next = prev.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        )
        try {
          localStorage.setItem(studyPlansStorageKey, JSON.stringify(next))
        } catch {}

        const updated = next.find((p) => p.id === id)
        if (updated) {
          void fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUserId || 'guest',
              action: 'update_study_plan',
              updateStudyPlan: updated,
              studyPlans: next,
            }),
          }).catch(() => {})
        }

        return next
      })
    },
    [currentUserId, studyPlansStorageKey]
  )

  const deleteStudyPlan = useCallback(
    (id: string) => {
      setStudyPlans((prev) => {
        const next = prev.filter((p) => p.id !== id)
        try {
          localStorage.setItem(studyPlansStorageKey, JSON.stringify(next))
        } catch {}

        void fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId || 'guest',
            action: 'delete_study_plan',
            deleteStudyPlanId: id,
            studyPlans: next,
          }),
        }).catch(() => {})

        return next
      })

      setActivePlanId((cur) => (cur === id ? null : cur))
    },
    [currentUserId, studyPlansStorageKey]
  )

  const completeScheduledTask = useCallback(
    (planId: string, taskId: string) => {
      setStudyPlans((prev) => {
        const next = prev.map((plan) => {
          if (plan.id !== planId) return plan

          const targetTask = plan.tasks.find((t) => t.id === taskId)
          if (!targetTask) return plan

          const nextTasks = plan.tasks.map((t) =>
            t.id === taskId ? { ...t, status: 'completed' as const, completedAt: new Date().toISOString() } : t
          )

          // Check chapter completion status
          const chapterTasks = nextTasks.filter((t) => t.chapterId === targetTask.chapterId)
          const allCompleted = chapterTasks.length > 0 && chapterTasks.every((t) => t.status === 'completed')

          const nextChapters = plan.chapters.map((chap) => {
            if (chap.id === targetTask.chapterId) {
              return {
                ...chap,
                status: allCompleted ? ('Completed' as const) : ('In Progress' as const),
              }
            }
            return chap
          })

          return {
            ...plan,
            tasks: nextTasks,
            chapters: nextChapters,
            updatedAt: new Date().toISOString(),
          }
        })

        try {
          localStorage.setItem(studyPlansStorageKey, JSON.stringify(next))
        } catch {}

        void fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId || 'guest',
            action: 'complete_scheduled_task',
            studyPlans: next,
          }),
        }).catch(() => {})

        return next
      })
    },
    [currentUserId, studyPlansStorageKey]
  )

  const skipScheduledTask = useCallback(
    (planId: string, taskId: string) => {
      setStudyPlans((prev) => {
        const next = prev.map((plan) => {
          if (plan.id !== planId) return plan
          const nextTasks = plan.tasks.map((t) =>
            t.id === taskId ? { ...t, status: 'skipped' as const } : t
          )
          return { ...plan, tasks: nextTasks, updatedAt: new Date().toISOString() }
        })

        try {
          localStorage.setItem(studyPlansStorageKey, JSON.stringify(next))
        } catch {}

        void fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId || 'guest',
            action: 'skip_scheduled_task',
            studyPlans: next,
          }),
        }).catch(() => {})

        return next
      })
    },
    [currentUserId, studyPlansStorageKey]
  )

  const postponeScheduledTask = useCallback(
    (planId: string, taskId: string) => {
      setStudyPlans((prev) => {
        const next = prev.map((plan) => {
          if (plan.id !== planId) return plan
          const nextTasks = plan.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: 'postponed' as const,
                  postponeCount: (t.postponeCount || 0) + 1,
                }
              : t
          )
          return { ...plan, tasks: nextTasks, updatedAt: new Date().toISOString() }
        })

        try {
          localStorage.setItem(studyPlansStorageKey, JSON.stringify(next))
        } catch {}

        void fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId || 'guest',
            action: 'postpone_scheduled_task',
            studyPlans: next,
          }),
        }).catch(() => {})

        return next
      })
    },
    [currentUserId, studyPlansStorageKey]
  )

  const editScheduledTask = useCallback(
    (planId: string, taskId: string, updates: Partial<ScheduledStudyTask>) => {
      setStudyPlans((prev) => {
        const next = prev.map((plan) => {
          if (plan.id !== planId) return plan
          const nextTasks = plan.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
          return { ...plan, tasks: nextTasks, updatedAt: new Date().toISOString() }
        })

        try {
          localStorage.setItem(studyPlansStorageKey, JSON.stringify(next))
        } catch {}

        void fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId || 'guest',
            action: 'edit_scheduled_task',
            studyPlans: next,
          }),
        }).catch(() => {})

        return next
      })
    },
    [currentUserId, studyPlansStorageKey]
  )

  const addUnscheduledTask = useCallback(
    (
      planId: string,
      taskData: Omit<ScheduledStudyTask, 'id' | 'planId' | 'status' | 'orderInDay'>
    ) => {
      setStudyPlans((prev) => {
        const next = prev.map((plan) => {
          if (plan.id !== planId) return plan
          const newTask: ScheduledStudyTask = {
            ...taskData,
            id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            planId,
            status: 'pending',
            postponeCount: 0,
            orderInDay: plan.tasks.length + 1,
          }
          return { ...plan, tasks: [...plan.tasks, newTask], updatedAt: new Date().toISOString() }
        })

        try {
          localStorage.setItem(studyPlansStorageKey, JSON.stringify(next))
        } catch {}

        void fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId || 'guest',
            action: 'add_unscheduled_task',
            studyPlans: next,
          }),
        }).catch(() => {})

        return next
      })
    },
    [currentUserId, studyPlansStorageKey]
  )

  const reschedulePlan = useCallback(
    (planId: string, newPreferences?: Partial<StudyPreferences>): RescheduleResult | null => {
      const plan = studyPlans.find((p) => p.id === planId)
      if (!plan) return null

      const result = reschedulePlanTasks(plan, new Date(), newPreferences)

      setStudyPlans((prev) => {
        const next = prev.map((p) => (p.id === planId ? result.updatedPlan : p))
        try {
          localStorage.setItem(studyPlansStorageKey, JSON.stringify(next))
        } catch {}

        void fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId || 'guest',
            action: 'reschedule_study_plan',
            updateStudyPlan: result.updatedPlan,
            studyPlans: next,
          }),
        }).catch(() => {})

        return next
      })

      return result
    },
    [studyPlans, currentUserId, studyPlansStorageKey]
  )

  const startFocusForTask = useCallback((task: ScheduledStudyTask) => {
    setActiveStudyTask(task)
    setTimerModeState('focus')
    timerModeRef.current = 'focus'
    const mins = Math.max(5, Math.min(90, task.durationMinutes))
    setFocusMin(mins)
    focusMinRef.current = mins
    const target = mins * 60
    targetSecondsRef.current = target
    setRemainingSeconds(target)
    setActiveElapsedSeconds(0)
    sessionStartTimeRef.current = null
    segmentStartTimeRef.current = null
  }, [])

  const clearActiveStudyTask = useCallback(() => {
    setActiveStudyTask(null)
  }, [])

  // Distraction Journal metrics
  const todayKey = dateKey(new Date())
  const weekStart = daysAgo(6)

  const todayDistractionCount = useMemo(() => {
    return distractions.filter((d) => d.dateKey === todayKey).length
  }, [distractions, todayKey])

  const weeklyDistractionCount = useMemo(() => {
    return distractions.filter((d) => new Date(d.timestamp) >= weekStart).length
  }, [distractions, weekStart])

  const topDistractionCategory = useMemo(() => {
    if (distractions.length === 0) return null
    const counts: Record<string, number> = {}
    for (const d of distractions) {
      counts[d.category] = (counts[d.category] || 0) + 1
    }
    let topCat = null
    let max = 0
    for (const [cat, cnt] of Object.entries(counts)) {
      if (cnt > max) {
        max = cnt
        topCat = cat
      }
    }
    return topCat
  }, [distractions])

  const currentUser = useMemo(() => {
    if (!currentUserId) return null
    return accounts.find((a) => a.id === currentUserId) || null
  }, [accounts, currentUserId])

  const persistAccounts = useCallback((newAccounts: UserAccount[]) => {
    setAccounts(newAccounts)
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(newAccounts))
    } catch {}
  }, [])

  // Delete a session locally and on server
  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const updated = prev.filter((s) => s.id !== id)
        try {
          localStorage.setItem(sessionsStorageKey, JSON.stringify(updated))
        } catch {}

        void fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId || 'guest',
            action: 'delete_session',
            sessions: updated,
          }),
        }).catch(() => {})

        return updated
      })
    },
    [currentUserId, sessionsStorageKey]
  )

  // addFocusMinutes for backwards compatibility
  const addFocusMinutes = useCallback(
    (minutes: number) => {
      if (!currentUserId || minutes <= 0) return
      const now = new Date()
      const started = new Date(now.getTime() - minutes * 60 * 1000)
      recordCompletedSession({
        id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUserId,
        mode: 'focus',
        targetDurationSeconds: minutes * 60,
        actualDurationSeconds: minutes * 60,
        startedAt: started.toISOString(),
        completedAt: now.toISOString(),
        status: 'completed',
        dateKey: dateKey(now),
      })
    },
    [currentUserId, recordCompletedSession]
  )

  const userCompletedFocusSessions = useMemo(() => {
    if (!currentUserId) return []
    return sessions.filter((s) => s.userId === currentUserId && s.status === 'completed' && s.mode === 'focus')
  }, [sessions, currentUserId])

  const completedTodaySeconds = useMemo(() => {
    return userCompletedFocusSessions
      .filter((s) => (s.dateKey || dateKey(new Date(s.completedAt))) === todayKey)
      .reduce((sum, s) => sum + s.actualDurationSeconds, 0)
  }, [userCompletedFocusSessions, todayKey])

  const liveActiveFocusSeconds = timerMode === 'focus' ? activeElapsedSeconds : 0
  const todayTotalSeconds = completedTodaySeconds + liveActiveFocusSeconds
  const todayMinutes = Math.floor(todayTotalSeconds / 60)

  const history = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of userCompletedFocusSessions) {
      const dKey = s.dateKey || dateKey(new Date(s.completedAt))
      const minutes = Math.round(s.actualDurationSeconds / 60)
      map[dKey] = (map[dKey] ?? 0) + minutes
    }
    if (todayTotalSeconds > 0) {
      map[todayKey] = Math.max(map[todayKey] ?? 0, Math.floor(todayTotalSeconds / 60))
    }
    return map
  }, [userCompletedFocusSessions, todayTotalSeconds, todayKey])

  const sessionsToday = useMemo(() => {
    return userCompletedFocusSessions.filter(
      (s) => (s.dateKey || dateKey(new Date(s.completedAt))) === todayKey
    ).length
  }, [userCompletedFocusSessions, todayKey])

  const streak = useMemo(() => {
    let count = 0
    const todayMins = history[todayKey] ?? 0
    let offset = todayMins >= STREAK_THRESHOLD_MINUTES ? 0 : 1
    while ((history[dateKey(daysAgo(offset))] ?? 0) >= STREAK_THRESHOLD_MINUTES) {
      count++
      offset++
    }
    return count
  }, [history, todayKey])

  const completionRate = useMemo(() => {
    if (tasks.length === 0) return 0
    const done = tasks.filter((t) => t.done).length
    return Math.round((done / tasks.length) * 100)
  }, [tasks])

  // Auth: Login
  const login = useCallback(
    async (email: string, password?: string) => {
      const cleanEmail = email.trim().toLowerCase()
      const found = accounts.find((a) => a.email.toLowerCase() === cleanEmail)
      if (!found) {
        return { success: false, error: 'No account found with this email. Please check your spelling or sign up.' }
      }
      if (password && found.password && found.password !== password) {
        return { success: false, error: 'Incorrect password. Please try again.' }
      }
      setCurrentUserId(found.id)
      try {
        localStorage.setItem(CURRENT_USER_ID_KEY, found.id)
      } catch {}
      return { success: true }
    },
    [accounts]
  )

  // Auth: Sign up
  const signup = useCallback(
    async (name: string, email: string, password?: string, title?: string) => {
      const cleanEmail = email.trim().toLowerCase()
      if (accounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
        return { success: false, error: 'An account with this email already exists. Please log in.' }
      }

      const colors = [
        'from-purple-500 to-indigo-600',
        'from-emerald-500 to-teal-600',
        'from-amber-500 to-orange-600',
        'from-cyan-500 to-blue-600',
        'from-rose-500 to-pink-600',
      ]
      const randomColor = colors[Math.floor(Math.random() * colors.length)]
      const newUser: UserAccount = {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: name.trim(),
        email: cleanEmail,
        title: title?.trim() || 'Focused Student',
        avatarColor: randomColor,
        createdAt: new Date().toISOString().split('T')[0],
        password: password || '',
      }

      const nextAccounts = [...accounts, newUser]
      persistAccounts(nextAccounts)
      setCurrentUserId(newUser.id)
      try {
        localStorage.setItem(CURRENT_USER_ID_KEY, newUser.id)
      } catch {}
      return { success: true }
    },
    [accounts, persistAccounts]
  )

  // Auth: Log out
  const logout = useCallback(() => {
    setCurrentUserId(null)
    try {
      localStorage.removeItem(CURRENT_USER_ID_KEY)
    } catch {}
  }, [])

  // Auth: Switch Account
  const switchAccount = useCallback((userId: string) => {
    setCurrentUserId(userId)
    try {
      localStorage.setItem(CURRENT_USER_ID_KEY, userId)
    } catch {}
  }, [])

  // Auth: Update Profile
  const updateProfile = useCallback(
    (name: string, title: string) => {
      if (!currentUserId) return
      const updated = accounts.map((a) =>
        a.id === currentUserId ? { ...a, name, title } : a
      )
      persistAccounts(updated)
    },
    [accounts, currentUserId, persistAccounts]
  )

  // Tasks
  const updateTasks = useCallback(
    (updater: (prev: Task[]) => Task[]) => {
      setTasks((prev) => {
        const next = updater(prev)
        if (currentUserId) {
          try {
            localStorage.setItem(tasksStorageKey, JSON.stringify(next))
          } catch {}
          void fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUserId,
              action: 'update_tasks',
              tasks: next,
            }),
          }).catch(() => {})
        }
        return next
      })
    },
    [currentUserId, tasksStorageKey]
  )

  const addTask = useCallback(
    (title: string) => {
      const id = crypto.randomUUID()
      updateTasks((prev) => [...prev, { id, title, done: false }])
    },
    [updateTasks]
  )

  const toggleTask = useCallback(
    (id: string) => {
      updateTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
    },
    [updateTasks]
  )

  const deleteTask = useCallback(
    (id: string) => {
      updateTasks((prev) => prev.filter((t) => t.id !== id))
    },
    [updateTasks]
  )

  const value = useMemo<FocusPulseState>(() => {
    return {
      currentUser,
      accounts,
      sessions,
      history,
      tasks,
      distractions,
      sessionsToday,
      todayMinutes,
      todayTotalSeconds,
      streak,
      completionRate,
      todayDistractionCount,
      weeklyDistractionCount,
      topDistractionCategory,
      currentSessionId,
      timerMode,
      timerRunning,
      remainingSeconds,
      activeElapsedSeconds,
      focusMin,
      breakMin,
      targetSeconds: targetSecondsRef.current,
      startTimer,
      pauseTimer,
      toggleTimer,
      resetTimer,
      logCurrentSession,
      setTimerMode,
      setTimerDuration,
      addDistraction,
      updateDistraction,
      deleteDistraction,

      // Study Planner
      studyPlans,
      activePlanId,
      activeStudyTask,
      setActivePlanId,
      saveStudyPlan,
      updateStudyPlan,
      deleteStudyPlan,
      completeScheduledTask,
      skipScheduledTask,
      postponeScheduledTask,
      editScheduledTask,
      addUnscheduledTask,
      reschedulePlan,
      startFocusForTask,
      clearActiveStudyTask,

      login,
      signup,
      logout,
      switchAccount,
      updateProfile,
      recordCompletedSession,
      deleteSession,
      addFocusMinutes,
      addTask,
      toggleTask,
      deleteTask,
    }
  }, [
    currentUser,
    accounts,
    sessions,
    history,
    tasks,
    distractions,
    studyPlans,
    activePlanId,
    activeStudyTask,
    sessionsToday,
    todayMinutes,
    todayTotalSeconds,
    streak,
    completionRate,
    todayDistractionCount,
    weeklyDistractionCount,
    topDistractionCategory,
    currentSessionId,
    timerMode,
    timerRunning,
    remainingSeconds,
    activeElapsedSeconds,
    focusMin,
    breakMin,
    startTimer,
    pauseTimer,
    toggleTimer,
    resetTimer,
    logCurrentSession,
    setTimerMode,
    setTimerDuration,
    addDistraction,
    updateDistraction,
    deleteDistraction,
    setActivePlanId,
    saveStudyPlan,
    updateStudyPlan,
    deleteStudyPlan,
    completeScheduledTask,
    skipScheduledTask,
    postponeScheduledTask,
    editScheduledTask,
    addUnscheduledTask,
    reschedulePlan,
    startFocusForTask,
    clearActiveStudyTask,
    login,
    signup,
    logout,
    switchAccount,
    updateProfile,
    recordCompletedSession,
    deleteSession,
    addFocusMinutes,
    addTask,
    toggleTask,
    deleteTask,
  ])

  if (!initialized) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return <FocusPulseContext.Provider value={value}>{children}</FocusPulseContext.Provider>
}

export function useFocusPulse() {
  const ctx = useContext(FocusPulseContext)
  if (!ctx) throw new Error('useFocusPulse must be used within FocusPulseProvider')
  return ctx
}
