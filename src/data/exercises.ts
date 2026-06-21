// ─────────────────────────────────────────────────────────────────────────
// EXERCISE LIBRARY
// Ported from the existing mobility-tracker component. Content reused
// as-is; added: stable ids, timerSec (for the in-app timer), and a
// `caution` field where relevant (e.g. Cat-Cow after a back spasm).
// ─────────────────────────────────────────────────────────────────────────

export interface ExerciseItem {
  id: string
  name: string
  sets: string
  timerSec: number
  purpose: string
  setup: string
  cue: string
  feel: string
  caution?: string
  /** If set, timerSec is the duration PER SIDE. The card runs two timers
   * back-to-back (Left/Right or Side 1/Side 2), auto-restarting between
   * them, instead of a single countdown. */
  sides?: boolean
}

export const MORNING_ROUTINE: ExerciseItem[] = [
  {
    id: 'pelvic_clock',
    name: 'Pelvic Clock',
    sets: '20 slow reps · 2 min',
    timerSec: 120,
    purpose: 'Teach pelvis to move independently from the spine',
    setup:
      'Lie on your back, knees bent, feet flat hip-width apart. Arms relaxed at your sides.',
    cue:
      'Imagine a clock on your pelvis: 12 at the navel, 6 at the tailbone. Slowly tilt toward 12 (arch low back), then toward 6 (flatten). Find the neutral midpoint. Move only the pelvis — ribs stay still.',
    feel: 'Low back: gentle alternating arch and flatten. No pain, just control.',
    caution:
      'If you feel sharp pain arching toward 12, keep the range tiny and pain-free — don’t chase a full arch.'
  },
  {
    id: 'cat_cow',
    name: 'Cat-Cow',
    sets: '10 slow cycles · 1 min',
    timerSec: 60,
    purpose: 'Segment the spine — move each vertebra individually',
    setup: 'On all fours: wrists under shoulders, knees under hips. Spine neutral.',
    cue:
      'COW: start from the tailbone, tilt it up, let the arch ripple up lumbar → thoracic → neck. CAT: tuck tailbone, round from base up through mid-back → upper back → drop head last. 5 sec per direction.',
    feel: 'Each segment moving in sequence. If one area feels stuck, pause and breathe into it.',
    caution:
      'Sharp pain on the Cat→Cow (arching) transition after a back spasm: skip Cow entirely. Do Cat-only (rounding) holds until pain-free.'
  },
  {
    id: 'hip_flexor_lunge',
    name: 'Hip Flexor Lunge',
    sets: '2 × 60 sec each side · 2 min',
    timerSec: 60,
    sides: true,
    purpose: 'Release psoas shortened by desk sitting',
    setup:
      'Kneel on one knee (mat for comfort). Front foot forward, front shin vertical. Back knee under hip. Hands on front thigh or hips.',
    cue:
      'FIRST: squeeze the back glute hard — this is the unlock. THEN: shift hips slightly forward (not torso). Feel it deep in the front crease of the back hip, not the thigh.',
    feel: 'Deep pull at the very front of the hip joint on the back leg. If you feel it in the thigh — squeeze the glute harder.'
  },
  {
    id: 'lat_hang',
    name: 'Lat Hang',
    sets: '3 × 30 sec · 1.5 min',
    timerSec: 30,
    purpose: 'Release lats + decompress lumbar spine',
    setup: 'Grip pull-up bar slightly wider than shoulder-width. Let feet leave the floor. Relax shoulders.',
    cue:
      'Let gravity decompress you 10 sec. Then actively reach taller through your arms — feel stretch deepen from armpit to lower back. Breathe into the sides of your ribcage.',
    feel: 'Lengthening from armpit to lower back. Not in hands or forearms.'
  },
  {
    id: 'dead_bug',
    name: 'Dead Bug',
    sets: '3 × 8 reps each side · 2 min',
    timerSec: 120,
    purpose: 'Core stability + train anterior pelvic tilt under load',
    setup:
      'Lie on your back, arms pointing to ceiling, knees bent 90° in the air (tabletop). Press lower back FLAT into the floor.',
    cue:
      'Slowly lower one arm overhead AND the opposite leg toward the floor simultaneously. Only go as far as lower back stays flat. Return and switch. Not a stretch — a control drill.',
    feel: 'Deep core bracing. Lower back glued to floor the entire time.'
  },
  {
    id: 'seated_pelvic_tilt',
    name: 'Seated Pelvic Tilt',
    sets: '20 reps, 5–8 sec hold · 1.5 min',
    timerSec: 90,
    purpose: 'Reprogram desk posture — also do this at your work desk',
    setup: 'Sit on a firm chair. Rolled towel behind lower back as feedback. Feet flat, knees at 90°.',
    cue:
      'Tighten deep abs, tuck tailbone forward — press lower back into the towel. Hold 5–8 sec. Relax fully. Movement comes from core, not feet.',
    feel: 'Lower back flattening against the towel. Mild deep-ab engagement, not a crunch.',
    caution: 'If posterior tilt itself is sharp right now, reduce range drastically or skip until pain-free.'
  }
]

