# Firebase + Firestore Integration for Mobility Coach

**Date:** 2026-06-22  
**Status:** Design Approved  
**Scope:** Add cloud sync, Google authentication, and cross-device real-time sync for workout logs

---

## Overview

This design adds cloud persistence to Mobility Coach using Firebase + Firestore. Users will:
- Sign in with Google (one-click)
- Automatically sync workouts across devices in real-time
- Edit past logs with automatic recalculation of decay/avatar/rings from that day forward
- View same data whether they're on phone, tablet, or browser
- See conflict warnings if duplicate logs exist for the same day

**Key constraint:** Single user app (3-4 workouts per day), free Firebase tier.

---

## Architecture

### Three-Layer Model

```
┌─────────────────────────┐
│   Login Screen          │
│   (Google Sign-In)      │
└────────────┬────────────┘
             ↓
┌─────────────────────────────────────────┐
│ Auth Layer (Firebase Auth)              │
│ ├─ Google OAuth                         │
│ └─ Session management                   │
└────────────┬────────────────────────────┘
             ↓
┌──────────────────────────────────────────────────────┐
│ Sync Layer (Firestore Real-Time Listener)           │
│ ├─ Merge local Dexie + cloud on login               │
│ ├─ Conflict detection (same day/type duplicates)    │
│ └─ Real-time sync of changes across devices         │
└────────────┬─────────────────────────────────────────┘
             ↓
┌──────────────────────────────────────────────────────┐
│ Data Layer                                           │
│ ├─ Firestore (cloud source of truth)                │
│ └─ Dexie (local cache for speed + offline)          │
└──────────────────────────────────────────────────────┘
```

### Data Flow

**Logging a new workout:**
1. User fills form → clicks "Log"
2. Save to Dexie immediately (instant UI feedback)
3. Async save to Firestore in background
4. Real-time listener on other devices picks up the change

**Editing a past log:**
1. User clicks "Edit" on past day
2. Change value (e.g., reps 10 → 20)
3. Update Dexie + recalculate from that day forward (decay, avatar, rings)
4. Async update to Firestore
5. Other devices sync via real-time listener

**Switching devices:**
1. User signs in on new device
2. Fetch all Firestore logs
3. Merge with any local Dexie logs (conflict detection)
4. Set up real-time listener for live sync
5. Show home screen with all data

---

## Data Structure (Firestore Schema)

### Collections Layout

```
Firestore Database (project: mobility-coach-prod)
└── users/{uid}/
    ├── workouts/
    │   ├── {workoutId}/ (one doc per workout session)
    │   ├── {workoutId}/
    │   └── {workoutId}/
    └── metadata/
        └── document (sync metadata)
```

### Workout Document Schema

Each workout is a separate Firestore document:

```typescript
interface WorkoutDoc {
  // Immutable
  type: 'calisthenics' | 'bjj' | 'mobility'
  date: string                    // YYYY-MM-DD
  createdAt: number              // Unix timestamp
  updatedAt: number              // Unix timestamp (updates on edit)
  
  // Editable
  exerciseIds: string[]           // ['pushups', 'pullups']
  data: Record<string, ExerciseLog>
  
  // Conflict handling
  conflicted?: boolean            // Flag if duplicate exists for this day
  
  // Calisthenics specific
  plannedSec?: number            // if logged as session
  actualSec?: number
  
  // BJJ specific
  tags?: string[]
  
  // Mobility specific
  plannedSec?: number
  actualSec?: number
  label?: string
}

interface ExerciseLog {
  reps?: number
  seconds?: number
}
```

### Example Documents

**Calisthenics workout:**
```json
{
  "type": "calisthenics",
  "date": "2026-06-22",
  "createdAt": 1718000000,
  "updatedAt": 1718000000,
  "exerciseIds": ["pushups", "pullups"],
  "data": {
    "pushups": { "reps": 20 },
    "pullups": { "reps": 8 }
  }
}
```

**BJJ class:**
```json
{
  "type": "bjj",
  "date": "2026-06-22",
  "createdAt": 1718000001,
  "updatedAt": 1718000001,
  "tags": ["submissions", "guard"],
  "conflicted": false
}
```

### Metadata Document

```json
{
  "lastSync": 1718000000,
  "version": 1
}
```

---

## Login & Authentication

### Google Sign-In Flow

