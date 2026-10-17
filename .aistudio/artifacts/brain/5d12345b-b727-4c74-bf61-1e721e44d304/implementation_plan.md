# FocusPulse — Study Habit Tracker & Focus Analytics

FocusPulse is a high-performance study habit tracker and focus analytics platform replicating the exact UX and feature set of `https://focus-pulse-six.vercel.app/`. It pairs an interactive Pomodoro timer with procedural Web Audio ambient soundscapes, a 52-week contribution habit heatmap, a daily goals checklist, and live Gemini AI-powered study analytics.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during clarification and are locked into this plan:
> - **Scope**: Complete replica of all 4 tabs (Focus Timer, Analytics Dashboard, Goals, and AI Insights) along with the ambient audio engine.
> - **AI Engine**: Live Gemini 3.8 Flash server-side integration (`/api/gemini/insights`) delivering personalized recommendations based on actual user study patterns, with client heuristic fallback.
> - **Data & State**: In-browser persistent storage (`localStorage`) initialized with 53 weeks of realistic study history and seeded starter tasks.

- **Confirmed Decision 1**: Full feature replica matching `https://focus-pulse-six.vercel.app/` including timer controls, preset durations, ambient audio selector, sound volume sliders, chime tests, 7-day bar chart, 52-week contribution heatmap, task checklist, and dark/light mode toggle.
- **Confirmed Decision 2**: Server-side Gemini API route (`/api/gemini/insights`) using `@google/genai` with `gemini-3.8-flash` returning structured JSON recommendations, while preserving zero-config instant functionality.

---

## 1. Overview & Core Concept

FocusPulse helps learners, developers, and students maintain consistent deep work through rhythmic study intervals and continuous habit feedback.