export const BJJ_RELEASE: ExerciseItem[] = [
  {
    id: 'hip_flexor_lunge_ext',
    name: 'Hip Flexor Lunge (extended)',
    sets: '2 × 90 sec each side · 3 min',
    timerSec: 90,
    sides: true,
    purpose: 'Release psoas compressed during guard and passing',
    setup: 'Same as morning. Optionally raise back foot onto a couch or wall for deeper stretch.',
    cue:
      'Squeeze back glute, shift hips forward. Focus on the guard-side hip — it took the most compression. Each exhale deepens position a few mm.',
    feel: 'Deep hip crease pull on back leg. Gradually deepening with each breath.'
  },
  {
    id: 'ninety_ninety_fold',
    name: '90/90 with Forward Fold',
    sets: '60 sec each side × 2 · 3 min',
    timerSec: 60,
    sides: true,
    purpose: 'Decompress external rotators after guard work',
    setup:
      'Both knees at 90°, front shin parallel ahead, back shin behind. Sit on blanket if hips don’t both touch floor.',
    cue:
      'Anterior tilt first (small arch). Then slowly lean chest toward front shin. Chest leads, not forehead. Feel pressure build deep in back-hip glute.',
    feel: 'Deep muscular pressure inside back hip (piriformis/glute). Not sharp, not in the joint.',
    caution: 'Skip the anterior-tilt arch if it’s sharp right now — fold gently without forcing the arch.'
  },
  {
    id: 'supine_figure_4',
    name: 'Supine Figure-4',
    sets: '60–90 sec each side · 2 min',
    timerSec: 75,
    sides: true,
    purpose: 'Release piriformis and deep hip rotators',
    setup:
      'Lie on back, knees bent, feet flat. Cross right ankle over left knee just above the kneecap. Flex right foot.',
    cue:
      'Reach hands behind left thigh and pull toward chest. Keep head and shoulders on floor. Right knee points away — gently push it further away with elbow to increase.',
    feel: 'Deep in outer hip and glute of the crossed (top) leg. If nothing: pull bottom thigh closer to chest.'
  },
  {
    id: 'lat_hang_bjj',
    name: 'Lat Hang',
    sets: '2 × 30 sec · 1 min',
    timerSec: 30,
    purpose: 'Decompress spine after rolling',
    setup: 'Pull-up bar, full hang, feet off floor.',
    cue: 'Just breathe. Pure passive decompression. Breathe into the sides of your ribs.',
    feel: 'Spine lengthening. Relief in lower back.'
  },
  {
    id: 'childs_pose_lat',
    name: "Child's Pose with Lat Reach",
    sets: '45 sec center + 45 sec each side · 2 min',
    timerSec: 45,
    purpose: 'Full posterior chain reset',
    setup: 'Kneel, sit hips toward heels, reach arms forward, forehead down.',
    cue:
      'CENTER: breathe deeply, low back expands. SIDE: walk both hands right — feel left lat and side body stretch. Repeat left. Hips heavy toward heels.',
    feel: 'Center: low back and hips opening. Side: clear stretch along torso from hip to armpit.'
  }
]

