'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrainCircuit, CalendarCheck, Flame, Lightbulb, RefreshCw, Sparkles, Target, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DAILY_GOAL_MINUTES, dateKey, daysAgo, formatHours, useFocusPulse } from './store'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type Insight = { icon: typeof Sparkles; title: string; body: string; tag: string }

const ICON_MAP: Record<string, typeof Sparkles> = {
  zap: Zap,
  calendar: CalendarCheck,
  flame: Flame,
  target: Target,
  sparkles: Sparkles,
  brain: BrainCircuit,
}

export function AiInsights() {
  const { history, todayMinutes, streak, completionRate, tasks, sessionsToday } = useFocusPulse()
  const [index, setIndex] = useState(0)
  const [thinking, setThinking] = useState(false)
  const [liveInsights, setLiveInsights] = useState<Insight[] | null>(null)
  const [isAiPowered, setIsAiPowered] = useState(false)

  const { fallbackInsights, bestDay, weekAvg, averages } = useMemo(() => {
    const totals = Array(7).fill(0)
    const counts = Array(7).fill(0)
    for (let i = 1; i <= 56; i++) {
      const date = daysAgo(i)
      totals[date.getDay()] += history[dateKey(date)] ?? 0
      counts[date.getDay()]++
    }
    const avgs = totals.map((t, i) => Math.round(t / counts[i]))
    const best = avgs.indexOf(Math.max(...avgs))
    const worst = avgs.indexOf(Math.min(...avgs))
    const lastWeek = Array.from({ length: 7 }, (_, i) => history[dateKey(daysAgo(i + 1))] ?? 0)
    const avg = Math.round(lastWeek.reduce((a, b) => a + b, 0) / 7)
    const openTasks = tasks.filter((t) => !t.done).length

    const list: Insight[] = []
    if (avg === 0 && todayMinutes === 0) {
      list.push({
        icon: Zap,
        tag: 'Momentum',
        title: 'Ready to begin your study streak',
        body: 'Start with a 25-minute Pomodoro focus block today. Short, dedicated sessions build steady academic momentum without burnout.',
      })
    } else if (todayMinutes < avg) {
      list.push({
        icon: Zap,
        tag: 'Momentum',
        title: `You're ${formatHours(avg - todayMinutes)} behind your usual pace`,
        body: `Your 7-day average is ${formatHours(avg)}. A focused 25-minute session would put you right back on track — start one now while your mind is fresh.`,
      })
    } else {
      list.push({
        icon: Zap,
        tag: 'Momentum',
        title: 'You are ahead of your average today',
        body: `You've logged ${formatHours(todayMinutes)} versus a ${formatHours(avg)} daily average. Great dedication today!`,
      })
    }

    if (avgs[best] > 0) {
      list.push({
        icon: CalendarCheck,
        tag: 'Pattern',
        title: `${WEEKDAYS[best]}s are your power days`,
        body: `You average ${formatHours(avgs[best])} on ${WEEKDAYS[best]}s. Schedule your most challenging topics for ${WEEKDAYS[best]} to maximize retention.`,
      })
    } else {
      list.push({
        icon: CalendarCheck,
        tag: 'Pattern',
        title: 'Discover your optimal study rhythm',
        body: 'As you complete focus sessions across different weekdays, FocusPulse will reveal your peak concentration days and optimal study times.',
      })
    }
    list.push({
      icon: Flame,
      tag: 'Consistency',
      title: streak >= 5 ? `${streak}-day streak — you're building a real habit` : 'Short, daily sessions beat weekend cramming',
      body:
        streak >= 5
          ? 'Research shows habits solidify around consistent repetition. Protect the streak with at least one session tomorrow, even a short one.'
          : 'Aim for at least 15 focused minutes every day this week. Consistency compounds faster than occasional marathons.',
    })
    list.push({
      icon: Target,
      tag: 'Goals',
      title: completionRate >= 50 ? `${completionRate}% of goals done — strong follow-through` : 'Your task list may be too ambitious',
      body:
        openTasks > 0
          ? `You have ${openTasks} open ${openTasks === 1 ? 'task' : 'tasks'}. Pair your next focus session with the smallest one to build quick wins.`
          : 'Every goal is checked off. Add one stretch task for tomorrow to keep the momentum going.',
    })
    return { fallbackInsights: list, bestDay: WEEKDAYS[best], weekAvg: avg, averages: avgs }
  }, [history, todayMinutes, streak, completionRate, tasks])

  const fetchAiInsights = useCallback(async () => {
    setThinking(true)
    try {
      const openTasks = tasks.filter((t) => !t.done).length
      const res = await fetch('/api/gemini/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          todayMinutes,
          weekAvg,
          streak,
          completionRate,
          openTasks,
          totalTasks: tasks.length,
          weekdayAverages: averages,
          bestDay,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.insights && Array.isArray(data.insights) && data.insights.length > 0) {
          const mapped: Insight[] = data.insights.map(
            (item: { tag: string; title: string; body: string; iconName?: string }) => ({
              tag: item.tag || 'AI Insight',
              title: item.title,
              body: item.body,
              icon: (item.iconName && ICON_MAP[item.iconName.toLowerCase()]) || Sparkles,
            })
          )
          setLiveInsights(mapped)
          setIsAiPowered(true)
          return
        }
      }
    } catch {
      // Fallback seamlessly to local rule-based heuristics
    } finally {
      setThinking(false)
    }
  }, [todayMinutes, weekAvg, streak, completionRate, tasks, averages, bestDay])

  useEffect(() => {
    void fetchAiInsights()
  }, [fetchAiInsights])

  const insights = liveInsights && liveInsights.length > 0 ? liveInsights : fallbackInsights
  const current = insights[index % insights.length]
  const Icon = current.icon

  const handleNextInsight = () => {
    setThinking(true)
    setTimeout(() => {
      setIndex((i) => i + 1)
      setThinking(false)
    }, 400)
  }

  const handleRegenerate = async () => {
    await fetchAiInsights()
    setIndex((i) => i + 1)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section
        aria-label="AI insight"
        className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/25 via-card to-accent/20 p-6 sm:p-8"
      >
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-accent/25 blur-3xl" />
        <div className="relative flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
                <BrainCircuit className="size-6 text-white" aria-hidden />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">FocusPulse AI</h2>
                  {isAiPowered && (
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
                      Gemini Live
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Based on your last 8 weeks</p>
              </div>
            </div>
            <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              {current.tag}
            </span>
          </div>

          <div aria-live="polite" className={cn('min-h-36 transition-opacity duration-300', thinking && 'opacity-30')}>
            <div className="mb-3 flex items-center gap-2 text-primary">
              <Icon className="size-5" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wider">Recommendation</span>
            </div>
            <p className="text-balance text-xl font-semibold leading-snug sm:text-2xl">{current.title}</p>
            <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">{current.body}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5" aria-hidden>
              {insights.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === index % insights.length ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60',
                  )}
                  aria-label={`Go to insight ${i + 1}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleNextInsight}
                disabled={thinking}
                className="rounded-xl border bg-background/60 px-3 py-2 text-xs font-medium backdrop-blur transition-all hover:border-primary/50"
              >
                Next
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={thinking}
                className="flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-md transition-all hover:opacity-90 disabled:opacity-50"
              >
                <RefreshCw className={cn('size-3.5', thinking && 'animate-spin')} aria-hidden />
                {thinking ? 'Analyzing…' : 'Regenerate'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Pattern signals" className="flex flex-col gap-4 rounded-3xl border bg-card p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Lightbulb className="size-4 text-accent" aria-hidden />
          Signals we noticed
        </h2>
        <dl className="flex flex-col gap-3">
          {[
            { label: 'Best study day', value: bestDay },
            { label: '7-day average', value: formatHours(weekAvg) },
            { label: 'Daily goal', value: formatHours(DAILY_GOAL_MINUTES) },
            { label: 'Sessions today', value: String(sessionsToday) },
            { label: 'Current streak', value: `${streak} days` },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between rounded-2xl border bg-background/40 px-4 py-3 transition-colors hover:border-primary/30"
            >
              <dt className="text-sm text-muted-foreground">{s.label}</dt>
              <dd className="text-sm font-semibold">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
