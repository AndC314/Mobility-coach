# Changelog

All notable changes to Mobility Coach are documented here.

## [Unreleased]

### Added
- **Recovery Decay Engine** (`src/lib/recommendation.ts`, `src/data/muscleMap.ts`)
  - 48-hour exponential decay model: `S(t) = S₀ · e^(-λt)` with λ ≈ 0.096
  - `BiometricModifiers` interface for Apple Health integration (sleep score, HRV status)
  - `computeMuscleSorenessDecay()` function with optional biometric scaling
  - PPL + Core muscle categorization (`MUSCLE_CATEGORY`, `CATEGORY_MUSCLES`)
  - Active recovery injection when categories >30% soreness
  - BJJ muscle activation map (full-body with grip, bridge, hip escape focus)

- **Avatar & Progression System** (`src/hooks/useAvatarStats.ts`, `src/components/AvatarDisplay.tsx`)
  - 5-axis development profile: Push/Pull/Core/Mobility/Grappling
  - 4 tier levels: novice → developing → strong → elite
  - 12+ milestone definitions (e.g., "First Pull-up", "L-sit 20s", "30 BJJ Classes")
  - Tier-based avatar display with AI-generated image fallback

- **Skill Radar Chart** (`src/components/SkillRadar.tsx`)
  - SVG pentagon chart showing all 5 development axes
  - Editorial style (minimal, high-contrast, desaturated tones)
  - Legend with axis values
  - Responsive sizing

- **Muscle Groups Tracker** (`src/components/MuscleGroupsDisplay.tsx`)
  - Today's trained/untrained muscle groups (text-based, no visualization)
  - Load percentage bars for trained muscles
  - Untrained muscles shown as tags
  - Automatically updates as calisthenics are logged

- **Calendar Progress Rings** (enhanced `src/components/TrainingCalendar.tsx`)
  - 3 concentric SVG arcs per day (if training logged)
  - Blue ring (outer): Mobility completion % (actualSec / plannedSec)
  - Red ring (middle): BJJ (0% or 100%, if class attended)
  - Green ring (inner): Calisthenics (10% per muscle group at full load)
  - Today indicator: thin orange outline
  - Ring legend above grid
  - Designed to not overlap with day numbers (even 2-digit)

- **Apple Health Bridge** (`src/hooks/useAppleHealth.ts`)
  - Mock provider using localStorage (ready for @capacitor-community/apple-health swap)
  - `AppleHealthData` interface: sleepDuration, sleepQualityScore, restingHRV, lastSyncedAt
  - `healthDataToBiometricModifiers()` converter
  - Async-ready structure for future Capacitor native compilation

- **Backdate Logging**
  - Calisthenics: optional `date` parameter in `logCalisthenics()` (defaults to today)
  - BJJ: date picker already in form, passes explicit date to `addClassLog()`
  - Streaks, muscle map, and decay calculations all respect backdated entries
  - Updating `upsertTodaySession()` to accept optional `date` parameter

- **Exercise Images Support**
  - Added `image?: string` field to `CalisthenicsExerciseDef`
  - `ExerciseCard.tsx` displays images when expanded (path: `/exercises/{name}.webp`)
  - Paths ready for AI-generated assets: `/public/exercises/{exercise}.webp`
  - Avatar tiers ready: `/public/avatar/{tier}.webp`

- **Additional Exercises**
  - Pike pushups, Tuck L-sit, Pistol squat with muscle activation mappings
  - Muscle suggestions reverse map (untrained muscles show suggested exercises)

### Fixed
- TypeScript error in `useWakeLock.ts`: null-safety check before event listener attachment
- Missing exercise definitions in `EXERCISE_MUSCLES` (pike_pushups, tuck_lsit, pistol_squat)

### Changed
- `TrainingCalendar` component: enhanced with ring visualization and legend
- `recommendation.ts`: integrated decay model into `generateTodayPlan()`
- Progress page: removed separate "Avatar" tab (avatar integrated into main view)

### Documentation
- Added `CONTEXT.md`: comprehensive project reference (architecture, data model, components)
- Added `.gitignore`: excludes CONTEXT.md and local files

---

## Technical Details

### Decay Algorithm
```
S(t) = S₀ · e^(-λt)
λ = ln(100) / 48 ≈ 0.0960
At t=48h: S ≈ 1% (fully recovered)
```

**Biometric Modifiers** extend recovery:
- Sleep score < 50: λ *= 0.6 (extends recovery window)
- HRV suppressed: λ *= 0.7 (adds 30% to recovery time)

### Muscle Category to Recovery Area Mapping
| Category | Recovery Area |
|----------|---------------|
| push | shoulders |
| pull | shoulders |
| legs | hips |
| core | lower_back |

### Calendar Ring Radii (SVG)
- Mobility: r=17px
- BJJ: r=13.5px
- Calisthenics: r=10px
- (Sized for 2-digit numbers to fit inside)

### Tier Thresholds
| Axis | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|------|--------|--------|--------|--------|
| Push (reps) | 8 | 25 | — | 40 |
| Pull (reps) | 1 | 6 | 10 | 15 |
| Core (sec) | 30 | 60 | 90 | 120 |
| Mobility (sessions) | 20 | 40 | — | — |
| Grappling (classes) | 10 | 30 | — | 50 |

---

## Migration Guide

### From Previous Version
No breaking changes. New features are additive:
- Decay calculations are optional (default recovery = 0%)
- Avatar is new (no data loss if skipped)
- Calendar rings are visual enhancement (existing data unaffected)

### Adding Features to Progress Page
```tsx
// Radar chart
import SkillRadar from '../components/SkillRadar'
<Card>
  <h2>Development</h2>
  <SkillRadar />
</Card>

// Muscle tracker
import { MuscleGroupsDisplay } from '../components/MuscleGroupsDisplay'
<MuscleGroupsDisplay />
```

---

## Known Limitations
- [ ] Cloud sync not implemented (local storage only)
- [ ] Apple Health integration not yet wired (interface ready)
- [ ] Exercise images/GIFs not yet sourced (asset paths ready)
- [ ] Avatar AI images not yet generated (fallback SVG active)
- [ ] NITS scoring integration pending
