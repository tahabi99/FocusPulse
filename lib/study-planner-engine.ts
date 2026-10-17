export type Priority = 'high' | 'medium' | 'low'

export interface Subject {
  id: string
  name: string
  color: string
  accentColor: string
  targetHoursPerWeek: number
  priority: Priority
  iconName?: string
}

export interface ExamDeadline {
  id: string
  subjectId: string
  title: string
  dueDate: string // YYYY-MM-DD
  targetGrade?: string
  estimatedHoursNeeded: number
  completedHours: number
  notes?: string
}

export interface PlannedStudyBlock {
  id: string
  subjectId: string
  dayOfWeek: number // 0 = Sun, 1 = Mon, ..., 6 = Sat
  startTime: string // "09:00"
  durationMinutes: number // 25, 50, 90
  topic: string
  pomodoroCount: number
  completed: boolean
}

export interface StudyPlan {
  subjects: Subject[]
  deadlines: ExamDeadline[]
  schedule: PlannedStudyBlock[]
  weeklyTargetHours: number
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'flexible'
  lastOptimized?: string
}

export interface StudentPersonalizationProfile {
  studentName: string
  field: string
  primaryGoal: string
  availableHoursPerDay: number
  preferredTime: 'morning' | 'afternoon' | 'evening' | 'flexible'
  sessionDuration: number
  studyDays: number[]
  isPersonalized: boolean
  personalizedAdvice?: string
  lastUpdated?: string
}

export const SUBJECT_COLOR_OPTIONS = [
  {
    id: 'blue',
    label: 'Blue',
    color: 'from-blue-500 to-indigo-600',
    accentColor: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
  },
  {
    id: 'purple',
    label: 'Purple',
    color: 'from-purple-500 to-pink-600',
    accentColor: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    color: 'from-emerald-500 to-teal-600',
    accentColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
  },
  {
    id: 'amber',
    label: 'Amber',
    color: 'from-amber-500 to-orange-600',
    accentColor: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  },
  {
    id: 'rose',
    label: 'Rose',
    color: 'from-rose-500 to-pink-600',
    accentColor: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
  },
  {
    id: 'cyan',
    label: 'Cyan',
    color: 'from-cyan-500 to-blue-600',
    accentColor: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30',
  },
  {
    id: 'violet',
    label: 'Violet',
    color: 'from-violet-500 to-purple-600',
    accentColor: 'text-violet-500 bg-violet-500/10 border-violet-500/30',
  },
]

export interface PlanPreset {
  id: string
  name: string
  description: string
  field: string
  defaultGoal: string
  subjects: Subject[]
  deadlines: ExamDeadline[]
}

