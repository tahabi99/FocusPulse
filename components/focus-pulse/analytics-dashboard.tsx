'use client'

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  History,
  Play,
  Plus,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DAILY_GOAL_MINUTES,
  dateKey,
  daysAgo,
  formatHours,
  formatSecondsDetailed,
  useFocusPulse,
} from './store'
import { DailyStudyTipWidget } from './daily-study-tip'

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HEATMAP_WEEKS = 52

function StatCard({
  icon: Icon,
  label,
  value,
  subvalue,
  hint,
  tone,
  progress,
  isLive,
  onClick,
}: {
  icon: typeof Clock
  label: string
  value: string
  subvalue?: string
  hint: string
  tone: 'primary' | 'accent' | 'amber' | 'purple'
  progress?: number
  isLive?: boolean
  onClick?: () => void
}) {
  const toneStyles = {
    primary: 'from-primary/20 text-primary',
    accent: 'from-accent/20 text-accent',
    amber: 'from-[oklch(0.78_0.15_70)]/20 text-[oklch(0.75_0.15_70)]',
    purple: 'from-purple-500/20 text-purple-500',
  }[tone]
  const barStyles = {
    primary: 'bg-primary',
    accent: 'bg-accent',
    amber: 'bg-[oklch(0.75_0.15_70)]',
    purple: 'bg-purple-500',
  }[tone]

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        'group relative overflow-hidden rounded-3xl border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5',
        onClick && 'cursor-pointer hover:border-purple-500/40'
      )}
    >
      <div
        aria-hidden
        className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-60', toneStyles)}
      />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{label}</p>
            {isLive && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                LIVE
              </span>
            )}
          </div>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          {subvalue && <p className="text-xs font-medium text-foreground/80">{subvalue}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl bg-background/70', toneStyles)}>
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
      {progress !== undefined && (
        <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all duration-700', barStyles)}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  )
}

function WeeklyChart({ history }: { history: Record<string, number> }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = daysAgo(6 - i)
    return { date, minutes: history[dateKey(date)] ?? 0, isToday: i === 6 }
  })
  const max = Math.max(DAILY_GOAL_MINUTES, ...days.map((d) => d.minutes))
  const total = days.reduce((s, d) => s + d.minutes, 0)
  const goalPct = (DAILY_GOAL_MINUTES / max) * 100

  return (
    <section aria-label="Weekly focus chart" className="rounded-3xl border bg-card p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">This week</h2>
          <p className="text-xs text-muted-foreground">Daily focus minutes, last 7 days (Live)</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-semibold">{formatHours(total)}</p>
          <p className="flex items-center justify-end gap-1 text-xs text-accent">
            <TrendingUp className="size-3" aria-hidden />
            {total > 0 ? `avg ${formatHours(Math.round(total / 7))}/day` : 'No focus logged this week yet'}
          </p>
        </div>
      </div>
      <div className="relative h-56">
        <div
          className="absolute inset-x-0 border-t border-dashed border-accent/50"
          style={{ bottom: `calc(${goalPct}% * 0.86 + 28px)` }}
          aria-hidden
        >
          <span className="absolute -top-5 right-0 text-[10px] font-medium text-accent">
            Goal {formatHours(DAILY_GOAL_MINUTES)}
          </span>
        </div>
        <ul className="flex h-full items-end gap-2 sm:gap-4">
          {days.map(({ date, minutes, isToday }) => (
            <li key={dateKey(date)} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                {formatHours(minutes)}
              </span>
              <div className="flex h-[86%] w-full max-w-12 items-end">
                <div
                  className={cn(
                    'w-full rounded-t-xl rounded-b-md transition-all duration-500 group-hover:brightness-125',
                    isToday
                      ? 'bg-gradient-to-t from-accent/70 to-accent'
                      : 'bg-gradient-to-t from-primary/50 to-primary'
                  )}
                  style={{ height: `${Math.max(3, (minutes / max) * 100)}%` }}
                  aria-label={`${WEEKDAY_SHORT[date.getDay()]}: ${formatHours(minutes)}`}
                  role="img"
                />
              </div>
              <span className={cn('text-xs', isToday ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                {isToday ? 'Today' : WEEKDAY_SHORT[date.getDay()]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function heatLevel(minutes: number) {
  if (minutes <= 0) return 'bg-heat-0'
  if (minutes < 30) return 'bg-heat-1'
  if (minutes < 60) return 'bg-heat-2'
  if (minutes < 120) return 'bg-heat-3'
  return 'bg-heat-4'
}

function ContributionHeatmap({ history }: { history: Record<string, number> }) {
  const today = daysAgo(0)
  const totalDays = (HEATMAP_WEEKS - 1) * 7 + today.getDay() + 1
  const start = daysAgo(totalDays - 1)
  const weeks: { date: Date; minutes: number }[][] = []
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    const col: { date: Date; minutes: number }[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start)
      date.setDate(start.getDate() + w * 7 + d)
      if (date > today) break
      col.push({ date, minutes: history[dateKey(date)] ?? 0 })
    }
    weeks.push(col)
  }
  const activeDays = weeks.flat().filter((d) => d.minutes > 0).length

  return (
    <section aria-label="Study habit heatmap" className="rounded-3xl border bg-card p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Study habits</h2>
          <p className="text-xs text-muted-foreground">
            {activeDays} {activeDays === 1 ? 'active day' : 'active days'} in the last year
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          Less
          {['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4'].map((c) => (
            <span key={c} className={cn('size-3 rounded-[3px]', c)} aria-hidden />
          ))}
          More
        </div>
      </div>
      <div className="overflow-x-auto pb-1" ref={(el) => { if (el) el.scrollLeft = el.scrollWidth }}>
        <div className="flex min-w-max gap-1">
          <div className="mr-1 grid grid-rows-7 gap-1 text-[10px] text-muted-foreground" aria-hidden>
            {WEEKDAY_SHORT.map((d, i) => (
              <span key={d} className="flex h-3.5 items-center">
                {i % 2 === 1 ? d : ''}
              </span>
            ))}
          </div>
          {weeks.map((col, w) => (
            <div key={w} className="grid grid-rows-7 gap-1">
              {col.map(({ date, minutes }) => (
                <span
                  key={dateKey(date)}
                  role="img"
                  aria-label={`${date.toDateString()}: ${formatHours(minutes)} focused`}
                  title={`${date.toDateString()} · ${formatHours(minutes)}`}
                  className={cn(
                    'size-3.5 rounded-[4px] transition-transform duration-150 hover:scale-125 hover:ring-2 hover:ring-accent/60',
                    heatLevel(minutes)
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function RecentSessionsLog() {
  const { sessions, deleteSession, addFocusMinutes } = useFocusPulse()
  const focusSessions = sessions.filter((s) => s.status === 'completed' && s.mode === 'focus')

  return (
    <section aria-label="Recent focus sessions" className="rounded-3xl border bg-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <History className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Session History</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {focusSessions.length} {focusSessions.length === 1 ? 'session' : 'sessions'} recorded
          </span>
          <button
            type="button"
            onClick={() => addFocusMinutes(25)}
            className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Plus className="size-3" />
            <span>+25m Quick Log</span>
          </button>
        </div>
      </div>

      {focusSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <Clock className="mb-2 size-8 opacity-40" />
          <p className="text-sm font-medium">No sessions completed yet</p>
          <p className="mt-0.5 text-xs">
            Start a focus session in the Focus Timer tab to record your study time.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/40 overflow-hidden rounded-2xl border bg-background/40">
          {focusSessions.slice(0, 10).map((s) => {
            const completedDate = new Date(s.completedAt)
            const timeStr = completedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            const dateStr = completedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
            const durationMins = Math.max(1, Math.round(s.actualDurationSeconds / 60))

            return (
              <div
                key={s.id}
                className="group flex items-center justify-between p-3.5 transition-colors hover:bg-background/80"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {durationMins} min Focus Session
                      </span>
                      <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                        Completed
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {dateStr} at {timeStr}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-foreground">
                    +{durationMins}m ({formatSecondsDetailed(s.actualDurationSeconds)})
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteSession(s.id)}
                    aria-label="Delete session record"
                    className="rounded-lg p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export function AnalyticsDashboard({
  onNavigateToTimer,
  onNavigateToJournal,
}: {
  onNavigateToTimer?: () => void
  onNavigateToJournal?: () => void
}) {
  const {
    history,
    todayMinutes,
    todayTotalSeconds,
    streak,
    completionRate,
    tasks,
    todayDistractionCount,
    weeklyDistractionCount,
    timerRunning,
    timerMode,
    activeElapsedSeconds,
    logCurrentSession,
  } = useFocusPulse()

  const doneCount = tasks.filter((t) => t.done).length
  const isFocusingLive = timerRunning && timerMode === 'focus'

  return (
    <div className="flex flex-col gap-6">
      {/* REAL-TIME LIVE FOCUS TRACKER BANNER */}
      {(timerRunning || activeElapsedSeconds > 0) && (
        <section
          aria-label="Real-time live focus tracker"
          className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-card to-primary/10 p-5 shadow-lg shadow-emerald-500/5 animate-in fade-in"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
                <Clock className="size-6 animate-pulse" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="size-2 animate-ping rounded-full bg-emerald-500" />
                    {timerRunning ? 'LIVE FOCUSING NOW' : 'SESSION PAUSED'}
                  </span>
                  <span className="text-xs text-muted-foreground">Mode: {timerMode}</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                    {formatSecondsDetailed(activeElapsedSeconds)}
                  </span>
                  <span className="text-xs text-muted-foreground">elapsed in current session</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeElapsedSeconds >= 5 && timerMode === 'focus' && (
                <button
                  type="button"
                  onClick={logCurrentSession}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/25 transition-all hover:bg-emerald-500 active:translate-y-0"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>Save & Log Session</span>
                </button>
              )}
              {onNavigateToTimer && (
                <button
                  type="button"
                  onClick={onNavigateToTimer}
                  className="flex items-center gap-1 rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-xs font-medium text-foreground transition-all hover:bg-muted"
                >
                  <span>Go to Timer</span>
                  <ArrowRight className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      <DailyStudyTipWidget />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Clock}
          label="Total Focus Time Today"
          value={formatSecondsDetailed(todayTotalSeconds)}
          subvalue={todayMinutes > 0 ? `${todayMinutes} min total` : undefined}
          hint={
            todayMinutes > 0
              ? `${Math.round((todayMinutes / DAILY_GOAL_MINUTES) * 100)}% of ${formatHours(DAILY_GOAL_MINUTES)} goal`
              : `Goal: ${formatHours(DAILY_GOAL_MINUTES)} daily`
          }
          tone="primary"
          progress={(todayTotalSeconds / (DAILY_GOAL_MINUTES * 60)) * 100}
          isLive={isFocusingLive}
        />
        <StatCard
          icon={Flame}
          label="Weekly Streak"
          value={`${streak} ${streak === 1 ? 'Day' : 'Days'}`}
          hint={
            streak >= 5
              ? 'On fire — keep it going'
              : streak > 0
              ? 'Consistent study habit forming'
              : 'Study 15+ min to start your streak'
          }
          tone="amber"
          progress={(Math.min(streak, 7) / 7) * 100}
        />
        <StatCard
          icon={Target}
          label="Completion Rate"
          value={`${completionRate}%`}
          hint={
            tasks.length > 0
              ? `${doneCount} of ${tasks.length} goals completed`
              : 'Add goals in the Goals tab'
          }
          tone="accent"
          progress={completionRate}
        />
        <StatCard
          icon={BookOpen}
          label="Distractions Today"
          value={String(todayDistractionCount)}
          subvalue={weeklyDistractionCount > 0 ? `${weeklyDistractionCount} this week` : undefined}
          hint={
            todayDistractionCount === 0
              ? 'Clean focus session — 0 interruptions'
              : `${todayDistractionCount} ${todayDistractionCount === 1 ? 'interruption' : 'interruptions'} logged`
          }
          tone="purple"
          onClick={onNavigateToJournal}
        />
      </div>

      <WeeklyChart history={history} />
      <ContributionHeatmap history={history} />
      <RecentSessionsLog />
    </div>
  )
}
