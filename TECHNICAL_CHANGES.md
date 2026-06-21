# Technical Changes — Latest Session

Date: 2026-06-21  
Branch: `feature/why-notebook-profit-and-diagnostics`

## Overview

This session added three major subsystems: recovery decay engine, avatar progression system, and visual enhancements (calendar rings, radar chart, muscle tracker).

---

## 1. Recovery Decay Engine

### Files Modified/Created
- `src/lib/recommendation.ts` — Updated with decay integration
- `src/data/muscleMap.ts` — New decay functions + PPL categorization
- `src/db/db.ts` — `HealthMetrics` table (prepared, not yet populated)

### Key Functions
```typescript
// src/data/muscleMap.ts

// Compute effective lambda (decay constant) with optional biometric scaling
computeEffectiveLambda(baseLambda, modifiers?: BiometricModifiers): number

// Compute muscle soreness decay over time from exercise logs
computeMuscleSorenessDecay(inputs: DecayInput[], nowMs, modifiers?): MuscleSoreness[]

// Aggregate to category level (push/pull/legs/core)
computeCategorySoreness(muscleSoreness): CategorySoreness[]

// src/lib/recommendation.ts
// Daily plan generation now decay-aware
generateTodayPlan(biometrics?: BiometricModifiers): Promise<TodayPlan>
```

### Data Structures
```typescript
// Input: exercise logs with timestamps
interface DecayInput {
  exerciseId: CalisthenicsExerciseId
  value: number // reps or hold seconds
  loggedAt: number // Date.now() when workout was logged
}

// Output: per-muscle soreness + recovery time estimate
interface MuscleSoreness {
  muscle: MuscleGroup
  category: MovementCategory
  soreness: number // 0-100
  hoursToRecovery: number // estimate to ≤1%
}

// Biometric modifiers (optional, from Apple Health)
interface BiometricModifiers {
  sleepScore?: number // 0-100
  hrvStatus?: 'optimal' | 'suppressed'
}
```

### Algorithm
- **Formula:** `S(t) = S₀ · e^(-λt)` where λ ≈ 0.096
- **Peak load:** 100% per muscle per exercise session
- **Activation scaling:** primary=100%, secondary=50% of value
- **Decay constant** scaled by sleep/HRV if provided
- **Suppression threshold:** >30% soreness → exclude from plan, inject recovery

---

## 2. Avatar & Progression System

### Files Created
- `src/hooks/useAvatarStats.ts` — 5-axis profile aggregator
- `src/components/AvatarDisplay.tsx` — AI-image + procedural SVG fallback

### Files Modified
- `src/pages/Progress.tsx` — Avatar integrated into main view

### 5-Axis Profile
```typescript
interface AvatarAxis {
  key: 'push' | 'pull' | 'core' | 'mobility' | 'grappling'
  label: string
  value: number // 0-100 normalized
  raw: number // actual best value
  unit: string // 'reps', 's', 'sessions', 'classes'
}

interface AvatarStats {
  axes: AvatarAxis[]
  overallLevel: number // 0-100 average
  milestones: AvatarMilestone[] // unlocked progression markers
}
```

### Data Sources
| Axis | Source | Normalization Cap |
|------|--------|-------------------|
| Push | Best calisthenics (pushups, dips) | 40 reps |
| Pull | Best (pullups, australian) + measurements | 15 reps |
| Core | Best holds (plank, hollow, L-sit) | 120s |
| Mobility | Completed mobility sessions | 60 sessions |
| Grappling | Logged BJJ classes | 50 classes |

### Milestones (12 defined)
- Beginner: Floor pushups (8+), first pullup, hollow body 30s, 10 BJJ classes
- Intermediate: Dips (6+), 6 pullups, L-sit 10s, 20+ mobility sessions, 30 BJJ
- Advanced: L-sit 20s, Dragon flag (5+ reps), 50 BJJ classes

### Avatar Tiers (Procedural SVG + AI Images)
```
novice (opacity 0.5) → developing (0.7) → strong (0.9) → elite (1.0)
```
- Computed from unlocked milestone count & tier distribution
- SVG fallback: stick figure with variable limb thickness & stance width
- AI images (optional): `/public/avatar/{tier}.webp` (novice, developing, strong, elite)

---

## 3. Visual Enhancements

### Calendar Rings (TrainingCalendar.tsx)
```typescript
// Per-day ring completion
interface DayRings {
  mobility: number // 0-1 (actualSec / plannedSec)
  bjj: number // 0 or 1 (class attended Y/N)
  calisthenics: number // 0-1 (10% per muscle at full load)
}

// SVG rendering
// Outer (17px): mobility (blue #3b82f6)
// Middle (13.5px): BJJ (red #ef4444)
// Inner (10px): calisthenics (green #22c55e)
// Today: orange outline (1.5px)
```

**Ring Math:**
- Mobility: sum of all daily mobility sessions' `actualSec / plannedSec`
- BJJ: 1 if any `bjjClassLogs` entry for that date
- Calisthenics: count muscle groups at 100% load ÷ 10 (0-1.0)

### Skill Radar (SkillRadar.tsx)
```typescript
// SVG pentagon chart
// 5 axes, 4 grid rings (0.25, 0.5, 0.75, 1.0)
// Data polygon with axis circles
// Legend row with raw values
```

