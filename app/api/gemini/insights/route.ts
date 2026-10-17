import { GoogleGenAI, Type } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'

interface InsightMetricPayload {
  todayMinutes?: number
  weekAvg?: number
  streak?: number
  completionRate?: number
  openTasks?: number
  totalTasks?: number
  weekdayAverages?: number[]
  bestDay?: string
}

function generateDynamicInsights(metrics: InsightMetricPayload) {
  const todayMinutes = Number(metrics.todayMinutes) || 0
  const weekAvg = Number(metrics.weekAvg) || 0
  const streak = Number(metrics.streak) || 0
  const completionRate = Number(metrics.completionRate) || 0
  const openTasks = Number(metrics.openTasks) || 0
  const bestDay = metrics.bestDay || 'Wednesday'

  const insights = []

  // 1. Momentum Insight
  if (todayMinutes >= 60) {
    insights.push({
      tag: 'Momentum',
      title: `High Velocity: ${todayMinutes} mins logged today`,
      body: `You are outperforming your daily baseline by +${Math.max(0, todayMinutes - weekAvg)} mins. Keep cognitive fatigue in check with a 5-minute hydration break.`,
      iconName: 'zap',
    })
  } else if (todayMinutes > 0) {
    insights.push({
      tag: 'Momentum',
      title: 'Strong Ignition Started',
      body: `You have put in ${todayMinutes} focused minutes. Building momentum early reduces afternoon resistance by 70%. One more 25m block seals the streak.`,
      iconName: 'zap',
    })
  } else {
    insights.push({
      tag: 'Momentum',
      title: 'Ready for First Ignition',
      body: 'Commit to just 5 focused minutes on your hardest pending task. The Zeigarnik effect will carry you through a full 25-minute Pomodoro session.',
      iconName: 'sparkles',
    })
  }

  // 2. Consistency & Streak Insight
  if (streak >= 7) {
    insights.push({
      tag: 'Consistency',
      title: `Unstoppable: ${streak}-Day Streak`,
      body: 'Your neural habit loops are solidified. Maintaining consistency requires lower daily willpower than starting from scratch.',
      iconName: 'flame',
    })
  } else if (streak >= 3) {
    insights.push({
      tag: 'Consistency',
      title: `${streak}-Day Streak Active`,
      body: 'Consistency compounds exponentially. Reach day 7 to turn this focus habit into an effortless automatic study routine.',
      iconName: 'flame',
    })
  } else {
    insights.push({
      tag: 'Consistency',
      title: 'Day 1 Momentum Builder',
      body: 'The greatest hurdle is Day 1. Complete one timed session today to initiate your official study streak counter.',
      iconName: 'target',
    })
  }

  // 3. Task Execution Insight
  if (openTasks > 0) {
    insights.push({
      tag: 'Execution',
      title: `${openTasks} Pending Homework Tasks`,
      body: `Task completion rate is currently ${completionRate}%. Tackle your single highest-priority task first before opening low-friction busywork.`,
      iconName: 'target',
    })
  } else {
    insights.push({
      tag: 'Execution',
      title: 'Inbox Zero & Clean Docket',
      body: 'All study tasks are clear. Use this cognitive clarity for active recall revision or planning tomorrow\'s deep work sessions.',
      iconName: 'sparkles',
    })
  }

  // 4. Rhythm & Peak Power Day
  insights.push({
    tag: 'Pattern',
    title: `${bestDay} is Your Peak Focus Day`,
    body: `Your historical logs indicate optimal focus stamina on ${bestDay}. Schedule difficult problem sets, calculus, or heavy memorization on this day.`,
    iconName: 'calendar',
  })

  return { insights }
}

export async function POST(req: NextRequest) {
  try {
    const body: InsightMetricPayload = await req.json().catch(() => ({}))
    const apiKey = process.env.GEMINI_API_KEY

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        })

        const prompt = `Analyze these user study habits:
- Today's focused time: ${body.todayMinutes || 0} minutes
- 7-day daily average: ${body.weekAvg || 0} minutes
- Current consecutive streak: ${body.streak || 0} days
- Tasks completed: ${(body.totalTasks || 0) - (body.openTasks || 0)} of ${body.totalTasks || 0} (${body.completionRate || 0}%)
- Open tasks pending: ${body.openTasks || 0}
- Weekday average breakdown (Sun-Sat): ${JSON.stringify(body.weekdayAverages || [])}
- Highest output day: ${body.bestDay || 'Wednesday'}

Provide exactly 4 distinct, encouraging, and scientifically backed study insights tailored to this data.`

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            systemInstruction:
              'You are FocusPulse AI, an elite academic and cognitive performance coach. You give sharp, encouraging, hyper-relevant observations based on the user\'s real study hours, consistency, power days, and task completion.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                insights: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      tag: {
                        type: Type.STRING,
                        description: 'Short 1-word category: Momentum, Pattern, Consistency, or Goals',
                      },
                      title: {
                        type: Type.STRING,
                        description: 'A punchy, informative title addressing the user directly',
                      },
                      body: {
                        type: Type.STRING,
                        description: '1-2 practical, motivating sentences with actionable advice',
                      },
                      iconName: {
                        type: Type.STRING,
                        description: 'One of: zap, calendar, flame, target, sparkles',
                      },
                    },
                    required: ['tag', 'title', 'body', 'iconName'],
                  },
                },
              },
              required: ['insights'],
            },
          },
        })

        if (response?.text) {
          const parsed = JSON.parse(response.text)
          if (Array.isArray(parsed?.insights) && parsed.insights.length > 0) {
            return NextResponse.json(parsed)
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini live call error, using dynamic academic insights:', geminiErr)
      }
    }

    // Graceful, immediate personalized fallback
    return NextResponse.json(generateDynamicInsights(body))
  } catch (error) {
    console.error('Error in insights route:', error)
    return NextResponse.json(generateDynamicInsights({}))
  }
}
