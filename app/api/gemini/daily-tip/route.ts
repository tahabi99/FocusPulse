import { GoogleGenAI, Type } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'

interface TipPayload {
  todayMinutes?: number
  weekAvg?: number
  streak?: number
  completionRate?: number
  openTasks?: number
  totalTasks?: number
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'
  recentTitles?: string[]
}

const FALLBACK_TIPS = [
  {
    title: 'The 5-Minute Ignition Protocol',
    category: 'Momentum',
    advice: 'When feeling resistance to start studying, commit to just 5 focused minutes with zero distractions. The Zeigarnik effect kicks in, reducing activation energy by over 80%.',
    actionStep: 'Set your timer for 5 minutes right now on your hardest pending task. Allow yourself to stop if you wish — 90% of the time you will keep going.',
    scientificPrinciple: 'Zeigarnik Effect & Activation Energy',
    estimatedImpact: 'Eliminates procrastination in <5 mins',
    tags: ['#Momentum', '#QuickStart', '#Neuroscience'],
  },
  {
    title: 'Interleaved Practice over Blocked Cramming',
    category: 'Active Recall',
    advice: 'Switching between 2 related subjects or problem variations during a 50-minute block forces your brain to discriminate concepts rather than relying on muscle memory.',
    actionStep: 'Pick 2 different subjects or problem sets today and alternate every 25 minutes instead of doing one for 3 hours straight.',
    scientificPrinciple: 'Cognitive Interleaving Effect (Rohrer & Taylor)',
    estimatedImpact: '+43% retention on delayed exams',
    tags: ['#ActiveRecall', '#Retention', '#Cognition'],
  },
  {
    title: 'The Ultradian Rhythm Cadence',
    category: 'Deep Work',
    advice: 'Human cognitive stamina naturally peaks and troughs in 90-minute ultradian cycles. Pushing through exhaustion causes diminishing mental returns.',
    actionStep: 'Complete two 25-minute pomodoro blocks, followed by a mandatory 10-minute screen-free break with water and movement.',
    scientificPrinciple: 'Kleitman Ultradian Rest-Activity Cycle',
    estimatedImpact: 'Prevents mid-afternoon brain fog',
    tags: ['#DeepWork', '#Recovery', '#Endurance'],
  },
  {
    title: 'Closed-Book Brain Dumps',
    category: 'Active Recall',
    advice: 'Passive re-reading creates an illusion of competence. Closing all notes and writing down everything you remember creates strong retrieval pathways.',
    actionStep: 'Take a blank sheet of paper and write everything you remember from your last study session in 3 minutes before opening any notes.',
    scientificPrinciple: 'The Testing Effect (Roediger & Karpicke)',
    estimatedImpact: '+50% long-term recall strength',
    tags: ['#ActiveRecall', '#TestingEffect', '#HighLeverage'],
  },
  {
    title: 'Protect Your Streak with a Minimum Viable Session',
    category: 'Habit Building',
    advice: 'Habit loops are fragile in early weeks. On hectic days, doing even a single 15-minute micro-session maintains your neural habit identity.',
    actionStep: 'Log at least 15 focused minutes today, no matter how busy your schedule gets.',
    scientificPrinciple: 'Identity-Based Habit Formation (Clear & Wood)',
    estimatedImpact: 'Saves 100% of habit momentum',
    tags: ['#Consistency', '#StreakDefense', '#Habits'],
  },
]