// New exercises for recovery sequences (neck / shoulders / general)
export const RECOVERY_EXTRAS: ExerciseItem[] = [
  {
    id: 'chin_tucks',
    name: 'Chin Tucks',
    sets: '2 × 10 reps · 1.5 min',
    timerSec: 90,
    purpose: 'Decompress the cervical spine, release upper traps',
    setup: 'Sit or stand tall, shoulders relaxed down.',
    cue:
      'Glide your head straight back, like making a double chin, without tilting up or down. Hold 2 sec, release. Slow and controlled.',
    feel: 'Gentle stretch at the base of the skull and back of the neck.'
  },
  {
    id: 'neck_side_stretch',
    name: 'Neck Side Stretch',
    sets: '45 sec each side · 1.5 min',
    timerSec: 45,
    sides: true,
    purpose: 'Release upper traps and side neck tension',
    setup: 'Sit tall. Anchor one hand under your thigh for the side you’re stretching.',
    cue:
      'Tilt your ear toward the opposite shoulder. Add gentle overhead hand pressure for a deeper stretch. Keep shoulders down and relaxed.',
    feel: 'A stretch along the side of the neck down toward the shoulder.'
  },
  {
    id: 'doorway_pec_stretch',
    name: 'Doorway Pec Stretch',
    sets: '45 sec each side, two arm heights · 2 min',
    timerSec: 45,
    purpose: 'Open the front of the shoulder and chest — handstand prep',
    setup: 'Stand in a doorway, forearm on the frame.',
    cue:
      'Try the arm at 90° first, then lower to ~45°. Rotate your body away from the arm until you feel a stretch in the front of the shoulder/chest, not the bicep.',
    feel: 'Stretch across the front of the chest/shoulder. If you feel nothing, try the lower arm angle.'
  },
  {
    id: 'shoulder_cars',
    name: 'Shoulder CARs',
    sets: '5 slow circles each direction each side · 3 min',
    timerSec: 45,
    sides: true,
    purpose: 'Full shoulder joint health — active range of motion, not passive stretching',
    setup:
      'Stand tall, brace your core and squeeze your glutes to lock the spine out of the movement. Pin one arm to your side. Move only from the shoulder.',
    cue:
      'Reach your arm forward, then arc up overhead as high as you can, then pull back behind you as far as possible, then circle down. Move through every degree of range you have — this is active control, not momentum. Go painfully slow.',
    feel:
      'The entire shoulder girdle working through its full available range. No pain, just deep end-range tension.',
    caution:
      'If you feel a pinch at the top (impingement), reduce the overhead range slightly and focus on the front-to-back arc instead.'
  },
  {
    id: 'wrist_conditioning',
    name: 'Wrist Conditioning',
    sets: '2–3 min total · rotations + loaded stretches',
    timerSec: 120,
    purpose: 'Build wrist resilience for BJJ gripping and calisthenics loading',
    setup:
      'Kneel on the floor, hands flat in front of you fingers pointing forward.',
    cue:
      'CIRCLES: lift palms, rotate wrists in slow circles both directions × 10 each. LOADED EXTENSION: lean forward into hands until a firm stretch is felt in the forearm. Rock gently forward and back × 10. FLEXION: flip hands over so backs of hands are on floor, lean back × 10. FINGER SPREAD: splay fingers wide, hold 5 sec, close into a fist, hold 5 sec × 5.',
    feel:
      'Progressive warmth and mild stretch through the forearm flexors and extensors. Nothing sharp.',
    caution:
      'If you have an acute wrist injury, skip loaded extension and do circles only. Stop immediately if you feel any sharp or shooting pain.'
  },
  {
    id: 'thread_the_needle',
    name: 'Thread the Needle',
    sets: '45 sec each side · 1.5 min',
    timerSec: 45,
    sides: true,
    purpose: 'Posterior shoulder + upper back rotation',
    setup: 'On all fours. Slide one arm under your body, palm up, resting your shoulder and ear on the floor.',
    cue:
      'Do a lat hang first if this feels blocked. Keep hips stacked over knees. Breathe into the upper back and shoulder.',
    feel: 'Stretch across the back of the shoulder and upper back. If you feel nothing, do a lat hang first.'
  }
]

export const ALL_EXERCISES: Record<string, ExerciseItem> = Object.fromEntries(
  [...MORNING_ROUTINE, ...BJJ_RELEASE, ...RECOVERY_EXTRAS].map((e) => [e.id, e])
)

// ─────────────────────────────────────────────────────────────────────────
// PROGRESSIONS (90/90, Straddle, Pike)
// ─────────────────────────────────────────────────────────────────────────

