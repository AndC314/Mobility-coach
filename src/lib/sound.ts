// ─────────────────────────────────────────────────────────────────────────
// SOUND ENGINE
//
// Web Audio API dings for timer cues (midpoint + completion).
// No audio files — synthesised tones only, works fully offline.
//
// iOS/Android Safari requirement: AudioContext must be created AND
// resumed inside a direct user-gesture handler (a tap/click). We do this
// by calling `primeAudio()` from the Start button press, before the
// interval-based countdowns begin. The context is then reused for all
// subsequent dings.
// ─────────────────────────────────────────────────────────────────────────

let ctx: AudioContext | null = null
let primed = false

/** Call this synchronously inside a tap handler (e.g. the Start button).
 *  Creates and resumes the AudioContext in the user-gesture window.
 *  Safe to call multiple times — no-op after the first successful prime. */
export async function primeAudio(): Promise<void> {
  if (primed) return
  const AC = window.AudioContext || (window as any).webkitAudioContext
  if (!AC) return
  try {
    ctx = new AC()
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    // Play a silent buffer to fully unlock iOS audio
    const buf = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start(0)
    primed = true
  } catch {
    // audio not available — timers still work, just silent
  }
}

function getCtx(): AudioContext | null {
  if (!ctx) return null
  // Re-resume if the OS suspended us (e.g. tab went background)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
  return ctx
}

/**
 * Schedule a tone at a given time offset from now.
 * @param frequency Hz
 * @param durationSec seconds the tone rings
 * @param gainPeak 0.0–1.0 volume peak
 * @param startOffset seconds from ctx.currentTime to start
 */
function scheduleTone(
  audioCtx: AudioContext,
  frequency: number,
  durationSec: number,
  gainPeak: number,
  startOffset: number
) {
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()

  osc.type = 'sine'
  osc.frequency.value = frequency

  const now = audioCtx.currentTime + startOffset
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec)

  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.start(now)
  osc.stop(now + durationSec + 0.01)
}

/**
 * Midpoint cue — single soft ding.
 * Lower pitch so it's clearly distinct from the completion sound.
 */
export function playMidwayDing() {
  const audioCtx = getCtx()
  if (!audioCtx) return
  scheduleTone(audioCtx, 660, 0.25, 0.4, 0)
}

/**
 * Completion cue — two ascending dings scheduled together so the
 * second tone never gets lost to a suspended context.
 */
export function playCompleteDing() {
  const audioCtx = getCtx()
  if (!audioCtx) return
  scheduleTone(audioCtx, 880, 0.25, 0.5, 0)
  scheduleTone(audioCtx, 1100, 0.30, 0.5, 0.22) // 220ms gap, same ctx
}

/** Legacy compatibility — used by any code that calls playDing directly. */
export function playDing(frequency = 880, durationMs = 220) {
  const audioCtx = getCtx()
  if (!audioCtx) return
  scheduleTone(audioCtx, frequency, durationMs / 1000, 0.45, 0)
}
