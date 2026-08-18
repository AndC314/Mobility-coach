import type { MuscleScore } from '../data/muscleMap'
import type { MuscleGroup } from '../data/muscleMap'

const UNTRAINED = '#2e3248'
const PRIMARY_FULL = '#d9472b'
const SECONDARY_FULL = '#f5c842'

function scoreColor(score: number, level: 'primary' | 'secondary'): string {
  if (score === 0) return UNTRAINED
  if (level === 'secondary') {
    const t = score / 100
    return interpolateColor('#2e3248', SECONDARY_FULL, t)
  }
  const t = score / 100
  return interpolateColor('#2e3248', PRIMARY_FULL, t)
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

export default function BodyMap({ scores, width = 340 }: BodyMapProps) {
  const scoreMap = new Map(scores.map((s) => [s.muscle, s]))
  const get = (m: MuscleGroup) => {
    const s = scoreMap.get(m)
    return scoreColor(s?.score ?? 0, s?.level ?? 'secondary')
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-3 justify-center" style={{ minWidth: width }}>
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
    <svg viewBox="0 0 180 400" width="160" height="340" aria-label="Front body view">
      {/* Body silhouette outline */}
      <path
        d="M90 12 C80 12 73 18 71 28 C69 36 71 42 73 46 L73 48
           C66 52 58 58 52 66 C46 74 42 84 40 96 L36 97
           C30 99 27 105 25 112 C23 121 25 128 29 132 L33 134
           C33 139 35 145 37 150 L37 154
           C35 164 33 175 33 186 L35 192 L37 220
           C37 230 39 240 41 250 L43 270
           C43 280 45 290 47 300 L49 328
           C49 338 51 346 53 352 L55 362
           C53 365 51 370 51 374 C51 380 55 384 60 386 L66 386
           C71 386 75 382 77 378 L79 374 C80 369 80 365 80 362
           L80 330 C84 326 87 322 90 320
           C93 322 96 326 100 330 L100 362
           C100 365 100 369 101 374 L103 378
           C105 382 109 386 114 386 L120 386
           C125 384 129 380 129 374 C129 370 127 365 125 362
           L127 352 C129 346 131 338 131 328 L133 300
           C135 290 137 280 137 270 L139 250
           C141 240 143 230 143 220 L145 192 L147 186
           C147 175 145 164 143 154 L143 150
           C145 145 147 139 147 134 L151 132
           C155 128 157 121 155 112 C153 105 150 99 144 97
           L140 96 C138 84 134 74 128 66
           C122 58 114 52 107 48 L107 46
           C109 42 111 36 109 28 C107 18 100 12 90 12 Z"
        fill="#1a1d2e"
        stroke="#3e4258"
        strokeWidth="1"
      />

      {/* === CHEST — Pectoralis Major === */}
      {/* Left pec */}
      <path
        d="M63 74 C67 69 75 66 83 67 C87 68 89 70 90 73
           L90 100 C87 103 82 105 76 104 C70 103 65 99 62 94
           C59 88 60 80 63 74 Z"
        fill={get('chest')}
      />
      {/* Right pec */}
      <path
        d="M117 74 C113 69 105 66 97 67 C93 68 91 70 90 73
           L90 100 C93 103 98 105 104 104 C110 103 115 99 118 94
           C121 88 120 80 117 74 Z"
        fill={get('chest')}
      />
      {/* Pec fiber lines */}
      <path d="M70 78 Q80 82 88 85" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.15" />
      <path d="M68 84 Q78 88 87 92" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.15" />
      <path d="M110 78 Q100 82 92 85" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.15" />
      <path d="M112 84 Q102 88 93 92" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.15" />

      {/* === FRONT DELTOIDS === */}
      <path
        d="M52 66 C56 61 62 58 66 60 C68 62 67 68 65 74
           C63 79 59 82 55 81 C51 79 49 74 52 66 Z"
        fill={get('front_delt')}
      />
      <path
        d="M128 66 C124 61 118 58 114 60 C112 62 113 68 115 74
           C117 79 121 82 125 81 C129 79 131 74 128 66 Z"
        fill={get('front_delt')}
      />

      {/* === BICEPS === */}
      <path
        d="M47 86 C45 92 43 102 43 112 C43 120 45 127 47 132
           L54 130 C52 124 50 117 50 110 C50 101 52 93 54 86 Z"
        fill={get('biceps')}
      />
      <path
        d="M133 86 C135 92 137 102 137 112 C137 120 135 127 133 132
           L126 130 C128 124 130 117 130 110 C130 101 128 93 126 86 Z"
        fill={get('biceps')}
      />
      {/* Bicep peak line */}
      <path d="M47 106 Q50 104 54 106" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.15" />
      <path d="M133 106 Q130 104 126 106" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.15" />

      {/* === TRICEPS (lateral head visible from front) === */}
      <path
        d="M54 86 C56 92 57 100 57 110 C57 118 56 124 54 130
           L47 132 L47 86 Z"
        fill={get('triceps')}
        opacity="0.6"
      />
      <path
        d="M126 86 C124 92 123 100 123 110 C123 118 124 124 126 130
           L133 132 L133 86 Z"
        fill={get('triceps')}
        opacity="0.6"
      />

      {/* === FOREARMS === */}
      <path
        d="M41 138 C39 148 37 160 37 170 C37 178 39 184 41 188
           L49 186 C47 181 46 174 46 167 C46 157 48 147 49 138 Z"
        fill={get('forearms')}
      />
      <path
        d="M139 138 C141 148 143 160 143 170 C143 178 141 184 139 188
           L131 186 C133 181 134 174 134 167 C134 157 132 147 131 138 Z"
        fill={get('forearms')}
      />

      {/* === ABS — Rectus Abdominis (6 sections) === */}
      {/* Upper abs */}
      <path
        d="M80 102 C82 100 86 99 90 99 C94 99 98 100 100 102
           L100 118 C98 120 94 121 90 121 C86 121 82 120 80 118 Z"
        fill={get('abs')}
      />
      {/* Middle abs */}
      <path
        d="M80 123 C82 121 86 120 90 120 C94 120 98 121 100 123
           L100 142 C98 144 94 145 90 145 C86 145 82 144 80 142 Z"
        fill={get('abs')}
      />
      {/* Lower abs */}
      <path
        d="M80 147 C82 145 86 144 90 144 C94 144 98 145 100 147
           L100 168 C98 170 94 172 90 172 C86 172 82 170 80 168 Z"
        fill={get('abs')}
      />
      {/* Linea alba (center line) */}
      <line x1="90" y1="99" x2="90" y2="172" stroke="#000" strokeWidth="0.5" opacity="0.2" />
      {/* Tendinous inscriptions (horizontal lines) */}
      <line x1="81" y1="119" x2="99" y2="119" stroke="#000" strokeWidth="0.4" opacity="0.15" />
      <line x1="81" y1="143" x2="99" y2="143" stroke="#000" strokeWidth="0.4" opacity="0.15" />

      {/* === OBLIQUES (serratus + external oblique) === */}
      <path
        d="M66 96 C64 104 63 114 64 124 C65 132 67 138 70 142
           L80 140 C78 134 77 126 77 118 C77 108 78 100 79 94 Z"
        fill={get('abs')}
        opacity="0.5"
      />
      <path
        d="M114 96 C116 104 117 114 116 124 C115 132 113 138 110 142
           L100 140 C102 134 103 126 103 118 C103 108 102 100 101 94 Z"
        fill={get('abs')}
        opacity="0.5"
      />
      {/* Serratus digitations */}
      <path d="M68 98 L77 96" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.12" />
      <path d="M66 104 L77 101" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.12" />
      <path d="M65 110 L77 107" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.12" />
      <path d="M112 98 L103 96" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.12" />
      <path d="M114 104 L103 101" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.12" />
      <path d="M115 110 L103 107" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.12" />

      {/* === HIP FLEXORS === */}
      <path
        d="M74 170 C72 178 70 186 70 194 L82 194 L84 170 Z"
        fill={get('hip_flexors')}
        opacity="0.7"
      />
      <path
        d="M106 170 C108 178 110 186 110 194 L98 194 L96 170 Z"
        fill={get('hip_flexors')}
        opacity="0.7"
      />

      {/* === QUADS — Rectus Femoris + Vastus === */}
      {/* Left quad */}
      <path
        d="M66 202 C64 218 62 238 62 256 C62 268 64 278 66 284
           L82 284 C84 278 86 268 86 256 C86 238 84 218 82 202 Z"
        fill={get('quads')}
      />
      {/* Right quad */}
      <path
        d="M114 202 C116 218 118 238 118 256 C118 268 116 278 114 284
           L98 284 C96 278 94 268 94 256 C94 238 96 218 98 202 Z"
        fill={get('quads')}
      />
      {/* Quad fiber lines */}
      <path d="M70 220 L70 260" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.1" />
      <path d="M76 215 L76 270" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.1" />
      <path d="M110 220 L110 260" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.1" />
      <path d="M104 215 L104 270" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.1" />

      {/* Vastus medialis (teardrop) */}
      <path
        d="M80 268 C82 272 83 278 82 284 L74 284 C73 278 74 272 76 268 Z"
        fill={get('quads')}
        opacity="0.9"
      />
      <path
        d="M100 268 C98 272 97 278 98 284 L106 284 C107 278 106 272 104 268 Z"
        fill={get('quads')}
        opacity="0.9"
      />

      {/* === INNER THIGH / ADDUCTORS === */}
      <path
        d="M82 202 C84 218 86 238 86 256 L90 256 L90 202 Z"
        fill={get('inner_thigh')}
        opacity="0.7"
      />
      <path
        d="M98 202 C96 218 94 238 94 256 L90 256 L90 202 Z"
        fill={get('inner_thigh')}
        opacity="0.7"
      />

      {/* === CALVES (Tibialis Anterior from front) === */}
      <path
        d="M64 290 C62 306 62 322 64 340 L76 340 C78 322 78 306 76 290 Z"
        fill={get('calves')}
        opacity="0.7"
      />
      <path
        d="M116 290 C118 306 118 322 116 340 L104 340 C102 322 102 306 104 290 Z"
        fill={get('calves')}
        opacity="0.7"
      />
      {/* Tibialis ridge */}
      <path d="M68 295 L68 335" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.1" />
      <path d="M112 295 L112 335" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.1" />

      {/* Front label */}
      <text x="90" y="394" textAnchor="middle" className="text-[9px]" fill="#7a7d96">FRONT</text>
    </svg>
  )
}

function BackView({ get }: { get: (m: MuscleGroup) => string }) {
  return (
    <svg viewBox="0 0 180 400" width="160" height="340" aria-label="Back body view">
      {/* Body silhouette outline */}
      <path
        d="M90 12 C80 12 73 18 71 28 C69 36 71 42 73 46 L73 48
           C66 52 58 58 52 66 C46 74 42 84 40 96 L36 97
           C30 99 27 105 25 112 C23 121 25 128 29 132 L33 134
           C33 139 35 145 37 150 L37 154
           C35 164 33 175 33 186 L35 192 L37 220
           C37 230 39 240 41 250 L43 270
           C43 280 45 290 47 300 L49 328
           C49 338 51 346 53 352 L55 362
           C53 365 51 370 51 374 C51 380 55 384 60 386 L66 386
           C71 386 75 382 77 378 L79 374 C80 369 80 365 80 362
           L80 330 C84 326 87 322 90 320
           C93 322 96 326 100 330 L100 362
           C100 365 100 369 101 374 L103 378
           C105 382 109 386 114 386 L120 386
           C125 384 129 380 129 374 C129 370 127 365 125 362
           L127 352 C129 346 131 338 131 328 L133 300
           C135 290 137 280 137 270 L139 250
           C141 240 143 230 143 220 L145 192 L147 186
           C147 175 145 164 143 154 L143 150
           C145 145 147 139 147 134 L151 132
           C155 128 157 121 155 112 C153 105 150 99 144 97
           L140 96 C138 84 134 74 128 66
           C122 58 114 52 107 48 L107 46
           C109 42 111 36 109 28 C107 18 100 12 90 12 Z"
        fill="#1a1d2e"
        stroke="#3e4258"
        strokeWidth="1"
      />

      {/* === TRAPS — Upper trapezius diamond === */}
      <path
        d="M76 48 C80 44 86 42 90 42 C94 42 100 44 104 48
           L112 60 C108 66 100 70 90 70 C80 70 72 66 68 60 Z"
        fill={get('traps')}
      />
      {/* Trap fiber lines (converge to spine) */}
      <path d="M76 52 Q83 56 88 60" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.12" />
      <path d="M104 52 Q97 56 92 60" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.12" />
      <path d="M72 58 Q80 62 88 64" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.12" />
      <path d="M108 58 Q100 62 92 64" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.12" />

      {/* === REAR DELTOIDS === */}
      <path
        d="M52 66 C56 60 62 58 66 60 C68 63 66 70 63 76
           C60 80 55 81 52 78 C49 75 49 70 52 66 Z"
        fill={get('rear_delt')}
      />
      <path
        d="M128 66 C124 60 118 58 114 60 C112 63 114 70 117 76
           C120 80 125 81 128 78 C131 75 131 70 128 66 Z"
        fill={get('rear_delt')}
      />

      {/* === RHOMBOIDS (between shoulder blades) === */}
      <path
        d="M76 62 C80 58 86 56 90 56 C94 56 100 58 104 62
           L104 90 C100 94 94 96 90 96 C86 96 80 94 76 90 Z"
        fill={get('rhomboids')}
      />
      {/* Spine line */}
      <line x1="90" y1="42" x2="90" y2="170" stroke="#000" strokeWidth="0.6" opacity="0.2" />

      {/* === LATS — Latissimus Dorsi (wing) === */}
      <path
        d="M62 76 C58 84 54 94 52 106 C50 118 52 128 56 132
           L74 130 C76 122 77 112 76 102 C75 92 72 84 68 76 Z"
        fill={get('lats')}
      />
      <path
        d="M118 76 C122 84 126 94 128 106 C130 118 128 128 124 132
           L106 130 C104 122 103 112 104 102 C105 92 108 84 112 76 Z"
        fill={get('lats')}
      />
      {/* Lat fiber lines (fan down toward iliac crest) */}
      <path d="M64 82 Q68 94 72 110" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.1" />
      <path d="M60 90 Q64 102 68 118" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.1" />
      <path d="M116 82 Q112 94 108 110" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.1" />
      <path d="M120 90 Q116 102 112 118" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.1" />

      {/* === TRICEPS (long head — posterior) === */}
      <path
        d="M44 86 C42 96 40 108 40 118 C40 126 42 132 44 136
           L52 134 C50 128 48 120 48 112 C48 102 50 92 52 86 Z"
        fill={get('triceps')}
      />
      <path
        d="M136 86 C138 96 140 108 140 118 C140 126 138 132 136 136
           L128 134 C130 128 132 120 132 112 C132 102 130 92 128 86 Z"
        fill={get('triceps')}
      />
      {/* Tricep horseshoe line */}
      <path d="M45 108 Q48 106 52 108" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.15" />
      <path d="M135 108 Q132 106 128 108" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.15" />

      {/* === FOREARMS === */}
      <path
        d="M38 142 C36 152 34 164 34 174 C34 182 36 188 38 192
           L46 190 C44 185 43 178 43 171 C43 161 45 151 46 142 Z"
        fill={get('forearms')}
      />
      <path
        d="M142 142 C144 152 146 164 146 174 C146 182 144 188 142 192
           L134 190 C136 185 137 178 137 171 C137 161 135 151 134 142 Z"
        fill={get('forearms')}
      />

      {/* === LOWER BACK — Erector Spinae === */}
      <path
        d="M78 98 C80 96 84 95 90 95 C96 95 100 96 102 98
           L102 142 C100 146 96 148 90 148 C84 148 80 146 78 142 Z"
        fill={get('lower_back')}
      />
      {/* Erector columns */}
      <path d="M84 100 L84 142" fill="none" stroke="#000" strokeWidth="0.4" opacity="0.12" />
      <path d="M96 100 L96 142" fill="none" stroke="#000" strokeWidth="0.4" opacity="0.12" />

      {/* === GLUTES — Gluteus Maximus === */}
      <path
        d="M66 152 C62 164 62 178 66 190 C70 200 78 204 86 204
           L90 204 L90 152 C84 150 76 150 66 152 Z"
        fill={get('glutes')}
      />
      <path
        d="M114 152 C118 164 118 178 114 190 C110 200 102 204 94 204
           L90 204 L90 152 C96 150 104 150 114 152 Z"
        fill={get('glutes')}
      />
      {/* Glute fiber lines */}
      <path d="M70 160 Q78 170 84 180" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.1" />
      <path d="M66 170 Q74 180 82 190" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.1" />
      <path d="M110 160 Q102 170 96 180" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.1" />
      <path d="M114 170 Q106 180 98 190" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.1" />
      {/* Glute separation */}
      <line x1="90" y1="152" x2="90" y2="204" stroke="#000" strokeWidth="0.5" opacity="0.15" />

      {/* === HAMSTRINGS === */}
      <path
        d="M66 210 C64 228 62 248 64 264 C66 276 68 284 70 290
           L84 290 C86 284 88 274 88 262 C88 244 86 226 84 210 Z"
        fill={get('hamstrings')}
      />
      <path
        d="M114 210 C116 228 118 248 116 264 C114 276 112 284 110 290
           L96 290 C94 284 92 274 92 262 C92 244 94 226 96 210 Z"
        fill={get('hamstrings')}
      />
      {/* Hamstring separation (biceps femoris vs semitendinosus) */}
      <path d="M76 215 L76 280" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.12" />
      <path d="M104 215 L104 280" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.12" />

      {/* === CALVES — Gastrocnemius === */}
      <path
        d="M66 296 C64 306 62 320 64 334 C66 344 70 350 74 352
           L84 352 C86 346 86 336 84 326 C82 316 80 306 78 296 Z"
        fill={get('calves')}
      />
      <path
        d="M114 296 C116 306 118 320 116 334 C114 344 110 350 106 352
           L96 352 C94 346 94 336 96 326 C98 316 100 306 102 296 Z"
        fill={get('calves')}
      />
      {/* Calf heads separation */}
      <path d="M72 300 L72 340" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.12" />
      <path d="M108 300 L108 340" fill="none" stroke="#000" strokeWidth="0.3" opacity="0.12" />

      {/* Back label */}
      <text x="90" y="394" textAnchor="middle" className="text-[9px]" fill="#7a7d96">BACK</text>
    </svg>
  )
}
