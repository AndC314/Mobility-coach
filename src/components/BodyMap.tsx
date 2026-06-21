import type { MuscleScore } from '../data/muscleMap'
import type { MuscleGroup } from '../data/muscleMap'

// ─────────────────────────────────────────────────────────────────────────
// Color scale: untrained → grey, secondary → gold, primary fully loaded → red
// Intermediate values interpolate between the base color and full saturation
// ─────────────────────────────────────────────────────────────────────────

const UNTRAINED = '#d0d3de'
const PRIMARY_LOW = '#f5c84222'   // transparent gold when score is low
const PRIMARY_FULL = '#d9472b'    // full red at 100%
const SECONDARY_FULL = '#f5c842' // gold

function scoreColor(score: number, level: 'primary' | 'secondary'): string {
  if (score === 0) return UNTRAINED
  if (level === 'secondary') {
    const alpha = Math.round((score / 100) * 200 + 55)
    return SECONDARY_FULL + alpha.toString(16).padStart(2, '0').slice(0, 2)
  }
  // primary: interpolate grey -> gold -> red
  if (score < 50) return `hsl(38, ${Math.round(score * 1.6)}%, 55%)`
  return PRIMARY_FULL
}

interface BodyMapProps {
  scores: MuscleScore[]
  width?: number
}

export default function BodyMap({ scores, width = 340 }: BodyMapProps) {
  const scoreMap = new Map(scores.map((s) => [s.muscle, s]))
  const get = (m: MuscleGroup) => {
    const s = scoreMap.get(m)
    return scoreColor(s?.score ?? 0, s?.level ?? 'secondary')
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-2 justify-center" style={{ minWidth: width }}>
        <FrontView get={get} />
        <BackView get={get} />
      </div>
      <Legend />
    </div>
  )
}

