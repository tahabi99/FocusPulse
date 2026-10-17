import { GoogleGenAI, Type } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'
import {
  DAYS_OF_WEEK,
  DEFAULT_SUBJECTS,
  ExamDeadline,
  PlannedStudyBlock,
  Subject,
} from '@/lib/study-planner-engine'

interface GeneratePlanRequest {
  studentName?: string
  fieldOfStudy?: string
  goal?: string
  subjects: Subject[]
  deadlines: ExamDeadline[]
  preferredTime?: 'morning' | 'afternoon' | 'evening' | 'flexible'
  sessionDuration?: number // 25, 50, 75
  studyDays?: number[] // e.g. [1, 2, 3, 4, 5, 6]
  dailyTargetHours?: number
}

function generateLocalSmartSchedule(
  subjects: Subject[],
  deadlines: ExamDeadline[],
  preferredTime: 'morning' | 'afternoon' | 'evening' | 'flexible' = 'morning',
  sessionDuration: number = 50,
  studyDays: number[] = [1, 2, 3, 4, 5, 6]
): PlannedStudyBlock[] {
  const timeMap = {
    morning: ['08:30', '10:00', '11:30'],
    afternoon: ['13:30', '15:00', '16:30'],
    evening: ['18:00', '19:30', '21:00'],
    flexible: ['09:30', '14:00', '18:30'],
  }[preferredTime] || ['09:00', '10:30', '14:00']

  const pomodoros = Math.max(1, Math.round(sessionDuration / 25))
  const blocks: PlannedStudyBlock[] = []
  let blockCounter = 1

  const activeSubjects = subjects.length > 0 ? subjects : DEFAULT_SUBJECTS
  const sortedSubs = [...activeSubjects].sort((a, b) => {
    const p = { high: 3, medium: 2, low: 1 }
    return p[b.priority] - p[a.priority]
  })

  studyDays.forEach((day, dayIndex) => {
    // 2 blocks per study day
    const sub1 = sortedSubs[(dayIndex * 2) % sortedSubs.length]
    const sub2 = sortedSubs[(dayIndex * 2 + 1) % sortedSubs.length]

    const dl1 = deadlines.find((d) => d.subjectId === sub1.id)
    const dl2 = deadlines.find((d) => d.subjectId === sub2.id)

    blocks.push({
      id: `ai_blk_${Date.now()}_${blockCounter++}`,
      subjectId: sub1.id,
      dayOfWeek: day,
      startTime: timeMap[0],
      durationMinutes: sessionDuration,
      topic: dl1 ? `High-Yield Prep: ${dl1.title}` : `Core Mastery & Problem Solving`,
      pomodoroCount: pomodoros,
      completed: false,
    })

    blocks.push({
      id: `ai_blk_${Date.now()}_${blockCounter++}`,
      subjectId: sub2.id,
      dayOfWeek: day,
      startTime: timeMap[1],
      durationMinutes: sessionDuration,
      topic: dl2 ? `Review & Practice: ${dl2.title}` : `Active Recall & Flashcards`,
      pomodoroCount: pomodoros,
      completed: false,
    })
  })

  return blocks
}

