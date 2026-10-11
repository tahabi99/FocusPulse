'use client'

import { Clock, Flame, Target, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DAILY_GOAL_MINUTES, dateKey, daysAgo, formatHours, useFocusPulse } from './store'

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HEATMAP_WEEKS = 52

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  progress,
}: {
  icon: typeof Clock
  label: string
  value: string
  hint: string
  tone: 'primary' | 'accent' | 'amber'
  progress?: number
}) {
  const toneStyles = {
    primary: 'from-primary/20 text-primary',
    accent: 'from-accent/20 text-accent',
    amber: 'from-[oklch(0.78_0.15_70)]/20 text-[oklch(0.75_0.15_70)]',
  }[tone]
  const barStyles = {
    primary: 'bg-primary',
    accent: 'bg-accent',
    amber: 'bg-[oklch(0.75_0.15_70)]',
  }[tone]

  return (
    <div className="group relative overflow-hidden rounded-3xl border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
      <div
        aria-hidden
        className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-60', toneStyles)}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <span className={cn('flex size-10 items-center justify-center rounded-xl bg-background/70', toneStyles)}>
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
      {progress !== undefined && (
        <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all duration-700', barStyles)}
            style={{ width: `${Math.min(100, progress)}%` }}
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
          <p className="text-xs text-muted-foreground">Daily focus minutes, last 7 days</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold">{formatHours(total)}</p>
          <p className="flex items-center justify-end gap-1 text-xs text-accent">
            <TrendingUp className="size-3" aria-hidden />
            avg {formatHours(Math.round(total / 7))}/day
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
                      : 'bg-gradient-to-t from-primary/50 to-primary',
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
  if (minutes < 60) return 'bg-heat-1'
  if (minutes < 120) return 'bg-heat-2'
  if (minutes < 180) return 'bg-heat-3'
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
            {activeDays} active days in the last year
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
                    heatLevel(minutes),
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

export function AnalyticsDashboard() {
  const { history, todayMinutes, streak, completionRate, tasks } = useFocusPulse()
  const doneCount = tasks.filter((t) => t.done).length

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Clock}
          label="Total Focus Hours Today"
          value={formatHours(todayMinutes)}
          hint={`${Math.round((todayMinutes / DAILY_GOAL_MINUTES) * 100)}% of ${formatHours(DAILY_GOAL_MINUTES)} goal`}
          tone="primary"
          progress={(todayMinutes / DAILY_GOAL_MINUTES) * 100}
        />
        <StatCard
          icon={Flame}
          label="Weekly Streak"
          value={`${streak} ${streak === 1 ? 'Day' : 'Days'}`}
          hint={streak >= 5 ? 'On fire — keep it going' : 'Study 15+ min daily to grow it'}
          tone="amber"
          progress={(Math.min(streak, 7) / 7) * 100}
        />
        <StatCard
          icon={Target}
          label="Completion Rate"
          value={`${completionRate}%`}
          hint={`${doneCount} of ${tasks.length} goals completed`}
          tone="accent"
          progress={completionRate}
        />
      </div>
      <WeeklyChart history={history} />
      <ContributionHeatmap history={history} />
    </div>
  )
}
