import type { CalisthenicsExerciseId, CalisthenicsMetric } from '../db/db'

export interface CalisthenicsExerciseDef {
  id: CalisthenicsExerciseId
  name: string
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
    metric: 'hold_sec',
    unit: 's',
    icon: '🧱',
    description: 'Total hold time, forearms or hands, straight line from shoulders to ankles.'
  },
  {
    id: 'hollow_body',
    name: 'Hollow Body',
    metric: 'hold_sec',
    unit: 's',
    icon: '🌙',
    description: 'Total hold time, lower back pressed to floor, shoulders and legs lifted.'
  },
  {
    id: 'pushups',
    name: 'Push-ups',
    metric: 'reps',
    unit: 'reps',
    icon: '💪',
    description: 'Max reps with good form, chest to floor.'
  },
  {
    id: 'pullups',
    name: 'Pull-ups',
    metric: 'reps',
    unit: 'reps',
    icon: '🧗',
    description: 'Max reps, full hang to chin over bar.'
  },
  {
    id: 'squats',
    name: 'Squats',
    metric: 'reps',
    unit: 'reps',
    icon: '🦵',
    description: 'Bodyweight squats, max reps with full depth.'
  },
  {
    id: 'bulgarian_squat',
    name: 'Bulgarian Split Squat',
    metric: 'reps',
    unit: 'reps',
    icon: '🦿',
    description: 'Rear foot elevated, max reps per leg.'
  },
  {
    id: 'australian_pullups',
    name: 'Australian Pull-ups',
    metric: 'reps',
    unit: 'reps',
    icon: '🪢',
    description: 'Horizontal row under a bar or rings, body straight.',
    equipmentNote: 'Needs a low bar or rings — log when accessible.'
  },
  {
    id: 'dips',
    name: 'Dips',
    metric: 'reps',
    unit: 'reps',
    icon: '🔻',
    description: 'Parallel bars or bench, max reps, full lockout at top, controlled descent.',
    equipmentNote: 'Needs parallel bars or sturdy edges — log when accessible.'
  },
  {
    id: 'pike_pushups',
    name: 'Pike Push-ups',
    metric: 'reps',
    unit: 'reps',
    icon: '🔺',
    description: 'Hips high in a pike/downward-dog shape, lower head toward floor between hands. Primary shoulder press progression toward handstand push-ups.'
  },
  {
    id: 'tuck_lsit',
    name: 'Tuck L-sit',
    metric: 'hold_sec',
    unit: 's',
    icon: '🪑',
    description: 'Knees tucked to chest, both feet off the floor, arms straight. Total accumulated hold time. The stepping stone between floor support holds and full L-sit.'
  },
  {
    id: 'pistol_squat',
    name: 'Pistol Squat',
    metric: 'reps',
    unit: 'reps',
    icon: '🦯',
    description: 'Single-leg squat to full depth, free leg extended forward. Count total reps across both legs. Use a doorframe or band for assistance if needed.'
  },
  {
    id: 'lsit',
    name: 'L-Sit',
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
    metric: 'reps',
    unit: 'reps',
    icon: '🏹',
    description: 'Heavy unilateral push with straight-arm lock on the other side. Mimic framing.',
    setup: 'Take a very wide push-up stance.',
    cue: 'Take a very wide push-up stance. Lower your chest toward your right hand while keeping your left arm completely straight and locked out. Push back to center and alternate.',
    bjjTransfer: 'You rarely push with both arms evenly in BJJ. You are almost always framing or posting heavily on one arm while the other attacks, defends, or grabs a collar.',
    feelIt: 'Intense load on the pushing chest/triceps, and a stretching/stabilizing load on the straight arm\'s shoulder.'
  }
]

export function getExerciseDef(id: CalisthenicsExerciseId): CalisthenicsExerciseDef | undefined {
  return CALISTHENICS_EXERCISES.find((e) => e.id === id)
}
