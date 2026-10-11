'use client'

import { useState } from 'react'
import { Activity, Moon, Sun } from 'lucide-react'

export function TopNav() {
  const [dark, setDark] = useState(true)

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#" className="group flex items-center gap-2.5" aria-label="FocusPulse home">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
            <Activity className="size-5 text-white" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Focus<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Pulse</span>
          </span>
        </a>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex size-10 items-center justify-center rounded-xl border bg-card text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground"
          >
            {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
          </button>
          <button
            type="button"
            aria-label="Open profile for Alex Morgan"
            className="flex items-center gap-2.5 rounded-xl border bg-card py-1 pl-1 pr-3 transition-all hover:-translate-y-0.5 hover:border-primary/40"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-primary text-xs font-semibold text-white">
              AM
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-medium">Alex Morgan</span>
              <span className="block text-xs text-muted-foreground">Pro learner</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
