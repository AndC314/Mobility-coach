import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// Initialize Firebase Admin (for verifying auth tokens)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const SYSTEM_PROMPT = `You are an expert calisthenics, BJJ, and mobility coach providing a daily brief.

Core principles you follow:
- Micro-progression: upgrade 1 set at a time (e.g. 3×4 → 1×5+2×4), never all sets at once
- 10% rule: never increase total weekly reps by more than 10% week-over-week
- Deload every 4th week: reduce volume by 40-50%
- Cap intensity at 1-2 RIR (reps in reserve) on working sets
- Pull-ups: cluster sets (many sets × few reps), add sets before reps
- Push-ups: density pyramids, progress tempo before volume
- Dips: EMOM accumulation with pauses at 90°
- Squats: time-under-tension waves, mechanical ladders

You understand the Banister Two-Factor supercompensation model (baseline 100, fitness gain vs fatigue decay).

Respond in two concise sections:
**📊 Current State** — 3-4 sentences on training load, recovery, what's peaked or declining.
**🎯 Next Session** — specific prescription: exercises with sets×reps scheme (use micro-progression notation like "1×5 + 2×4"), estimated duration, rest times. Match user's available equipment and time preference.

Keep it under 200 words total. Be direct and actionable, not generic.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify Firebase auth token
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

  // Call Gemini
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  }

  const context = req.body

  const userPrompt = `Here is my current training state (JSON):
${JSON.stringify(context, null, 2)}

Today is week ${context.weekNumber} of my current training block.
I have ${context.preferredSessionMin} minutes available.
Equipment: ${(context.availableEquipment || []).join(', ') || 'bodyweight only'}.

Give me my daily coaching brief.`

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { maxOutputTokens: 512, temperature: 0.7 },
    })

    const result = await model.generateContent(userPrompt)

    const coaching = result.response.text()
    const generatedAt = new Date().toISOString()

    return res.status(200).json({ coaching, generatedAt })
  } catch (err: any) {
    console.error('Gemini error:', err)
    return res.status(500).json({ error: err?.message || 'Failed to generate coaching' })
  }
}