export const PLAN_PRESETS: PlanPreset[] = [
  {
    id: 'premed',
    name: 'Pre-Med & Healthcare',
    description: 'Dense memorization, biochemical pathways, and high-yield question banks.',
    field: 'Pre-Medicine & Biological Sciences',
    defaultGoal: 'Master MCAT/board concepts & excel in pre-med coursework',
    subjects: [
      {
        id: 'sub_anat',
        name: 'Human Anatomy & Physiology',
        color: 'from-rose-500 to-pink-600',
        accentColor: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
        targetHoursPerWeek: 8,
        priority: 'high',
        iconName: 'Activity',
      },
      {
        id: 'sub_ochem',
        name: 'Organic Chemistry II',
        color: 'from-purple-500 to-indigo-600',
        accentColor: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
        targetHoursPerWeek: 7,
        priority: 'high',
        iconName: 'Atom',
      },
      {
        id: 'sub_biochem',
        name: 'Cellular Biochemistry',
        color: 'from-emerald-500 to-teal-600',
        accentColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
        targetHoursPerWeek: 5,
        priority: 'medium',
        iconName: 'Dna',
      },
      {
        id: 'sub_stats',
        name: 'Biostatistics & Epidemiology',
        color: 'from-blue-500 to-cyan-600',
        accentColor: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
        targetHoursPerWeek: 3,
        priority: 'low',
        iconName: 'BarChart2',
      },
    ],
    deadlines: [
      {
        id: 'dl_ochem_exam',
        subjectId: 'sub_ochem',
        title: 'Synthesis & Reaction Mechanisms Exam',
        dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        targetGrade: 'A',
        estimatedHoursNeeded: 14,
        completedHours: 5,
        notes: 'Carboxylic acid derivatives & enolate chemistry',
      },
      {
        id: 'dl_anat_practical',
        subjectId: 'sub_anat',
        title: 'Cardiovascular & Renal Lab Practical',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        targetGrade: 'A',
        estimatedHoursNeeded: 12,
        completedHours: 4,
        notes: 'Histology slides & anatomical model identification',
      },
    ],
  },
  {
    id: 'engineering',
    name: 'Computer Science & Software',
    description: 'Deep coding blocks, algorithmic reasoning, and systems design.',
    field: 'Computer Science & Engineering',
    defaultGoal: 'Ace algorithms exam & build technical portfolio',
    subjects: [
      {
        id: 'sub_algo',
        name: 'Algorithms & Data Structures',
        color: 'from-purple-500 to-pink-600',
        accentColor: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
        targetHoursPerWeek: 8,
        priority: 'high',
        iconName: 'Code',
      },
      {
        id: 'sub_sys',
        name: 'Operating Systems & Concurrency',
        color: 'from-blue-500 to-indigo-600',
        accentColor: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
        targetHoursPerWeek: 6,
        priority: 'high',
        iconName: 'Cpu',
      },
      {
        id: 'sub_calc',
        name: 'Linear Algebra & Discrete Math',
        color: 'from-emerald-500 to-teal-600',
        accentColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
        targetHoursPerWeek: 5,
        priority: 'medium',
        iconName: 'Calculator',
      },
      {
        id: 'sub_ai',
        name: 'Machine Learning Fundamentals',
        color: 'from-amber-500 to-orange-600',
        accentColor: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
        targetHoursPerWeek: 4,
        priority: 'medium',
        iconName: 'Brain',
      },
    ],
    deadlines: [
      {
        id: 'dl_algo_midterm',
        subjectId: 'sub_algo',
        title: 'Midterm: Graph Traversal & Dynamic Programming',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        targetGrade: 'A',
        estimatedHoursNeeded: 15,
        completedHours: 6,
        notes: 'Dijkstra, Bellman-Ford, and Knapsack variants',
      },
      {
        id: 'dl_os_kernel',
        subjectId: 'sub_sys',
        title: 'Multithreading & Semaphore Kernel Project',
        dueDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        targetGrade: 'A+',
        estimatedHoursNeeded: 16,
        completedHours: 4,
        notes: 'Implement reader-writer lock without starvation',
      },
    ],
  },
  {
    id: 'business',
    name: 'Business, Finance & Econ',
    description: 'Financial valuation, macroeconomic policy, and case study defense.',
    field: 'Finance, Economics & Management',
    defaultGoal: 'Master quantitative analysis and financial modeling',
    subjects: [
      {
        id: 'sub_fin',
        name: 'Corporate Finance & Valuation',
        color: 'from-emerald-500 to-teal-600',
        accentColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
        targetHoursPerWeek: 7,
        priority: 'high',
        iconName: 'TrendingUp',
      },
      {
        id: 'sub_econ',
        name: 'Macroeconomics & Monetary Policy',
        color: 'from-blue-500 to-indigo-600',
        accentColor: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
        targetHoursPerWeek: 5,
        priority: 'high',
        iconName: 'Globe',
      },
      {
        id: 'sub_acct',
        name: 'Financial Accounting & Reporting',
        color: 'from-purple-500 to-pink-600',
        accentColor: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
        targetHoursPerWeek: 5,
        priority: 'medium',
        iconName: 'FileSpreadsheet',
      },
      {
        id: 'sub_strat',
        name: 'Strategic Management',
        color: 'from-amber-500 to-orange-600',
        accentColor: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
        targetHoursPerWeek: 3,
        priority: 'low',
        iconName: 'Target',
      },
    ],
    deadlines: [
      {
        id: 'dl_fin_model',
        subjectId: 'sub_fin',
        title: 'Discounted Cash Flow (DCF) Valuation Model',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        targetGrade: 'A',
        estimatedHoursNeeded: 10,
        completedHours: 3.5,
        notes: 'WACC sensitivity table and terminal value projection',
      },
    ],
  },
  {
    id: 'law',
    name: 'Law, Humanities & Arts',
    description: 'Case briefs, constitutional doctrine, philosophy, and critical analysis.',
    field: 'Law, Philosophy & Humanities',
    defaultGoal: 'Refine legal writing and excel in doctrinal exams',
    subjects: [
      {
        id: 'sub_conlaw',
        name: 'Constitutional Law & Doctrine',
        color: 'from-amber-500 to-orange-600',
        accentColor: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
        targetHoursPerWeek: 7,
        priority: 'high',
        iconName: 'Shield',
      },
      {
        id: 'sub_writing',
        name: 'Legal Research & Analysis',
        color: 'from-purple-500 to-pink-600',
        accentColor: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
        targetHoursPerWeek: 6,
        priority: 'high',
        iconName: 'Feather',
      },
      {
        id: 'sub_torts',
        name: 'Torts & Civil Liability',
        color: 'from-rose-500 to-pink-600',
        accentColor: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
        targetHoursPerWeek: 5,
        priority: 'medium',
        iconName: 'Book',
      },
      {
        id: 'sub_ethics',
        name: 'Jurisprudence & Ethics',
        color: 'from-cyan-500 to-blue-600',
        accentColor: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30',
        targetHoursPerWeek: 3,
        priority: 'low',
        iconName: 'Scale',
      },
    ],
    deadlines: [
      {
        id: 'dl_conlaw_brief',
        subjectId: 'sub_conlaw',
        title: 'Appellate Moot Court Brief Submission',
        dueDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        targetGrade: 'A',
        estimatedHoursNeeded: 16,
        completedHours: 5,
        notes: 'Substantive due process & equal protection scrutiny',
      },
    ],
  },
  {
    id: 'highschool',
    name: 'High School & AP Honors',
    description: 'AP Calculus, Chemistry, Literature, and US History prep.',
    field: 'High School / AP Prep',
    defaultGoal: 'Score 5s on AP exams & boost GPA',
    subjects: [
      {
        id: 'sub_ap_calc',
        name: 'AP Calculus BC',
        color: 'from-blue-500 to-indigo-600',
        accentColor: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
        targetHoursPerWeek: 6,
        priority: 'high',
        iconName: 'Calculator',
      },
      {
        id: 'sub_ap_chem',
        name: 'AP Chemistry',
        color: 'from-emerald-500 to-teal-600',
        accentColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
        targetHoursPerWeek: 6,
        priority: 'high',
        iconName: 'FlaskConical',
      },
      {
        id: 'sub_ap_ush',
        name: 'AP US History',
        color: 'from-amber-500 to-orange-600',
        accentColor: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
        targetHoursPerWeek: 4,
        priority: 'medium',
        iconName: 'History',
      },
      {
        id: 'sub_ap_lit',
        name: 'AP English Literature',
        color: 'from-purple-500 to-pink-600',
        accentColor: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
        targetHoursPerWeek: 3,
        priority: 'low',
        iconName: 'BookOpen',
      },
    ],
    deadlines: [
      {
        id: 'dl_ap_chem_mock',
        subjectId: 'sub_ap_chem',
        title: 'Full AP Chemistry Practice Exam',
        dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        targetGrade: '5',
        estimatedHoursNeeded: 8,
        completedHours: 2,
        notes: 'Thermodynamics, Equilibrium, and Acid-Base titration',
      },
    ],
  },
]