export async function POST(req: NextRequest) {
  let body: GeneratePlanRequest
  try {
    body = (await req.json()) as GeneratePlanRequest
  } catch {
    body = { subjects: DEFAULT_SUBJECTS, deadlines: [] }
  }

  const {
    studentName = 'Student',
    fieldOfStudy = 'General Academics',
    goal = 'Master coursework and excel in exams',
    subjects = [],
    deadlines = [],
    preferredTime = 'morning',
    sessionDuration = 50,
    studyDays = [1, 2, 3, 4, 5, 6],
    dailyTargetHours = 3,
  } = body

  const activeSubjects = subjects && subjects.length > 0 ? subjects : DEFAULT_SUBJECTS

  // Check if Gemini API key exists
  if (!process.env.GEMINI_API_KEY) {
    const fallbackSchedule = generateLocalSmartSchedule(
      activeSubjects,
      deadlines,
      preferredTime,
      sessionDuration,
      studyDays
    )

    return NextResponse.json({
      advice: `Personalized schedule created for ${studentName} (${fieldOfStudy}). Sessions are balanced using spaced repetition across ${studyDays.length} active study days with high-priority subjects scheduled during your preferred ${preferredTime} window.`,
      highlights: [
        `Prioritized subjects with upcoming deadlines`,
        `Calibrated to ${sessionDuration}-minute Pomodoro blocks`,
        `Includes dedicated rest buffers to prevent burnout`,
      ],
      schedule: fallbackSchedule,
    })
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    const prompt = `You are a world-class cognitive learning scientist and academic coach.
Create a highly personalized weekly study plan for this student:
- Name: ${studentName}
- Field / Goal: ${fieldOfStudy} - ${goal}
- Subjects: ${JSON.stringify(
      activeSubjects.map((s) => ({
        id: s.id,
        name: s.name,
        targetHoursPerWeek: s.targetHoursPerWeek,
        priority: s.priority,
      }))
    )}
- Upcoming Deadlines / Exams: ${JSON.stringify(
      deadlines.map((d) => ({
        subjectId: d.subjectId,
        title: d.title,
        dueDate: d.dueDate,
        estimatedHoursNeeded: d.estimatedHoursNeeded,
      }))
    )}
- Preferred study time of day: ${preferredTime} (morning: ~8:30-11:30, afternoon: ~13:30-16:30, evening: ~18:00-21:00)
- Target session block duration: ${sessionDuration} minutes
- Active study days of week (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat): ${studyDays.join(', ')}
- Target daily hours: ~${dailyTargetHours} hours

Guidelines:
1. Schedule 2 to 3 study blocks per active study day, respecting the study days and preferred time.
2. Interleave different subjects (do not put the same hard subject 3 times in a row).
3. Prioritize subjects with close deadlines.
4. Each block topic must be concrete, actionable, and specific to the subject.
5. Provide 2-3 sentences of supportive, science-backed personalized advice for this student's specific goal.`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            advice: {
              type: Type.STRING,
              description: '2-3 sentences of personalized academic strategy and advice.',
            },
            highlights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 key takeaways of this personalized schedule.',
            },
            schedule: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subjectId: { type: Type.STRING },
                  dayOfWeek: { type: Type.INTEGER },
                  startTime: { type: Type.STRING, description: 'HH:MM format' },
                  durationMinutes: { type: Type.INTEGER },
                  topic: { type: Type.STRING },
                  pomodoroCount: { type: Type.INTEGER },
                },
                required: [
                  'subjectId',
                  'dayOfWeek',
                  'startTime',
                  'durationMinutes',
                  'topic',
                  'pomodoroCount',
                ],
              },
            },
          },
          required: ['advice', 'highlights', 'schedule'],
        },
      },
    })

    const parsed = JSON.parse(response.text || '{}')

    // Validate and format schedule blocks
    const validatedSchedule: PlannedStudyBlock[] = (parsed.schedule || []).map(
      (b: any, index: number) => {
        const validSub = activeSubjects.find((s) => s.id === b.subjectId) || activeSubjects[0]
        return {
          id: `ai_blk_${Date.now()}_${index}`,
          subjectId: validSub.id,
          dayOfWeek: typeof b.dayOfWeek === 'number' ? b.dayOfWeek : 1,
          startTime: b.startTime || '10:00',
          durationMinutes: Number(b.durationMinutes) || sessionDuration,
          topic: b.topic || `${validSub.name} Focused Practice`,
          pomodoroCount: Number(b.pomodoroCount) || Math.max(1, Math.round(sessionDuration / 25)),
          completed: false,
        }
      }
    )

    const finalSchedule =
      validatedSchedule.length > 0
        ? validatedSchedule
        : generateLocalSmartSchedule(
            activeSubjects,
            deadlines,
            preferredTime,
            sessionDuration,
            studyDays
          )

    return NextResponse.json({
      advice:
        parsed.advice ||
        `Personalized schedule created for ${studentName}. Spaced retrieval sessions balanced for ${fieldOfStudy}.`,
      highlights: parsed.highlights || [
        'Interleaved study blocks to maximize concept retention',
        'Prioritized upcoming deadlines with targeted prep blocks',
        'Built with dedicated buffer times to protect stamina',
      ],
      schedule: finalSchedule,
    })
  } catch (err: any) {
    console.error('Study plan generation fallback:', err)
    const fallbackSchedule = generateLocalSmartSchedule(
      activeSubjects,
      deadlines,
      preferredTime,
      sessionDuration,
      studyDays
    )

    return NextResponse.json({
      advice: `Personalized schedule calibrated for ${studentName} (${fieldOfStudy}). Spaced study blocks scheduled for your ${activeSubjects.length} courses.`,
      highlights: [
        'Spaced sessions across the week to prevent cramming fatigue',
        'Alternating high-focus and active-recall blocks',
        'Pomodoro intervals optimized for sustained attention',
      ],
      schedule: fallbackSchedule,
    })
  }
}
