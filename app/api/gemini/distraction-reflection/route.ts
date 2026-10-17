import { GoogleGenAI } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'
import type { DistractionEntry } from '@/app/api/sync/route'

interface ReflectionPayload {
  distractions: DistractionEntry[]
  todayCount: number
  weekCount: number
  topCategory: string | null
  returnRate: number
}

function generateLocalReflection(data: ReflectionPayload) {
  const { distractions, todayCount, weekCount, topCategory, returnRate } = data

  if (distractions.length === 0) {
    return {
      headline: 'A Clean Slate: No Distractions Logged Yet',
      summary: 'You haven’t recorded any distractions yet. Whenever an impulse, notification, or interruption pulls your attention away during study, tap "Log Distraction" to record it without disrupting your timer.',
      suggestions: [
        'Notice the subtle urges to check your phone or switch tabs before acting on them.',
        'Use the Distraction Journal as a mindful pause button rather than a judgment.',
      ],
      patternObserved: 'No data available yet.',
      tone: 'encouraging',
    }
  }

  // Count by category
  const catCounts: Record<string, number> = {}
  for (const d of distractions) {
    catCounts[d.category] = (catCounts[d.category] || 0) + 1
  }

  const primaryCategory = topCategory || Object.keys(catCounts)[0] || 'Random Thoughts'
  const countInPrimary = catCounts[primaryCategory] || 1
  const pct = Math.round((countInPrimary / distractions.length) * 100)

  // Category-specific supportive suggestions
  const categoryAdvice: Record<string, string[]> = {
    'Phone / Social Media': [
      'Keep your phone out of arm’s reach or in another room during high-focus Pomodoro blocks.',
      'Turn on "Do Not Disturb" or Greyscale mode to reduce visual dopamine hooks from app icons.',
    ],
    Notifications: [
      'Disable non-essential desktop and browser banner notifications before starting your focus timer.',
      'Batch-check your messages only during planned 5-minute break intervals.',
    ],
    'Noise / Environment': [
      'Pair your study session with the built-in ambient rain or Lo-Fi audio in FocusPulse to mask background noise.',
      'If studying in a shared space, wear headphones as a polite visual cue that you are in deep work.',
    ],
    'Tiredness / Sleepiness': [
      'Stand up and do a quick 60-second stretch or splash cold water on your face during your next break.',
      'Ensure you take full 5-minute screen-free breaks rather than switching to other screens.',
    ],
    'Random Thoughts': [
      'Keep a blank "parking lot" scratchpad next to your desk to jot down stray thoughts so your brain can let them go.',
      'Remind yourself: "I will handle this thought during my break in just a few minutes."',
    ],
    'Hunger / Thirst': [
      'Place a bottle of water and a light healthy snack on your desk before starting your timer.',
      'Stay hydrated — mild dehydration drops cognitive focus by up to 15%.',
    ],
    'Someone Interrupted Me': [
      'Communicate your focus blocks to family, roommates, or peers with a clear "Focus in Progress" indicator.',
      'Schedule designated times when you are fully available for conversations.',
    ],
    Other: [
      'Review your journal notes to spot any specific physical or mental triggers unique to your setup.',
      'Celebrate returning to your studies: you returned to focus ' + returnRate + '% of the time!',
    ],
  }

  const suggestions = categoryAdvice[primaryCategory] || categoryAdvice['Other']

  return {
    headline: `Reflecting on Your Study Focus (${distractions.length} ${distractions.length === 1 ? 'entry' : 'entries'})`,
    summary: `Over your recorded sessions, **${primaryCategory}** accounted for ${pct}% of your focus interruptions (${countInPrimary} out of ${distractions.length} logs). You successfully returned to your studies **${returnRate}%** of the time, demonstrating strong resilience.`,
    suggestions,
    patternObserved: `Primary interruption: ${primaryCategory} (${countInPrimary} times). Today: ${todayCount} logs, This week: ${weekCount} logs.`,
    tone: 'supportive',
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ReflectionPayload = await req.json()
    const { distractions, todayCount, weekCount, topCategory, returnRate } = body

    if (!distractions || distractions.length === 0) {
      return NextResponse.json(generateLocalReflection(body))
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(generateLocalReflection(body))
    }

    try {
      const ai = new GoogleGenAI({ apiKey })

      const prompt = `You are an empathetic, supportive learning habit coach inside FocusPulse.
Review the student's actual distraction journal records and write a concise, supportive reflection.

Student Data:
- Total Distraction Logs: ${distractions.length}
- Today's Distractions: ${todayCount}
- This Week's Total Distractions: ${weekCount}
- Most Frequent Category: ${topCategory || 'N/A'}
- Returned to Study Rate: ${returnRate}%
- Recent entries (up to 10):
${distractions
  .slice(0, 10)
  .map(
    (d, i) =>
      `${i + 1}. [${d.category}] Intensity: ${d.intensity}, Returned: ${
        d.returnedToStudying ? 'Yes' : 'No'
      }, Note: "${d.note || 'None'}" at ${d.timestamp}`
  )
  .join('\n')}

Guidelines:
1. Be encouraging, warm, and practical. NEVER blame, shame, or make the user feel guilty.
2. Only mention categories and facts that exist in the provided data. Never invent fake events or patterns.
3. Highlight their resilience when they returned to studying.
4. Provide 2-3 specific, actionable, gentle strategies to address their primary distraction.
5. Return JSON in this format:
{
  "headline": "Short title (under 8 words)",
  "summary": "1-2 paragraphs of supportive insight referencing their actual numbers",
  "suggestions": ["Actionable tip 1", "Actionable tip 2", "Actionable tip 3"],
  "patternObserved": "One sentence summary of primary pattern"
}`

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI timeout')), 10000)
      )

      const generatePromise = ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      })

      const res = await Promise.race([generatePromise, timeoutPromise])
      const text = res.text
      if (text) {
        const parsed = JSON.parse(text)
        return NextResponse.json(parsed)
      }
    } catch {
      // Fallback seamlessly to local intelligent reflection
    }

    return NextResponse.json(generateLocalReflection(body))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error generating reflection'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
