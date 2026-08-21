import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const SYSTEM_PROMPT = `You are an expert calisthenics and mobility coach. You prescribe precise, data-driven workouts.

## Your Principles
- Micro-progression: upgrade 1 set at a time (3×4 → 1×5+2×4 → 2×5+1×4 → 3×5)
- 10% rule: never increase total weekly volume by more than 10%
- Deload every 4th week: reduce volume by 40-50%
- Cap intensity at 1-2 RIR (reps in reserve)
- Pull-ups: cluster sets (many sets × few reps), add sets before adding reps
- Push-ups: density work (EMOM), progress tempo before volume
- Dips: EMOM accumulation, add pauses at 90°
- Squats: time-under-tension waves, tempo 3-1-1-0
- Holds: accumulate total time, progress by adding sets not duration

## Response Rules
- The "sessionPlan" MUST only use exercises from the "availableExercises" list in the context
- Use the exact exerciseId values from that list
- Respect the user's time budget (preferredSessionMin)
- If an exercise is plateaued, suggest a variation or change the stimulus (tempo, pause, ROM)
- If a category's supercompensation is declining, prioritize training it
- Include warm-up/mobility work when time allows

## Coaching Text Format
The "coaching" field must be short, structured, and human-readable:
- Line 1: A bold heading like **Today's Focus: Pull + Core**
- Line 2-3: One sentence on your current readiness state (mention which categories are fresh vs fatigued)
- Line 4-5: One sentence on the strategy for today's session (why these exercises, what progression cue)
- No raw numbers, no parentheses with scores, no bullet lists of data. Speak like a coach, not a data dump.
- Use **bold** for exercise names and key terms only.

You MUST respond with valid JSON matching this exact schema:
{
  "coaching": "string — short coaching note as described above, use \\n for line breaks",
  "sessionPlan": [
    {
      "exerciseId": "string — exact ID from availableExercises",
      "name": "string — exercise display name",
      "sets": number,
      "reps": "string — e.g. '8' for reps, '30s' for holds, '1×6 + 2×5' for micro-progression",
      "restSec": number,
      "notes": "string or null — micro-progression cue or coaching tip",
      "category": "string — push/pull/legs/core/mobility"
    }
  ]
}`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' })
  }

  try {
    const token = authHeader.slice(7)
    await getAuth().verifyIdToken(token)
  } catch {
    return res.status(401).json({ error: 'Invalid auth token' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  }

  const context = req.body

  const userPrompt = `Here is my current training state:

${JSON.stringify(context, null, 2)}

Today is week ${context.weekNumber} of the year.
I have ${context.preferredSessionMin} minutes available.
Equipment: ${(context.availableEquipment || []).join(', ') || 'bodyweight only'}.

Design my session for today. Use ONLY exercises from my availableExercises list (use their exact exerciseId). Consider my exercise history trends and plateaus when choosing rep schemes.`

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    })

    const result = await model.generateContent(userPrompt)
    const text = result.response.text()

    // Parse and validate JSON
    let parsed: { coaching: string; sessionPlan: any[] }
    try {
      parsed = JSON.parse(text)
    } catch {
      // Fallback: return raw text as coaching only
      return res.status(200).json({
        coaching: text,
        sessionPlan: null,
        generatedAt: new Date().toISOString(),
      })
    }

    return res.status(200).json({
      coaching: parsed.coaching || '',
      sessionPlan: Array.isArray(parsed.sessionPlan) ? parsed.sessionPlan : null,
      generatedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('Gemini error:', err)
    return res.status(500).json({ error: err?.message || 'Failed to generate coaching' })
  }
}
