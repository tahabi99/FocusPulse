'use client'

import { useId, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  Brain,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
  Edit3,
  Filter,
  Flame,
  HelpCircle,
  Info,
  Loader2,
  Moon,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserX,
  Utensils,
  Volume2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  dateKey,
  daysAgo,
  DistractionCategory,
  DistractionEntry,
  DistractionIntensity,
  useFocusPulse,
} from './store'

const CATEGORY_CONFIG: Record<
  DistractionCategory,
  {
    label: string
    icon: typeof Phone
    badgeClass: string
    bgClass: string
    textClass: string
    description: string
  }
> = {
  'Phone / Social Media': {
    label: 'Phone / Social Media',
    icon: Phone,
    badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400',
    bgClass: 'bg-rose-500/10',
    textClass: 'text-rose-500',
    description: 'Scrolling feeds, answering messages, checking apps',
  },
  Notifications: {
    label: 'Notifications',
    icon: Bell,
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-500',
    description: 'Banners, email pings, desktop alert popups',
  },
  'Noise / Environment': {
    label: 'Noise / Environment',
    icon: Volume2,
    badgeClass: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
    bgClass: 'bg-sky-500/10',
    textClass: 'text-sky-500',
    description: 'Loud chatter, street noise, music or room commotion',
  },
  'Tiredness / Sleepiness': {
    label: 'Tiredness / Sleepiness',
    icon: Moon,
    badgeClass: 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400',
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-500',
    description: 'Heavy eyes, low mental energy, yawning spells',
  },
  'Random Thoughts': {
    label: 'Random Thoughts',
    icon: Brain,
    badgeClass: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    bgClass: 'bg-indigo-500/10',
    textClass: 'text-indigo-500',
    description: 'Daydreaming, unrelated ideas, sudden mental tangent',
  },
  'Hunger / Thirst': {
    label: 'Hunger / Thirst',
    icon: Utensils,
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-500',
    description: 'Craving snacks, needing water or coffee',
  },
  'Someone Interrupted Me': {
    label: 'Someone Interrupted Me',
    icon: UserX,
    badgeClass: 'border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-500',
    description: 'Roommate, peer, colleague, or family member spoke to me',
  },
  Other: {
    label: 'Other',
    icon: MoreHorizontal,
    badgeClass: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
    bgClass: 'bg-zinc-500/10',
    textClass: 'text-zinc-500',
    description: 'Uncategorized physical or situational interruption',
  },
}

const CATEGORY_LIST = Object.keys(CATEGORY_CONFIG) as DistractionCategory[]

interface ReflectionResult {
  headline: string
  summary: string
  suggestions: string[]
  patternObserved: string
  tone?: string
}

