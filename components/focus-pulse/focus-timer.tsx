'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BellRing,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  Coffee,
  Minus,
  Moon,
  MoreHorizontal,
  Pause,
  Phone,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  UserX,
  Utensils,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatHours,
  formatSecondsDetailed,
  useFocusPulse,
  type DistractionCategory,
  type DistractionIntensity,
} from './store'
import { createAudioContext, playChime, playClick } from './sound-engine'
import { AmbientSoundPanel, useAmbientSound, type AmbientKind } from './ambient-sound'

type Mode = 'focus' | 'break'
type Alert = { finished: Mode; minutes: number } | null

function DurationStepper({
  label,
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  disabled: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border bg-background/50 p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={disabled || value <= min}
          onClick={() => onChange(value - 1)}
          className="flex size-8 items-center justify-center rounded-lg border transition-colors hover:bg-muted disabled:opacity-40"
        >
          <Minus className="size-3.5" aria-hidden />
        </button>
        <span className="w-14 text-center font-mono text-sm tabular-nums">{value} min</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
          className="flex size-8 items-center justify-center rounded-lg border transition-colors hover:bg-muted disabled:opacity-40"
        >
          <Plus className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  )
}

export function FocusTimer({
  onOpenInsights,
  onOpenJournal,
  initialSurah,
}: {
  onOpenInsights: () => void
  onOpenJournal?: () => void
  initialSurah?: string
}) {
  const {
    timerMode,
    timerRunning,
    remainingSeconds,
    activeElapsedSeconds,
    focusMin,
    breakMin,
    targetSeconds,
    toggleTimer,
    resetTimer,
    logCurrentSession,
    setTimerMode,
    setTimerDuration,
    todayMinutes,
    todayTotalSeconds,
    sessionsToday,
    todayDistractionCount,
    addDistraction,
  } = useFocusPulse()

  const [soundOn, setSoundOn] = useState(true)
  const [chimeFlash, setChimeFlash] = useState(false)
  const [alert, setAlert] = useState<Alert>(null)

  // Quick Distraction Logging States (integrated with active running timer)
  const [distractionModalOpen, setDistractionModalOpen] = useState(false)
  const [distractionCat, setDistractionCat] = useState<DistractionCategory>('Phone / Social Media')
  const [distractionNote, setDistractionNote] = useState('')
  const [distractionIntensity, setDistractionIntensity] = useState<DistractionIntensity>('Medium')
  const [distractionReturned, setDistractionReturned] = useState(true)
  const [distractionToast, setDistractionToast] = useState<string | null>(null)

  const handleSaveQuickDistraction = (e: React.FormEvent) => {
    e.preventDefault()
    addDistraction({
      category: distractionCat,
      note: distractionNote.trim() || undefined,
      intensity: distractionIntensity,
      returnedToStudying: distractionReturned,
    })
    setDistractionModalOpen(false)
    setDistractionNote('')
    setDistractionToast('Distraction recorded! Focus timer keeps running.')
    setTimeout(() => setDistractionToast(null), 4000)
  }

  const audioRef = useRef<AudioContext | null>(null)
  const [ambient, setAmbient] = useState<AmbientKind>('lofi')
  const [surah, setSurah] = useState('055')
  const [withRain, setWithRain] = useState(true)
  const [volume, setVolume] = useState(0.6)
  const [previewing, setPreviewing] = useState(false)

  useEffect(() => {
    if (initialSurah) {
      setSurah(initialSurah)
      setAmbient('quran_rain')
    }
  }, [initialSurah])

  const ensureAudio = () => {
    if (!audioRef.current) audioRef.current = createAudioContext()
    void audioRef.current?.resume()
    return audioRef.current
  }

  const ambientAudio = useAmbientSound({
    kind: ambient,
    surah,
    withRain,
    volume,
    active: soundOn && (timerRunning || previewing),
    getContext: ensureAudio,
    onAutoAdvance: () => {
      const next = (Number(surah) % 114) + 1
      setSurah(String(next).padStart(3, '0'))
    },
  })
  const ambientAudible = soundOn && (timerRunning || previewing) && ambient !== 'off'

  const progress = Math.min(1, Math.max(0, 1 - remainingSeconds / (targetSeconds || 1)))

  // Audio effects
  const click = (kind: Parameters<typeof playClick>[1]) => {
    const ctx = ensureAudio()
    if (soundOn && ctx) playClick(ctx, kind)
  }

  const handleToggleRunning = () => {
    click(timerRunning ? 'pause' : 'start')
    if (!timerRunning) {
      setAlert(null)
      setPreviewing(false)
    }
    toggleTimer()
  }

  const handleReset = () => {
    click('reset')
    if (activeElapsedSeconds > 0 && timerMode === 'focus') {
      const savedMinutes = Math.max(1, Math.round(activeElapsedSeconds / 60))
      setAlert({
        finished: 'focus',
        minutes: savedMinutes,
      })
    } else {
      setAlert(null)
    }
    resetTimer()
  }

  const handleFinishAndLog = () => {
    click('start')
    setAlert({
      finished: timerMode,
      minutes: Math.max(1, Math.round(activeElapsedSeconds / 60)),
    })
    logCurrentSession()
  }

  const handleModeSwitch = (next: Mode) => {
    click('reset')
    setAlert(null)
    setTimerMode(next)
  }

  const testChime = () => {
    const ctx = ensureAudio()
    if (ctx) playChime(ctx)
  }

  useEffect(() => {
    const original = 'FocusPulse — Study Habit Tracker'
    const mm = String(Math.floor(remainingSeconds / 60)).padStart(2, '0')
    const ss = String(remainingSeconds % 60).padStart(2, '0')
    if (alert && !timerRunning) {
      document.title =
        alert.finished === 'focus' ? 'Session complete! · FocusPulse' : 'Break over! · FocusPulse'
    } else if (timerRunning) {
      document.title = `${mm}:${ss} · ${timerMode === 'focus' ? 'Focus' : 'Break'} · FocusPulse`
    } else {
      document.title = original
    }
  }, [remainingSeconds, timerRunning, timerMode, alert])

  useEffect(() => () => void audioRef.current?.close(), [])

  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0')
  const seconds = String(remainingSeconds % 60).padStart(2, '0')
  const radius = 120
  const circumference = 2 * Math.PI * radius
  const isFocus = timerMode === 'focus'
  const isAtStart = remainingSeconds === targetSeconds

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section
        aria-label="Pomodoro timer"
        className="relative overflow-hidden rounded-3xl border bg-card p-6 sm:p-8"
      >
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute -right-24 -top-24 size-72 rounded-full blur-3xl transition-colors duration-700',
            isFocus ? 'bg-primary/20' : 'bg-accent/20'
          )}
        />
        <div className="relative flex flex-col items-center gap-8">
          {alert && (
            <div
              role="alert"
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl border p-3 pr-2 animate-in fade-in slide-in-from-top-2',
                alert.finished === 'focus'
                  ? 'border-accent/40 bg-accent/10'
                  : 'border-primary/40 bg-primary/10'
              )}
            >
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-xl text-white',
                  alert.finished === 'focus' ? 'bg-accent' : 'bg-primary'
                )}
              >
                <BellRing className="size-4 animate-[bell-ring_0.9s_ease-in-out_3]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {alert.finished === 'focus'
                    ? `Great job! Logged ${alert.minutes} min focus session.`
                    : 'Break completed. Ready to focus?'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Saved permanently in your analytics session records.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleRunning}
                className={cn(
                  'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90',
                  alert.finished === 'focus' ? 'bg-accent' : 'bg-primary'
                )}
              >
                {alert.finished === 'focus' ? 'Start break' : 'Start focus'}
              </button>
              <button
                type="button"
                onClick={() => setAlert(null)}
                aria-label="Dismiss alert"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          )}

          {distractionToast && (
            <div
              role="status"
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3 pr-2 text-xs text-purple-700 dark:text-purple-300 animate-in fade-in"
            >
              <div className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-purple-500" />
                <span className="font-semibold">{distractionToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setDistractionToast(null)}
                aria-label="Dismiss notification"
                className="flex size-7 items-center justify-center rounded-lg hover:bg-purple-500/20"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-xl border bg-background/60 p-1" role="group" aria-label="Timer mode">
              {(['focus', 'break'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={timerMode === m}
                  onClick={() => handleModeSwitch(m)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-all',
                    timerMode === m
                      ? m === 'focus'
                        ? 'bg-primary text-primary-foreground shadow'
                        : 'bg-accent text-accent-foreground shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {m === 'focus' ? <Brain className="size-3.5" aria-hidden /> : <Coffee className="size-3.5" aria-hidden />}
                  {m}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                ensureAudio()
                setSoundOn((s) => !s)
              }}
              aria-label={soundOn ? 'Mute all sounds' : 'Unmute sounds'}
              className="flex items-center gap-2 rounded-xl border bg-background/60 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {soundOn ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
              <span className="flex h-4 items-end gap-0.5" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={cn('w-0.5 origin-bottom rounded-full', isFocus ? 'bg-primary' : 'bg-accent')}
                    style={{
                      height: '100%',
                      transform: 'scaleY(0.3)',
                      animation: ambientAudible ? `sound-bar ${0.6 + i * 0.12}s ease-in-out ${i * 0.08}s infinite` : 'none',
                    }}
                  />
                ))}
              </span>
              {soundOn ? 'Sound on' : 'Muted'}
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <svg viewBox="0 0 280 280" className="size-64 -rotate-90 sm:size-72" aria-hidden>
              <defs>
                <linearGradient id="ring-focus" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="oklch(0.62 0.2 310)" />
                </linearGradient>
                <linearGradient id="ring-break" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="oklch(0.72 0.13 200)" />
                </linearGradient>
              </defs>
              <circle cx="140" cy="140" r={radius} fill="none" stroke="var(--muted)" strokeWidth="12" />
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke={`url(#ring-${timerMode})`}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                className="transition-[stroke-dashoffset] duration-300 ease-linear"
              />
            </svg>
            <div
              className={cn(
                'absolute inset-6 rounded-full transition-shadow duration-500',
                chimeFlash && (isFocus ? 'shadow-[0_0_60px_10px] shadow-primary/40' : 'shadow-[0_0_60px_10px] shadow-accent/40')
              )}
              aria-hidden
            />
            <div className="absolute flex flex-col items-center">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {isFocus ? 'Deep focus' : 'Recharge'}
              </span>
              <span
                className="font-mono text-6xl font-semibold tabular-nums tracking-tight sm:text-7xl"
                role="timer"
                aria-live="off"
              >
                {minutes}:{seconds}
              </span>
              <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                {timerRunning && <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />}
                Session {sessionsToday + 1} ·{' '}
                {timerRunning
                  ? `Active: ${formatSecondsDetailed(activeElapsedSeconds)}`
                  : isAtStart
                  ? 'ready to start'
                  : `paused at ${formatSecondsDetailed(activeElapsedSeconds)}`}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleReset}
              aria-label="Reset timer"
              className="flex size-12 items-center justify-center rounded-2xl border bg-background/60 text-muted-foreground transition-all hover:-rotate-45 hover:text-foreground"
            >
              <RotateCcw className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleToggleRunning}
              aria-label={timerRunning ? 'Pause timer' : 'Start timer'}
              className={cn(
                'flex h-16 min-w-40 items-center justify-center gap-2 rounded-2xl px-8 text-base font-semibold text-white shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0',
                isFocus
                  ? 'bg-gradient-to-r from-primary to-[oklch(0.58_0.2_300)] shadow-primary/30'
                  : 'bg-gradient-to-r from-accent to-[oklch(0.65_0.13_200)] shadow-accent/30'
              )}
            >
              {timerRunning ? (
                <>
                  <Pause className="size-5" aria-hidden />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="size-5 fill-current" aria-hidden />
                  <span>{isAtStart ? 'Start Focus' : 'Resume'}</span>
                </>
              )}
            </button>

            {/* Instant Log / Save Button: allows saving focus time at any moment */}
            {activeElapsedSeconds >= 5 && isFocus && (
              <button
                type="button"
                onClick={handleFinishAndLog}
                aria-label="Save and log focus session"
                className="flex h-12 items-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition-all hover:bg-emerald-500/20 active:translate-y-0"
              >
                <CheckCircle2 className="size-4" />
                <span>Save & Log ({formatSecondsDetailed(activeElapsedSeconds)})</span>
              </button>
            )}

            {/* Quick Log Distraction Button: keeps timer running seamlessly */}
            <button
              type="button"
              onClick={() => setDistractionModalOpen(true)}
              aria-label="Log a distraction without stopping timer"
              className="flex h-12 items-center gap-1.5 rounded-2xl border border-purple-500/30 bg-purple-500/10 px-4 text-xs font-semibold text-purple-600 dark:text-purple-400 transition-all hover:bg-purple-500/20 hover:-translate-y-0.5 active:translate-y-0"
            >
              <BookOpen className="size-4" />
              <span>Log Distraction</span>
              {todayDistractionCount > 0 && (
                <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold">
                  {todayDistractionCount}
                </span>
              )}
            </button>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2">
            <DurationStepper
              label="Focus duration"
              value={focusMin}
              min={1}
              max={90}
              onChange={(v) => setTimerDuration('focus', v)}
              disabled={timerRunning}
            />
            <DurationStepper
              label="Break duration"
              value={breakMin}
              min={1}
              max={30}
              onChange={(v) => setTimerDuration('break', v)}
              disabled={timerRunning}
            />
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Timer presets">
            {[
              { label: 'Pomodoro (25/5)', f: 25, b: 5 },
              { label: 'Short sprint (15/3)', f: 15, b: 3 },
              { label: 'Deep block (45/10)', f: 45, b: 10 },
              { label: 'Ultra flow (60/15)', f: 60, b: 15 },
            ].map(({ label, f, b }) => {
              const active = focusMin === f && breakMin === b
              return (
                <button
                  key={label}
                  type="button"
                  disabled={timerRunning}
                  onClick={() => {
                    setTimerDuration('focus', f)
                    setTimerDuration('break', b)
                  }}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-all disabled:opacity-40',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6">
        <AmbientSoundPanel
          kind={ambient}
          onKindChange={setAmbient}
          surah={surah}
          onSurahChange={setSurah}
          withRain={withRain}
          onWithRainChange={setWithRain}
          volume={volume}
          onVolumeChange={setVolume}
          previewing={previewing}
          onTogglePreview={() => {
            ensureAudio()
            setPreviewing((p) => !p)
          }}
          onTestChime={testChime}
          status={ambientAudio.status}
          timerRunning={timerRunning}
          muted={!soundOn}
          currentTime={ambientAudio.currentTime}
          duration={ambientAudio.duration}
          onSeek={ambientAudio.seek}
          playbackSpeed={ambientAudio.playbackSpeed}
          onSpeedChange={ambientAudio.setPlaybackSpeed}
          tapeWarmth={ambientAudio.tapeWarmth}
          onWarmthChange={ambientAudio.setTapeWarmth}
          analogTapeDust={ambientAudio.analogTapeDust}
          onTapeDustChange={ambientAudio.setAnalogTapeDust}
          rainVolume={ambientAudio.rainVolume}
          onRainVolumeChange={ambientAudio.setRainVolume}
        />

        {/* Real-time Dynamic Summary Cards: Live seconds & minutes */}
        <section aria-label="Today summary" className="grid grid-cols-2 gap-4">
          <div className="rounded-3xl border bg-card p-5 transition-transform hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Focused today</p>
              {timerRunning && isFocus && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  LIVE
                </span>
              )}
            </div>
            <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">
              {formatSecondsDetailed(todayTotalSeconds)}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {todayMinutes} {todayMinutes === 1 ? 'min' : 'mins'} total today
            </p>
          </div>
          <div className="rounded-3xl border bg-card p-5 transition-transform hover:-translate-y-0.5">
            <p className="text-xs text-muted-foreground">Sessions</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{sessionsToday}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Completed today</p>
          </div>
        </section>

        <button
          type="button"
          onClick={onOpenInsights}
          className="group flex items-center gap-3 rounded-3xl border bg-gradient-to-br from-primary/15 via-card to-accent/15 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
            <Sparkles className="size-5 text-white" aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-semibold">See your AI insight</span>
            <span className="block text-xs text-muted-foreground">Personalized tips from your study pattern</span>
          </span>
        </button>

        {/* Distraction Journal Quick Navigation */}
        {onOpenJournal && (
          <button
            type="button"
            onClick={onOpenJournal}
            className="group flex items-center justify-between rounded-3xl border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-purple-500/40"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                <BookOpen className="size-5" />
              </span>
              <div>
                <span className="block text-sm font-semibold">Distraction Journal</span>
                <span className="block text-xs text-muted-foreground">
                  {todayDistractionCount === 0
                    ? 'Understand what interrupts your focus'
                    : `${todayDistractionCount} ${todayDistractionCount === 1 ? 'interruption' : 'interruptions'} logged today`}
                </span>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </button>
        )}
      </div>

      {/* Quick Distraction Modal - logs without interrupting timer */}
      {distractionModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-distraction-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border bg-card p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                  <BookOpen className="size-4" />
                </span>
                <h3 id="quick-distraction-title" className="text-base font-bold text-foreground">
                  Log a Distraction
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDistractionModalOpen(false)}
                aria-label="Close dialog"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {timerRunning && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                <span>Timer keeps ticking in background. Logging will not reset or pause your session.</span>
              </div>
            )}

            <form onSubmit={handleSaveQuickDistraction} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={distractionCat}
                  onChange={(e) => setDistractionCat(e.target.value as DistractionCategory)}
                  className="mt-1 h-9 w-full rounded-xl border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Phone / Social Media">Phone / Social Media</option>
                  <option value="Notifications">Notifications</option>
                  <option value="Noise / Environment">Noise / Environment</option>
                  <option value="Tiredness / Sleepiness">Tiredness / Sleepiness</option>
                  <option value="Random Thoughts">Random Thoughts</option>
                  <option value="Hunger / Thirst">Hunger / Thirst</option>
                  <option value="Someone Interrupted Me">Someone Interrupted Me</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Intensity
                </label>
                <div className="mt-1 flex gap-2">
                  {(['Low', 'Medium', 'High'] as DistractionIntensity[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDistractionIntensity(lvl)}
                      className={cn(
                        'flex-1 rounded-xl border py-1.5 text-xs font-semibold transition-all',
                        distractionIntensity === lvl
                          ? 'border-purple-500 bg-purple-500/15 text-purple-600 dark:text-purple-400'
                          : 'border-border/60 bg-background/50 text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border bg-background/50 p-2.5">
                <span className="text-xs font-medium text-foreground">Returned to studying afterward?</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={distractionReturned}
                  onClick={() => setDistractionReturned((r) => !r)}
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                    distractionReturned ? 'bg-emerald-500' : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block size-4 transform rounded-full bg-white shadow transition duration-200',
                      distractionReturned ? 'translate-x-4' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Short Note <span className="font-normal text-muted-foreground/60">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={distractionNote}
                  onChange={(e) => setDistractionNote(e.target.value)}
                  placeholder="e.g. Replied to a quick text, roommate asked a question..."
                  maxLength={100}
                  className="mt-1 h-9 w-full rounded-xl border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDistractionModalOpen(false)}
                  className="rounded-xl border px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow hover:opacity-95"
                >
                  <Check className="size-3.5" />
                  <span>Save Distraction</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