export const DEFAULT_SUBJECTS: Subject[] = []
export const DEFAULT_DEADLINES: ExamDeadline[] = []
export const DEFAULT_SCHEDULE: PlannedStudyBlock[] = []

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export function calculateDaysRemaining(dueDateStr: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dueDateStr)
  target.setHours(0, 0, 0, 0)
  const diffTime = target.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function calculateReadiness(deadline: ExamDeadline): {
  progressPct: number
  status: 'on_track' | 'needs_attention' | 'urgent' | 'completed'
  remainingHours: number
  recommendedHoursPerDay: number
} {
  const remainingHours = Math.max(0, deadline.estimatedHoursNeeded - deadline.completedHours)
  const progressPct =
    deadline.estimatedHoursNeeded > 0
      ? Math.min(100, Math.round((deadline.completedHours / deadline.estimatedHoursNeeded) * 100))
      : 100

  if (progressPct >= 100) {
    return {
      progressPct: 100,
      status: 'completed',
      remainingHours: 0,
      recommendedHoursPerDay: 0,
    }
  }

  const daysLeft = calculateDaysRemaining(deadline.dueDate)

  if (daysLeft <= 0) {
    return {
      progressPct,
      status: 'urgent',
      remainingHours,
      recommendedHoursPerDay: remainingHours,
    }
  }

  const recommendedHoursPerDay = Number((remainingHours / daysLeft).toFixed(1))

  let status: 'on_track' | 'needs_attention' | 'urgent' = 'on_track'
  if (daysLeft <= 2 && progressPct < 60) {
    status = 'urgent'
  } else if (recommendedHoursPerDay > 3 || (daysLeft <= 5 && progressPct < 40)) {
    status = 'needs_attention'
  }

  return {
    progressPct,
    status,
    remainingHours,
    recommendedHoursPerDay,
  }
}

