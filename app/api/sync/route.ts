import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import type { StudyPlan } from '@/lib/study-planner-engine'

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

export interface DistractionEntry {
  id: string
  userId: string
  category: DistractionCategory
  note?: string
  intensity: DistractionIntensity
  returnedToStudying: boolean
  timestamp: string
  dateKey: string
  sessionId?: string | null
}

interface FocusSession {
  id: string
  userId: string
  mode: 'focus' | 'break'
  targetDurationSeconds: number
  actualDurationSeconds: number
  startedAt: string
  completedAt: string
  status: 'completed' | 'abandoned' | 'cancelled'
  dateKey: string
}

interface StoredTimerState {
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
}

interface Task {
  id: string
  title: string
  done: boolean
}

interface UserDatabaseRecord {
  sessions: FocusSession[]
  activeTimer: StoredTimerState | null
  tasks: Task[]
  distractions: DistractionEntry[]
  studyPlans: StudyPlan[]
  updatedAt: number
}

// In-memory cache backed by filesystem persistence
const memoryDB: Map<string, UserDatabaseRecord> = new Map()

// Filepath for server-side persistence
const DB_DIR = path.join(process.cwd(), '.data')
const DB_FILE = path.join(DB_DIR, 'focuspulse_database.json')

function loadDatabaseFromFile(): Record<string, UserDatabaseRecord> {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed && typeof parsed === 'object') {
        return parsed
      }
    }
  } catch {
    // Fallback if file read fails
  }
  return {}
}

function persistDatabaseToFile(data: Record<string, UserDatabaseRecord>) {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true })
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch {
    // Memory remains intact
  }
}

// Initialize memory cache from disk
try {
  const diskData = loadDatabaseFromFile()
  for (const [uid, record] of Object.entries(diskData)) {
    if (!record.distractions) record.distractions = []
    if (!record.studyPlans) record.studyPlans = []
    memoryDB.set(uid, record)
  }
} catch {}

function getUserRecord(userId: string): UserDatabaseRecord {
  let record = memoryDB.get(userId)
  if (!record) {
    const diskData = loadDatabaseFromFile()
    if (diskData[userId]) {
      record = diskData[userId]
      if (!record.distractions) record.distractions = []
      if (!record.studyPlans) record.studyPlans = []
      memoryDB.set(userId, record)
    } else {
      record = {
        sessions: [],
        activeTimer: null,
        tasks: [],
        distractions: [],
        studyPlans: [],
        updatedAt: Date.now(),
      }
      memoryDB.set(userId, record)
    }
  }
  if (!record.distractions) record.distractions = []
  if (!record.studyPlans) record.studyPlans = []
  return record
}

function saveUserRecord(userId: string, record: UserDatabaseRecord) {
  record.updatedAt = Date.now()
  memoryDB.set(userId, record)

  // Persist to disk
  try {
    const diskData = loadDatabaseFromFile()
    diskData[userId] = record
    persistDatabaseToFile(diskData)
  } catch {}
}

// GET /api/sync?userId=...
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const userId = searchParams.get('userId') || 'guest'

  const record = getUserRecord(userId)

  return NextResponse.json({
    success: true,
    userId,
    serverTime: Date.now(),
    sessions: record.sessions || [],
    activeTimer: record.activeTimer,
    tasks: record.tasks || [],
    distractions: record.distractions || [],
    studyPlans: record.studyPlans || [],
  })
}

// POST /api/sync
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId = 'guest',
      action,
      activeTimer,
      newSession,
      sessions,
      tasks,
      newDistraction,
      distractions,
      deleteDistractionId,
      newStudyPlan,
      updateStudyPlan,
      deleteStudyPlanId,
      studyPlans,
    } = body

    const record = getUserRecord(userId)

    // 1. If new session was logged or completed, prepend to sessions
    if (newSession && typeof newSession === 'object' && newSession.id) {
      if (!record.sessions.some((s) => s.id === newSession.id)) {
        record.sessions = [newSession, ...record.sessions]
      }
    }

    // 2. If full sessions array provided, merge without duplicates
    if (Array.isArray(sessions)) {
      const map = new Map<string, FocusSession>()
      for (const s of record.sessions) {
        if (s && s.id) map.set(s.id, s)
      }
      for (const s of sessions) {
        if (s && s.id) map.set(s.id, s)
      }
      record.sessions = Array.from(map.values()).sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      )
    }

    // 3. Update active timer state
    if (activeTimer !== undefined) {
      record.activeTimer = activeTimer
    }

    // 4. Update tasks if provided
    if (Array.isArray(tasks)) {
      record.tasks = tasks
    }

    // 5. If new distraction was logged, prepend
    if (newDistraction && typeof newDistraction === 'object' && newDistraction.id) {
      if (!record.distractions.some((d) => d.id === newDistraction.id)) {
        record.distractions = [newDistraction, ...record.distractions]
      }
    }

    // 6. Delete distraction
    if (deleteDistractionId) {
      record.distractions = record.distractions.filter((d) => d.id !== deleteDistractionId)
    }

    // 7. Full distractions array sync
    if (Array.isArray(distractions)) {
      const map = new Map<string, DistractionEntry>()
      for (const d of record.distractions) {
        if (d && d.id) map.set(d.id, d)
      }
      for (const d of distractions) {
        if (d && d.id) map.set(d.id, d)
      }
      record.distractions = Array.from(map.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    }

    // 8. Study Plans: new study plan
    if (newStudyPlan && typeof newStudyPlan === 'object' && newStudyPlan.id) {
      const idx = record.studyPlans.findIndex((p) => p.id === newStudyPlan.id)
      if (idx >= 0) {
        record.studyPlans[idx] = newStudyPlan
      } else {
        record.studyPlans = [newStudyPlan, ...record.studyPlans]
      }
    }

    // 9. Study Plans: update existing plan
    if (updateStudyPlan && typeof updateStudyPlan === 'object' && updateStudyPlan.id) {
      record.studyPlans = record.studyPlans.map((p) =>
        p.id === updateStudyPlan.id ? { ...p, ...updateStudyPlan } : p
      )
    }

    // 10. Study Plans: delete plan
    if (deleteStudyPlanId) {
      record.studyPlans = record.studyPlans.filter((p) => p.id !== deleteStudyPlanId)
    }

    // 11. Study Plans: full array sync
    if (Array.isArray(studyPlans)) {
      record.studyPlans = studyPlans
    }

    // Save to server database
    saveUserRecord(userId, record)

    return NextResponse.json({
      success: true,
      userId,
      serverTime: Date.now(),
      action: action || 'sync',
      sessions: record.sessions,
      activeTimer: record.activeTimer,
      tasks: record.tasks,
      distractions: record.distractions,
      studyPlans: record.studyPlans,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to sync with server database'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
