'use client'

import { useState, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BarChart3, BookOpen, Calendar, HelpCircle, ListChecks, Sparkles, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FocusPulseProvider, useFocusPulse } from './store'
import { TopNav } from './top-nav'
import { FocusTimer } from './focus-timer'
import { DistractionJournal } from './distraction-journal'
import { StudyPlanner } from './study-planner'
import { AnalyticsDashboard } from './analytics-dashboard'
import { TaskList } from './task-list'
import { AiInsights } from './ai-insights'
import { LoginPage } from './login-page'
import { AiStudyTutor } from './ai-study-tutor'
import { DailyStudyTipWidget } from './daily-study-tip'
import { PageOpeningAnimation } from './page-opening-animation'

const tabs = [
  { id: 'timer', label: 'Focus Timer', icon: Timer },
  { id: 'planner', label: 'Study Planner', icon: Calendar },
  { id: 'tutor', label: 'Ask AI Tutor', icon: HelpCircle },
  { id: 'journal', label: 'Distraction Journal', icon: BookOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'tasks', label: 'Goals', icon: ListChecks },
  { id: 'insights', label: 'AI Insights', icon: Sparkles },
] as const

type TabId = (typeof tabs)[number]['id']

const subscribe = () => () => {}

const dashboardContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
}

const slideUpItemVariants = {
  hidden: {
    opacity: 0,
    y: 28,
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

function ShellInner({ onReplayIntro }: { onReplayIntro: () => void }) {
  const [active, setActive] = useState<TabId>('timer')
  const [timerSurah, setTimerSurah] = useState<string | undefined>(undefined)
  const { currentUser } = useFocusPulse()
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )

  // Auth Gate: Require login first before accessing the app
  if (!currentUser) {
    return <LoginPage />
  }

  const firstName = currentUser.name.split(' ')[0]

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[480px] bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.22_277/0.22),transparent_65%)]"
      />
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <TopNav onReplayIntro={onReplayIntro} />
      </motion.div>

      {/* Main Dashboard Content with Staggered Fade-in and Slide-up */}
      <motion.main
        variants={dashboardContainerVariants}
        initial="hidden"
        animate="visible"
        className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6"
      >
        {/* Welcome Section: Fade-in & Slide-up */}
        <motion.div
          variants={slideUpItemVariants}
          className="mb-4 flex flex-col gap-1"
        >
          <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            Welcome back, {firstName}
          </h1>
          <p className="text-pretty text-sm text-muted-foreground">
            Build deep focus, one session at a time.
          </p>
        </motion.div>

        {/* Daily Study Tip Widget: Fade-in & Slide-up */}
        {active !== 'analytics' && (
          <motion.div variants={slideUpItemVariants}>
            <DailyStudyTipWidget variant="banner" />
          </motion.div>
        )}

        {/* Navigation Tabs: Fade-in & Slide-up */}
        <motion.div
          variants={slideUpItemVariants}
          role="tablist"
          aria-label="FocusPulse sections"
          className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border bg-card/60 p-1 backdrop-blur sm:grid-cols-4 md:grid-cols-7"
        >
          {tabs.map(({ id, label, icon: Icon }) => {
            const selected = active === id
            return (
              <button
                key={id}
                role="tab"
                id={`tab-${id}`}
                aria-selected={selected}
                aria-controls={`panel-${id}`}
                onClick={() => setActive(id)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl px-2.5 py-2.5 text-xs sm:text-sm font-medium transition-all duration-200',
                  selected
                    ? 'bg-gradient-to-r from-primary to-[oklch(0.58_0.2_300)] text-primary-foreground shadow-lg shadow-primary/25'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{label}</span>
              </button>
            )
          })}
        </motion.div>

        {/* Tab Panels: Fade-in & Slide-up */}
        {mounted ? (
          <motion.div
            variants={slideUpItemVariants}
            className="w-full"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <div
                  role="tabpanel"
                  id="panel-timer"
                  aria-labelledby="tab-timer"
                  className={cn(active !== 'timer' && 'hidden')}
                >
                  <FocusTimer
                    onOpenInsights={() => setActive('insights')}
                    onOpenJournal={() => setActive('journal')}
                    initialSurah={timerSurah}
                  />
                </div>
                <div
                  role="tabpanel"
                  id="panel-planner"
                  aria-labelledby="tab-planner"
                  className={cn(active !== 'planner' && 'hidden')}
                >
                  <StudyPlanner
                    onNavigateToTimer={() => {
                      setActive('timer')
                    }}
                  />
                </div>
                <div
                  role="tabpanel"
                  id="panel-tutor"
                  aria-labelledby="tab-tutor"
                  className={cn(active !== 'tutor' && 'hidden')}
                >
                  <AiStudyTutor />
                </div>
                <div
                  role="tabpanel"
                  id="panel-journal"
                  aria-labelledby="tab-journal"
                  className={cn(active !== 'journal' && 'hidden')}
                >
                  <DistractionJournal onNavigateToTimer={() => setActive('timer')} />
                </div>
                <div
                  role="tabpanel"
                  id="panel-analytics"
                  aria-labelledby="tab-analytics"
                  className={cn(active !== 'analytics' && 'hidden')}
                >
                  <AnalyticsDashboard
                onNavigateToTimer={() => setActive('timer')}
                onNavigateToJournal={() => setActive('journal')}
              />
            </div>
            <div
              role="tabpanel"
              id="panel-tasks"
              aria-labelledby="tab-tasks"
              className={cn(active !== 'tasks' && 'hidden')}
            >
              <TaskList />
            </div>
            <div
              role="tabpanel"
              id="panel-insights"
              aria-labelledby="tab-insights"
              className={cn(active !== 'insights' && 'hidden')}
            >
              <AiInsights />
            </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="h-[480px] animate-pulse rounded-3xl border bg-card/50" />
        )}
      </motion.main>
    </div>
  )
}

export function AppShell() {
  const [introKey, setIntroKey] = useState(1)

  return (
    <FocusPulseProvider>
      <PageOpeningAnimation key={introKey} />
      <ShellInner onReplayIntro={() => setIntroKey((k) => k + 1)} />
    </FocusPulseProvider>
  )
}
