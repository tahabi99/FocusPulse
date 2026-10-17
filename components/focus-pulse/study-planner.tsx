'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Flame,
  GraduationCap,
  Layers,
  Lightbulb,
  ListPlus,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  Sparkles,
  Target,
  Trash2,
  User,
  Wand2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusPulse } from './store'
import {
  calculateDaysRemaining,
  calculateReadiness,
  calculateWeeklyStudyStats,
  DAYS_OF_WEEK,
  DAYS_SHORT,
  DEFAULT_DEADLINES,
  DEFAULT_SCHEDULE,
  DEFAULT_SUBJECTS,
  ExamDeadline,
  generateSmartStudySchedule,
  PlannedStudyBlock,
  PLAN_PRESETS,
  PlanPreset,
  Priority,
  StudentPersonalizationProfile,
  Subject,
  SUBJECT_COLOR_OPTIONS,
} from '@/lib/study-planner-engine'

export function StudyPlanner({
  onNavigateToTimer,
}: {
  onNavigateToTimer?: (subjectName?: string, minutes?: number) => void
}) {
  const { currentUser, setTimerDuration, setTimerMode } = useFocusPulse()

  const storageKey = `focuspulse:study_planner:${currentUser?.id || 'guest'}`
  const profileKey = `focuspulse:study_profile:${currentUser?.id || 'guest'}`

  // State: Core Plan Data (Default is strictly empty: 00 and no subject)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [deadlines, setDeadlines] = useState<ExamDeadline[]>([])
  const [schedule, setSchedule] = useState<PlannedStudyBlock[]>([])

  // State: Personalization Profile
  const [profile, setProfile] = useState<StudentPersonalizationProfile>({
    studentName: currentUser?.name?.split(' ')[0] || 'Student',
    field: '',
    primaryGoal: '',
    availableHoursPerDay: 3,
    preferredTime: 'morning',
    sessionDuration: 50,
    studyDays: [1, 2, 3, 4, 5, 6],
    isPersonalized: false,
    personalizedAdvice: undefined,
  })

  // State: Active View & Filters
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'all'>('all')
  const [activeTab, setActiveTab] = useState<'schedule' | 'deadlines' | 'subjects'>('schedule')

  // State: Modals & Feedback
  const [personalizeModalOpen, setPersonalizeModalOpen] = useState(false)
  const [addSubjectModalOpen, setAddSubjectModalOpen] = useState(false)
  const [addBlockModalOpen, setAddBlockModalOpen] = useState(false)
  const [addDeadlineModalOpen, setAddDeadlineModalOpen] = useState(false)
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Personalization Wizard Form State
  const [wizPresetId, setWizPresetId] = useState<string>('custom')
  const [wizStudentName, setWizStudentName] = useState(currentUser?.name?.split(' ')[0] || 'Student')
  const [wizField, setWizField] = useState('')
  const [wizGoal, setWizGoal] = useState('')
  const [wizSubjects, setWizSubjects] = useState<Subject[]>([])
  const [wizHoursPerDay, setWizHoursPerDay] = useState(3)
  const [wizPreferredTime, setWizPreferredTime] = useState<'morning' | 'afternoon' | 'evening' | 'flexible'>('morning')
  const [wizSessionDuration, setWizSessionDuration] = useState<number>(50)
  const [wizStudyDays, setWizStudyDays] = useState<number[]>([1, 2, 3, 4, 5, 6])

  // New Subject Form State
  const [newSubName, setNewSubName] = useState('')
  const [newSubHours, setNewSubHours] = useState(5)
  const [newSubPriority, setNewSubPriority] = useState<Priority>('high')
  const [newSubColorId, setNewSubColorId] = useState('purple')

  // New Study Block Form State
  const [newBlockSubjectId, setNewBlockSubjectId] = useState<string>('')
  const [newBlockDay, setNewBlockDay] = useState<number>(1)
  const [newBlockTime, setNewBlockTime] = useState('10:00')
  const [newBlockDuration, setNewBlockDuration] = useState<number>(50)
  const [newBlockTopic, setNewBlockTopic] = useState('')

  // New Deadline Form State
  const [newDeadlineSubjectId, setNewDeadlineSubjectId] = useState<string>('')
  const [newDeadlineTitle, setNewDeadlineTitle] = useState('')
  const [newDeadlineDate, setNewDeadlineDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [newDeadlineHours, setNewDeadlineHours] = useState<number>(10)
  const [newDeadlineGrade, setNewDeadlineGrade] = useState('A')
  const [newDeadlineNotes, setNewDeadlineNotes] = useState('')

  // Load from local storage, removing any legacy mock/default data
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(profileKey)
      let parsedP: StudentPersonalizationProfile | null = null
      if (savedProfile) {
        parsedP = JSON.parse(savedProfile)
      }

      // If user has not personalized, or if stored plan contains legacy mock IDs, force clean 00 state
      const savedPlan = localStorage.getItem(storageKey)
      if (savedPlan && parsedP?.isPersonalized) {
        const parsed = JSON.parse(savedPlan)
        // Check for legacy mock items:
        const hasLegacyMock = parsed.subjects?.some((s: Subject) => s.id === 'sub_math' && s.name === 'Mathematics & Calculus')
        if (hasLegacyMock) {
          // Clear legacy mock data to fulfill "default will be 00 and no subject"
          setSubjects([])
          setDeadlines([])
          setSchedule([])
          localStorage.removeItem(storageKey)
          localStorage.removeItem(profileKey)
          return
        }

        if (Array.isArray(parsed.subjects)) setSubjects(parsed.subjects)
        if (Array.isArray(parsed.deadlines)) setDeadlines(parsed.deadlines)
        if (Array.isArray(parsed.schedule)) setSchedule(parsed.schedule)
        setProfile(parsedP)
      } else {
        // Strict default: 00 and no subjects
        setSubjects([])
        setDeadlines([])
        setSchedule([])
        setProfile((prev) => ({ ...prev, isPersonalized: false }))
      }
    } catch {
      setSubjects([])
      setDeadlines([])
      setSchedule([])
    }
  }, [storageKey, profileKey])

  // Save changes helper
  const persistPlan = (
    newSubs: Subject[],
    newDeads: ExamDeadline[],
    newSched: PlannedStudyBlock[],
    newProfile?: StudentPersonalizationProfile
  ) => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          subjects: newSubs,
          deadlines: newDeads,
          schedule: newSched,
        })
      )
      if (newProfile) {
        localStorage.setItem(profileKey, JSON.stringify(newProfile))
      }
    } catch {}
  }

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Stats calculation
  const stats = useMemo(() => {
    return calculateWeeklyStudyStats(schedule, subjects)
  }, [schedule, subjects])

  // Handlers: Wizard Preset Change
  const handleSelectPreset = (preset: PlanPreset) => {
    setWizPresetId(preset.id)
    setWizField(preset.field)
    setWizGoal(preset.defaultGoal)
    setWizSubjects(preset.subjects)
  }

  const handleSelectBlankCustom = () => {
    setWizPresetId('custom')
    setWizField('Custom Curriculum')
    setWizGoal('Master core coursework')
    setWizSubjects([
      {
        id: `sub_${Date.now()}_1`,
        name: 'My Course 1',
        color: 'from-purple-500 to-indigo-600',
        accentColor: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
        targetHoursPerWeek: 5,
        priority: 'high',
      },
    ])
  }

  const handleOpenPersonalizeModal = () => {
    setWizStudentName(profile.studentName || currentUser?.name?.split(' ')[0] || 'Student')
    setWizField(profile.field || '')
    setWizGoal(profile.primaryGoal || '')
    // If empty, offer a blank starter course
    if (subjects.length > 0) {
      setWizSubjects(subjects)
    } else {
      setWizSubjects([
        {
          id: `sub_${Date.now()}_1`,
          name: '',
          color: 'from-purple-500 to-indigo-600',
          accentColor: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
          targetHoursPerWeek: 5,
          priority: 'high',
        },
      ])
    }
    setWizHoursPerDay(profile.availableHoursPerDay || 3)
    setWizPreferredTime(profile.preferredTime || 'morning')
    setWizSessionDuration(profile.sessionDuration || 50)
    setWizStudyDays(profile.studyDays || [1, 2, 3, 4, 5, 6])
    setPersonalizeModalOpen(true)
  }

  // Generate Personalized Schedule (AI + Local Fallback)
  const handleApplyPersonalization = async (useAi: boolean = true) => {
    const validSubs = wizSubjects.filter((s) => s.name.trim().length > 0)
    if (validSubs.length === 0) {
      alert('Please enter at least one course / subject name.')
      return
    }

    setIsGeneratingAi(true)
    const selectedPreset = PLAN_PRESETS.find((p) => p.id === wizPresetId)
    const presetDeadlines = selectedPreset ? selectedPreset.deadlines : deadlines

    let generatedSchedule: PlannedStudyBlock[] = []
    let customAdvice = ''

    if (useAi) {
      try {
        const res = await fetch('/api/gemini/study-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName: wizStudentName || 'Student',
            fieldOfStudy: wizField || 'Personalized Study Plan',
            goal: wizGoal || 'Academic excellence',
            subjects: validSubs,
            deadlines: presetDeadlines,
            preferredTime: wizPreferredTime,
            sessionDuration: wizSessionDuration,
            studyDays: wizStudyDays,
            dailyTargetHours: wizHoursPerDay,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.schedule && data.schedule.length > 0) {
            generatedSchedule = data.schedule
            customAdvice = data.advice || ''
          }
        }
      } catch (err) {
        console.error('Failed to call AI study planner API:', err)
      }
    }

    // Fallback if AI was disabled or failed
    if (generatedSchedule.length === 0) {
      generatedSchedule = generateSmartStudySchedule(
        validSubs,
        presetDeadlines,
        wizPreferredTime
      )
      customAdvice = `Personalized study plan created for ${wizStudentName || 'Student'}. Sessions are calibrated to ${wizSessionDuration}-minute Pomodoro blocks and distributed across your active study days.`
    }

    const updatedProfile: StudentPersonalizationProfile = {
      studentName: wizStudentName || 'Student',
      field: wizField || 'Personalized Plan',
      primaryGoal: wizGoal || 'Coursework Mastery',
      availableHoursPerDay: wizHoursPerDay,
      preferredTime: wizPreferredTime,
      sessionDuration: wizSessionDuration,
      studyDays: wizStudyDays,
      isPersonalized: true,
      personalizedAdvice: customAdvice,
      lastUpdated: new Date().toISOString(),
    }

    setSubjects(validSubs)
    setDeadlines(presetDeadlines)
    setSchedule(generatedSchedule)
    setProfile(updatedProfile)

    persistPlan(validSubs, presetDeadlines, generatedSchedule, updatedProfile)

    setIsGeneratingAi(false)
    setPersonalizeModalOpen(false)
    showToast(`Personalized study plan created with ${validSubs.length} course${validSubs.length > 1 ? 's' : ''}!`)
  }

  // Reset to 00 and no subjects
  const handleResetToZero = () => {
    if (confirm('Clear planner back to 00 (no subjects)?')) {
      setSubjects([])
      setDeadlines([])
      setSchedule([])
      const zeroProfile: StudentPersonalizationProfile = {
        studentName: currentUser?.name?.split(' ')[0] || 'Student',
        field: '',
        primaryGoal: '',
        availableHoursPerDay: 0,
        preferredTime: 'morning',
        sessionDuration: 50,
        studyDays: [1, 2, 3, 4, 5, 6],
        isPersonalized: false,
        personalizedAdvice: undefined,
      }
      setProfile(zeroProfile)
      localStorage.removeItem(storageKey)
      localStorage.removeItem(profileKey)
      showToast('Study planner cleared to 00 (no subjects).')
    }
  }

  // Toggle study block completion
  const handleToggleBlockCompleted = (id: string) => {
    const next = schedule.map((b) => (b.id === id ? { ...b, completed: !b.completed } : b))
    setSchedule(next)
    persistPlan(subjects, deadlines, next, profile)
  }

  // Delete study block
  const handleDeleteBlock = (id: string) => {
    const next = schedule.filter((b) => b.id !== id)
    setSchedule(next)
    persistPlan(subjects, deadlines, next, profile)
    showToast('Study block removed.')
  }

  // Add study block
  const handleSaveBlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBlockTopic.trim()) return

    const subId = newBlockSubjectId || subjects[0]?.id
    if (!subId) {
      alert('Please add a course first before scheduling study blocks.')
      return
    }

    const pomodoros = Math.max(1, Math.round(newBlockDuration / 25))
    const newBlock: PlannedStudyBlock = {
      id: `blk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      subjectId: subId,
      dayOfWeek: Number(newBlockDay),
      startTime: newBlockTime,
      durationMinutes: Number(newBlockDuration),
      topic: newBlockTopic.trim(),
      pomodoroCount: pomodoros,
      completed: false,
    }

    const next = [...schedule, newBlock].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek
      return a.startTime.localeCompare(b.startTime)
    })

    setSchedule(next)
    persistPlan(subjects, deadlines, next, profile)
    setAddBlockModalOpen(false)
    setNewBlockTopic('')
    showToast('New study block added to your weekly timetable.')
  }

  // Add subject
  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubName.trim()) return

    const selectedColor =
      SUBJECT_COLOR_OPTIONS.find((c) => c.id === newSubColorId) || SUBJECT_COLOR_OPTIONS[0]

    const newSub: Subject = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newSubName.trim(),
      color: selectedColor.color,
      accentColor: selectedColor.accentColor,
      targetHoursPerWeek: Number(newSubHours),
      priority: newSubPriority,
    }

    const next = [...subjects, newSub]
    setSubjects(next)
    const updatedProfile = { ...profile, isPersonalized: true }
    setProfile(updatedProfile)
    persistPlan(next, deadlines, schedule, updatedProfile)
    setAddSubjectModalOpen(false)
    setNewSubName('')
    showToast(`Added ${newSub.name} to your courses!`)
  }

  // Delete subject
  const handleDeleteSubject = (id: string) => {
    const nextSubs = subjects.filter((s) => s.id !== id)
    const nextSchedule = schedule.filter((b) => b.subjectId !== id)
    const nextDeadlines = deadlines.filter((d) => d.subjectId !== id)
    setSubjects(nextSubs)
    setSchedule(nextSchedule)
    setDeadlines(nextDeadlines)
    const updatedProfile = { ...profile, isPersonalized: nextSubs.length > 0 }
    setProfile(updatedProfile)
    persistPlan(nextSubs, nextDeadlines, nextSchedule, updatedProfile)
    showToast('Course removed.')
  }

  // Add exam deadline
  const handleSaveDeadline = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDeadlineTitle.trim()) return

    const subId = newDeadlineSubjectId || subjects[0]?.id
    if (!subId) {
      alert('Please add a course first before tracking an exam or deadline.')
      return
    }

    const newDl: ExamDeadline = {
      id: `dl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      subjectId: subId,
      title: newDeadlineTitle.trim(),
      dueDate: newDeadlineDate,
      targetGrade: newDeadlineGrade,
      estimatedHoursNeeded: Number(newDeadlineHours),
      completedHours: 0,
      notes: newDeadlineNotes.trim() || undefined,
    }

    const next = [...deadlines, newDl].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    setDeadlines(next)
    persistPlan(subjects, next, schedule, profile)
    setAddDeadlineModalOpen(false)
    setNewDeadlineTitle('')
    setNewDeadlineNotes('')
    showToast('Exam / Project deadline recorded.')
  }

  // Delete deadline
  const handleDeleteDeadline = (id: string) => {
    const next = deadlines.filter((d) => d.id !== id)
    setDeadlines(next)
    persistPlan(subjects, next, schedule, profile)
    showToast('Deadline removed.')
  }

  // Launch Focus Timer for a block
  const handleLaunchBlockTimer = (block: PlannedStudyBlock) => {
    const sub = subjects.find((s) => s.id === block.subjectId)
    setTimerMode('focus')
    setTimerDuration('focus', block.durationMinutes)
    if (onNavigateToTimer) {
      onNavigateToTimer(sub?.name, block.durationMinutes)
    }
  }

  // Filtered schedule
  const displayedSchedule = useMemo(() => {
    return schedule.filter((b) => {
      if (selectedDayFilter !== 'all' && b.dayOfWeek !== selectedDayFilter) return false
      return true
    })
  }, [schedule, selectedDayFilter])

  const newSubNameId = useId()
  const newBlockTopicId = useId()
  const newDeadlineTitleId = useId()
  const newDeadlineDateId = useId()
  const newDeadlineNotesId = useId()

  const isPlannerEmpty = subjects.length === 0

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border bg-card p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-gradient-to-br from-primary/25 via-accent/20 to-transparent blur-3xl"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Calendar className="size-5" aria-hidden />
              </span>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl text-foreground">
                Study Planner & Schedule
              </h2>

              {!isPlannerEmpty && profile.isPersonalized ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  <span>Personalized: {profile.field || 'Active Plan'}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-muted bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
                  <span>Empty · No Subjects Added</span>
                </span>
              )}
            </div>

            <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
              {isPlannerEmpty
                ? 'Your study schedule is currently empty. Begin personalizing to configure your courses, study hours, and weekly Pomodoro blocks.'
                : `Customized for ${profile.studentName || 'you'} · ${subjects.length} active course${subjects.length > 1 ? 's' : ''}. Spaced Pomodoro study blocks calibrated to your schedule.`}
            </p>

            {!isPlannerEmpty && profile.personalizedAdvice && (
              <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-primary/25 bg-primary/5 p-3.5 text-xs text-foreground">
                <Lightbulb className="size-4 shrink-0 text-primary mt-0.5" />
                <p className="italic text-muted-foreground leading-relaxed">
                  <strong className="font-semibold text-foreground not-italic">Cognitive Coach Strategy: </strong>
                  {profile.personalizedAdvice}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenPersonalizeModal}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-[oklch(0.58_0.2_300)] px-5 py-3 text-xs sm:text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-primary/35 active:translate-y-0"
            >
              <Wand2 className="size-4" />
              <span>{isPlannerEmpty ? 'Begin Personalizing Schedule' : 'Adjust Personalization'}</span>
            </button>

            {!isPlannerEmpty && (
              <>
                <button
                  type="button"
                  onClick={() => setAddBlockModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-2xl border border-border bg-background px-4 py-3 text-xs sm:text-sm font-medium text-foreground transition-all hover:bg-muted active:translate-y-0"
                >
                  <Plus className="size-4" />
                  <span>Add Block</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToZero}
                  title="Clear back to Empty (no subjects)"
                  aria-label="Clear back to Empty"
                  className="flex size-11 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground transition-all hover:text-foreground hover:bg-muted"
                >
                  <RotateCcw className="size-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Toast alert */}
        {toastMessage && (
          <div
            role="status"
            className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 animate-in fade-in"
          >
            <div className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-emerald-500" />
              <span className="font-semibold">{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* 2. Dynamic Dashboard: Empty State vs. Populated Dashboard */}
      {isPlannerEmpty ? (
        /* Empty State replacing default dashboard content with clear call-to-action */
        <section
          aria-label="Empty study planner"
          className="relative overflow-hidden rounded-3xl border bg-card p-8 sm:p-12 text-center shadow-sm"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -top-24 flex justify-center"
          >
            <div className="size-96 rounded-full bg-gradient-to-b from-primary/15 via-accent/10 to-transparent blur-3xl" />
          </div>

          <div className="relative mx-auto flex max-w-2xl flex-col items-center">
            {/* Empty Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary mb-4">
              <Sparkles className="size-3.5" />
              <span>Empty Schedule · 0 Courses Added</span>
            </span>

            {/* Icon Graphic */}
            <div className="relative mb-5 flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-muted border shadow-inner">
              <Calendar className="size-10 text-primary" />
              <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-background border shadow">
                <Plus className="size-4 text-primary" />
              </span>
            </div>

            {/* Headline & Description */}
            <h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Your Study Planner is Empty
            </h3>
            <p className="mt-2.5 max-w-lg text-sm text-muted-foreground leading-relaxed">
              No subjects or study blocks have been added yet. Personalize your planner with your actual courses, upcoming exams, and target daily hours to generate your custom weekly timetable.
            </p>

            {/* Feature Highlights Grid */}
            <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-3 text-left">
              <div className="rounded-2xl border bg-background/80 p-4 backdrop-blur-sm transition-all hover:border-primary/40">
                <div className="flex size-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 mb-2.5">
                  <Layers className="size-4" />
                </div>
                <h4 className="text-xs font-bold text-foreground">1. Add Your Courses</h4>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  Enter your subjects, target weekly hours, and exam priorities.
                </p>
              </div>

              <div className="rounded-2xl border bg-background/80 p-4 backdrop-blur-sm transition-all hover:border-primary/40">
                <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 mb-2.5">
                  <Clock className="size-4" />
                </div>
                <h4 className="text-xs font-bold text-foreground">2. Set Study Times</h4>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  Choose morning, afternoon, or evening blocks with custom Pomodoros.
                </p>
              </div>

              <div className="rounded-2xl border bg-background/80 p-4 backdrop-blur-sm transition-all hover:border-primary/40">
                <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 mb-2.5">
                  <Target className="size-4" />
                </div>
                <h4 className="text-xs font-bold text-foreground">3. Track Deadlines</h4>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  Monitor test dates with automatic hours-per-day pacing and readiness.
                </p>
              </div>
            </div>

            {/* Clear Call-To-Action to Begin Personalizing */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleOpenPersonalizeModal}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-primary to-[oklch(0.58_0.2_300)] px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-primary/35 active:translate-y-0"
              >
                <Wand2 className="size-4.5" />
                <span>Begin Personalizing Schedule</span>
              </button>

              <button
                type="button"
                onClick={() => setAddSubjectModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted active:translate-y-0"
              >
                <Plus className="size-4" />
                <span>Add Single Course</span>
              </button>
            </div>
          </div>
        </section>
      ) : (
        /* Populated Active Dashboard with Metrics, Tabs, Schedule, and Deadlines */
        <>
          {/* Key Weekly Metrics */}
          <section aria-label="Planner summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="group relative overflow-hidden rounded-3xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Weekly Target</p>
                  <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-foreground">
                    {stats.totalScheduledHours}h
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {schedule.length} planned study blocks
                  </p>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock className="size-5" />
                </span>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Completed This Week</p>
                  <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-foreground">
                    {stats.completedHours}h
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {stats.totalScheduledMinutes > 0
                      ? `${Math.round((stats.completedMinutes / stats.totalScheduledMinutes) * 100)}% of scheduled blocks`
                      : '00% completion'}
                  </p>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="size-5" />
                </span>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Upcoming Deadlines</p>
                  <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-foreground">
                    {deadlines.length}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Exams & projects tracked
                  </p>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <Target className="size-5" />
                </span>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Your Courses</p>
                  <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-foreground">
                    {subjects.length}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Active in your schedule
                  </p>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                  <GraduationCap className="size-5" />
                </span>
              </div>
            </div>
          </section>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              {[
                { id: 'schedule', label: 'Weekly Timetable', icon: Calendar },
                { id: 'deadlines', label: `Exams & Deadlines (${deadlines.length})`, icon: Target },
                { id: 'subjects', label: `My Courses (${subjects.length})`, icon: Layers },
              ].map(({ id, label, icon: Icon }) => {
                const active = activeTab === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id as typeof activeTab)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all',
                      active
                        ? 'bg-primary text-primary-foreground shadow'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>

            {activeTab === 'subjects' && (
              <button
                type="button"
                onClick={() => setAddSubjectModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
              >
                <Plus className="size-3.5" />
                <span>Add Course</span>
              </button>
            )}

            {activeTab === 'deadlines' && (
              <button
                type="button"
                onClick={() => setAddDeadlineModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow"
              >
                <Plus className="size-3.5" />
                <span>Add Deadline</span>
              </button>
            )}
          </div>

          {/* 4. Tab Content: Weekly Timetable */}
          {activeTab === 'schedule' && (
            <section aria-label="Weekly timetable" className="flex flex-col gap-5">
              {/* Day Filters */}
              <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border bg-card/60 p-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedDayFilter('all')}
                  className={cn(
                    'rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
                    selectedDayFilter === 'all'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  All Days ({schedule.length})
                </button>
                {DAYS_OF_WEEK.map((dayName, idx) => {
                  const dayCount = schedule.filter((b) => b.dayOfWeek === idx).length
                  const isSelected = selectedDayFilter === idx
                  return (
                    <button
                      key={dayName}
                      type="button"
                      onClick={() => setSelectedDayFilter(idx)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <span>{DAYS_SHORT[idx]}</span>
                      {dayCount > 0 && (
                        <span
                          className={cn(
                            'size-4 rounded-full text-[10px] font-bold flex items-center justify-center',
                            isSelected ? 'bg-primary-foreground/20 text-white' : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {dayCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Schedule List */}
              <div className="space-y-3">
                {displayedSchedule.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed p-12 text-center">
                    <Calendar className="size-8 text-muted-foreground/60" />
                    <h4 className="mt-3 text-sm font-semibold text-foreground">
                      No study blocks scheduled for this view
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                      Tap "Add Block" to schedule a study session, or re-open Personalize to auto-generate blocks.
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAddBlockModalOpen(true)}
                        className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow"
                      >
                        <Plus className="size-3.5" />
                        <span>Add Study Block</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  displayedSchedule.map((block) => {
                    const sub = subjects.find((s) => s.id === block.subjectId) || {
                      name: 'Course',
                      accentColor: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
                    }
                    const dayName = DAYS_OF_WEEK[block.dayOfWeek]

                    return (
                      <div
                        key={block.id}
                        className={cn(
                          'group flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-all hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between',
                          block.completed && 'opacity-65 bg-muted/30'
                        )}
                      >
                        <div className="flex items-start gap-3.5">
                          {/* Checkbox toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleBlockCompleted(block.id)}
                            aria-label={block.completed ? 'Mark uncompleted' : 'Mark completed'}
                            className={cn(
                              'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border transition-all',
                              block.completed
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : 'border-muted-foreground/30 hover:border-primary'
                            )}
                          >
                            {block.completed && <Check className="size-3.5 stroke-[3]" />}
                          </button>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  'rounded-full border px-2.5 py-0.5 text-[11px] font-bold',
                                  sub.accentColor
                                )}
                              >
                                {sub.name}
                              </span>
                              <span className="font-mono text-xs text-muted-foreground">
                                {dayName} · {block.startTime}
                              </span>
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                {block.pomodoroCount} Pomodoro{block.pomodoroCount > 1 ? 's' : ''} ({block.durationMinutes}m)
                              </span>
                            </div>

                            <p
                              className={cn(
                                'text-sm font-semibold text-foreground',
                                block.completed && 'line-through text-muted-foreground'
                              )}
                            >
                              {block.topic}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleLaunchBlockTimer(block)}
                            className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
                          >
                            <Play className="size-3 fill-current" />
                            <span>Start Session</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(block.id)}
                            aria-label="Delete block"
                            className="flex size-8 items-center justify-center rounded-lg border text-muted-foreground transition hover:border-rose-500/40 hover:text-rose-500"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </section>
          )}

          {/* 5. Tab Content: Exam Deadlines */}
          {activeTab === 'deadlines' && (
            <section aria-label="Exam deadlines" className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Monitor countdowns, target scores, and recommended daily study pacing for your specific courses.
              </p>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {deadlines.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border border-dashed p-10 text-center">
                    <Target className="size-8 text-muted-foreground/60" />
                    <h4 className="mt-2 text-sm font-semibold text-foreground">No upcoming exams or deadlines</h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Track upcoming tests and projects to calculate recommended daily study pacing.
                    </p>
                    <button
                      type="button"
                      onClick={() => setAddDeadlineModalOpen(true)}
                      className="mt-4 flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow"
                    >
                      <Plus className="size-3.5" />
                      <span>Add Deadline</span>
                    </button>
                  </div>
                ) : (
                  deadlines.map((dl) => {
                    const sub = subjects.find((s) => s.id === dl.subjectId) || {
                      name: 'Course',
                      accentColor: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
                    }
                    const readiness = calculateReadiness(dl)
                    const daysLeft = calculateDaysRemaining(dl.dueDate)

                    return (
                      <div
                        key={dl.id}
                        className="flex flex-col justify-between rounded-3xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={cn(
                                'rounded-full border px-2.5 py-0.5 text-[10px] font-bold',
                                sub.accentColor
                              )}
                            >
                              {sub.name}
                            </span>
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-bold',
                                readiness.status === 'urgent' && 'bg-rose-500/15 text-rose-500',
                                readiness.status === 'needs_attention' && 'bg-amber-500/15 text-amber-500',
                                readiness.status === 'on_track' && 'bg-emerald-500/15 text-emerald-500',
                                readiness.status === 'completed' && 'bg-primary/15 text-primary'
                              )}
                            >
                              {readiness.status === 'urgent' && 'Urgent Pace'}
                              {readiness.status === 'needs_attention' && 'Needs Attention'}
                              {readiness.status === 'on_track' && 'On Track'}
                              {readiness.status === 'completed' && 'Ready!'}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-sm font-bold text-foreground">{dl.title}</h4>
                            {dl.notes && <p className="mt-1 text-xs text-muted-foreground">{dl.notes}</p>}
                          </div>

                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-muted-foreground">Due: {dl.dueDate}</span>
                            <span
                              className={cn(
                                'font-mono font-bold',
                                daysLeft <= 3 ? 'text-rose-500' : 'text-foreground'
                              )}
                            >
                              {daysLeft <= 0 ? 'Due Today / Passed' : `${daysLeft} days remaining`}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                              <span>
                                {dl.completedHours}h of {dl.estimatedHoursNeeded}h prepped
                              </span>
                              <span>{readiness.progressPct}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${readiness.progressPct}%` }}
                              />
                            </div>
                          </div>

                          {readiness.recommendedHoursPerDay > 0 && (
                            <p className="text-[11px] text-muted-foreground">
                              Recommended:{' '}
                              <span className="font-semibold text-foreground font-mono">
                                {readiness.recommendedHoursPerDay} hrs/day
                              </span>{' '}
                              to be 100% prepared.
                            </p>
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t pt-3">
                          <span className="text-xs font-medium text-muted-foreground">
                            Target Grade:{' '}
                            <span className="font-bold text-foreground">{dl.targetGrade || 'A'}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteDeadline(dl.id)}
                            aria-label="Delete deadline"
                            className="text-xs text-rose-500 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </section>
          )}

          {/* 6. Tab Content: My Courses & Targets */}
          {activeTab === 'subjects' && (
            <section aria-label="Subjects and targets" className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Manage your personal course load, set target hours per week, and balance priorities.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                {subjects.map((sub) => {
                  const matchingBlocks = schedule.filter((b) => b.subjectId === sub.id)
                  const scheduledMins = matchingBlocks.reduce((sum, b) => sum + b.durationMinutes, 0)
                  const scheduledHrs = Number((scheduledMins / 60).toFixed(1))
                  const pct =
                    sub.targetHoursPerWeek > 0
                      ? Math.min(100, Math.round((scheduledHrs / sub.targetHoursPerWeek) * 100))
                      : 100

                  return (
                    <div key={sub.id} className="rounded-3xl border bg-card p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs font-bold',
                            sub.accentColor
                          )}
                        >
                          {sub.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
                            {sub.priority} Priority
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubject(sub.id)}
                            title="Delete course"
                            aria-label="Delete course"
                            className="text-muted-foreground hover:text-rose-500"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium text-foreground">
                          <span>Scheduled vs Weekly Goal</span>
                          <span className="font-mono">
                            {scheduledHrs}h / {sub.targetHoursPerWeek}h ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                        <span>
                          {matchingBlocks.length} planned session{matchingBlocks.length === 1 ? '' : 's'} on calendar
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewBlockSubjectId(sub.id)
                            setAddBlockModalOpen(true)
                          }}
                          className="text-primary hover:underline font-semibold"
                        >
                          + Schedule Block
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* 7. Modal: Personalize My Study Plan (Wizard) */}
      {personalizeModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="personalize-plan-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto"
        >
          <div className="relative my-8 w-full max-w-2xl overflow-hidden rounded-3xl border bg-card p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Wand2 className="size-5" />
                </span>
                <div>
                  <h3 id="personalize-plan-title" className="text-base font-bold text-foreground">
                    Personalize Study Plan
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Add your courses, academic goals, and preferred study hours.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPersonalizeModalOpen(false)}
                aria-label="Close dialog"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 space-y-6">
              {/* Optional Curriculum Quick-Fill Templates */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  1. Quick Preset Suggestions (Or build your own below)
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={handleSelectBlankCustom}
                    className={cn(
                      'flex flex-col text-left rounded-2xl border p-2.5 transition-all',
                      wizPresetId === 'custom'
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                        : 'border-border/70 bg-background/60 hover:bg-muted'
                    )}
                  >
                    <span className="text-xs font-bold text-foreground">Custom / Blank</span>
                    <span className="mt-0.5 text-[10px] text-muted-foreground">
                      Build your courses completely from scratch.
                    </span>
                  </button>

                  {PLAN_PRESETS.map((preset) => {
                    const selected = wizPresetId === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={cn(
                          'flex flex-col text-left rounded-2xl border p-2.5 transition-all',
                          selected
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                            : 'border-border/70 bg-background/60 hover:bg-muted'
                        )}
                      >
                        <span className="text-xs font-bold text-foreground">{preset.name}</span>
                        <span className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">
                          {preset.description}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Goal and Student Profile */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Your Name / Nickname
                  </label>
                  <input
                    type="text"
                    value={wizStudentName}
                    onChange={(e) => setWizStudentName(e.target.value)}
                    placeholder="e.g. Alex"
                    className="h-10 w-full rounded-xl border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Primary Academic Goal
                  </label>
                  <input
                    type="text"
                    value={wizGoal}
                    onChange={(e) => setWizGoal(e.target.value)}
                    placeholder="e.g. Ace my midterm, Maintain 4.0 GPA"
                    className="h-10 w-full rounded-xl border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Courses (Editable list) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    2. Your Courses ({wizSubjects.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newSubId = `sub_${Date.now()}`
                      setWizSubjects([
                        ...wizSubjects,
                        {
                          id: newSubId,
                          name: '',
                          color: 'from-purple-500 to-indigo-600',
                          accentColor: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
                          targetHoursPerWeek: 5,
                          priority: 'high',
                        },
                      ])
                    }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    + Add Course
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {wizSubjects.map((sub, index) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-2 rounded-xl border bg-background p-2 text-xs"
                    >
                      <input
                        type="text"
                        value={sub.name}
                        placeholder="Course title, e.g. Organic Chem, History"
                        onChange={(e) => {
                          const val = e.target.value
                          setWizSubjects(
                            wizSubjects.map((s, i) => (i === index ? { ...s, name: val } : s))
                          )
                        }}
                        className="flex-1 rounded-lg border bg-card px-2.5 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">Target:</span>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={sub.targetHoursPerWeek}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setWizSubjects(
                              wizSubjects.map((s, i) =>
                                i === index ? { ...s, targetHoursPerWeek: val } : s
                              )
                            )
                          }}
                          className="w-12 rounded-lg border bg-card px-1.5 py-1 text-center font-mono text-xs text-foreground"
                        />
                        <span className="text-[10px] text-muted-foreground">h/wk</span>
                      </div>
                      <select
                        value={sub.priority}
                        onChange={(e) => {
                          const val = e.target.value as Priority
                          setWizSubjects(
                            wizSubjects.map((s, i) => (i === index ? { ...s, priority: val } : s))
                          )
                        }}
                        className="rounded-lg border bg-card px-2 py-1 text-[11px] text-foreground"
                      >
                        <option value="high">High</option>
                        <option value="medium">Med</option>
                        <option value="low">Low</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setWizSubjects(wizSubjects.filter((_, i) => i !== index))}
                        className="text-muted-foreground hover:text-rose-500 p-1"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time of Day & Pomodoro Preferences */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Preferred Study Time
                  </label>
                  <select
                    value={wizPreferredTime}
                    onChange={(e) => setWizPreferredTime(e.target.value as any)}
                    className="h-10 w-full rounded-xl border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="morning">Morning (8:30 - 11:30)</option>
                    <option value="afternoon">Afternoon (1:30 - 4:30)</option>
                    <option value="evening">Evening (6:00 - 9:00)</option>
                    <option value="flexible">Flexible / Spread Out</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Pomodoro Session Length
                  </label>
                  <select
                    value={wizSessionDuration}
                    onChange={(e) => setWizSessionDuration(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value={25}>25 min (Standard Pomodoro)</option>
                    <option value={50}>50 min (Deep Work Block)</option>
                    <option value={75}>75 min (Intensive Flow)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Target Study Hours / Day
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={wizHoursPerDay}
                    onChange={(e) => setWizHoursPerDay(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Active Study Days */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Active Study Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((d, i) => {
                    const isSelected = wizStudyDays.includes(i)
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (wizStudyDays.length > 1) {
                              setWizStudyDays(wizStudyDays.filter((day) => day !== i))
                            }
                          } else {
                            setWizStudyDays([...wizStudyDays, i].sort())
                          }
                        }}
                        className={cn(
                          'rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all',
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'border-border/60 bg-background text-muted-foreground hover:bg-muted'
                        )}
                      >
                        {DAYS_SHORT[i]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setPersonalizeModalOpen(false)}
                  disabled={isGeneratingAi}
                  className="rounded-xl border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPersonalization(true)}
                  disabled={isGeneratingAi}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.58_0.2_300)] px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-95"
                >
                  {isGeneratingAi ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Optimizing with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      <span>Save & Generate Plan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal: Add Course / Subject */}
      {addSubjectModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-subject-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border bg-card p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Layers className="size-4" />
                </span>
                <h3 id="add-subject-title" className="text-base font-bold text-foreground">
                  Add Course / Subject
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddSubjectModalOpen(false)}
                aria-label="Close dialog"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="mt-4 space-y-4">
              <div>
                <label htmlFor={newSubNameId} className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Course Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id={newSubNameId}
                  type="text"
                  required
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder="e.g. Organic Chemistry, Civil Procedure, Japanese N3"
                  className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Target Hours / Week
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={newSubHours}
                    onChange={(e) => setNewSubHours(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Priority
                  </label>
                  <select
                    value={newSubPriority}
                    onChange={(e) => setNewSubPriority(e.target.value as Priority)}
                    className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Color Theme
                </label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewSubColorId(c.id)}
                      className={cn(
                        'rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all',
                        newSubColorId === c.id
                          ? 'border-primary ring-2 ring-primary/30 font-bold'
                          : 'border-border/60 bg-background text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setAddSubjectModalOpen(false)}
                  className="rounded-xl border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow"
                >
                  <Check className="size-3.5" />
                  <span>Save Course</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Modal: Add Study Block */}
      {addBlockModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-block-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border bg-card p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Plus className="size-4" />
                </span>
                <h3 id="add-block-title" className="text-base font-bold text-foreground">
                  Schedule Study Block
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddBlockModalOpen(false)}
                aria-label="Close dialog"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBlock} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Course
                </label>
                <select
                  value={newBlockSubjectId || subjects[0]?.id || ''}
                  onChange={(e) => setNewBlockSubjectId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={newBlockTopicId} className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Topic / Task <span className="text-rose-500">*</span>
                </label>
                <input
                  id={newBlockTopicId}
                  type="text"
                  required
                  value={newBlockTopic}
                  onChange={(e) => setNewBlockTopic(e.target.value)}
                  placeholder="e.g. Chapter 4 Practice Problems, Review Flashcards..."
                  className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Day of Week
                  </label>
                  <select
                    value={newBlockDay}
                    onChange={(e) => setNewBlockDay(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    {DAYS_OF_WEEK.map((d, i) => (
                      <option key={d} value={i}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newBlockTime}
                    onChange={(e) => setNewBlockTime(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Duration (Minutes)
                </label>
                <div className="mt-1 grid grid-cols-4 gap-2">
                  {[25, 50, 75, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setNewBlockDuration(mins)}
                      className={cn(
                        'rounded-xl border py-2 text-xs font-semibold transition-all',
                        newBlockDuration === mins
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/60 bg-background text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setAddBlockModalOpen(false)}
                  className="rounded-xl border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow"
                >
                  <Check className="size-3.5" />
                  <span>Save Block</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. Modal: Add Exam Deadline */}
      {addDeadlineModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-deadline-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border bg-card p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <Target className="size-4" />
                </span>
                <h3 id="add-deadline-title" className="text-base font-bold text-foreground">
                  Track Exam / Project Deadline
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddDeadlineModalOpen(false)}
                aria-label="Close dialog"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDeadline} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Course
                </label>
                <select
                  value={newDeadlineSubjectId || subjects[0]?.id || ''}
                  onChange={(e) => setNewDeadlineSubjectId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={newDeadlineTitleId} className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Exam / Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id={newDeadlineTitleId}
                  type="text"
                  required
                  value={newDeadlineTitle}
                  onChange={(e) => setNewDeadlineTitle(e.target.value)}
                  placeholder="e.g. Midterm 2, Term Paper, Final Oral Defense"
                  className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={newDeadlineDateId} className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Due Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={newDeadlineDateId}
                    type="date"
                    required
                    value={newDeadlineDate}
                    onChange={(e) => setNewDeadlineDate(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newDeadlineHours}
                    onChange={(e) => setNewDeadlineHours(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor={newDeadlineNotesId} className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Study Notes / Key Topics
                </label>
                <input
                  id={newDeadlineNotesId}
                  type="text"
                  value={newDeadlineNotes}
                  onChange={(e) => setNewDeadlineNotes(e.target.value)}
                  placeholder="e.g. Chapters 5-8, Mechanism problems, Case summaries"
                  className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setAddDeadlineModalOpen(false)}
                  className="rounded-xl border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow"
                >
                  <Check className="size-3.5" />
                  <span>Save Deadline</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudyPlanner
