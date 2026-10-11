'use client'

import { useState, useSyncExternalStore } from 'react'
import { BarChart3, ListChecks, Sparkles, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FocusPulseProvider } from './store'
import { TopNav } from './top-nav'
import { FocusTimer } from './focus-timer'
import { AnalyticsDashboard } from './analytics-dashboard'
import { TaskList } from './task-list'
import { AiInsights } from './ai-insights'

const tabs = [
  { id: 'timer', label: 'Focus Timer', icon: Timer },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'tasks', label: 'Goals', icon: ListChecks },
  { id: 'insights', label: 'AI Insights', icon: Sparkles },
] as const

type TabId = (typeof tabs)[number]['id']

const subscribe = () => () => {}

export function AppShell() {
  const [active, setActive] = useState<TabId>('timer')
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )

  return (
    <FocusPulseProvider>
      <div className="relative min-h-dvh overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 h-[480px] bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.22_277/0.22),transparent_65%)]"
        />
        <TopNav />
        <main className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">
          <div className="mb-6 flex flex-col gap-1">
            <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Welcome back, Alex
            </h1>
            <p className="text-pretty text-sm text-muted-foreground">
              Build deep focus, one session at a time.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="FocusPulse sections"
            className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border bg-card/60 p-1 backdrop-blur sm:inline-grid sm:grid-cols-4"
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
                    'flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
                    selected
                      ? 'bg-gradient-to-r from-primary to-[oklch(0.58_0.2_300)] text-primary-foreground shadow-lg shadow-primary/25'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </button>
              )
            })}
          </div>

          {mounted ? (
            <div
              role="tabpanel"
              id={`panel-${active}`}
              aria-labelledby={`tab-${active}`}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {active === 'timer' && <FocusTimer onOpenInsights={() => setActive('insights')} />}
              {active === 'analytics' && <AnalyticsDashboard />}
              {active === 'tasks' && <TaskList />}
              {active === 'insights' && <AiInsights />}
            </div>
          ) : (
            <div className="h-[480px] animate-pulse rounded-3xl border bg-card/50" />
          )}
        </main>
      </div>
    </FocusPulseProvider>
  )
}
