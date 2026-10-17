'use client'

import { useState } from 'react'
import { Activity, ChevronDown, Moon, Sparkles, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusPulse } from './store'
import { AccountMenu } from './account-menu'

export function TopNav({
  onReplayIntro,
}: {
  onReplayIntro?: () => void
}) {
  const [dark, setDark] = useState(true)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const { currentUser } = useFocusPulse()

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
  }

  const initials = currentUser
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
    : 'U'

  return (
    <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <a href="#" className="group flex items-center gap-2.5" aria-label="FocusPulse home">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
            <Activity className="size-5 text-white" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Focus<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Pulse</span>
          </span>
        </a>

        {/* Right Controls */}
        <div className="relative flex items-center gap-2 sm:gap-3">
          {/* Replay Intro Animation */}
          {onReplayIntro && (
            <button
              type="button"
              onClick={onReplayIntro}
              title="Replay opening animation"
              aria-label="Replay opening animation"
              className="hidden sm:flex size-10 items-center justify-center rounded-xl border bg-card text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
            >
              <Sparkles className="size-4" aria-hidden />
            </button>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex size-10 items-center justify-center rounded-xl border bg-card text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground"
          >
            {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
          </button>

          {/* Profile / Account Dropdown */}
          {currentUser && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                aria-label={`Open account menu for ${currentUser.name}`}
                aria-expanded={accountMenuOpen}
                className="flex items-center gap-2 rounded-xl border bg-card py-1 pl-1 pr-2.5 transition-all hover:-translate-y-0.5 hover:border-primary/40"
              >
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-lg text-xs font-semibold text-white shadow-sm bg-gradient-to-br',
                    currentUser.avatarColor
                  )}
                >
                  {initials}
                </span>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block max-w-[120px] truncate text-sm font-medium">{currentUser.name}</span>
                  <span className="block max-w-[120px] truncate text-[10px] text-muted-foreground">{currentUser.title}</span>
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground transition-transform duration-200" aria-hidden />
              </button>

              <AccountMenu isOpen={accountMenuOpen} onClose={() => setAccountMenuOpen(false)} />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