1. User sees login screen with "Sign in with Google" button
2. Click → open Google OAuth consent
3. User approves → Firebase returns `uid` + auth token
4. App automatically triggers merge flow (see Sync section)
5. User is logged in, sees home screen

### Auth State Management

```typescript
// New hook
useAuth() → {
  user: User | null          // Firebase user object
  loading: boolean
  logout: () => Promise<void>
}

// In App.tsx
if (loading) return <LoadingScreen />
if (!user) return <LoginScreen />
return <HomeScreen />
```

### Logout

- User taps account menu → "Logout"
- Clear auth session
- Show login screen
- Local Dexie data persists (safe to re-login later)

---

## Sync & Conflict Merge Logic

### On First Login

**Step 1: Fetch remote data**
```
Firestore query: user/{uid}/workouts
Download all workout documents
```

**Step 2: Load local data**
```
Dexie query: select all workouts
```

**Step 3: Merge with conflict detection**
```
For each calendar day:
  - If workouts match (type + date are identical)
    → Keep Firestore version (cloud is source of truth)
  - If one version is newer (updatedAt)
    → Use newer version
  - If duplicates exist for same (type, date)
    → Mark both with conflicted: true
  - If only in Firestore
    → Add to local Dexie
  - If only in Dexie
    → Upload to Firestore
```

**Step 4: Trigger full recalculation**
```
Recalculate: decay, avatar tiers, rings, streaks
(All calcs respect the merged data)
```

**Step 5: Set up real-time listener**
```
Start Firestore snapshot listener
On any change → update Dexie + recalculate
```

### On Edit (Any Device)

**Immediate local update:**
1. Update Dexie (instant UI feedback)
2. Update `updatedAt` timestamp
3. Recalculate from that date forward (decay chain)
4. Re-render UI

**Background sync:**
1. Call `updateDoc()` on Firestore
2. If successful → silent (already reflected locally)
3. If fails → show error toast, user can retry

**Real-time propagation:**
- Firestore listener on other devices fires automatically
- They fetch the updated document
- They recalculate from that date forward
- They see the changes in real-time

### On New Log (Any Device)

1. Call `logCalisthenics()` / `addClassLog()` / etc. (existing functions)
2. Save to Dexie (instant)
3. Generate `workoutId` (UUID)
4. Save to Firestore `users/{uid}/workouts/{workoutId}` (async)
5. Firestore listener fires on this device + other devices
6. Other devices add the new workout to Dexie + recalculate

### Offline Handling

- If offline when editing: changes queue locally
- On reconnect: Firestore auto-reconnects
- Queued changes upload automatically
- Real-time listener re-establishes

---

## Conflict Detection & Resolution

### When Conflicts Occur

Conflicts happen when:
- Two identical workouts exist for the same (date, type)
- Detected during login merge OR via real-time listener

### User Experience

1. **Calendar shows warning:** Day with conflict shows `!` indicator
2. **Tap the day:** Opens a modal showing both workouts
3. **User chooses:**
   - Delete one
   - Merge manually (combine reps/data)
   - Keep both (if intentional duplicate)

### Implementation

- Add `ConflictWarning` component
- Add conflict flag to `TrainingCalendar` rendering
- Add modal to `WorkoutConflictResolver.tsx`

---

## Recalculation from Date Forward

When a past workout is edited, the system recalculates:

1. **Decay soreness** — from edited day through today
2. **Avatar stats** — re-aggregate all time
3. **Rings** — from edited day through today
4. **Streaks** — re-check from edited day

**Pseudocode:**
```typescript
async function handleWorkoutEdit(workoutId, newData) {
  // 1. Update Dexie + Firestore
  await updateWorkout(workoutId, newData)
  
  // 2. Get edited workout
  const workout = await getWorkout(workoutId)
  const editedDate = parseDate(workout.date)
  
  // 3. Recalculate from that date forward
  const today = new Date()
  const allLogs = await getAllWorkoutLogs(editedDate, today)
  
  // 4. Recompute everything
  const decay = computeMuscleSorenessDecay(allLogs)
  const avatar = computeAvatarStats(allLogs)
  const rings = computeCalendarRings(allLogs)
  const streaks = computeStreaks(allLogs)
  
  // 5. Update UI
  setRecoveryState(decay)
  setAvatarState(avatar)
  setCalendarState(rings)
}
```

---

## Weekly Report (Summary Stats)