export async function POST(req: NextRequest) {
  try {
    const body: TipPayload = await req.json().catch(() => ({}))
    const {
      todayMinutes = 0,
      weekAvg = 60,
      streak = 0,
      completionRate = 0,
      openTasks = 0,
      totalTasks = 0,
      timeOfDay = 'afternoon',
      recentTitles = [],
    } = body

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      // Pick dynamic fallback based on user state
      const fallback = pickFallbackTip({ todayMinutes, streak, openTasks, recentTitles })
      return NextResponse.json({ tip: fallback, isLiveAi: false })
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })

    const prompt = `Generate a single, hyper-personalized, and highly actionable "Daily Study Tip" for this student:
Current student context:
- Time of Day: ${timeOfDay}
- Focused Time Today: ${todayMinutes} minutes (7-day daily average: ${weekAvg} minutes)
- Current Consecutive Streak: ${streak} days
- Pending / Open Tasks: ${openTasks} open of ${totalTasks} total (Task completion rate: ${completionRate}%)
- Already seen recent tip titles: ${recentTitles.join(', ') || 'None'}

Requirements:
1. Ground the advice in cognitive neuroscience, memory research, or evidence-based productivity (e.g. Active Recall, Spaced Repetition, Interleaving, Pomodoro Cadence, Dual Coding, Zeigarnik Effect, Ultradian Rhythms, Dopamine Management).
2. Directly reference their current study reality (e.g., if streak is high, reinforce maintenance; if todayMinutes is low, give a quick-start ignition tip; if pending tasks are high, give a triage tip).
3. Provide a concrete, highly actionable "actionStep" that takes less than 3 minutes to initiate or can be applied immediately in their next session.
4. Keep the tone inspiring, razor-sharp, scientifically authoritative yet warm and encouraging.
5. Do NOT repeat any recently seen tip titles.`

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are FocusPulse AI Coach, a world-class cognitive performance coach for ambitious students. You provide single, highly actionable, scientifically validated productivity tips tailored to the student\'s real-time metrics.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Catchy, punchy title for the tip (under 8 words)',
            },
            category: {
              type: Type.STRING,
              description: 'Category: e.g. Momentum, Deep Work, Active Recall, Habit Building, Cognitive Energy, or Focus Flow',
            },
            advice: {
              type: Type.STRING,
              description: '1 to 2 sentences of clear, compelling advice tailored to their exact metrics',
            },
            actionStep: {
              type: Type.STRING,
              description: 'Specific, immediate single action step the student can do right now or in their next 25-minute block',
            },
            scientificPrinciple: {
              type: Type.STRING,
              description: 'The scientific study, cognitive bias, or psychological principle behind this advice (e.g. Zeigarnik Effect, Ultradian Rhythm, Testing Effect)',
            },
            estimatedImpact: {
              type: Type.STRING,
              description: 'Brief metric-driven outcome (e.g. +35% retention, Zero start friction, 2x focus stamina)',
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2-3 short hashtags, e.g. ["#ActiveRecall", "#DeepWork"]',
            },
          },
          required: ['title', 'category', 'advice', 'actionStep', 'scientificPrinciple', 'estimatedImpact', 'tags'],
        },
      },
    })

    const text = response.text
    if (!text) {
      const fallback = pickFallbackTip({ todayMinutes, streak, openTasks, recentTitles })
      return NextResponse.json({ tip: fallback, isLiveAi: false })
    }

    const tipData = JSON.parse(text)
    return NextResponse.json({ tip: tipData, isLiveAi: true })
  } catch (error) {
    console.error('Error generating daily study tip:', error)
    const fallback = pickFallbackTip({ todayMinutes: 0, streak: 1, openTasks: 1, recentTitles: [] })
    return NextResponse.json({ tip: fallback, isLiveAi: false })
  }
}

function pickFallbackTip({
  todayMinutes = 0,
  streak = 0,
  openTasks = 0,
  recentTitles = [],
}: {
  todayMinutes?: number
  streak?: number
  openTasks?: number
  recentTitles?: string[]
}) {
  let candidates = FALLBACK_TIPS.filter((t) => !recentTitles.includes(t.title))
  if (candidates.length === 0) candidates = FALLBACK_TIPS

  if (todayMinutes === 0) {
    return candidates.find((t) => t.category === 'Momentum') ?? candidates[0]
  }
  if (streak >= 3) {
    return candidates.find((t) => t.category === 'Habit Building') ?? candidates[0]
  }
  if (openTasks > 2) {
    return candidates.find((t) => t.category === 'Deep Work') ?? candidates[0]
  }
  return candidates[Math.floor(Math.random() * candidates.length)]
}