Features:
- No external chart library (pure SVG)
- Responsive sizing
- Desaturated colors per axis
- Transparent data fill

### Muscle Groups Display (MuscleGroupsDisplay.tsx)
```typescript
// Text-based, no visualization
// Today's calisthenics → muscle load bars
// Load bars: grey (<40%) → gold (40-80%) → red (80%+)
// Untrained: tags with names only
```

---

## 4. Backdate Support

### Changes to Logging Functions

**Calisthenics (`useCalisthenics.ts`):**
```typescript
await logCalisthenics({
  exerciseId: 'pushups',
  value: 20,
  date?: string // YYYY-MM-DD, optional
})
```

**BJJ (`useBjjSkills.ts`):**
```typescript
// Already supported via form date picker
await addClassLog({
  date: '2026-06-18', // explicit date
  tagIds: [1, 3]
})
```

**Session Upsert (`useSessions.ts`):**
```typescript
await upsertTodaySession({
  type: 'calisthenics',
  label: 'Pushups',
  plannedSec: 60,
  actualSec: 60,
  exerciseIds: ['pushups'],
  date?: string // optional, defaults to today
})
```

### Streaks & Decay Respect Backdated Entries
- Decay calculation includes all logs regardless of logging date
- Streak computation uses actual date (not created date)
- Muscle map includes backdated sessions

---

## 5. Exercise Metadata

### CalisthenicsExerciseDef Extended
```typescript
interface CalisthenicsExerciseDef {
  // ... existing fields ...
  image?: string // Path like '/exercises/pushups.webp'
}
```

### New Exercise Entries
- `pike_pushups` — shoulder/core emphasis
- `tuck_lsit` — core/hip flexors
- `pistol_squat` — single-leg quad work

### Muscle Suggestions Map
```typescript
MUSCLE_SUGGESTIONS: Record<MuscleGroup, ExerciseSuggestion[]>
```
- Used by "Suggested next" card to recommend exercises for untrained muscles
- Reverse lookup: muscle → primary exercises

---

## 6. Apple Health Integration (Prepared)

### Mock Provider (src/hooks/useAppleHealth.ts)
```typescript
interface AppleHealthData {
  sleepDuration: number | null // hours
  sleepQualityScore: number | null // 0-100
  restingHRV: number | null // ms
  lastSyncedAt: string | null // ISO timestamp
}

function useAppleHealth(): AppleHealthState {
  // Currently: localStorage mock
  // Future: swap with @capacitor-community/apple-health
}

// Converter for decay engine
function healthDataToBiometricModifiers(data): BiometricModifiers | undefined
```

**Migration Path:**
1. Install `@capacitor-community/apple-health`
2. Replace `fetchAppleHealthData()` implementation
3. No changes to UI or decay engine needed

---

## 7. Bug Fixes

### TypeScript Errors Resolved
1. **useWakeLock.ts line 21:** Null-safety in event listener
   ```typescript
   // Before: lockRef.current.addEventListener (can be null during async)
   // After: check lockRef.current before calling addEventListener
   ```

2. **muscleMap.ts EXERCISE_MUSCLES:** Missing exercise definitions
   - Added pike_pushups, tuck_lsit, pistol_squat with activations

---

## Files Changed Summary

### New Files
- `src/hooks/useAvatarStats.ts` (155 lines)
- `src/hooks/useAppleHealth.ts` (92 lines)
- `src/components/SkillRadar.tsx` (112 lines)
- `src/components/AvatarDisplay.tsx` (187 lines)
- `src/components/MuscleGroupsDisplay.tsx` (60 lines)
- `CHANGELOG.md` (tracking)
- `TECHNICAL_CHANGES.md` (this file)
- `.gitignore` (new)

### Modified Files
- `src/lib/recommendation.ts` (+180 lines, decay integration)
- `src/data/muscleMap.ts` (+330 lines, PPL + decay + suggestions)
- `src/components/TrainingCalendar.tsx` (+200 lines, rings + legend)
- `src/components/ExerciseCard.tsx` (image support)
- `src/pages/Progress.tsx` (avatar integrated)
- `src/hooks/useCalisthenics.ts` (date parameter)
- `src/hooks/useSessions.ts` (date parameter)
- `src/hooks/useWakeLock.ts` (null-safety fix)
- `src/data/calisthenics.ts` (image paths)

### Commits
- 1 commit: "Add recovery decay engine, avatar system, calendar rings, muscle tracking"

---

## Testing Checklist

- [x] TypeScript builds without errors
- [x] Calendar rings render without overlap on 2-digit numbers
- [x] Decay calculations produce sensible soreness curves
- [x] Avatar tier transitions occur at correct milestone thresholds
- [x] Backdate support works for both calisthenics and BJJ
- [ ] Radar chart displays on mobile (responsive sizing TBD)
- [ ] Exercise images load gracefully if missing
- [ ] Apple Health mock reads/writes localStorage correctly

---

## Next Steps

1. **Asset Generation:** AI-generate exercise images + avatar tier images
2. **Apple Health Wiring:** Integrate actual HealthKit queries when Capacitor ready
3. **Rive Animations:** Replace procedural SVG with animated state machine (optional)
4. **Cloud Sync:** Design & implement optional server sync (Firebase or custom)
5. **NITS Integration:** Wire NITS scoring into recommendation engine
