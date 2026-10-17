'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Flame,
  History,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { dateKey, formatHours, useFocusPulse } from './store'

export interface DailyTipData {
  title: string
  category: string
  advice: string
  actionStep: string
  scientificPrinciple: string
  estimatedImpact: string
  tags?: string[]
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; icon: typeof Zap }> = {
  Momentum: {
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-500 dark:text-amber-400',
    icon: Zap,
  },
  'Deep Work': {
    bg: 'bg-primary/10 border-primary/20',
    text: 'text-primary',
    icon: Brain,
  },
  'Active Recall': {
    bg: 'bg-purple-500/10 border-purple-500/20',
    text: 'text-purple-500 dark:text-purple-400',
    icon: Sparkles,
  },
  'Habit Building': {
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-500 dark:text-emerald-400',
    icon: Flame,
  },
  'Cognitive Energy': {
    bg: 'bg-blue-500/10 border-blue-500/20',
    text: 'text-blue-500 dark:text-blue-400',
    icon: Clock,
  },
}

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

interface DailyStudyTipWidgetProps {
  className?: string
  variant?: 'card' | 'banner'
  onNavigateToTasks?: () => void
}

export function DailyStudyTipWidget({
  className,
  variant = 'card',
  onNavigateToTasks,
}: DailyStudyTipWidgetProps) {
  const { currentUser, todayMinutes, streak, completionRate, tasks, history } = useFocusPulse()
  const [tip, setTip] = useState<DailyTipData | null>(null)
  const [isLiveAi, setIsLiveAi] = useState(false)
  const [loading, setLoading] = useState(false)
  const [practiced, setPracticed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [pastTips, setPastTips] = useState<DailyTipData[]>([])
  const [expanded, setExpanded] = useState(true)
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null)

  const todayStr = useMemo(() => dateKey(new Date()), [])
  const userStorageKey = useMemo(
    () => `focuspulse:daily_tip:${currentUser?.id || 'guest'}:${todayStr}`,
    [currentUser?.id, todayStr]
  )
  const historyStorageKey = useMemo(
    () => `focuspulse:tip_history:${currentUser?.id || 'guest'}`,
    [currentUser?.id]
  )
  const practicedStorageKey = useMemo(
    () => `focuspulse:tip_practiced:${currentUser?.id || 'guest'}:${todayStr}`,
    [currentUser?.id, todayStr]
  )

  // Compute 7-day average
  const weekAvg = useMemo(() => {
    let sum = 0
    for (let i = 1; i <= 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      sum += history[dateKey(d)] ?? 0
    }
    return Math.round(sum / 7)
  }, [history])

  const openTasks = useMemo(() => tasks.filter((t) => !t.done).length, [tasks])

  // Load from local storage
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Load past tips history
    try {
      const storedHistory = localStorage.getItem(historyStorageKey)
      if (storedHistory) {
        setPastTips(JSON.parse(storedHistory))
      }
    } catch {
      // Ignore
    }

    // Load practiced state
    try {
      const isPracticed = localStorage.getItem(practicedStorageKey) === 'true'
      setPracticed(isPracticed)
    } catch {
      // Ignore
    }

    // Load today's tip if already generated
    try {
      const saved = localStorage.getItem(userStorageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.tip) {
          setTip(parsed.tip)
          setIsLiveAi(parsed.isLiveAi ?? true)
          return
        }
      }
    } catch {
      // Fall through to fetch
    }

    // If no tip saved for today, fetch
    fetchTip()
  }, [userStorageKey, practicedStorageKey, historyStorageKey])

  const fetchTip = useCallback(
    async (forceRefresh = false) => {
      setLoading(true)
      try {
        const timeOfDay = getTimeOfDay()
        const recentTitles = pastTips.map((t) => t.title).slice(-5)

        const res = await fetch('/api/gemini/daily-tip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            todayMinutes,
            weekAvg,
            streak,
            completionRate,
            openTasks,
            totalTasks: tasks.length,
            timeOfDay,
            recentTitles,
          }),
        })

        if (!res.ok) throw new Error('Failed to fetch tip')
        const data = await res.json()

        if (data.tip) {
          setTip(data.tip)
          setIsLiveAi(Boolean(data.isLiveAi))

          // Save to local storage
          try {
            localStorage.setItem(
              userStorageKey,
              JSON.stringify({ tip: data.tip, isLiveAi: data.isLiveAi })
            )
            // Add to past tips (deduplicated)
            setPastTips((prev) => {
              const filtered = prev.filter((p) => p.title !== data.tip.title)
              const updated = [data.tip, ...filtered].slice(0, 10)
              localStorage.setItem(historyStorageKey, JSON.stringify(updated))
              return updated
            })
          } catch {
            // Ignore storage errors
          }
        }
      } catch (err) {
        console.error('Daily tip error:', err)
      } finally {
        setLoading(false)
      }
    },
    [
      todayMinutes,
      weekAvg,
      streak,
      completionRate,
      openTasks,
      tasks.length,
      pastTips,
      userStorageKey,
      historyStorageKey,
    ]
  )

  const togglePracticed = () => {
    const next = !practiced
    setPracticed(next)
    try {
      localStorage.setItem(practicedStorageKey, String(next))
    } catch {
      // Ignore
    }
  }

  const copyTip = async () => {
    if (!tip) return
    const text = `💡 FocusPulse Daily Study Tip: ${tip.title}\n\n${tip.advice}\n\n🎯 Action Step: ${tip.actionStep}\n🧠 Science: ${tip.scientificPrinciple}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore clipboard error
    }
  }

  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    if (!tip) return

    window.speechSynthesis.cancel()
    const textToSpeak = `Daily Study Tip: ${tip.title}. ${tip.advice}. Action step: ${tip.actionStep}. Scientific principle: ${tip.scientificPrinciple}.`
    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    speechRef.current = utterance
    setIsSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const categoryConfig = tip ? CATEGORY_STYLES[tip.category] || CATEGORY_STYLES['Momentum'] : CATEGORY_STYLES['Momentum']
  const CategoryIcon = categoryConfig.icon

  // Compact Banner Variant
  if (variant === 'banner') {
    if (!tip && loading) {
      return (
        <div className={cn('mb-6 rounded-2xl border bg-card/60 p-4 backdrop-blur animate-pulse', className)}>
          <div className="flex items-center justify-between">
            <div className="h-4 w-48 rounded bg-muted" />
            <div className="h-4 w-20 rounded bg-muted" />
          </div>
        </div>
      )
    }

    if (!tip) return null

    return (
      <div
        className={cn(
          'group relative mb-6 overflow-hidden rounded-2xl border bg-card/70 p-4 shadow-sm backdrop-blur transition-all duration-300 hover:shadow-md hover:border-primary/40',
          className
        )}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-primary/10 blur-2xl transition-all group-hover:bg-primary/20" />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-[oklch(0.58_0.2_300)]/20 text-primary border border-primary/25">
              <Lightbulb className="size-4" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  Daily Study Tip
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                    categoryConfig.bg,
                    categoryConfig.text
                  )}
                >
                  <CategoryIcon className="size-2.5" />
                  {tip.category}
                </span>
                {isLiveAi && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Gemini 3.8
                  </span>
                )}
              </div>
              <h3 className="mt-0.5 text-sm font-semibold tracking-tight text-foreground">
                {tip.title}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1 sm:line-clamp-2">
                {tip.advice}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={togglePracticed}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                practiced
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border'
              )}
              title={practiced ? 'Marked as practiced today' : 'Commit to this tip today'}
            >
              <Check className={cn('size-3', practiced && 'stroke-[3] text-emerald-500')} />
              <span>{practiced ? 'Committed' : 'Practice'}</span>
            </button>

            <button
              type="button"
              onClick={() => fetchTip(true)}
              disabled={loading}
              className="inline-flex size-8 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
              title="Get another personalized tip"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin text-primary')} />
            </button>

            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="inline-flex size-8 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title={expanded ? 'Collapse tip details' : 'Expand tip details'}
            >
              {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="relative mt-3.5 pt-3.5 border-t border-border/50 text-xs text-muted-foreground space-y-2">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-foreground flex items-start gap-2">
              <Zap className="size-3.5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-primary">Action Step: </span>
                <span>{tip.actionStep}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Brain className="size-3 text-muted-foreground/80" />
                Principle: <strong className="font-medium text-foreground">{tip.scientificPrinciple}</strong>
              </span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground font-mono">
                {tip.estimatedImpact}
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Full Card Widget Variant (for Analytics Dashboard & Detailed Views)
  return (
    <section
      aria-label="Daily Study Tip widget"
      className={cn(
        'group relative overflow-hidden rounded-3xl border bg-card/80 p-6 shadow-sm backdrop-blur transition-all duration-300 hover:shadow-xl hover:shadow-primary/5',
        className
      )}
    >
      {/* Background ambient decorative glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-primary/15 to-[oklch(0.58_0.2_300)]/15 blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-70"
      />

      {/* Widget Header */}
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-[oklch(0.58_0.2_300)]/25 text-primary border border-primary/30 shadow-inner">
            <Lightbulb className="size-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                Daily Study Tip
              </h2>
              {tip && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                    categoryConfig.bg,
                    categoryConfig.text
                  )}
                >
                  <CategoryIcon className="size-3" />
                  {tip.category}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Personalized productivity coaching powered by Gemini AI
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* TTS Read Aloud */}
          <button
            type="button"
            onClick={toggleSpeech}
            disabled={!tip}
            className={cn(
              'inline-flex size-9 items-center justify-center rounded-xl border transition-colors',
              isSpeaking
                ? 'bg-primary text-primary-foreground border-primary shadow-sm animate-pulse'
                : 'bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            title={isSpeaking ? 'Stop voice readout' : 'Listen to this study tip'}
          >
            {isSpeaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>

          {/* Copy Tip */}
          <button
            type="button"
            onClick={copyTip}
            disabled={!tip}
            className="inline-flex size-9 items-center justify-center rounded-xl border bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Copy tip to clipboard"
          >
            {copied ? <Check className="size-4 text-emerald-500 stroke-[3]" /> : <Copy className="size-4" />}
          </button>

          {/* Past Tips History Toggle */}
          {pastTips.length > 1 && (
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                'inline-flex size-9 items-center justify-center rounded-xl border transition-colors',
                showHistory
                  ? 'bg-muted text-foreground border-foreground/20'
                  : 'bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title="View past daily tips"
            >
              <History className="size-4" />
            </button>
          )}

          {/* Refresh Tip */}
          <button
            type="button"
            onClick={() => fetchTip(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            title="Fetch a fresh personalized tip from Gemini"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin text-primary')} />
            <span className="hidden sm:inline">{loading ? 'Analyzing...' : 'New Tip'}</span>
          </button>
        </div>
      </div>

      {/* Widget Content */}
      <div className="relative mt-5">
        {loading && !tip ? (
          <div className="space-y-3 py-4 animate-pulse">
            <div className="h-5 w-2/3 rounded-lg bg-muted" />
            <div className="h-4 w-full rounded-lg bg-muted" />
            <div className="h-4 w-4/5 rounded-lg bg-muted" />
            <div className="h-16 w-full rounded-2xl bg-muted/60" />
          </div>
        ) : tip ? (
          <div className="flex flex-col gap-4">
            {/* Title & Core Advice */}
            <div>
              <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                {tip.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {tip.advice}
              </p>
            </div>

            {/* Action Step Box */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                    <Zap className="size-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      Actionable Step for Today
                    </span>
                    <p className="mt-0.5 text-sm font-medium text-foreground leading-snug">
                      {tip.actionStep}
                    </p>
                  </div>
                </div>

                {/* Practiced / Commitment Button */}
                <button
                  type="button"
                  onClick={togglePracticed}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-all duration-200 shrink-0',
                    practiced
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                      : 'bg-background hover:bg-muted text-foreground border border-border/80'
                  )}
                >
                  <Check className={cn('size-4', practiced && 'stroke-[3]')} />
                  <span>{practiced ? 'Committed for Today! ✨' : 'I will do this today'}</span>
                </button>
              </div>
            </div>

            {/* Scientific Principle & Estimated Impact Row */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-border/50 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1 text-muted-foreground">
                  <Brain className="size-3.5 text-primary" />
                  <span>Science:</span>
                  <strong className="font-semibold text-foreground">{tip.scientificPrinciple}</strong>
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 border border-accent/20 px-2.5 py-1 text-accent font-medium">
                  Impact: {tip.estimatedImpact}
                </span>
              </div>

              {/* Data Context Chips */}
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Flame className="size-3 text-amber-500" />
                  {streak}d streak
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3 text-primary" />
                  {formatHours(todayMinutes)} today
                </span>
                {isLiveAi && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live AI
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Optional Past Tips List */}
            {showHistory && pastTips.length > 0 && (
              <div className="mt-3 rounded-2xl border bg-background/50 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <History className="size-3.5" /> Recent Study Tips
                  </span>
                  <span className="text-[10px] text-muted-foreground">{pastTips.length} saved</span>
                </div>
                <div className="divide-y divide-border/40 max-h-48 overflow-y-auto">
                  {pastTips.map((pt, i) => (
                    <div
                      key={i}
                      className={cn(
                        'py-2 cursor-pointer transition-colors hover:text-primary',
                        pt.title === tip.title && 'font-semibold text-primary'
                      )}
                      onClick={() => setTip(pt)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{pt.title}</span>
                        <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                          {pt.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {pt.actionStep}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}
