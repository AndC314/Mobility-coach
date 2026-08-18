import type { MuscleScore } from '../data/muscleMap'
import type { MuscleGroup } from '../data/muscleMap'

const UNTRAINED = '#2e3248'
const PRIMARY_FULL = '#d9472b'
const SECONDARY_FULL = '#f5c842'

function scoreColor(score: number, level: 'primary' | 'secondary'): string {
  if (score === 0) return UNTRAINED
  const target = level === 'secondary' ? SECONDARY_FULL : PRIMARY_FULL
  const t = Math.min(1, score / 100)
  return interpolateColor(UNTRAINED, target, t)
}

function interpolateColor(from: string, to: string, t: number): string {
  const f = hexToRgb(from)
  const toRgb = hexToRgb(to)
  const r = Math.round(f.r + (toRgb.r - f.r) * t)
  const g = Math.round(f.g + (toRgb.g - f.g) * t)
  const b = Math.round(f.b + (toRgb.b - f.b) * t)
  return `rgb(${r},${g},${b})`
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

interface BodyMapProps {
  scores: MuscleScore[]
  width?: number
}

export default function BodyMap({ scores, width = 320 }: BodyMapProps) {
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

function Legend() {
  return (
    <div className="mt-3 flex justify-center gap-4 text-[10px] text-muted">
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#d9472b] inline-block" />
        Primary
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#f5c842] inline-block" />
        Secondary
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#2e3248] inline-block border border-[#3e4258]" />
        Untrained
      </div>
    </div>
  )
}

function FrontView({ get }: { get: (m: MuscleGroup) => string }) {
  return (
    <svg viewBox="0 0 120 320" width="140" height="320" aria-label="Front body view">
      {/* Body silhouette — athletic male proportions */}
      <path
        d="M60 8 C53 8 48 13 47 20 C46 26 47 30 49 33 L49 35
           C44 38 39 43 35 50 C31 57 29 65 28 74 L25 75
           C21 76 19 80 18 86 C17 92 18 97 21 99 L24 100
           C24 104 25 108 26 112 L26 116
           C25 124 24 132 24 140 L25 144 L26 162
           C26 169 27 176 28 183 L29 196
           C29 203 30 210 31 217 L32 240
           C32 247 33 254 35 260 L36 270
           C35 273 34 276 34 280 C34 284 36 287 40 288 L44 288
           C47 288 49 286 50 283 L51 280 C52 277 52 274 52 272
           L52 248 C55 245 57 242 60 240
           C63 242 65 245 68 248 L68 272
           C68 274 68 277 69 280 L70 283
           C71 286 73 288 76 288 L80 288
           C84 287 86 284 86 280 C86 276 85 273 84 270
           L85 260 C87 254 88 247 88 240 L89 217
           C90 210 91 203 91 196 L92 183
           C93 176 94 169 94 162 L95 144 L96 140
           C96 132 95 124 94 116 L94 112
           C95 108 96 104 96 100 L99 99
           C102 97 103 92 102 86 C101 80 99 76 95 75
           L92 74 C91 65 89 57 85 50
           C81 43 76 38 71 35 L71 33
           C73 30 74 26 73 20 C72 13 67 8 60 8 Z"
        fill="#1a1d2e"
        stroke="#3e4258"
        strokeWidth="0.8"
      />

      {/* === CHEST === */}
      <path
        d="M42 52 C45 48 51 46 56 47 C58 48 59 49 60 51
           L60 68 C58 70 54 72 50 71 C46 70 43 67 41 63 C39 59 40 55 42 52 Z"
        fill={get('chest')}
      />
      <path
        d="M78 52 C75 48 69 46 64 47 C62 48 61 49 60 51
           L60 68 C62 70 66 72 70 71 C74 70 77 67 79 63 C81 59 80 55 78 52 Z"
        fill={get('chest')}
      />
      {/* Pec fibers */}
      <path d="M46 54 Q52 57 58 59" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.12" />
      <path d="M74 54 Q68 57 62 59" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.12" />

      {/* === FRONT DELTOIDS === */}
      <path
        d="M35 50 C38 46 42 44 45 45 C46 47 45 51 44 55
           C42 58 39 60 37 59 C34 57 33 54 35 50 Z"
        fill={get('front_delt')}
      />
      <path
        d="M85 50 C82 46 78 44 75 45 C74 47 75 51 76 55
           C78 58 81 60 83 59 C86 57 87 54 85 50 Z"
        fill={get('front_delt')}
      />

      {/* === BICEPS === */}
      <path
        d="M31 62 C30 67 29 74 29 80 C29 86 30 91 31 94
           L36 93 C35 88 34 82 34 77 C34 71 35 66 36 62 Z"
        fill={get('biceps')}
      />
      <path
        d="M89 62 C90 67 91 74 91 80 C91 86 90 91 89 94
           L84 93 C85 88 86 82 86 77 C86 71 85 66 84 62 Z"
        fill={get('biceps')}
      />

      {/* === TRICEPS (lateral) === */}
      <path
        d="M36 62 C37 67 38 73 38 77 C38 82 37 88 36 93
           L31 94 L31 62 Z"
        fill={get('triceps')}
        opacity="0.55"
      />
      <path
        d="M84 62 C83 67 82 73 82 77 C82 82 83 88 84 93
           L89 94 L89 62 Z"
        fill={get('triceps')}
        opacity="0.55"
      />

      {/* === FOREARMS === */}
      <path
        d="M28 99 C27 106 26 115 26 122 C26 128 27 132 28 135
           L33 134 C32 130 31 125 31 119 C31 111 32 104 33 99 Z"
        fill={get('forearms')}
      />
      <path
        d="M92 99 C93 106 94 115 94 122 C94 128 93 132 92 135
           L87 134 C88 130 89 125 89 119 C89 111 88 104 87 99 Z"
        fill={get('forearms')}
      />

      {/* === ABS (3 sections) === */}
      <path
        d="M53 70 C54 69 57 68 60 68 C63 68 66 69 67 70
           L67 82 C66 83 63 84 60 84 C57 84 54 83 53 82 Z"
        fill={get('abs')}
      />
      <path
        d="M53 86 C54 85 57 84 60 84 C63 84 66 85 67 86
           L67 100 C66 101 63 102 60 102 C57 102 54 101 53 100 Z"
        fill={get('abs')}
      />
      <path
        d="M53 104 C54 103 57 102 60 102 C63 102 66 103 67 104
           L67 118 C66 119 63 120 60 120 C57 120 54 119 53 118 Z"
        fill={get('abs')}
      />
      {/* Linea alba */}
      <line x1="60" y1="68" x2="60" y2="120" stroke="#000" strokeWidth="0.4" opacity="0.15" />
      {/* Tendinous inscriptions */}
      <line x1="54" y1="83" x2="66" y2="83" stroke="#000" strokeWidth="0.3" opacity="0.12" />
      <line x1="54" y1="101" x2="66" y2="101" stroke="#000" strokeWidth="0.3" opacity="0.12" />

      {/* === OBLIQUES / SERRATUS === */}
      <path
        d="M43 65 C42 71 41 79 42 87 C43 93 44 97 46 100
           L53 98 C52 94 51 88 51 82 C51 75 52 69 53 65 Z"
        fill={get('abs')}
        opacity="0.45"
      />
      <path
        d="M77 65 C78 71 79 79 78 87 C77 93 76 97 74 100
           L67 98 C68 94 69 88 69 82 C69 75 68 69 67 65 Z"
        fill={get('abs')}
        opacity="0.45"
      />

      {/* === HIP FLEXORS === */}
      <path
        d="M49 120 C48 126 47 132 47 138 L54 138 L56 120 Z"
        fill={get('hip_flexors')}
        opacity="0.65"
      />
      <path
        d="M71 120 C72 126 73 132 73 138 L66 138 L64 120 Z"
        fill={get('hip_flexors')}
        opacity="0.65"
      />

      {/* === QUADS === */}
      <path
        d="M44 144 C43 156 42 170 42 182 C42 190 43 197 44 202
           L55 202 C56 197 57 190 57 182 C57 170 56 156 55 144 Z"
        fill={get('quads')}
      />
      <path
        d="M76 144 C77 156 78 170 78 182 C78 190 77 197 76 202
           L65 202 C64 197 63 190 63 182 C63 170 64 156 65 144 Z"
        fill={get('quads')}
      />
      {/* Quad separation */}
      <path d="M48 150 L48 195" fill="none" stroke="#000" strokeWidth="0.25" opacity="0.1" />
      <path d="M72 150 L72 195" fill="none" stroke="#000" strokeWidth="0.25" opacity="0.1" />

      {/* === INNER THIGH === */}
      <path
        d="M55 144 C56 156 57 168 57 180 L60 180 L60 144 Z"
        fill={get('inner_thigh')}
        opacity="0.65"
      />
      <path
        d="M65 144 C64 156 63 168 63 180 L60 180 L60 144 Z"
        fill={get('inner_thigh')}
        opacity="0.65"
      />

      {/* === CALVES (tibialis) === */}
      <path
        d="M43 208 C42 220 42 233 43 244 L52 244 C53 233 53 220 52 208 Z"
        fill={get('calves')}
        opacity="0.65"
      />
      <path
        d="M77 208 C78 220 78 233 77 244 L68 244 C67 233 67 220 68 208 Z"
        fill={get('calves')}
        opacity="0.65"
      />

      <text x="60" y="280" textAnchor="middle" className="text-[8px]" fill="#7a7d96" opacity="0.7">FRONT</text>
    </svg>
  )
}

function BackView({ get }: { get: (m: MuscleGroup) => string }) {
  return (
    <svg viewBox="0 0 120 320" width="140" height="320" aria-label="Back body view">
      {/* Body silhouette */}
      <path
        d="M60 8 C53 8 48 13 47 20 C46 26 47 30 49 33 L49 35
           C44 38 39 43 35 50 C31 57 29 65 28 74 L25 75
           C21 76 19 80 18 86 C17 92 18 97 21 99 L24 100
           C24 104 25 108 26 112 L26 116
           C25 124 24 132 24 140 L25 144 L26 162
           C26 169 27 176 28 183 L29 196
           C29 203 30 210 31 217 L32 240
           C32 247 33 254 35 260 L36 270
           C35 273 34 276 34 280 C34 284 36 287 40 288 L44 288
           C47 288 49 286 50 283 L51 280 C52 277 52 274 52 272
           L52 248 C55 245 57 242 60 240
           C63 242 65 245 68 248 L68 272
           C68 274 68 277 69 280 L70 283
           C71 286 73 288 76 288 L80 288
           C84 287 86 284 86 280 C86 276 85 273 84 270
           L85 260 C87 254 88 247 88 240 L89 217
           C90 210 91 203 91 196 L92 183
           C93 176 94 169 94 162 L95 144 L96 140
           C96 132 95 124 94 116 L94 112
           C95 108 96 104 96 100 L99 99
           C102 97 103 92 102 86 C101 80 99 76 95 75
           L92 74 C91 65 89 57 85 50
           C81 43 76 38 71 35 L71 33
           C73 30 74 26 73 20 C72 13 67 8 60 8 Z"
        fill="#1a1d2e"
        stroke="#3e4258"
        strokeWidth="0.8"
      />

      {/* === TRAPS === */}
      <path
        d="M50 34 C53 31 57 30 60 30 C63 30 67 31 70 34
           L76 43 C73 47 67 50 60 50 C53 50 47 47 44 43 Z"
        fill={get('traps')}
      />
      <path d="M50 36 Q55 39 59 42" fill="none" stroke="#000" strokeWidth="0.25" opacity="0.1" />
      <path d="M70 36 Q65 39 61 42" fill="none" stroke="#000" strokeWidth="0.25" opacity="0.1" />

      {/* === REAR DELTOIDS === */}
      <path
        d="M35 50 C38 46 42 44 45 45 C46 47 45 52 43 56
           C41 59 38 60 36 58 C34 56 33 53 35 50 Z"
        fill={get('rear_delt')}
      />
      <path
        d="M85 50 C82 46 78 44 75 45 C74 47 75 52 77 56
           C79 59 82 60 84 58 C86 56 87 53 85 50 Z"
        fill={get('rear_delt')}
      />

      {/* === RHOMBOIDS === */}
      <path
        d="M50 44 C53 41 57 40 60 40 C63 40 67 41 70 44
           L70 64 C67 67 63 68 60 68 C57 68 53 67 50 64 Z"
        fill={get('rhomboids')}
      />
      {/* Spine */}
      <line x1="60" y1="30" x2="60" y2="125" stroke="#000" strokeWidth="0.5" opacity="0.15" />

      {/* === LATS === */}
      <path
        d="M42 54 C39 61 37 70 36 78 C35 86 36 92 38 95
           L50 94 C51 87 51 79 50 72 C49 65 47 58 44 54 Z"
        fill={get('lats')}
      />
      <path
        d="M78 54 C81 61 83 70 84 78 C85 86 84 92 82 95
           L70 94 C69 87 69 79 70 72 C71 65 73 58 76 54 Z"
        fill={get('lats')}
      />
      <path d="M40 58 Q43 68 48 80" fill="none" stroke="#000" strokeWidth="0.25" opacity="0.08" />
      <path d="M80 58 Q77 68 72 80" fill="none" stroke="#000" strokeWidth="0.25" opacity="0.08" />

      {/* === TRICEPS (posterior) === */}
      <path
        d="M30 62 C29 68 28 76 28 82 C28 87 29 92 30 95
           L35 94 C34 89 33 84 33 79 C33 72 34 66 35 62 Z"
        fill={get('triceps')}
      />
      <path
        d="M90 62 C91 68 92 76 92 82 C92 87 91 92 90 95
           L85 94 C86 89 87 84 87 79 C87 72 86 66 85 62 Z"
        fill={get('triceps')}
      />

      {/* === FOREARMS === */}
      <path
        d="M27 100 C26 107 25 115 25 122 C25 127 26 131 27 134
           L32 133 C31 129 30 124 30 118 C30 110 31 104 32 100 Z"
        fill={get('forearms')}
      />
      <path
        d="M93 100 C94 107 95 115 95 122 C95 127 94 131 93 134
           L88 133 C89 129 90 124 90 118 C90 110 89 104 88 100 Z"
        fill={get('forearms')}
      />

      {/* === LOWER BACK (erector spinae) === */}
      <path
        d="M52 68 C54 67 57 66 60 66 C63 66 66 67 68 68
           L68 102 C66 104 63 105 60 105 C57 105 54 104 52 102 Z"
        fill={get('lower_back')}
      />
      <path d="M56 70 L56 100" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.1" />
      <path d="M64 70 L64 100" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.1" />

      {/* === GLUTES === */}
      <path
        d="M44 108 C42 116 42 126 44 134 C46 140 50 143 55 143
           L60 143 L60 108 C56 107 50 107 44 108 Z"
        fill={get('glutes')}
      />
      <path
        d="M76 108 C78 116 78 126 76 134 C74 140 70 143 65 143
           L60 143 L60 108 C64 107 70 107 76 108 Z"
        fill={get('glutes')}
      />
      <line x1="60" y1="108" x2="60" y2="143" stroke="#000" strokeWidth="0.4" opacity="0.12" />
      <path d="M47 114 Q52 122 56 130" fill="none" stroke="#000" strokeWidth="0.25" opacity="0.08" />
      <path d="M73 114 Q68 122 64 130" fill="none" stroke="#000" strokeWidth="0.25" opacity="0.08" />

      {/* === HAMSTRINGS === */}
      <path
        d="M44 148 C43 160 42 174 43 186 C44 194 45 200 46 204
           L56 204 C57 200 58 193 58 185 C58 172 57 160 56 148 Z"
        fill={get('hamstrings')}
      />
      <path
        d="M76 148 C77 160 78 174 77 186 C76 194 75 200 74 204
           L64 204 C63 200 62 193 62 185 C62 172 63 160 64 148 Z"
        fill={get('hamstrings')}
      />
      <path d="M50 152 L50 198" fill="none" stroke="#000" strokeWidth="0.25" opacity="0.1" />
      <path d="M70 152 L70 198" fill="none" stroke="#000" strokeWidth="0.25" opacity="0.1" />

      {/* === CALVES (gastrocnemius) === */}
      <path
        d="M44 210 C43 218 42 228 43 238 C44 244 46 248 48 250
           L56 250 C57 246 57 240 56 232 C55 224 54 217 53 210 Z"
        fill={get('calves')}
      />
      <path
        d="M76 210 C77 218 78 228 77 238 C76 244 74 248 72 250
           L64 250 C63 246 63 240 64 232 C65 224 66 217 67 210 Z"
        fill={get('calves')}
      />
      <path d="M48 214 L48 242" fill="none" stroke="#000" strokeWidth="0.25" opacity="0.08" />
      <path d="M72 214 L72 242" fill="none" stroke="#000" strokeWidth="0.25" opacity="0.08" />

      <text x="60" y="280" textAnchor="middle" className="text-[8px]" fill="#7a7d96" opacity="0.7">BACK</text>
    </svg>
  )
}
