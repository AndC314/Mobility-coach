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

const SYSTEM_PROMPT = `You are a concise personal calisthenics coach. You output ONLY valid JSON.

INTERNAL RULES (apply silently — NEVER mention these in your output):
- Micro-progression: upgrade 1 set at a time
- 10% weekly volume cap
- Deload every 4th week
- Pull-ups: cluster sets. Push-ups: EMOM density. Holds: add sets not duration.
- Only use exercises from the user's "availableExercises" list (exact exerciseId)
- Respect preferredSessionMin time budget
- Prioritize categories where supercompensation is declining

OUTPUT FORMAT — valid JSON with exactly two keys:

{
  "coaching": "2-3 sentences max. Written like a coach talking to an athlete. Example: **Pull & Core today.** Your pull muscles are fresh and ready for volume. We will push pull-ups to 5×4 with cluster rest, then hit hanging knee raises for core.",
  "sessionPlan": [
    {"exerciseId": "pullups", "name": "Pull-ups", "sets": 5, "reps": "4", "restSec": 90, "notes": "Cluster sets — full rest between each", "category": "pull"}
  ]
}

STRICT RULES for the "coaching" field:
- First line: bold focus like **Pull & Core today.**
- Then 1-2 plain sentences about what you're doing and why.
- NEVER include: exerciseIds, backticks, rule citations, scores, numbers in parentheses, technical jargon, or internal reasoning.
- Write as a human coach would speak out loud.`

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
      model: 'gemini-3.5-flash-lite',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        maxOutputTokens: 2048,
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
      // Try to extract coaching field from malformed JSON
      const coachMatch = text.match(/"coaching"\s*:\s*"((?:[^"\\]|\\.)*)"/s)
      const fallbackCoaching = coachMatch
        ? coachMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
        : 'Session plan is ready — check below.'
      return res.status(200).json({
        coaching: fallbackCoaching,
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