export interface PhaseDef {
  phase: 1 | 2 | 3 | 4
  label: string
  color: string
  sets: string
  timerSec: number
  setup: string
  cue: string
  feel: string
  checkpoint: string
  sides?: boolean
}

export const PHASES = [
  { phase: 1, weeks: '1–2', color: '#2ec4b6', title: 'Awareness' },
  { phase: 2, weeks: '3–4', color: '#f5c842', title: 'Release' },
  { phase: 3, weeks: '5–6', color: '#e8622a', title: 'Integration' },
  { phase: 4, weeks: '7–8', color: '#a78bfa', title: 'Strength' }
] as const

export const PROGRESSIONS: Record<'90/90' | 'straddle' | 'pike', PhaseDef[]> = {
  '90/90': [
    {
      phase: 1,
      label: 'Phase 1 — Awareness',
      color: '#2ec4b6',
      sets: '2 × 60 sec each side',
      timerSec: 60,
      sides: true,
      setup:
        'Sit on floor. Both knees at 90°. Front shin parallel ahead, back shin behind. Sit on a folded blanket (5–8cm) so pelvis tilts forward. Both hands on floor for support.',
      cue: 'Find anterior tilt: create a small arch in your lower back. Both hips on the floor. Don’t lean forward yet — just sit upright with the arch and hold.',
      feel: 'Deep glute and outer hip on the front-leg side. If you feel lower back: sit higher on the blanket.',
      checkpoint: 'Both hips touching the floor, spine upright'
    },
    {
      phase: 2,
      label: 'Phase 2 — Release',
      color: '#f5c842',
      sets: '2 × 60 sec each side + forward fold',
      timerSec: 60,
      sides: true,
      setup: 'Same as Phase 1. Remove one hand from floor.',
      cue: 'Hold upright 30 sec with no hands. Then fold chest toward front shin — chest leads, not forehead. Maintain low-back arch as long as possible.',
      feel: 'Deep pressure in back-hip glute when folding. Not the lower back.',
      checkpoint: 'Upright with no hands, 45 sec per side'
    },
    {
      phase: 3,
      label: 'Phase 3 — Integration',
      color: '#e8622a',
      sets: '10 switches + 5 hip lifts each side',
      timerSec: 120,
      setup: 'No blanket needed if hips now comfortably reach floor.',
      cue: 'SWITCH: lift both knees, rotate both legs to the other side. Slow. HIP LIFT: press front foot into floor, lift back knee off ground. Hold 2 sec.',
      feel: 'Hip lift: burn in outer hip of front leg working actively.',
      checkpoint: '10 smooth switches + 5 hip lifts each side'
    },
    {
      phase: 4,
      label: 'Phase 4 — Strength',
      color: '#a78bfa',
      sets: '5 full cycles each direction',
      timerSec: 150,
      setup: 'Same as Phase 3.',
      cue: 'Full flow: set up → anterior tilt → fold forward → hip lift → switch. All elements chained. Integrate as BJJ warm-up.',
      feel: 'Fluid and controlled. Each part should feel familiar now.',
      checkpoint: 'Fluid 5-cycle sequence without breaking'
    }
  ],
  straddle: [
    {
      phase: 1,
      label: 'Phase 1 — Awareness',
      color: '#2ec4b6',
      sets: '3 × 60 sec hold',
      timerSec: 60,
      setup: 'Sit on floor on folded blanket (5–8cm). Legs at comfortable width — 90° is fine. Toes to ceiling, feet dorsiflexed. Hands behind you on floor.',
      cue: 'Push sit bones forward, feel tension along the inner thigh from groin to knee. Do NOT fold yet. Just sit upright. Blanket tilts the pelvis forward automatically.',
      feel: 'Long tension line along inner thigh (adductors). NOT lower back. NOT behind knee.',
      checkpoint: 'Feel adductors clearly, not lower back'
    },
    {
      phase: 2,
      label: 'Phase 2 — Release',
      color: '#f5c842',
      sets: '3 × 60 sec + wall straddle 3–5 min',
      timerSec: 60,
      setup: 'Same blanket. Add wall straddle: lie on back with legs up a wall in a V shape.',
      cue: 'Walk hands forward 1–2cm per session, chest leading. Feet dorsiflexed. WALL: just lie and breathe — gravity opens the legs over 3–5 min.',
      feel: 'Adductors loading more with each forward walk. Wall gives slow passive opening.',
      checkpoint: 'Hands 10–15cm in front of hips with flat back'
    },
    {
      phase: 3,
      label: 'Phase 3 — Integration',
      color: '#e8622a',
      sets: '3 × 90 sec loaded holds',
      timerSec: 90,
      setup: 'No blanket. Add resistance band around both feet held in hands, OR 2–5kg plate on upper back.',
      cue: 'Use band to pull chest toward floor. Plate adds passive traction. Goal: elbows moving toward floor over weeks.',
      feel: 'Adductors and hamstrings both loading. Deeper pull than previous phases.',
      checkpoint: 'Forearms approaching floor'
    },
    {
      phase: 4,
      label: 'Phase 4 — Strength',
      color: '#a78bfa',
      sets: '3 × 2–3 min loaded + Seated Good Morning 3 × 8',
      timerSec: 150,
      setup: '5kg plate on upper back for hold. For Seated Good Morning: hold light weight at chest in straddle.',
      cue: 'HOLD: maximum passive range with plate, 2–3 min. GOOD MORNING: hinge forward with flat back, return upright. Builds active range for BJJ.',
      feel: 'Hold: deep adductor and hamstring load. Good Morning: hip flexors working to return upright.',
      checkpoint: 'Chest within 15cm of floor OR width beyond 120°'
    }
  ],
  pike: [
    {
      phase: 1,
      label: 'Phase 1 — Awareness',
      color: '#2ec4b6',
      sets: '3 × 60 sec passive hold',
      timerSec: 60,
      setup: 'Sit on folded blanket, legs straight. Loop towel or band around feet and hold ends. Feet dorsiflexed, kneecaps pushed into floor.',
      cue: 'Find anterior tilt first — small arch in low back. THEN pull towel gently to draw chest toward legs. Back stays slightly arched. Do NOT round to reach toes.',
      feel: 'Heavy pull high in back of thigh near sit bone. NOT behind knee. NOT calves.',
      checkpoint: 'Feel hamstrings near sit bone, not calves'
    },
    {
      phase: 2,
      label: 'Phase 2 — Active Pulses',
      color: '#f5c842',
      sets: '3 × 10 active pulses + 60 sec passive hold',
      timerSec: 90,
      setup: 'Same. No blanket if pelvis now tilts without it.',
      cue: 'PULSES: quads tight, toes toward shins, hip flexors compress chest toward thighs. Each rep is a 1-sec deliberate contraction — not a bounce. Rest 30 sec between sets. HOLD: end position passive 60 sec.',
      feel: 'Pulses: active effort from hip flexors, hamstrings resisting. Hold: deep hamstring near sit bone.',
      checkpoint: '10 clean active pulses with flat back'
    },
    {
      phase: 3,
      label: 'Phase 3 — Parallette Bridge',
      color: '#e8622a',
      sets: 'Tuck hold: 3 × 10 sec | One-leg: 3 × 5 sec each',
      timerSec: 90,
      setup: 'Sit between parallettes, hands gripping bars. Push down through hands. Tuck both knees to chest and lift.',
      cue: 'TUCK: lift hips, knees to chest, hold. EXTEND: slowly extend one leg straight while other stays tucked. If you can’t lift yet: feet on a low surface for assisted holds.',
      feel: 'Tuck: burn in hip flexors and hands. Extension: hamstrings and hip flexors working together.',
      checkpoint: 'Tuck hold 10 sec on parallettes'
    },
    {
      phase: 4,
      label: 'Phase 4 — L-sit',
      color: '#a78bfa',
      sets: 'L-sit: 5 × max hold | Weighted pulses: 3 × 10',
      timerSec: 120,
      setup: 'Parallettes or floor. Weighted pulses: 1–2kg ankle weights on floor pike.',
      cue: 'L-SIT: both legs extended, hold as long as possible. Even 1 sec counts — accumulate. WEIGHTED PULSES: same as Phase 2 but with ankle weights.',
      feel: 'L-sit: full body tension, hip flexors intense, hands driving into ground. Build 1 sec → 3 sec → 5 sec.',
      checkpoint: 'L-sit hold 3 sec on parallettes'
    }
  ]
}

export const PROGRESSION_LABELS: Record<'90/90' | 'straddle' | 'pike', string> = {
  '90/90': '90/90',
  straddle: 'Straddle',
  pike: 'Pike'
}