// ─── Legend ──────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="mt-3 flex justify-center gap-4 text-xs text-muted">
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-[#d9472b] inline-block" />
        Primary (high load)
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-[#f5c842] inline-block" />
        Secondary
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-[#d0d3de] inline-block" />
        Untrained
      </div>
    </div>
  )
}

// ─── Front View ──────────────────────────────────────────────────────────

function FrontView({ get }: { get: (m: MuscleGroup) => string }) {
  return (
    <svg viewBox="0 0 160 320" width="160" height="320" aria-label="Front body view">
      {/* Outline */}
      <ellipse cx="80" cy="22" rx="18" ry="20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      <path d="M62 42 Q50 50 48 80 Q46 110 50 120 L60 120 L60 180 L58 280 L72 280 L76 200 L84 200 L88 280 L102 280 L100 180 L100 120 L110 120 Q114 110 112 80 Q110 50 98 42 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      {/* arms */}
      <path d="M50 48 Q38 60 36 90 Q35 110 38 120 L46 118 Q44 100 46 80 Q48 60 60 50 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      <path d="M110 48 Q122 60 124 90 Q125 110 122 120 L114 118 Q116 100 114 80 Q112 60 100 50 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      {/* forearm */}
      <path d="M38 120 Q34 140 36 155 L44 153 Q42 140 46 118 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      <path d="M122 120 Q126 140 124 155 L116 153 Q118 140 114 118 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      {/* hands */}
      <ellipse cx="40" cy="160" rx="7" ry="9" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      <ellipse cx="120" cy="160" rx="7" ry="9" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      {/* legs */}
      <path d="M60 180 L57 280 L73 280 L76 200 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      <path d="M100 180 L103 280 L87 280 L84 200 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      {/* feet */}
      <ellipse cx="64" cy="285" rx="11" ry="6" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      <ellipse cx="96" cy="285" rx="11" ry="6" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />

      {/* ── MUSCLE FILLS ── */}

      {/* Chest */}
      <path d="M65 52 Q62 60 63 72 Q70 76 80 76 Q90 76 97 72 Q98 60 95 52 Q88 48 80 48 Q72 48 65 52Z"
        fill={get('chest')} opacity="0.85" />

      {/* Front delts */}
      <ellipse cx="55" cy="55" rx="8" ry="10" fill={get('front_delt')} opacity="0.85" />
      <ellipse cx="105" cy="55" rx="8" ry="10" fill={get('front_delt')} opacity="0.85" />

      {/* Biceps */}
      <path d="M40 68 Q36 82 37 98 L45 96 Q44 80 48 66 Z"
        fill={get('biceps')} opacity="0.85" />
      <path d="M120 68 Q124 82 123 98 L115 96 Q116 80 112 66 Z"
        fill={get('biceps')} opacity="0.85" />

      {/* Triceps front (lateral head visible) */}
      <path d="M48 66 Q44 80 44 96 L50 96 Q52 80 56 66 Z"
        fill={get('triceps')} opacity="0.6" />
      <path d="M112 66 Q116 80 116 96 L110 96 Q108 80 104 66 Z"
        fill={get('triceps')} opacity="0.6" />

      {/* Forearms */}
      <path d="M38 118 Q34 136 36 153 L44 151 Q42 136 46 118 Z"
        fill={get('forearms')} opacity="0.85" />
      <path d="M122 118 Q126 136 124 153 L116 151 Q118 136 114 118 Z"
        fill={get('forearms')} opacity="0.85" />

      {/* Abs */}
      <rect x="70" y="76" width="20" height="42" rx="4" fill={get('abs')} opacity="0.85" />

      {/* Hip flexors */}
      <path d="M68 118 Q65 130 66 142 L80 142 L80 118 Z"
        fill={get('hip_flexors')} opacity="0.75" />
      <path d="M92 118 Q95 130 94 142 L80 142 L80 118 Z"
        fill={get('hip_flexors')} opacity="0.75" />

      {/* Quads */}
      <path d="M60 148 Q55 175 57 205 L73 205 L76 148 Z"
        fill={get('quads')} opacity="0.85" />
      <path d="M100 148 Q105 175 103 205 L87 205 L84 148 Z"
        fill={get('quads')} opacity="0.85" />

      {/* Inner thigh */}
      <path d="M76 148 Q74 175 74 205 L80 205 L80 148 Z"
        fill={get('inner_thigh')} opacity="0.75" />
      <path d="M84 148 Q86 175 86 205 L80 205 L80 148 Z"
        fill={get('inner_thigh')} opacity="0.75" />

      {/* Calves (front, tibialis) */}
      <path d="M58 205 Q56 235 57 260 L66 260 L68 205 Z"
        fill={get('calves')} opacity="0.65" />
      <path d="M102 205 Q104 235 103 260 L94 260 L92 205 Z"
        fill={get('calves')} opacity="0.65" />
    </svg>
  )
}

// ─── Back View ───────────────────────────────────────────────────────────

function BackView({ get }: { get: (m: MuscleGroup) => string }) {
  return (
    <svg viewBox="0 0 160 320" width="160" height="320" aria-label="Back body view">
      {/* Outline — mirror of front */}
      <ellipse cx="80" cy="22" rx="18" ry="20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      <path d="M62 42 Q50 50 48 80 Q46 110 50 120 L60 120 L60 180 L58 280 L72 280 L76 200 L84 200 L88 280 L102 280 L100 180 L100 120 L110 120 Q114 110 112 80 Q110 50 98 42 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      <path d="M50 48 Q38 60 36 90 Q35 110 38 120 L46 118 Q44 100 46 80 Q48 60 60 50 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      <path d="M110 48 Q122 60 124 90 Q125 110 122 120 L114 118 Q116 100 114 80 Q112 60 100 50 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      <path d="M38 120 Q34 140 36 155 L44 153 Q42 140 46 118 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      <path d="M122 120 Q126 140 124 155 L116 153 Q118 140 114 118 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      <ellipse cx="40" cy="160" rx="7" ry="9" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      <ellipse cx="120" cy="160" rx="7" ry="9" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      <path d="M60 180 L57 280 L73 280 L76 200 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      <path d="M100 180 L103 280 L87 280 L84 200 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      <ellipse cx="64" cy="285" rx="11" ry="6" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
      <ellipse cx="96" cy="285" rx="11" ry="6" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />

      {/* ── MUSCLE FILLS ── */}

      {/* Traps */}
      <path d="M68 42 Q70 55 80 58 Q90 55 92 42 Q86 38 80 37 Q74 38 68 42Z"
        fill={get('traps')} opacity="0.85" />

      {/* Rear delts */}
      <ellipse cx="54" cy="58" rx="9" ry="8" fill={get('rear_delt')} opacity="0.85" />
      <ellipse cx="106" cy="58" rx="9" ry="8" fill={get('rear_delt')} opacity="0.85" />

      {/* Lats */}
      <path d="M52 60 Q48 80 50 108 L62 108 Q63 82 66 60 Z"
        fill={get('lats')} opacity="0.85" />
      <path d="M108 60 Q112 80 110 108 L98 108 Q97 82 94 60 Z"
        fill={get('lats')} opacity="0.85" />

      {/* Rhomboids */}
      <path d="M66 60 Q68 80 80 82 Q92 80 94 60 Q88 52 80 50 Q72 52 66 60Z"
        fill={get('rhomboids')} opacity="0.85" />

      {/* Triceps (back — long head) */}
      <path d="M42 66 Q38 82 40 100 L48 98 Q46 82 50 68 Z"
        fill={get('triceps')} opacity="0.85" />
      <path d="M118 66 Q122 82 120 100 L112 98 Q114 82 110 68 Z"
        fill={get('triceps')} opacity="0.85" />

      {/* Forearms */}
      <path d="M38 118 Q34 136 36 153 L44 151 Q42 136 46 118 Z"
        fill={get('forearms')} opacity="0.85" />
      <path d="M122 118 Q126 136 124 153 L116 151 Q118 136 114 118 Z"
        fill={get('forearms')} opacity="0.85" />

      {/* Lower back */}
      <rect x="68" y="108" width="24" height="28" rx="4" fill={get('lower_back')} opacity="0.85" />

      {/* Glutes */}
      <path d="M60 136 Q57 160 60 180 L80 180 L100 180 Q103 160 100 136 Q90 128 80 128 Q70 128 60 136Z"
        fill={get('glutes')} opacity="0.85" />

      {/* Hamstrings */}
      <path d="M60 180 Q57 210 60 240 L72 240 L76 180 Z"
        fill={get('hamstrings')} opacity="0.85" />
      <path d="M100 180 Q103 210 100 240 L88 240 L84 180 Z"
        fill={get('hamstrings')} opacity="0.85" />

      {/* Calves (gastrocnemius) */}
      <path d="M60 240 Q58 260 60 278 L72 278 L72 240 Z"
        fill={get('calves')} opacity="0.85" />
      <path d="M100 240 Q102 260 100 278 L88 278 L88 240 Z"
        fill={get('calves')} opacity="0.85" />
    </svg>
  )
}