### Query & Aggregation

```typescript
async function getWeeklyStats(weekStart: Date) {
  const weekEnd = endOfWeek(weekStart)
  
  // Query Firestore for that week
  const workouts = await query(
    collection(db, `users/${uid}/workouts`),
    where('date', '>=', formatDate(weekStart)),
    where('date', '<=', formatDate(weekEnd))
  ).get()
  
  // Aggregate in-memory
  return {
    totalWorkouts: workouts.length,
    totalCalisthenicsReps: sum(workouts.calisthenics.reps),
    totalBjjClasses: count(workouts.bjj),
    totalMobilitySeconds: sum(workouts.mobility.seconds),
    peakSorenessDay: max(workouts.soreness),
    newPRsUnlocked: filter(milestones, m.unlockedThisWeek)
  }
}
```

### Display

Show as a card on Progress page:
```
Week of Jun 17–23
───────────────
Total workouts: 5
BJJ classes: 2
Total reps: 147
Total mobility: 45 min
Peak soreness: Monday
New PRs: Hollow body 30s, 5 pullups
```

---

## Error Handling

### Firestore Write Failures

- **On save failure:** Show error toast "Couldn't save, please retry"
- **User taps retry:** Attempt save again
- **Offline:** Queue change, sync on reconnect

### Merge Conflicts During Login

- **Show conflict modal:** Display duplicates, ask user to resolve
- **Block home screen** until resolved

### Auth Failures

- **Invalid token:** Re-prompt login
- **User denied Google consent:** Show message, prompt again

---

## Technical Implementation Details

### New Dependencies

```json
{
  "firebase": "^10.0.0",
  "react-firebase-hooks": "^5.1.0"
}
```

### New Files to Create

```
src/
├── hooks/
│   ├── useAuth.ts                 (Google auth + session)
│   ├── useFirebaseSync.ts         (Merge + real-time listener)
│   └── useConflictResolver.ts     (Conflict detection)
│
├── components/
│   ├── LoginScreen.tsx            (Google sign-in button)
│   ├── ConflictWarning.tsx        (! indicator on calendar)
│   └── WorkoutConflictResolver.tsx (Modal to resolve)
│
├── lib/
│   ├── firebase.ts                (Firebase config + init)
│   └── merge.ts                   (Merge algorithm)
│
└── types/
    └── firebase.ts                (WorkoutDoc, etc.)
```

### Modified Files

```
src/
├── App.tsx                         (Auth guard wrapper)
├── components/TrainingCalendar.tsx (Add ! for conflicts)
├── hooks/useCalisthenics.ts        (No changes to logging API)
├── hooks/useBjjSkills.ts           (No changes to logging API)
└── hooks/useMobility.ts            (No changes to logging API)
```

---

## Migration Plan

### Phase 1: Setup (Day 1)
- [ ] Create Firebase project
- [ ] Install Firebase SDK
- [ ] Build `useAuth` hook + LoginScreen
- [ ] Test Google sign-in locally

### Phase 2: Sync (Day 2)
- [ ] Implement `useFirebaseSync` + merge logic
- [ ] Set up real-time listener
- [ ] Test merge on first login
- [ ] Add conflict detection

### Phase 3: Integration (Day 3)
- [ ] Wire into existing logging functions
- [ ] Test edit → recalculation flow
- [ ] Add weekly report query
- [ ] Test cross-device sync (simulator + browser)

---

## Success Criteria

✓ User can sign in with Google  
✓ First login merges local + cloud data correctly  
✓ New workouts sync in real-time across devices  
✓ Editing a log recalculates from that date forward  
✓ Conflicts are detected and user can resolve  
✓ Weekly stats query works  
✓ Offline changes queue and sync on reconnect  
✓ Free Firebase tier is sufficient (no unexpected bills)

---

## Known Limitations & Future Work

- [ ] No user profile editing (name, preferences)
- [ ] No data export (could add later)
- [ ] No audit log of edits (could add later)
- [ ] No multi-device "last write wins" strategy (simple + sufficient for single user)
- [ ] No backup beyond Firestore (could add Firebase exports)

---

## References

- Firebase SDK: https://firebase.google.com/docs
- Firestore Best Practices: https://firebase.google.com/docs/firestore/best-practices
- React Firebase Hooks: https://github.com/CSFrequency/react-firebase-hooks
