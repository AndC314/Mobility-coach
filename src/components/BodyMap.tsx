import type { MuscleScore } from '../data/muscleMap'
import type { MuscleGroup } from '../data/muscleMap'

const UNTRAINED = '#d0d3de'
const PRIMARY_FULL = '#d9472b'
const SECONDARY_FULL = '#f5c842'

function scoreColor(score: number, level: 'primary' | 'secondary'): string {
  if (score === 0) return UNTRAINED
  if (level === 'secondary') {
    const alpha = Math.round((score / 100) * 200 + 55)
    return SECONDARY_FULL + alpha.toString(16).padStart(2, '0').slice(0, 2)
  }
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
      <div className="flex gap-4 justify-center" style={{ minWidth: width }}>
        <FrontView get={get} />
        <BackView get={get} />
      </div>
      <Legend />
    </div>
  )
}

function Legend() {
  return (
    <div className="mt-3 flex justify-center gap-4 text-xs text-muted">
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-[#d9472b] inline-block" />
        Primary Muscles
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-[#f5c842] inline-block" />
        Secondary Muscles
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-[#d0d3de] inline-block" />
        Untargeted Muscles
      </div>
    </div>
  )
}

function FrontView({ get }: { get: (m: MuscleGroup) => string }) {
  return (
    <svg viewBox="0 0 200 420" width="155" height="320" aria-label="Front body view">
      {/* Body outline */}
      <path
        d="M100 18 C88 18 80 26 78 38 C76 46 78 52 80 56 L80 58 C72 62 64 68 58 76 C52 84 48 94 46 106 L42 106 C36 108 32 114 30 122 C28 132 30 140 34 144 L38 146 C38 152 40 158 42 162 L42 164 C40 174 38 184 38 194 L40 200 L42 230 C42 240 44 250 46 260 L48 280 C48 290 50 300 52 310 L54 340 C54 350 56 358 58 364 L60 374 C58 378 56 382 56 386 C56 392 60 396 66 398 L72 398 C78 398 82 394 84 390 L86 386 C88 380 88 376 88 372 L88 340 C92 336 96 332 100 330 C104 332 108 336 112 340 L112 372 C112 376 112 380 114 386 L116 390 C118 394 122 398 128 398 L134 398 C140 396 144 392 144 386 C144 382 142 378 140 374 L142 364 C144 358 146 350 146 340 L148 310 C150 300 152 290 152 280 L154 260 C156 250 158 240 158 230 L160 200 L162 194 C162 184 160 174 158 164 L158 162 C160 158 162 152 162 146 L166 144 C170 140 172 132 170 122 C168 114 164 108 158 106 L154 106 C152 94 148 84 142 76 C136 68 128 62 120 58 L120 56 C122 52 124 46 122 38 C120 26 112 18 100 18 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        className="text-border"
        opacity="0.6"
      />

      {/* Chest - pectorals */}
      <path
        d="M72 82 C72 78 76 74 82 72 C88 70 94 70 100 72 C106 70 112 70 118 72 C124 74 128 78 128 82 C128 90 124 96 118 100 C112 104 106 106 100 106 C94 106 88 104 82 100 C76 96 72 90 72 82 Z"
        fill={get('chest')}
        opacity="0.85"
      />
      {/* Chest separation line */}
      <line x1="100" y1="72" x2="100" y2="106" stroke="currentColor" strokeWidth="0.5" className="text-border" opacity="0.3" />

      {/* Front deltoids */}
      <path
        d="M58 76 C62 70 68 66 72 68 C74 70 74 76 72 82 C68 86 64 88 60 88 C56 86 54 82 58 76 Z"
        fill={get('front_delt')}
        opacity="0.85"
      />
      <path
        d="M142 76 C138 70 132 66 128 68 C126 70 126 76 128 82 C132 86 136 88 140 88 C144 86 146 82 142 76 Z"
        fill={get('front_delt')}
        opacity="0.85"
      />

      {/* Biceps */}
      <path
        d="M52 94 C50 100 48 110 48 120 C48 130 50 138 52 142 L58 140 C56 134 54 126 54 118 C54 108 56 100 58 94 Z"
        fill={get('biceps')}
        opacity="0.85"
      />
      <path
        d="M148 94 C150 100 152 110 152 120 C152 130 150 138 148 142 L142 140 C144 134 146 126 146 118 C146 108 144 100 142 94 Z"
        fill={get('biceps')}
        opacity="0.85"
      />

      {/* Triceps (front — lateral head visible) */}
      <path
        d="M58 94 C60 100 62 108 62 118 C62 126 60 134 58 140 L52 142 L52 94 Z"
        fill={get('triceps')}
        opacity="0.55"
      />
      <path
        d="M142 94 C140 100 138 108 138 118 C138 126 140 134 142 140 L148 142 L148 94 Z"
        fill={get('triceps')}
        opacity="0.55"
      />

      {/* Forearms */}
      <path
        d="M46 148 C44 158 42 170 42 180 C42 188 44 194 46 198 L54 196 C52 190 50 184 50 176 C50 166 52 156 54 148 Z"
        fill={get('forearms')}
        opacity="0.85"
      />
      <path
        d="M154 148 C156 158 158 170 158 180 C158 188 156 194 154 198 L146 196 C148 190 150 184 150 176 C150 166 148 156 146 148 Z"
        fill={get('forearms')}
        opacity="0.85"
      />

      {/* Abs — six-pack sections */}
      <path
        d="M86 108 C86 106 90 104 100 104 C110 104 114 106 114 108 L114 130 C114 132 110 134 100 134 C90 134 86 132 86 130 Z"
        fill={get('abs')}
        opacity="0.8"
      />
      <path
        d="M86 136 C86 134 90 133 100 133 C110 133 114 134 114 136 L114 156 C114 158 110 160 100 160 C90 160 86 158 86 156 Z"
        fill={get('abs')}
        opacity="0.85"
      />
      <path
        d="M86 162 C86 160 90 159 100 159 C110 159 114 160 114 162 L114 178 C114 180 110 182 100 182 C90 182 86 180 86 178 Z"
        fill={get('abs')}
        opacity="0.85"
      />
      {/* Ab center line */}
      <line x1="100" y1="104" x2="100" y2="182" stroke="currentColor" strokeWidth="0.4" className="text-border" opacity="0.25" />

      {/* Hip flexors */}
      <path
        d="M80 182 C78 190 76 198 76 206 L88 206 L92 182 Z"
        fill={get('hip_flexors')}
        opacity="0.7"
      />
      <path
        d="M120 182 C122 190 124 198 124 206 L112 206 L108 182 Z"
        fill={get('hip_flexors')}
        opacity="0.7"
      />

      {/* Quads */}
      <path
        d="M72 214 C70 230 68 250 68 268 C68 280 70 290 72 296 L88 296 C90 290 92 280 92 268 C92 250 90 230 88 214 Z"
        fill={get('quads')}
        opacity="0.85"
      />
      <path
        d="M128 214 C130 230 132 250 132 268 C132 280 130 290 128 296 L112 296 C110 290 108 280 108 268 C108 250 110 230 112 214 Z"
        fill={get('quads')}
        opacity="0.85"
      />

      {/* Inner thigh / adductors */}
      <path
        d="M88 214 C90 230 92 248 92 268 L100 268 L100 214 Z"
        fill={get('inner_thigh')}
        opacity="0.7"
      />
      <path
        d="M112 214 C110 230 108 248 108 268 L100 268 L100 214 Z"
        fill={get('inner_thigh')}
        opacity="0.7"
      />

      {/* Calves (front — tibialis) */}
      <path
        d="M70 302 C68 320 68 338 70 354 L82 354 C84 338 84 320 82 302 Z"
        fill={get('calves')}
        opacity="0.6"
      />
      <path
        d="M130 302 C132 320 132 338 130 354 L118 354 C116 338 116 320 118 302 Z"
        fill={get('calves')}
        opacity="0.6"
      />
    </svg>
  )
}

function BackView({ get }: { get: (m: MuscleGroup) => string }) {
  return (
    <svg viewBox="0 0 200 420" width="155" height="320" aria-label="Back body view">
      {/* Body outline (mirrored) */}
      <path
        d="M100 18 C88 18 80 26 78 38 C76 46 78 52 80 56 L80 58 C72 62 64 68 58 76 C52 84 48 94 46 106 L42 106 C36 108 32 114 30 122 C28 132 30 140 34 144 L38 146 C38 152 40 158 42 162 L42 164 C40 174 38 184 38 194 L40 200 L42 230 C42 240 44 250 46 260 L48 280 C48 290 50 300 52 310 L54 340 C54 350 56 358 58 364 L60 374 C58 378 56 382 56 386 C56 392 60 396 66 398 L72 398 C78 398 82 394 84 390 L86 386 C88 380 88 376 88 372 L88 340 C92 336 96 332 100 330 C104 332 108 336 112 340 L112 372 C112 376 112 380 114 386 L116 390 C118 394 122 398 128 398 L134 398 C140 396 144 392 144 386 C144 382 142 378 140 374 L142 364 C144 358 146 350 146 340 L148 310 C150 300 152 290 152 280 L154 260 C156 250 158 240 158 230 L160 200 L162 194 C162 184 160 174 158 164 L158 162 C160 158 162 152 162 146 L166 144 C170 140 172 132 170 122 C168 114 164 108 158 106 L154 106 C152 94 148 84 142 76 C136 68 128 62 120 58 L120 56 C122 52 124 46 122 38 C120 26 112 18 100 18 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        className="text-border"
        opacity="0.6"
      />

      {/* Traps — diamond shape from neck to mid-back */}
      <path
        d="M82 56 C86 52 94 50 100 50 C106 50 114 52 118 56 L124 68 C120 74 110 78 100 78 C90 78 80 74 76 68 Z"
        fill={get('traps')}
        opacity="0.85"
      />

      {/* Rear deltoids */}
      <path
        d="M58 76 C62 70 68 68 72 70 C74 74 72 80 68 86 C64 90 58 90 56 86 C54 82 54 78 58 76 Z"
        fill={get('rear_delt')}
        opacity="0.85"
      />
      <path
        d="M142 76 C138 70 132 68 128 70 C126 74 128 80 132 86 C136 90 142 90 144 86 C146 82 146 78 142 76 Z"
        fill={get('rear_delt')}
        opacity="0.85"
      />

      {/* Rhomboids — mid-back between shoulder blades */}
      <path
        d="M82 68 C86 64 94 62 100 62 C106 62 114 64 118 68 L118 98 C114 102 106 104 100 104 C94 104 86 102 82 98 Z"
        fill={get('rhomboids')}
        opacity="0.85"
      />
      {/* Spine line */}
      <line x1="100" y1="56" x2="100" y2="180" stroke="currentColor" strokeWidth="0.6" className="text-border" opacity="0.3" />

      {/* Lats — large wing shape */}
      <path
        d="M68 82 C64 90 60 100 58 112 C56 124 58 132 62 136 L78 136 C80 128 82 118 82 108 C82 98 78 90 74 82 Z"
        fill={get('lats')}
        opacity="0.85"
      />
      <path
        d="M132 82 C136 90 140 100 142 112 C144 124 142 132 138 136 L122 136 C120 128 118 118 118 108 C118 98 122 90 126 82 Z"
        fill={get('lats')}
        opacity="0.85"
      />

      {/* Triceps (back — long head) */}
      <path
        d="M50 94 C48 104 46 116 46 126 C46 134 48 140 50 144 L58 142 C56 136 54 128 54 120 C54 110 56 100 58 94 Z"
        fill={get('triceps')}
        opacity="0.85"
      />
      <path
        d="M150 94 C152 104 154 116 154 126 C154 134 152 140 150 144 L142 142 C144 136 146 128 146 120 C146 110 144 100 142 94 Z"
        fill={get('triceps')}
        opacity="0.85"
      />

      {/* Forearms */}
      <path
        d="M44 150 C42 160 40 172 40 182 C40 190 42 196 44 200 L52 198 C50 192 48 186 48 178 C48 168 50 158 52 150 Z"
        fill={get('forearms')}
        opacity="0.85"
      />
      <path
        d="M156 150 C158 160 160 172 160 182 C160 190 158 196 156 200 L148 198 C150 192 152 186 152 178 C152 168 150 158 148 150 Z"
        fill={get('forearms')}
        opacity="0.85"
      />

      {/* Lower back — erector spinae */}
      <path
        d="M86 108 C86 106 92 104 100 104 C108 104 114 106 114 108 L114 148 C114 152 108 154 100 154 C92 154 86 152 86 148 Z"
        fill={get('lower_back')}
        opacity="0.85"
      />

      {/* Glutes */}
      <path
        d="M72 160 C68 172 68 186 72 198 C76 208 84 212 92 212 L100 212 L100 160 C92 158 82 158 72 160 Z"
        fill={get('glutes')}
        opacity="0.85"
      />
      <path
        d="M128 160 C132 172 132 186 128 198 C124 208 116 212 108 212 L100 212 L100 160 C108 158 118 158 128 160 Z"
        fill={get('glutes')}
        opacity="0.85"
      />

      {/* Hamstrings */}
      <path
        d="M72 218 C70 236 68 256 70 274 C72 286 74 294 76 300 L90 300 C92 294 94 284 94 272 C94 254 92 236 90 218 Z"
        fill={get('hamstrings')}
        opacity="0.85"
      />
      <path
        d="M128 218 C130 236 132 256 130 274 C128 286 126 294 124 300 L110 300 C108 294 106 284 106 272 C106 254 108 236 110 218 Z"
        fill={get('hamstrings')}
        opacity="0.85"
      />

      {/* Calves (gastrocnemius) */}
      <path
        d="M72 306 C70 316 68 330 70 344 C72 354 76 360 80 362 L90 362 C92 356 92 346 90 336 C88 326 86 316 84 306 Z"
        fill={get('calves')}
        opacity="0.85"
      />
      <path
        d="M128 306 C130 316 132 330 130 344 C128 354 124 360 120 362 L110 362 C108 356 108 346 110 336 C112 326 114 316 116 306 Z"
        fill={get('calves')}
        opacity="0.85"
      />
    </svg>
  )
}