export function generateSmartStudySchedule(
  subjects: Subject[],
  deadlines: ExamDeadline[],
  preferredTime: 'morning' | 'afternoon' | 'evening' | 'flexible' = 'morning'
): PlannedStudyBlock[] {
  const blocks: PlannedStudyBlock[] = []
  let blockIdCounter = 1

  const timeMap = {
    morning: ['08:30', '10:00', '11:30'],
    afternoon: ['13:30', '15:00', '16:30'],
    evening: ['18:00', '19:30', '21:00'],
    flexible: ['09:30', '14:00', '18:30'],
  }[preferredTime]

  // Sort subjects by priority and upcoming deadlines
  const sortedSubjects = [...subjects].sort((a, b) => {
    const priorityVal = { high: 3, medium: 2, low: 1 }
    return priorityVal[b.priority] - priorityVal[a.priority]
  })

  // Spread across Monday (1) to Saturday (6)
  const studyDays = [1, 2, 3, 4, 5, 6]

  studyDays.forEach((day) => {
    // 2 blocks per day
    const firstSubject = sortedSubjects[(day * 2) % sortedSubjects.length]
    const secondSubject = sortedSubjects[(day * 2 + 1) % sortedSubjects.length]

    // Find relevant deadline topic if any
    const relatedDeadline1 = deadlines.find((d) => d.subjectId === firstSubject.id)
    const relatedDeadline2 = deadlines.find((d) => d.subjectId === secondSubject.id)

    blocks.push({
      id: `smart_blk_${blockIdCounter++}`,
      subjectId: firstSubject.id,
      dayOfWeek: day,
      startTime: timeMap[0],
      durationMinutes: 50,
      topic: relatedDeadline1 ? `Prep for: ${relatedDeadline1.title}` : `Core Concepts & Practice`,
      pomodoroCount: 2,
      completed: false,
    })

    blocks.push({
      id: `smart_blk_${blockIdCounter++}`,
      subjectId: secondSubject.id,
      dayOfWeek: day,
      startTime: timeMap[1],
      durationMinutes: 50,
      topic: relatedDeadline2 ? `Review for: ${relatedDeadline2.title}` : `Exercises & Active Recall`,
      pomodoroCount: 2,
      completed: false,
    })
  })

  return blocks
}

export function calculateWeeklyStudyStats(
  schedule: PlannedStudyBlock[],
  subjects: Subject[]
): {
  totalScheduledMinutes: number
  totalScheduledHours: number
  completedMinutes: number
  completedHours: number
  subjectDistribution: { subject: Subject; minutes: number; hours: number; percentage: number }[]
} {
  let totalScheduledMinutes = 0
  let completedMinutes = 0
  const subjectMinutesMap: Record<string, number> = {}

  for (const blk of schedule) {
    totalScheduledMinutes += blk.durationMinutes
    if (blk.completed) completedMinutes += blk.durationMinutes
    subjectMinutesMap[blk.subjectId] =
      (subjectMinutesMap[blk.subjectId] || 0) + blk.durationMinutes
  }

  const subjectDistribution = subjects.map((sub) => {
    const minutes = subjectMinutesMap[sub.id] || 0
    return {
      subject: sub,
      minutes,
      hours: Number((minutes / 60).toFixed(1)),
      percentage:
        totalScheduledMinutes > 0 ? Math.round((minutes / totalScheduledMinutes) * 100) : 0,
    }
  })

  return {
    totalScheduledMinutes,
    totalScheduledHours: Number((totalScheduledMinutes / 60).toFixed(1)),
    completedMinutes,
    completedHours: Number((completedMinutes / 60).toFixed(1)),
    subjectDistribution,
  }
}
