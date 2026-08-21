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

const SYSTEM_PROMPT = `You are a concise mobility and flexibility coach. You output ONLY valid JSON.

INTERNAL RULES (apply silently — NEVER mention these in your output):
- After a calisthenics session that hit pull muscles, prioritize shoulder/lat mobility
- After push work, prioritize thoracic spine and pec stretches
- After leg work, prioritize hip flexor and hamstring stretches
- If no mobility in 3+ days, suggest a longer full-body session
- If mobility was done yesterday, suggest a lighter maintenance session
- Two-sided exercises (sides: true) need 2 sets minimum (one per side)
- Holds progress by adding sets, NOT by increasing hold duration
- Stay within the user's time budget (preferredSessionMin)
- Only use exercises from the user's "availableExercises" list (exact exerciseId)
- Prioritize mobility areas where supercompensation is declining

OUTPUT FORMAT — valid JSON with exactly two keys:

{
  "coaching": "2-3 sentences max. Written like a coach talking to an athlete. Example: **Hip & Spine focus.** Your hips haven't been stretched in 3 days and yesterday's pull session tightened your lats. We will open everything up with deep hip work and thoracic rotation.",
  "sessionPlan": [
    {"exerciseId": "ninety_ninety", "name": "90/90 Stretch", "holdSec": 60, "sets": 2, "category": "hip", "notes": "Both sides — lean into the back hip"}
  ]
}

STRICT RULES for the "coaching" field:
- First line: bold focus like **Hip & Spine focus.**
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

  const userPrompt = `Here is my current mobility/flexibility state:

${JSON.stringify(context, null, 2)}

Today is week ${context.weekNumber} of the year.
I have ${context.preferredSessionMin} minutes available for mobility.

Design my mobility session for today. Use ONLY exercises from my availableExercises list (use their exact exerciseId). Consider:
- What I stretched last time and how long ago
- Which muscles I worked in my last calisthenics session (they need mobility work)
- My mobility supercompensation scores (lower = needs more work)`

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

    let parsed: { coaching: string; sessionPlan: any[] }
    try {
      parsed = JSON.parse(text)
    } catch {
      const coachMatch = text.match(/"coaching"\s*:\s*"((?:[^"\\]|\\.)*)"/s)
      const fallbackCoaching = coachMatch
        ? coachMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
        : 'Mobility session is ready — check below.'
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
    console.error('Gemini mobility error:', err)
    const msg = err?.message || ''
    if (msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests')) {
      return res.status(200).json({
        coaching: "**Our bots are working hard on themselves today.** They're fixing bugs, upgrading circuits, and will be back tomorrow fully recharged to coach your mobility. In the meantime, pick your own stretches below!",
        sessionPlan: null,
        generatedAt: new Date().toISOString(),
        rateLimited: true,
      })
    }
    return res.status(500).json({ error: msg || 'Failed to generate mobility coaching' })
  }
}
