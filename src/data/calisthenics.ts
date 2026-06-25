import type { CalisthenicsExerciseId, CalisthenicsMetric } from '../db/db'

export interface CalisthenicsExerciseDef {
  id: CalisthenicsExerciseId
  name: string
  type: 'dynamic' | 'hold' // dynamic = reps (3s per rep default), hold = timed
  metric: CalisthenicsMetric
  unit: string
  icon: string
  description: string
  /** true if the user has flagged limited access to equipment for this one */
  equipmentNote?: string
  /** How to set up the exercise */
  setup?: string
  /** Key coaching cue for proper form */
  cue?: string
  /** How this exercise transfers to BJJ performance */
  bjjTransfer?: string
  /** What body parts you should feel working */
  feelIt?: string
}

export const CALISTHENICS_EXERCISES: CalisthenicsExerciseDef[] = [
  {
    id: 'plank',
    name: 'Plank',
    type: 'hold',
    metric: 'hold_sec',
    unit: 's',
    icon: '🧱',
    description: 'Total hold time, forearms or hands, straight line from shoulders to ankles.'
  },
  {
    id: 'hollow_body',
    name: 'Hollow Body',
    type: 'hold',
    metric: 'hold_sec',
    unit: 's',
    icon: '🌙',
    description: 'Total hold time, lower back pressed to floor, shoulders and legs lifted.'
  },
  {
    id: 'hollow_body_hold',
    name: 'Hollow Body Hold',
    type: 'hold',
    metric: 'hold_sec',
    unit: 's',
    icon: '🛡️',
    description: 'Your structural armor when playing guard or defending from the bottom. Keep your spine off the mat.',
    setup: 'Lie flat on your yoga mat.',
    cue: 'Lie flat on your yoga mat. Point your toes and tuck your chin to your chest. Contract your abs heavily to lift your shoulder blades and your legs a few inches off the floor. The absolute most important detail: You must crush your lower back into the mat. There should be zero gap between your lumbar spine and the floor. If you cannot maintain this, bring your knees into a tuck position until your core is strong enough to keep your back flat with straight legs.',
    bjjTransfer: 'This is your structural armor when playing guard or defending from the bottom. When you are on your back, an opponent\'s goal is to flatten your spine against the mat, which kills your hip mobility and stops you from bridging. A strong hollow body acts like a spring—it keeps your core engaged, your shoulders off the mat, and your hips active, making it incredibly difficult for them to pin you flat.',
    feelIt: 'Your entire abdominal wall should be burning. If you feel any tension or arching in your lower back, your form has broken and you are no longer protecting your spine.'
  },
  {
    id: 'pushups',
    name: 'Push-ups',
    type: 'dynamic',
    metric: 'reps',
    unit: 'reps',
    icon: '💪',
    description: 'Max reps with good form, chest to floor.'
  },
  {
    id: 'pullups',
    name: 'Pull-ups',
    type: 'dynamic',
    metric: 'reps',
    unit: 'reps',
    icon: '🧗',
    description: 'Max reps, full hang to chin over bar.'
  },
  {
    id: 'squats',
    name: 'Squats',
    type: 'dynamic',
    metric: 'reps',
    unit: 'reps',
    icon: '🦵',
    description: 'Bodyweight squats, max reps with full depth.'
  },
  {
    id: 'bulgarian_squat',
    name: 'Bulgarian Split Squat',
    type: 'dynamic',
    metric: 'reps',
    unit: 'reps',
    icon: '🦿',
    description: 'Rear foot elevated, max reps per leg.'
  },
  {
    id: 'australian_pullups',
    name: 'Australian Pull-ups',
    type: 'dynamic',
    metric: 'reps',
    unit: 'reps',
    icon: '🪢',
    description: 'Horizontal row under a bar or rings, body straight.',
    equipmentNote: 'Needs a low bar or rings — log when accessible.'
  },
  {
    id: 'dips',
    name: 'Dips',
    type: 'dynamic',
    metric: 'reps',
    unit: 'reps',
    icon: '🔻',
    description: 'Parallel bars or bench, max reps, full lockout at top, controlled descent.',
    equipmentNote: 'Needs parallel bars or sturdy edges — log when accessible.'
  },
  {
    id: 'pike_pushups',
    name: 'Pike Push-ups',
    type: 'dynamic',
    metric: 'reps',
    unit: 'reps',
    icon: '🔺',
    description: 'Hips high in a pike/downward-dog shape, lower head toward floor between hands. Primary shoulder press progression toward handstand push-ups.'
  },
  {
    id: 'tuck_lsit',
    name: 'Tuck L-sit',
    type: 'hold',
    metric: 'hold_sec',
    unit: 's',
    icon: '🪑',
    description: 'Knees tucked to chest, both feet off the floor, arms straight. Total accumulated hold time. The stepping stone between floor support holds and full L-sit.'
  },
  {
    id: 'pistol_squat',
    name: 'Pistol Squat',
    type: 'dynamic',
    metric: 'reps',
    unit: 'reps',
    icon: '🦯',
    description: 'Single-leg squat to full depth, free leg extended forward. Count total reps across both legs. Use a doorframe or band for assistance if needed.'
  },
  {
    id: 'lsit',
    name: 'L-Sit',
    type: 'hold',
    metric: 'hold_sec',
    unit: 's',
    icon: '📐',
    description: 'Hold a perfect L-shape on parallettes or floor. Core compression secret to guard retention.',
    setup: 'Use your low or high parallettes. If on floor, hands shoulder-width apart, straight arms.',
    cue: 'Depress your shoulders away from your ears (push the parallettes hard into the floor). Compress your abdomen heavily to lift your legs, locking your knees.',
    bjjTransfer: 'Core compression is the secret to guard retention. The ability to pull your knees tightly to your chest is what stops aggressive guard passes and allows you to pummel your legs back inside.',
    feelIt: 'Deep in your lower abs and hip flexors. If your quads cramp, your abs aren\'t compressing hard enough.'
  },
  {
    id: 'planche_leans',
    name: 'Planche Leans',
    type: 'hold',
    metric: 'hold_sec',
    unit: 's',
    icon: '⬆️',
    description: 'Lean your shoulders past your wrists with locked elbows. Build the framing structure of top pressure.',
    setup: 'Hands shoulder-width apart on the floor. Lock your elbows completely.',
    cue: 'Lock your elbows completely and protract your shoulder blades (push your upper back toward the ceiling). Squeeze your glutes to keep your body in a rigid straight line as you lean your shoulders past your wrists.',
    bjjTransfer: 'This mimics the exact skeletal structure needed to frame against heavy top pressure. You learn to bear weight on locked, straight arms rather than relying on muscularly fatigued bent arms.',
    feelIt: 'Your front deltoids, biceps tendons, and core.'
  },
  {
    id: 'pistol_squats',
    name: 'Pistol Squats',
    type: 'dynamic',
    metric: 'reps',
    unit: 'reps',
    icon: '🦿',
    description: 'Single-leg squat to full depth. Use your plyo box to control depth if still building balance.',
    setup: 'Stand on one leg. Use your plyo box to touch down at the bottom if needed.',
    cue: 'Root your working foot into the floor, grabbing the mat with your toes. Reach your arms forward as a counterbalance, and brace your core as if taking a punch.',
    bjjTransfer: 'BJJ requires explosive, asymmetrical leg strength—whether you are executing a technical stand-up under pressure, finishing a single-leg sweep, or driving through a takedown.',
    feelIt: 'Heavy engagement in the working quad, glute, and the stabilizing muscles of your ankle.'
  },
  {
    id: 'ring_rows',
    name: 'Ring Rows',
    type: 'dynamic',
    metric: 'reps',
    unit: 'reps',
    icon: '⭕',
    description: 'Horizontal pulling on rings. Adjust angle to control difficulty. Break someone\'s posture.',
    setup: 'Hang your rings and adjust the angle to control the difficulty.',
    cue: 'Initiate the movement by retracting your shoulder blades first, then pull the rings to your ribs. Squeeze your glutes to keep your body completely straight—do not let your hips sag.',
    bjjTransfer: 'BJJ relies far more on horizontal pulling (breaking someone\'s posture in your closed guard, pulling them into a sweep) than vertical pulling.',
    feelIt: 'Your lats, rhomboids (between the shoulder blades), and biceps.'
  },
  {
    id: 'hindu_pushups',
    name: 'Hindu Push-Ups',
    type: 'dynamic',
    metric: 'reps',
    unit: 'reps',
    icon: '🙏',
    description: 'Fluid spinal mobility movement. Swoop chest low, drive up, then back. Master dynamic escapes.',
    setup: 'Start in a downward dog position on your mat.',
    cue: 'Start in a downward dog. Swoop your chest as low to your yoga mat as possible, then drive your chest up to the ceiling while dropping your hips. Push straight back to the start.',
    bjjTransfer: 'This builds the exact fluid, sweeping spinal mobility required to duck under grips, execute smooth escapes, and maintain heavy, dynamic top pressure from side control.',
    feelIt: 'Triceps, chest, and a deep active stretch along your spinal erectors.'
  },
  {
    id: 'scapular_pullups',
    name: 'Scapular Pull-Ups',
    type: 'dynamic',
    metric: 'reps',
    unit: 'reps',
    icon: '⬆️',
    description: 'Strict scapular pulls on bar. No elbow bend. Build grip endurance and lat control.',
    setup: 'Use your doorway pull-up bar (keep it strictly bodyweight without explosive jerking so the bar stays secure).',
    cue: 'Hang from the bar with completely relaxed, straight arms. Without bending your elbows, pull your shoulder blades down and together to lift your chest slightly toward the bar. Hold for a second, then lower.',
    bjjTransfer: 'Gi BJJ requires immense grip endurance and the ability to control an opponent\'s posture without burning out your biceps. This isolates the muscles that anchor your pulling strength.',
    feelIt: 'Lower traps (middle back) and lats.'
  },
  {
    id: 'gymnastics_bridge',
    name: 'Gymnastics Bridge',
    type: 'hold',
    metric: 'hold_sec',
    unit: 's',
    icon: '🌉',
    description: 'Hip drive explosion with shoulder opening. Your upa (bridge escape) secret weapon.',
    setup: 'Lie on your back with hands planted by your ears.',
    cue: 'Lie on your back with hands planted by your ears. Drive through your heels to lift your hips, then push the floor away with your hands, trying to open your armpits toward the wall behind you.',
    bjjTransfer: 'The BJJ bridge (upa) is your primary escape tool. Calisthenics bridges drastically improve shoulder and thoracic mobility, giving you a much higher, more explosive hip drive to buck heavy opponents off you.',
    feelIt: 'Glutes, hamstrings, and a deep opening stretch in your chest and shoulders.'
  },
  {
    id: 'hanging_knee_to_chest',
    name: 'Hanging Knee-to-Chest',
    type: 'dynamic',
    metric: 'reps',
    unit: 'reps',
    icon: '🔺',
    description: 'Pull knees high against gravity. Control guard retention and inversions.',
    setup: 'Hang from your pull-up bar.',
    cue: 'Hang from the bar. Engage your lats (pulling down slightly) to stop your body from swinging. Use your lower abs to pull your knees as high to your chest as possible. Do not use momentum.',
    bjjTransfer: 'Inversions, throwing up triangles, and quickly recovering guard all require you to lift your lower body against gravity while hanging or lying on your back.',
    feelIt: 'Lower abs and forearms (grip).'
  },
  {
    id: 'archer_pushups',
    name: 'Archer Push-Ups',
    type: 'dynamic',
    metric: 'reps',
    unit: 'reps',
    icon: '🏹',
    description: 'Heavy unilateral push with straight-arm lock on the other side. Mimic framing.',
    setup: 'Take a very wide push-up stance.',
    cue: 'Take a very wide push-up stance. Lower your chest toward your right hand while keeping your left arm completely straight and locked out. Push back to center and alternate.',
    bjjTransfer: 'You rarely push with both arms evenly in BJJ. You are almost always framing or posting heavily on one arm while the other attacks, defends, or grabs a collar.',
    feelIt: 'Intense load on the pushing chest/triceps, and a stretching/stabilizing load on the straight arm\'s shoulder.'
  },
  {
    id: 'side_plank',
    name: 'Side Plank',
    type: 'hold',
    metric: 'hold_sec',
    unit: 's',
    icon: '📏',
    description: 'Total hold time per side. Keep hips stacked and body in a straight line.',
    setup: 'Lie on your side. Stack feet, prop on forearm. Lift hips to form a straight line.',
    cue: 'Drive your hip to the ceiling. Squeeze your oblique. Do not let hips sag or rotate.',
    bjjTransfer: 'Lateral stability is essential for maintaining side control and escaping bottom positions.',
    feelIt: 'Obliques and the lateral hip stabilizers of the working side.'
  },
  {
    id: 'crow_pose',
    name: 'Crow Pose',
    type: 'hold',
    metric: 'hold_sec',
    unit: 's',
    icon: '🐦',
    description: 'Total hold time balanced on both hands, knees resting on triceps.',
    setup: 'Squat, place hands flat shoulder-width apart. Lean forward, place knees on triceps.',
    cue: 'Round your upper back. Shift weight forward slowly until feet lift. Squeeze knees into arms.',
    bjjTransfer: 'Builds the wrist stability and protraction strength used in framing and posting on all fours.',
    feelIt: 'Wrists, front deltoids, and deep core compression.'
  }
]

export function getExerciseDef(id: CalisthenicsExerciseId): CalisthenicsExerciseDef | undefined {
  return CALISTHENICS_EXERCISES.find((e) => e.id === id)
}

/**
 * Calculate estimated duration in seconds for a calisthenics exercise.
 *
 * For hold exercises: uses the logged value directly (or value × sets)
 * For dynamic (reps) exercises: 3 seconds per rep × sets + rest time between sets
 *
 * Rest time defaults to 30s, configurable via userRestSeconds parameter.
 */
export function estimateCalisthenicsduration(
  exerciseId: CalisthenicsExerciseId,
  value: number,
  sets?: number,
  userRestSeconds: number = 30
): number {
  const exercise = getExerciseDef(exerciseId)
  if (!exercise) return 0

  const numSets = sets ?? 1

  if (exercise.type === 'hold') {
    // Hold exercises: user logs the duration directly
    // If they log sets, multiply: 3×60s = 180s total
    return value * numSets
  }

  // Dynamic exercises: reps with rest between sets
  // Duration = (reps × 3 sec/rep × sets) + (rest × (sets - 1))
  const repsTime = value * 3 * numSets
  const restTime = userRestSeconds * Math.max(0, numSets - 1)
  return repsTime + restTime
}