- **What It Does**:
  1. **Focus Timer**: Pomodoro & break timer with circular SVG countdown ring, time presets (25/5, 50/10, 90/20), custom duration steppers, completion chime, and browser tab title status updates.
  2. **Ambient Sound Synthesizer**: Web Audio API procedural sound engine generating Lo-fi beats, Rain, Brown noise, and streaming Mishary Rashid Alafasy Quran recitations (Surahs Al-Fatihah, Al-Kahf, Ya-Sin, Ar-Rahman, Al-Waqi'ah, Al-Mulk).
  3. **Analytics Dashboard**: 3 key metric cards (Today's Focus Hours, Weekly Streak, Completion Rate), a 7-day interactive bar chart with daily goal threshold line, and a 52-week GitHub-style study heatmap.
  4. **Daily Goals (Task List)**: Task management with instant add, completion toggle, deletion, and conic-gradient progress ring.
  5. **AI Insights**: Personalized analysis of weekday momentum, power study days, streak durability, and task load powered by Gemini 3.8 Flash.

- **Target Persona**: Focused learners, university students, and knowledge workers who need distraction-free timeboxing and visual proof of cumulative effort.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Focus Session Flow**:
   - User lands on the default "Focus Timer" tab.
   - Adjusts durations via steppers or clicks a preset pill (`25/5`, `50/10`, `90/20`).
   - Selects an ambient soundscape (Lofi, Rain, Brown noise, or Quran recitation) and adjusts volume or tests the completion chime.
   - Hits "Start": The circular ring begins smooth countdown, ambient audio fades in, soundwave equalizer visualizer animates, and document title reflects `MM:SS · Focus · FocusPulse`.
   - On completion: Three-tone sine chime rings, screen flashes subtle halo, celebration banner appears offering to start a break, and logged minutes increment today's stats.

2. **Habit Inspection Flow**:
   - User navigates to the "Analytics" tab.
   - Inspects KPI cards with progress meters against the 180-minute daily goal.
   - Reviews 7-day bar chart highlighting today's pace against the weekly average.
   - Inspects the 52-week habit heatmap with 5 heat intensity levels (`bg-heat-0` through `bg-heat-4`) and hover tooltips showing date and logged minutes.

3. **Task Completion Flow**:
   - User switches to "Goals", enters a study task, and submits via form.
   - Toggles tasks complete: strikethrough animates and the circular progress gauge updates in real time.

4. **AI Habit Coach Flow**:
   - User switches to "AI Insights".
   - Clicks "New insight" / "Analyze": Frontend passes the last 8 weeks of study sessions and task metrics to `/api/gemini/insights`.
   - Gemini evaluates best study days, pace variance, streak momentum, and task velocity, returning tailored recommendations.

### Visual Identity & Theme Tokens

- **Aesthetic Direction**: High-focus deep dark SaaS interface with vivid purple primary (`oklch(0.65 0.2 277)`) and emerald accent (`oklch(0.72 0.16 162)`).
- **Surface Contrast**: Dark backdrop (`oklch(0.155 0.02 272)`), subtle elevated cards (`oklch(0.2 0.024 272)`), and hairline border contrast (`oklch(1 0 0 / 9%)`).
- **Typography**: Clean sans (`Geist` / `Geist Mono` / system neo-grotesque) with tabular numerals (`tabular-nums`) across all timer displays, statistics, and chart values.
- **Zero-Pill Discipline**: Unboxed metadata text separated by dots; segmented tabs used for genuine view switching.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Procedural Web Audio Engine vs Audio Files**
  - *Chosen Approach*: Synthesize Lofi beats, rain, and brown noise directly in browser memory via Web Audio oscillators, biquad filters, and noise buffers.
  - *Why*: Instant playback with zero bandwidth latency, infinite procedural non-repeating audio, offline support, and no external audio asset dependencies.
- **Decision 2: Dual-Mode AI Insights (Server Gemini + Local Heuristics)**
  - *Chosen Approach*: Dedicated Next.js API route `/api/gemini/insights` using `@google/genai` with `gemini-3.8-flash`. If no API key is present or in offline mode, automatically fall back to the built-in mathematical pattern analyzer.
  - *Why*: Guarantees the application is 100% functional out of the box while unlocking live, intelligent LLM insights when the API key is active.
- **Decision 3: Local Storage Persistence with Seeded History**
  - *Chosen Approach*: Seed 53 weeks of realistic study history so the heatmap and weekly chart look vibrant and populated immediately, while persisting new timer sessions and tasks in `localStorage`.
  - *Why*: Replicates the rich visual appearance of the reference site without requiring user signup.

---

## 4. Technical Architecture & Data Strategy

### System Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FocusPulse Application                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ TopNav (Theme Toggle: Light/Dark · User Profile Header)       │     │
│   └──────────────────────────────────────────────────────────────┘     │
│                                  │                                     │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ FocusPulseProvider (Store Context & LocalStorage Persistence) │     │
│   │ - 52-week History Array  · Tasks Store  · Today Focus Min    │     │
│   │ - Sessions Today Count   · Streak Calc  · Completion Rate    │     │
│   └──────────────────────────────────────────────────────────────┘     │
│                                  │                                     │
│   ┌──────────────┬───────────────┴──────────────┬──────────────────┐   │
│   │              │                              │                  │   │
│   ▼              ▼                              ▼                  ▼   │
│ ┌────────────┐ ┌───────────────────────────┐ ┌────────────────┐  ┌─────────────┐
│ │FocusTimer  │ │AnalyticsDashboard         │ │TaskList        │  │AiInsights   │
│ │- SVG Ring  │ │- KPI Cards (3 Metrics)    │ │- Task Input    │  │- Live Card  │
│ │- SoundEngine│- 7-Day Bar Chart          │ │- Checkbox List │  │- Pattern Dt │
│ │  (Lofi/Rain│ │- 52-Week Contribution    │ │- Progress Ring │  │- Refresh Btn│
│ │   Quran)   │ │  Heatmap (5-step levels)  │ │- Local Storage │  └──────┬──────┘
│ └────────────┘ └───────────────────────────┘ └────────────────┘         │
│                                                                        │
│                                                          POST /api/gemini/insights
│                                                                        │
│                                                                        ▼
│                                                          ┌───────────────────────┐
│                                                          │ Next.js API Route     │
│                                                          │ GoogleGenAI SDK       │
│                                                          │ Model: gemini-3.8-flash│
│                                                          └───────────────────────┘
└────────────────────────────────────────────────────────────────────────┘
```

### Component & State Mapping

| Component | Responsibility & Interactions | State Handlers & Data Source |
|---|---|---|
| `AppShell` | Tab navigation (Timer, Analytics, Goals, AI Insights) with tab panel mount transitions | `activeTab`, `setActiveTab` |
| `FocusTimer` | Circular countdown display, duration configuration, audio playback coordinator | `running`, `remaining`, `focusMin`, `breakMin`, `mode`, `soundOn`, `ambient`, `playChime()` |
| `SoundEngine` | Web Audio synthesizer nodes (oscillators, biquad filters, pink/brown noise) and Quran streaming | `createAudioContext()`, `startSynth()`, `useAmbientSound()` |
| `AnalyticsDashboard` | Renders 3 KPI cards with progress bars, 7-day bar chart with goal line, 52-week contribution heatmap | Reads `history`, `todayMinutes`, `streak`, `completionRate` from context |
| `TaskList` | Add/toggle/delete study goals, renders conic-gradient completion ring | `draft`, `addTask()`, `toggleTask()`, `deleteTask()` |
| `AiInsights` | Displays actionable recommendations; triggers live Gemini API generation or local fallback | `fetch('/api/gemini/insights')` with payload of weekday totals and streak stats |
| `app/api/gemini/insights/route.ts` | Server-side Gemini 3.8 Flash endpoint returning structured recommendations | Server-side secret `GEMINI_API_KEY` |

---

## 5. Implementation Sequence

1. **Install `@google/genai`**: Add `@google/genai` package for server-side Gemini 3.8 Flash analytics.
2. **Implement API Route (`app/api/gemini/insights/route.ts`)**: Server-side endpoint with system instruction and structured JSON schema for study habit recommendations.
3. **Upgrade `AiInsights` Component**: Wire the live API fetch with loading state, error resilience, and graceful fallback to the client heuristics.
4. **Refine Focus Timer, Sound Engine & Ambient Panel**: Ensure all audio nodes, surah streaming, click chirps, and completion chimes operate cleanly with smooth volume transitions.
5. **Verify Analytics & Heatmap**: Check heatmap color levels, tooltip values, weekly bar alignments, and goal progress bars.
6. **Compile & Dev Server Verification**: Run `compile_applet` and verify dev server responsiveness on port 3000.