export function DistractionJournal({ onNavigateToTimer }: { onNavigateToTimer?: () => void }) {
  const {
    distractions,
    todayDistractionCount,
    weeklyDistractionCount,
    topDistractionCategory,
    currentSessionId,
    timerRunning,
    timerMode,
    addDistraction,
    updateDistraction,
    deleteDistraction,
  } = useFocusPulse()

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<DistractionEntry | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Form states
  const [formCategory, setFormCategory] = useState<DistractionCategory>('Phone / Social Media')
  const [formNote, setFormNote] = useState('')
  const [formIntensity, setFormIntensity] = useState<DistractionIntensity>('Medium')
  const [formReturned, setFormReturned] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Filter states
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Reflection AI state
  const [reflectionOpen, setReflectionOpen] = useState(false)
  const [reflecting, setReflecting] = useState(false)
  const [reflection, setReflection] = useState<ReflectionResult | null>(null)
  const [reflectionError, setReflectionError] = useState<string | null>(null)

  // Stats & calculations
  const returnRate = useMemo(() => {
    if (distractions.length === 0) return 0
    const returnedCount = distractions.filter((d) => d.returnedToStudying).length
    return Math.round((returnedCount / distractions.length) * 100)
  }, [distractions])

  // Week-over-week calculation
  const weekComparison = useMemo(() => {
    const now = new Date()
    const thisWeekStart = daysAgo(6, now)
    const prevWeekStart = daysAgo(13, now)
    const prevWeekEnd = daysAgo(7, now)

    const thisWeekEntries = distractions.filter((d) => new Date(d.timestamp) >= thisWeekStart)
    const prevWeekEntries = distractions.filter((d) => {
      const dt = new Date(d.timestamp)
      return dt >= prevWeekStart && dt <= prevWeekEnd
    })

    const thisCount = thisWeekEntries.length
    const prevCount = prevWeekEntries.length

    return {
      thisCount,
      prevCount,
      hasEnoughData: distractions.length >= 3 && prevCount > 0,
      diff: thisCount - prevCount,
    }
  }, [distractions])

  // 7-day daily breakdown
  const dailyBreakdown = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = daysAgo(6 - i)
      const k = dateKey(d)
      const count = distractions.filter((x) => x.dateKey === k).length
      const dayName = d.toLocaleDateString(undefined, { weekday: 'short' })
      return { dayName, dateStr: k, count, isToday: i === 6 }
    })
    const maxCount = Math.max(...days.map((d) => d.count), 1)
    return { days, maxCount }
  }, [distractions])

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of distractions) {
      counts[d.category] = (counts[d.category] || 0) + 1
    }
    const total = distractions.length
    return Object.entries(counts)
      .map(([cat, count]) => ({
        category: cat as DistractionCategory,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
  }, [distractions])

  // Filtered entries
  const filteredDistractions = useMemo(() => {
    const today = dateKey(new Date())
    const weekAgo = daysAgo(6)
    const monthAgo = daysAgo(29)

    return distractions.filter((d) => {
      // Category filter
      if (selectedCategoryFilter !== 'all' && d.category !== selectedCategoryFilter) {
        return false
      }

      // Date filter
      if (dateFilter === 'today' && d.dateKey !== today) return false
      if (dateFilter === 'week' && new Date(d.timestamp) < weekAgo) return false
      if (dateFilter === 'month' && new Date(d.timestamp) < monthAgo) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const noteMatch = d.note?.toLowerCase().includes(q)
        const catMatch = d.category.toLowerCase().includes(q)
        if (!noteMatch && !catMatch) return false
      }

      return true
    })
  }, [distractions, selectedCategoryFilter, dateFilter, searchQuery])

  // Handlers for modal
  const openNewDistractionModal = () => {
    setEditingEntry(null)
    setFormCategory('Phone / Social Media')
    setFormNote('')
    setFormIntensity('Medium')
    setFormReturned(true)
    setFormError(null)
    setFormSuccess(null)
    setModalOpen(true)
  }

  const openEditDistractionModal = (entry: DistractionEntry) => {
    setEditingEntry(entry)
    setFormCategory(entry.category)
    setFormNote(entry.note || '')
    setFormIntensity(entry.intensity)
    setFormReturned(entry.returnedToStudying)
    setFormError(null)
    setFormSuccess(null)
    setModalOpen(true)
  }

  const handleSaveDistraction = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formCategory) {
      setFormError('Please select a distraction category.')
      return
    }

    try {
      if (editingEntry) {
        updateDistraction(editingEntry.id, {
          category: formCategory,
          note: formNote.trim() || undefined,
          intensity: formIntensity,
          returnedToStudying: formReturned,
        })
        setFormSuccess('Distraction entry updated successfully.')
      } else {
        addDistraction({
          category: formCategory,
          note: formNote.trim() || undefined,
          intensity: formIntensity,
          returnedToStudying: formReturned,
        })
        setFormSuccess('Distraction logged successfully! Your focus timer is still running.')
      }

      setTimeout(() => {
        setModalOpen(false)
        setFormSuccess(null)
      }, 700)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save distraction.'
      setFormError(msg)
    }
  }

  // Handle reflection request
  const handleRequestReflection = async () => {
    setReflectionOpen(true)
    setReflecting(true)
    setReflectionError(null)

    try {
      const res = await fetch('/api/gemini/distraction-reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distractions,
          todayCount: todayDistractionCount,
          weekCount: weeklyDistractionCount,
          topCategory: topDistractionCategory,
          returnRate,
        }),
      })

      if (!res.ok) {
        throw new Error('Could not generate reflection at this moment.')
      }

      const data = await res.json()
      setReflection(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error generating reflection.'
      setReflectionError(msg)
    } finally {
      setReflecting(false)
    }
  }

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts)
      const todayStr = dateKey(new Date())
      const entryStr = dateKey(d)

      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      if (entryStr === todayStr) {
        return `Today at ${timeStr}`
      }

      const yday = daysAgo(1)
      if (entryStr === dateKey(yday)) {
        return `Yesterday at ${timeStr}`
      }

      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`
    } catch {
      return ts
    }
  }

  const categoryNoteId = useId()

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header & Actions */}
      <section className="relative overflow-hidden rounded-3xl border bg-card p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-gradient-to-br from-primary/20 via-accent/15 to-transparent blur-3xl"
        />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="size-4" aria-hidden />
              </span>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Distraction Journal</h2>
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">
              Understand what interrupts your focus and build better study habits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRequestReflection}
              className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs sm:text-sm font-semibold text-primary transition-all hover:bg-primary/20 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Sparkles className="size-4 text-primary" />
              <span>Reflect on My Distractions</span>
            </button>

            <button
              type="button"
              onClick={openNewDistractionModal}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.58_0.2_300)] px-5 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-primary/35 active:translate-y-0"
            >
              <Plus className="size-4" />
              <span>Log Distraction</span>
            </button>
          </div>
        </div>

        {/* Running Focus Timer Banner indicator */}
        {timerRunning && timerMode === 'focus' && (
          <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-300">
            <div className="flex items-center gap-2.5">
              <span className="size-2 animate-ping rounded-full bg-emerald-500" />
              <p className="font-medium">
                Focus Session is actively running! Logging a distraction here keeps your timer ticking seamlessly without interruptions.
              </p>
            </div>
            {onNavigateToTimer && (
              <button
                type="button"
                onClick={onNavigateToTimer}
                className="flex items-center gap-1 font-semibold underline underline-offset-4 hover:opacity-80"
              >
                <span>View Timer</span>
                <ArrowRight className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </section>

      {/* 2. Key Metrics Grid */}
      <section aria-label="Distraction metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Today's Distractions */}
        <div className="group relative overflow-hidden rounded-3xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Today's Distractions</p>
              <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-foreground">
                {todayDistractionCount}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {todayDistractionCount === 0
                  ? 'No interruptions yet today'
                  : `${todayDistractionCount} ${todayDistractionCount === 1 ? 'log' : 'logs'} recorded today`}
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock className="size-5" />
            </span>
          </div>
        </div>

        {/* Current Week's Distractions */}
        <div className="group relative overflow-hidden rounded-3xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">This Week</p>
              <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-foreground">
                {weeklyDistractionCount}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Past 7 days across all sessions
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Calendar className="size-5" />
            </span>
          </div>
        </div>

        {/* Top Interruption Category */}
        <div className="group relative overflow-hidden rounded-3xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Top Interruption</p>
              <p className="mt-2 truncate font-mono text-lg font-bold tracking-tight text-foreground sm:text-xl">
                {topDistractionCategory || 'None yet'}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {topDistractionCategory ? 'Most frequent interruption' : 'Awaiting your first log'}
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              {topDistractionCategory && CATEGORY_CONFIG[topDistractionCategory as DistractionCategory] ? (
                (() => {
                  const Icon = CATEGORY_CONFIG[topDistractionCategory as DistractionCategory].icon
                  return <Icon className="size-5" />
                })()
              ) : (
                <Target className="size-5" />
              )}
            </span>
          </div>
        </div>

        {/* Returned to Study Rate */}
        <div className="group relative overflow-hidden rounded-3xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Return to Study</p>
              <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-foreground">
                {distractions.length > 0 ? `${returnRate}%` : '—'}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {distractions.length > 0 ? 'Resilience after interruption' : 'Tracked upon logging'}
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="size-5" />
            </span>
          </div>
        </div>
      </section>

      {/* 3. Distraction Insights & Weekly Trends */}
      <section aria-label="Distraction insights" className="grid gap-6 lg:grid-cols-2">
        {/* Daily Interruption Distribution (7 Days) */}
        <div className="flex flex-col rounded-3xl border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-foreground">Daily Interruption Frequency</h3>
              <p className="text-xs text-muted-foreground">Actual distraction records over the past 7 days</p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">7 Days</span>
          </div>

          <div className="mt-6 flex h-36 items-end gap-2 sm:gap-3">
            {dailyBreakdown.days.map(({ dayName, count, isToday }) => {
              const heightPct =
                dailyBreakdown.maxCount > 0 ? Math.max(12, Math.round((count / dailyBreakdown.maxCount) * 100)) : 12

              return (
                <div key={dayName} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-[11px] font-mono font-medium text-muted-foreground">
                    {count > 0 ? count : ''}
                  </span>
                  <div className="relative flex w-full flex-1 items-end justify-center rounded-xl bg-muted/40 p-1">
                    <div
                      className={cn(
                        'w-full rounded-lg transition-all duration-500',
                        count === 0
                          ? 'h-1.5 bg-muted-foreground/20'
                          : isToday
                          ? 'bg-gradient-to-t from-primary to-[oklch(0.6_0.2_300)] shadow-md shadow-primary/20'
                          : 'bg-primary/50'
                      )}
                      style={{ height: count > 0 ? `${heightPct}%` : '6px' }}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-medium',
                      isToday ? 'text-primary font-bold' : 'text-muted-foreground'
                    )}
                  >
                    {dayName}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="mt-4 border-t pt-3 text-[11px] text-muted-foreground">
            {weekComparison.hasEnoughData ? (
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                {weekComparison.diff < 0 ? (
                  <>
                    <TrendingDown className="size-3.5 text-emerald-500" />
                    <span className="text-emerald-500">
                      {Math.abs(weekComparison.diff)} fewer distractions
                    </span>{' '}
                    compared with the previous 7-day period ({weekComparison.prevCount} last week vs{' '}
                    {weekComparison.thisCount} this week).
                  </>
                ) : weekComparison.diff > 0 ? (
                  <>
                    <TrendingUp className="size-3.5 text-amber-500" />
                    <span className="text-amber-500">
                      +{weekComparison.diff} distractions
                    </span>{' '}
                    compared with the previous 7-day period ({weekComparison.prevCount} last week vs{' '}
                    {weekComparison.thisCount} this week).
                  </>
                ) : (
                  <>
                    <span>Same count</span> as the previous 7 days ({weekComparison.thisCount} logs).
                  </>
                )}
              </div>
            ) : (
              <p>
                More entries are needed across multiple days before reliable weekly comparison trends can be established.
              </p>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="flex flex-col rounded-3xl border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-foreground">Category Breakdown</h3>
              <p className="text-xs text-muted-foreground">Distribution of triggers from your saved records</p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {distractions.length} {distractions.length === 1 ? 'total' : 'totals'}
            </span>
          </div>

          <div className="mt-4 flex-1 space-y-3">
            {categoryBreakdown.length === 0 ? (
              <div className="flex h-36 flex-col items-center justify-center text-center text-xs text-muted-foreground">
                <Info className="mb-2 size-5 text-muted-foreground/60" />
                <p>No distraction data recorded yet.</p>
                <p className="text-[11px]">Log your interruptions to see which categories occur most often.</p>
              </div>
            ) : (
              categoryBreakdown.slice(0, 5).map(({ category, count, percentage }) => {
                const conf = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['Other']
                const Icon = conf.icon
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="flex items-center gap-1.5">
                        <Icon className={cn('size-3.5', conf.textClass)} />
                        <span>{category}</span>
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', conf.bgClass.replace('/10', ''))}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <p className="mt-4 border-t pt-3 text-[11px] text-muted-foreground">
            {distractions.length < 3
              ? 'Record a few more entries to identify recurring triggers accurately.'
              : 'Grounded strictly in your logged events. No assumptions or external estimates.'}
          </p>
        </div>
      </section>

      {/* 4. Distraction History & Filters */}
      <section aria-label="Distraction history" className="rounded-3xl border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <h3 className="text-base font-semibold text-foreground">Distraction History</h3>
            <p className="text-xs text-muted-foreground">
              Timeline of logged interruptions with notes, intensity, and study return status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes or category..."
                className="h-9 w-44 rounded-xl border bg-background/50 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:w-56"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Date Range Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
              className="h-9 rounded-xl border bg-background/50 px-2.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Dates</option>
              <option value="today">Today Only</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="h-9 rounded-xl border bg-background/50 px-2.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Categories</option>
              {CATEGORY_LIST.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* History List */}
        <div className="mt-6 space-y-3">
          {filteredDistractions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center sm:p-12">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Compass className="size-6" />
              </div>
              <h4 className="mt-3 text-sm font-semibold text-foreground">
                {distractions.length === 0
                  ? 'No distractions logged yet'
                  : 'No entries match your selected filter'}
              </h4>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                {distractions.length === 0
                  ? 'Whenever a notification, stray thought, or noise interrupts your study flow, click "Log Distraction". Logging it without judgment is the fastest way to train laser focus.'
                  : 'Try clearing the search query or changing your category and date filters to view previous entries.'}
              </p>
              {distractions.length === 0 ? (
                <button
                  type="button"
                  onClick={openNewDistractionModal}
                  className="mt-4 flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow transition hover:opacity-95"
                >
                  <Plus className="size-3.5" />
                  <span>Log Your First Distraction</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryFilter('all')
                    setDateFilter('all')
                    setSearchQuery('')
                  }}
                  className="mt-4 text-xs font-semibold text-primary underline underline-offset-4 hover:opacity-80"
                >
                  Reset all filters
                </button>
              )}
            </div>
          ) : (
            filteredDistractions.map((entry) => {
              const conf = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG['Other']
              const Icon = conf.icon
              const isDeleting = deleteConfirmId === entry.id

              return (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-2xl border bg-background/50 p-4 transition-all hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3.5">
                    <span
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-xl border text-base',
                        conf.badgeClass
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{entry.category}</span>
                        {/* Intensity Badge */}
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            entry.intensity === 'Low' && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                            entry.intensity === 'Medium' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                            entry.intensity === 'High' && 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {entry.intensity} Intensity
                        </span>

                        {/* Returned to Study indicator */}
                        {entry.returnedToStudying ? (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            <Check className="size-3" />
                            <span>Returned to Study</span>
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Did not return
                          </span>
                        )}

                        {entry.sessionId && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            In Focus Session
                          </span>
                        )}
                      </div>

                      {entry.note && (
                        <p className="text-xs italic text-foreground/80">"{entry.note}"</p>
                      )}

                      <p className="text-[11px] text-muted-foreground">
                        {formatTimestamp(entry.timestamp)}
                      </p>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    {isDeleting ? (
                      <div className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-1 text-[11px] text-rose-600 dark:text-rose-400 animate-in fade-in">
                        <span className="px-1 font-medium">Delete?</span>
                        <button
                          type="button"
                          onClick={() => {
                            deleteDistraction(entry.id)
                            setDeleteConfirmId(null)
                          }}
                          className="rounded-lg bg-rose-600 px-2 py-0.5 font-bold text-white hover:bg-rose-700"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="rounded-lg px-2 py-0.5 text-muted-foreground hover:bg-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditDistractionModal(entry)}
                          aria-label={`Edit ${entry.category} entry`}
                          className="flex size-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                        >
                          <Edit3 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(entry.id)}
                          aria-label={`Delete ${entry.category} entry`}
                          className="flex size-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition hover:border-rose-500/40 hover:text-rose-500"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* 5. Log / Edit Distraction Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="distraction-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
        >
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border bg-card p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {editingEntry ? <Edit3 className="size-4" /> : <Plus className="size-4" />}
                </span>
                <h3 id="distraction-modal-title" className="text-lg font-bold text-foreground">
                  {editingEntry ? 'Edit Distraction' : 'Log a Distraction'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close dialog"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {timerRunning && timerMode === 'focus' && !editingEntry && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                <span>Timer is ticking normally in the background. Logging will not reset or pause your focus session.</span>
              </div>
            )}

            <form onSubmit={handleSaveDistraction} className="mt-4 space-y-4">
              {/* Category selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  What Interrupted You? <span className="text-rose-500">*</span>
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {CATEGORY_LIST.map((cat) => {
                    const conf = CATEGORY_CONFIG[cat]
                    const Icon = conf.icon
                    const isSelected = formCategory === cat
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormCategory(cat)}
                        className={cn(
                          'flex items-center gap-2 rounded-xl border p-2 text-left text-xs font-medium transition-all',
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                            : 'border-border/60 bg-background/50 text-foreground hover:bg-muted/50'
                        )}
                      >
                        <Icon className={cn('size-4 shrink-0', conf.textClass)} />
                        <span className="truncate">{cat}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Intensity level */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Distraction Intensity
                </label>
                <div className="mt-1.5 flex gap-2">
                  {(['Low', 'Medium', 'High'] as DistractionIntensity[]).map((lvl) => {
                    const isSel = formIntensity === lvl
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setFormIntensity(lvl)}
                        className={cn(
                          'flex-1 rounded-xl border py-2 text-xs font-semibold transition-all',
                          isSel
                            ? lvl === 'Low'
                              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : lvl === 'Medium'
                              ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            : 'border-border/60 bg-background/40 text-muted-foreground hover:bg-muted/40'
                        )}
                      >
                        {lvl}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Returned to studying toggle */}
              <div className="flex items-center justify-between rounded-xl border bg-background/50 p-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">Returned to Studying Afterward?</p>
                  <p className="text-[11px] text-muted-foreground">
                    Did you resume your focus block after dealing with this?
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formReturned}
                  onClick={() => setFormReturned((prev) => !prev)}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary',
                    formReturned ? 'bg-emerald-500' : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200',
                      formReturned ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              {/* Short note */}
              <div>
                <label htmlFor={categoryNoteId} className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Short Note <span className="font-normal text-muted-foreground/60">(Optional)</span>
                </label>
                <input
                  id={categoryNoteId}
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="e.g., Friend texted about dinner, checked tab for 30s..."
                  maxLength={120}
                  className="mt-1.5 h-10 w-full rounded-xl border bg-background/50 px-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {formError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 p-2.5 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-2.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow hover:opacity-95"
                >
                  <Check className="size-3.5" />
                  <span>{editingEntry ? 'Update Distraction' : 'Save Distraction'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. AI Reflection Modal */}
      {reflectionOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reflection-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
        >
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border bg-card p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="size-4" />
                </span>
                <h3 id="reflection-modal-title" className="text-lg font-bold text-foreground">
                  Distraction Reflection
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReflectionOpen(false)}
                aria-label="Close reflection dialog"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4">
              {reflecting ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    Analyzing your real journal logs...
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Synthesizing supportive suggestions tailored to your patterns.
                  </p>
                </div>
              ) : reflectionError ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-400">
                  <p className="font-semibold">Unable to generate reflection</p>
                  <p className="mt-1">{reflectionError}</p>
                  <button
                    type="button"
                    onClick={handleRequestReflection}
                    className="mt-3 flex items-center gap-1.5 font-bold underline underline-offset-4"
                  >
                    <RefreshCw className="size-3" />
                    <span>Try again</span>
                  </button>
                </div>
              ) : reflection ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <h4 className="font-semibold text-primary text-sm sm:text-base">
                      {reflection.headline}
                    </h4>
                    <p className="mt-2 text-xs leading-relaxed text-foreground/90 whitespace-pre-line">
                      {reflection.summary}
                    </p>
                  </div>

                  {reflection.patternObserved && (
                    <div className="rounded-xl border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Pattern: </span>
                      {reflection.patternObserved}
                    </div>
                  )}

                  {reflection.suggestions && reflection.suggestions.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Supportive Steps For Your Next Session:
                      </h5>
                      <ul className="mt-2 space-y-2">
                        {reflection.suggestions.map((s, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 rounded-xl border bg-background/40 p-2.5 text-xs text-foreground"
                          >
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                              {idx + 1}
                            </span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setReflectionOpen(false)}
                      className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow hover:opacity-95"
                    >
                      Got it, let's focus!
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
