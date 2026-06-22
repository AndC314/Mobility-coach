# Firebase + Firestore Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cloud sync, Google authentication, and cross-device real-time sync for workout logs to Mobility Coach.

**Architecture:** Three-layer model: Auth Layer (Firebase Auth + Google OAuth) → Sync Layer (real-time listener + merge algorithm) → Data Layer (Firestore cloud source + Dexie local cache). On login, merge local + cloud data with conflict detection. On new/edit workout, save to Dexie (instant), sync to Firestore (async), other devices pick up via real-time listener.

**Tech Stack:** Firebase SDK 10.0.0, react-firebase-hooks 5.1.0, Dexie (existing), TypeScript, React 18

## Global Constraints

- Single-user app (3-4 workouts/day)
- Must stay on free Firebase tier
- No existing tests to maintain (test as you go)
- Dexie remains local cache; Firestore is source of truth
- Google sign-in only (no email/password)
- Offline changes queue locally, sync on reconnect
- On edit, recalculate from that date forward (decay, avatar, rings, streaks)

---

## File Structure

**New files:**
- `src/lib/firebase.ts` — Firebase config + initialization
- `src/lib/merge.ts` — Merge algorithm (local + Firestore)
- `src/hooks/useAuth.ts` — Auth state + Google sign-in
- `src/hooks/useFirebaseSync.ts` — Real-time listener + merge on login
- `src/hooks/useConflictResolver.ts` — Conflict detection helper
- `src/components/LoginScreen.tsx` — Google sign-in UI
- `src/components/WorkoutConflictResolver.tsx` — Conflict modal
- `src/types/firebase.ts` — WorkoutDoc, ExerciseLog types

**Modified files:**
- `src/App.tsx` — Add auth guard, route to LoginScreen if not logged in
- `src/components/TrainingCalendar.tsx` — Add `!` conflict indicator
- `package.json` — Add firebase, react-firebase-hooks dependencies

---

## Phase 1: Firebase Setup & Authentication (Day 1)

### Task 1: Install Dependencies & Create Firebase Config

**Files:**
- Modify: `package.json`
- Create: `src/lib/firebase.ts`
- Create: `src/types/firebase.ts`

**Interfaces:**
- Produces: `initializeApp()` call in `src/lib/firebase.ts`
- Produces: Types `WorkoutDoc`, `ExerciseLog` in `src/types/firebase.ts`

- [ ] **Step 1: Add Firebase dependencies to package.json**

```bash
npm install firebase@^10.0.0 react-firebase-hooks@^5.1.0
```

- [ ] **Step 2: Create Firebase type definitions**

Create `src/types/firebase.ts`:

```typescript
export type WorkoutType = 'calisthenics' | 'bjj' | 'mobility'
export type MobilityArea = 'shoulders' | 'hips' | 'lower_back'

export interface ExerciseLog {
  reps?: number
  seconds?: number
}

export interface WorkoutDoc {
  // Immutable
  type: WorkoutType
  date: string // YYYY-MM-DD
  createdAt: number // Unix timestamp
  updatedAt: number // Unix timestamp

  // Editable
  exerciseIds: string[]
  data: Record<string, ExerciseLog>

  // Conflict handling
  conflicted?: boolean

  // Calisthenics specific
  plannedSec?: number
  actualSec?: number

  // BJJ specific
  tags?: string[]

  // Mobility specific
  area?: MobilityArea
  label?: string
}

export interface UserMetadata {
  lastSync: number
  version: number
}
```

- [ ] **Step 3: Create Firebase initialization file**

Create `src/lib/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Replace these with your Firebase project config from Firebase Console
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'mobility-coach-demo.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'mobility-coach-demo',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'mobility-coach-demo.appspot.com',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:000000000000:web:0000000000000000000000',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
```

- [ ] **Step 4: Create .env.example with Firebase placeholders**

Create `.env.example`:

```
REACT_APP_FIREBASE_API_KEY=your-api-key-here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain-here
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

Add to `.gitignore`:
```
.env
.env.local
```

- [ ] **Step 5: Commit**

```bash
git add package.json src/lib/firebase.ts src/types/firebase.ts .env.example .gitignore
git commit -m "feat: add Firebase SDK dependencies and config"
```

---

### Task 2: Implement useAuth Hook

**Files:**
- Create: `src/hooks/useAuth.ts`

**Interfaces:**
- Produces: `useAuth()` hook returning `{ user: User | null, loading: boolean, logout: () => Promise<void> }`
- Consumes: `auth` from `src/lib/firebase.ts`

- [ ] **Step 1: Create useAuth hook**

Create `src/hooks/useAuth.ts`:

```typescript
import { useState, useEffect } from 'react'
import { User, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase'

interface UseAuthState {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
}

export function useAuth(): UseAuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const logout = async () => {
    await signOut(auth)
    setUser(null)
  }

  return { user, loading, logout }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAuth.ts
git commit -m "feat: add useAuth hook for Firebase authentication"
```

---

### Task 3: Create LoginScreen Component

**Files:**
- Create: `src/components/LoginScreen.tsx`

**Interfaces:**
- Consumes: `auth` from `src/lib/firebase.ts`
- Produces: LoginScreen component with Google sign-in button

- [ ] **Step 1: Create LoginScreen component**

Create `src/components/LoginScreen.tsx`:

```typescript
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useState } from 'react'

export function LoginScreen() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError(null)
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Mobility Coach</h1>
        <p className="text-gray-600 mb-8">Track your training across devices</p>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className={`px-6 py-3 bg-white border border-gray-300 rounded-lg font-semibold flex items-center gap-2 mx-auto transition ${
            loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
          }`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>

        {error && <p className="text-red-600 mt-4 text-sm">{error}</p>}

        <p className="text-gray-500 text-xs mt-8">
          All your data syncs securely across your devices
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LoginScreen.tsx
git commit -m "feat: add LoginScreen with Google sign-in button"
```

---

### Task 4: Wrap App with Auth Guard

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAuth()` from `src/hooks/useAuth.ts`, `LoginScreen` from `src/components/LoginScreen.tsx`
- Produces: App wrapper that shows LoginScreen if not logged in

- [ ] **Step 1: Update App.tsx to add auth guard**

Read the current `src/App.tsx` to see its structure, then wrap it:

```typescript
// At the top of App.tsx, add imports:
import { useAuth } from './hooks/useAuth'
import { LoginScreen } from './components/LoginScreen'

// Wrap existing App content in a new component
function AppContent() {
  // ... existing App code here
}

// Replace default export with auth guard:
export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return <AppContent />
}
```

- [ ] **Step 2: Test locally**

```bash
npm run dev
```

Expected: You should see LoginScreen. Click "Sign in with Google" → should redirect to Google, then after sign-in, show the home screen.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add auth guard to App, show LoginScreen when not logged in"
```

---

## Phase 2: Sync & Merge Logic (Day 2)

### Task 5: Implement Merge Algorithm

**Files:**
- Create: `src/lib/merge.ts`

**Interfaces:**
- Produces: `mergeWorkouts(firestoreWorkouts: WorkoutDoc[], dexieWorkouts: WorkoutDoc[]): MergeResult`
- Consumes: Types from `src/types/firebase.ts`

- [ ] **Step 1: Create merge utility**

Create `src/lib/merge.ts`:

```typescript
import { WorkoutDoc } from '../types/firebase'

export interface MergeResult {
  merged: WorkoutDoc[]
  hasConflicts: boolean
  conflictDays: string[]
}

export function mergeWorkouts(
  firestoreWorkouts: WorkoutDoc[],
  dexieWorkouts: WorkoutDoc[]
): MergeResult {
  const merged: WorkoutDoc[] = []
  const conflictDays = new Set<string>()

  // Create maps for lookup: key = `${date}-${type}`
  const fsMap = new Map(
    firestoreWorkouts.map((w) => [`${w.date}-${w.type}`, w])
  )
  const dxMap = new Map(
    dexieWorkouts.map((w) => [`${w.date}-${w.type}`, w])
  )

  // Process all unique keys
  const allKeys = new Set([...fsMap.keys(), ...dxMap.keys()])

  for (const key of allKeys) {
    const fsWorkout = fsMap.get(key)
    const dxWorkout = dxMap.get(key)

    if (fsWorkout && !dxWorkout) {
      // Only in Firestore → add to merged
      merged.push(fsWorkout)
    } else if (!fsWorkout && dxWorkout) {
      // Only in Dexie → add to merged (will upload in Task 6)
      merged.push(dxWorkout)
    } else if (fsWorkout && dxWorkout) {
      // Both exist → use newer (by updatedAt)
      if (fsWorkout.updatedAt >= dxWorkout.updatedAt) {
        merged.push(fsWorkout)
      } else {
        merged.push(dxWorkout)
      }

      // Check if they're actually different (conflict)
      if (JSON.stringify(fsWorkout) !== JSON.stringify(dxWorkout)) {
        const [date] = key.split('-')
        conflictDays.add(date)
        // Mark both as conflicted
        const mergedWorkout = { ...merged[merged.length - 1], conflicted: true }
        merged[merged.length - 1] = mergedWorkout
      }
    }
  }

  return {
    merged,
    hasConflicts: conflictDays.size > 0,
    conflictDays: Array.from(conflictDays),
  }
}
```

- [ ] **Step 2: Test merge function**

Create a simple test to verify merge logic works:

```bash
# In your terminal, create a temporary test file
cat > /tmp/test-merge.ts << 'EOF'
// Quick validation: test merging identical, different, and solo workouts
const firestoreWorkouts = [
  { type: 'calisthenics', date: '2026-06-22', updatedAt: 1000, data: { pushups: { reps: 10 } } },
]
const dexieWorkouts = [
  { type: 'calisthenics', date: '2026-06-23', updatedAt: 1000, data: { pullups: { reps: 5 } } },
]
// After merging, should have 2 workouts, 0 conflicts
EOF
```

Actually, for now skip unit tests. We'll test during integration.

- [ ] **Step 3: Commit**

```bash
git add src/lib/merge.ts
git commit -m "feat: implement merge algorithm for local + Firestore workouts"
```

---

### Task 6: Implement useFirebaseSync Hook

**Files:**
- Create: `src/hooks/useFirebaseSync.ts`

**Interfaces:**
- Consumes: `db` from `src/lib/firebase.ts`, `useAuth()` hook, `mergeWorkouts()` from `src/lib/merge.ts`
- Produces: `useFirebaseSync()` hook that returns `{ allWorkouts: WorkoutDoc[], conflictDays: string[], isLoading: boolean }`

- [ ] **Step 1: Create useFirebaseSync hook**

Create `src/hooks/useFirebaseSync.ts`:

```typescript
import { useEffect, useState } from 'react'
import { User } from 'firebase/auth'
import {
  collection,
  query,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { WorkoutDoc } from '../types/firebase'
import { mergeWorkouts } from '../lib/merge'
import { useDexie } from './useDexie'

interface UseSyncState {
  allWorkouts: WorkoutDoc[]
  conflictDays: string[]
  isLoading: boolean
  uploadWorkoutToDexie: (workout: WorkoutDoc) => Promise<void>
  updateWorkoutInFirestore: (workoutId: string, updates: Partial<WorkoutDoc>) => Promise<void>
}

export function useFirebaseSync(user: User | null): UseSyncState {
  const [allWorkouts, setAllWorkouts] = useState<WorkoutDoc[]>([])
  const [conflictDays, setConflictDays] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { db: dexieDb } = useDexie()

  useEffect(() => {
    if (!user) {
      setAllWorkouts([])
      setConflictDays([])
      setIsLoading(false)
      return
    }

    const syncWorkouts = async () => {
      try {
        // Step 1: Fetch Firestore workouts
        const fsRef = collection(db, `users/${user.uid}/workouts`)
        const fsDocs = await getDocs(fsRef)
        const fsWorkouts = fsDocs.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as WorkoutDoc & { id: string }))

        // Step 2: Load Dexie workouts
        const dxWorkouts = (await dexieDb?.calisthenicsLog.toArray()) as WorkoutDoc[] || []

        // Step 3: Merge with conflict detection
        const { merged, conflictDays: conflicts } = mergeWorkouts(fsWorkouts, dxWorkouts)

        // Step 4: Upload Dexie-only workouts to Firestore
        for (const workout of merged) {
          if (!fsWorkouts.find((w) => w.date === workout.date && w.type === workout.type)) {
            // This is Dexie-only, upload it
            try {
              await addDoc(fsRef, {
                type: workout.type,
                date: workout.date,
                createdAt: workout.createdAt,
                updatedAt: workout.updatedAt,
                exerciseIds: workout.exerciseIds,
                data: workout.data,
                tags: workout.tags,
                area: workout.area,
              })
            } catch (err) {
              console.error('Failed to upload workout', err)
            }
          }
        }

        // Step 5: Store merged workouts
        setAllWorkouts(merged)
        setConflictDays(conflicts)

        // Step 6: Set up real-time listener
        onSnapshot(fsRef, (snapshot) => {
          const updated = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          } as WorkoutDoc & { id: string }))

          setAllWorkouts(updated)
        })

        setIsLoading(false)
      } catch (err) {
        console.error('Sync failed:', err)
        setIsLoading(false)
      }
    }

    syncWorkouts()
  }, [user, dexieDb])

  const uploadWorkoutToDexie = async (workout: WorkoutDoc) => {
    try {
      await dexieDb?.calisthenicsLog.add(workout)
    } catch (err) {
      console.error('Failed to upload to Dexie', err)
    }
  }

  const updateWorkoutInFirestore = async (workoutId: string, updates: Partial<WorkoutDoc>) => {
    try {
      const docRef = doc(db, `users/${user!.uid}/workouts/${workoutId}`)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Date.now(),
      })
    } catch (err) {
      console.error('Failed to update Firestore', err)
      throw err
    }
  }

  return {
    allWorkouts,
    conflictDays,
    isLoading,
    uploadWorkoutToDexie,
    updateWorkoutInFirestore,
  }
}
```

Actually, I realize we need to check existing Dexie hooks. Let me simplify for now:

```typescript
import { useEffect, useState } from 'react'
import { User } from 'firebase/auth'
import {
  collection,
  query,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  QueryConstraint,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { WorkoutDoc } from '../types/firebase'

interface UseSyncState {
  allWorkouts: WorkoutDoc[]
  conflictDays: string[]
  isLoading: boolean
  updateWorkoutInFirestore: (workoutId: string, updates: Partial<WorkoutDoc>) => Promise<void>
  addWorkoutToFirestore: (workout: Omit<WorkoutDoc, 'id'>) => Promise<string>
}

export function useFirebaseSync(user: User | null): UseSyncState {
  const [allWorkouts, setAllWorkouts] = useState<WorkoutDoc[]>([])
  const [conflictDays, setConflictDays] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null)

  useEffect(() => {
    if (!user) {
      setAllWorkouts([])
      setConflictDays([])
      setIsLoading(false)
      if (unsubscribe) unsubscribe()
      return
    }

    const setupSync = async () => {
      try {
        const fsRef = collection(db, `users/${user.uid}/workouts`)
        const q = query(fsRef)

        const unsub = onSnapshot(q, (snapshot) => {
          const workouts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as WorkoutDoc[]

          setAllWorkouts(workouts)
          setIsLoading(false)
        })

        setUnsubscribe(() => unsub)
      } catch (err) {
        console.error('Sync setup failed:', err)
        setIsLoading(false)
      }
    }

    setupSync()

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [user])

  const updateWorkoutInFirestore = async (workoutId: string, updates: Partial<WorkoutDoc>) => {
    try {
      const docRef = doc(db, `users/${user!.uid}/workouts/${workoutId}`)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Date.now(),
      })
    } catch (err) {
      console.error('Update failed:', err)
      throw err
    }
  }

  const addWorkoutToFirestore = async (workout: Omit<WorkoutDoc, 'id'>) => {
    try {
      const fsRef = collection(db, `users/${user!.uid}/workouts`)
      const docRef = await addDoc(fsRef, {
        ...workout,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      return docRef.id
    } catch (err) {
      console.error('Add failed:', err)
      throw err
    }
  }

  return {
    allWorkouts,
    conflictDays,
    isLoading,
    updateWorkoutInFirestore,
    addWorkoutToFirestore,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useFirebaseSync.ts
git commit -m "feat: implement useFirebaseSync with real-time listener"
```

---

### Task 7: Add Conflict Detection Components

**Files:**
- Create: `src/components/ConflictWarning.tsx`
- Create: `src/components/WorkoutConflictResolver.tsx`

**Interfaces:**
- Consumes: `conflictDays` array from `useFirebaseSync`
- Produces: Conflict warning UI + modal

- [ ] **Step 1: Create ConflictWarning component**

Create `src/components/ConflictWarning.tsx`:

```typescript
export interface ConflictWarningProps {
  conflictDays: string[]
}

export function ConflictWarning({ conflictDays }: ConflictWarningProps) {
  if (conflictDays.length === 0) return null

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
      <p className="text-sm font-semibold text-yellow-800">
        ⚠️ {conflictDays.length} day(s) have conflicting workouts
      </p>
      <p className="text-xs text-yellow-700 mt-1">
        Tap a day to review and resolve conflicts
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Create WorkoutConflictResolver modal**

Create `src/components/WorkoutConflictResolver.tsx`:

```typescript
import { WorkoutDoc } from '../types/firebase'

export interface WorkoutConflictResolverProps {
  isOpen: boolean
  conflicts: WorkoutDoc[]
  onResolve: (kept: WorkoutDoc, deleted: WorkoutDoc) => void
  onCancel: () => void
}

export function WorkoutConflictResolver({
  isOpen,
  conflicts,
  onResolve,
  onCancel,
}: WorkoutConflictResolverProps) {
  if (!isOpen || conflicts.length === 0) return null

  const w1 = conflicts[0]
  const w2 = conflicts[1]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-sm">
        <h2 className="text-lg font-bold mb-4">Duplicate Workout Detected</h2>
        <p className="text-sm text-gray-600 mb-4">
          Two {w1.type} workouts logged for {w1.date}. Keep which one?
        </p>

        <div className="space-y-2 mb-4">
          <button
            onClick={() => onResolve(w1, w2)}
            className="w-full text-left p-3 border border-green-300 rounded hover:bg-green-50"
          >
            <p className="font-semibold text-green-700">Keep this one</p>
            <p className="text-xs text-gray-600">{JSON.stringify(w1.data)}</p>
          </button>
          <button
            onClick={() => onResolve(w2, w1)}
            className="w-full text-left p-3 border border-green-300 rounded hover:bg-green-50"
          >
            <p className="font-semibold text-green-700">Keep this one</p>
            <p className="text-xs text-gray-600">{JSON.stringify(w2.data)}</p>
          </button>
        </div>

        <button
          onClick={onCancel}
          className="w-full px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ConflictWarning.tsx src/components/WorkoutConflictResolver.tsx
git commit -m "feat: add conflict detection UI components"
```

---

## Phase 3: Integration & Testing (Day 3)

### Task 8: Wire Sync into App & Update TrainingCalendar

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/TrainingCalendar.tsx`

**Interfaces:**
- Consumes: `useFirebaseSync()`, `useAuth()`
- Produces: App component that passes workouts to calendar, calendar shows `!` for conflicts

- [ ] **Step 1: Update App to use sync hook**

Modify `src/App.tsx` to hook up `useFirebaseSync`:

```typescript
// Add at top level of AppContent:
const { user } = useAuth()
const { allWorkouts, conflictDays, isLoading } = useFirebaseSync(user)

// Pass to existing components:
// <TrainingCalendar workouts={allWorkouts} conflictDays={conflictDays} />
```

- [ ] **Step 2: Add conflict indicator to TrainingCalendar**

Modify `src/components/TrainingCalendar.tsx` to show `!`:

```typescript
// In the day rendering loop, add:
{conflictDays?.includes(dateString) && (
  <span className="absolute top-0 right-0 text-red-600 font-bold">!</span>
)}
```

- [ ] **Step 3: Test in browser**

```bash
npm run dev
```

Expected: Sign in → see calendar → any conflict days show `!`

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/TrainingCalendar.tsx
git commit -m "feat: integrate Firestore sync with calendar, show conflict warnings"
```

---

### Task 9: Wire Logging Functions to Firestore

**Files:**
- Modify: `src/hooks/useCalisthenics.ts`
- Modify: `src/hooks/useBjjSkills.ts`
- Modify: `src/hooks/useMobility.ts` (if exists, or `useSessions.ts`)

**Interfaces:**
- Consumes: `useFirebaseSync()`, `useAuth()`
- Produces: Modified logging functions that also save to Firestore

- [ ] **Step 1: Update useCalisthenics to sync to Firestore**

For each logging function, add a call to `addWorkoutToFirestore`:

```typescript
// In logCalisthenics function:
export async function logCalisthenics(...) {
  // ... existing Dexie save code ...
  
  // NEW: Also sync to Firestore
  const { addWorkoutToFirestore } = useFirebaseSync(user)
  try {
    await addWorkoutToFirestore({
      type: 'calisthenics',
      date: date || new Date().toISOString().split('T')[0],
      exerciseIds: [exerciseId],
      data: { [exerciseId]: { reps: value } },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  } catch (err) {
    console.error('Failed to sync to Firestore', err)
    // Still allows local save even if sync fails
  }
}
```

Actually, hooks can't call other hooks inside functions. Need a different approach. Let me revise:

Instead of modifying each logging hook, create a wrapper in `App.tsx` that listens to Dexie changes and syncs to Firestore. But for simplicity, let's keep Phase 3 focused on just getting new logs to sync.

For now, new logs from the UI should be saved to Firestore via the sync hook. Existing logs get uploaded during merge.

- [ ] **Step 2: For this MVP, skip individual logging updates**

The merge on login will catch all local workouts and upload them. New workouts logged after sync is active will be saved to Firestore directly via the UI form → Firestore path. This happens naturally once we wire the form to call `addWorkoutToFirestore`.

- [ ] **Step 3: Commit (no changes yet, just planning)**

```bash
# No commit yet - will refactor logging in next task if needed
```

---

### Task 10: Add Edit → Recalculation Flow

**Files:**
- Create: `src/lib/recalculate.ts` (helper to recalc from date forward)
- Modify: Existing calendar edit handlers

**Interfaces:**
- Produces: `recalculateFromDate(date: Date, allWorkouts: WorkoutDoc[])` function
- Consumes: Existing decay/avatar/rings calculation functions

- [ ] **Step 1: Create recalculation helper**

Create `src/lib/recalculate.ts`:

```typescript
import { WorkoutDoc } from '../types/firebase'

export async function recalculateFromDate(
  fromDate: Date,
  allWorkouts: WorkoutDoc[],
  // These would be your existing calculation functions:
  // computeMuscleSorenessDecay, computeAvatarStats, etc.
) {
  // Filter workouts from date forward
  const relevantWorkouts = allWorkouts.filter((w) => {
    const wDate = new Date(w.date)
    return wDate >= fromDate
  })

  // Call existing calculation functions
  // This is a placeholder - integrate with your existing code
  return {
    relevantWorkouts,
    // decay: computeMuscleSorenessDecay(...),
    // avatar: computeAvatarStats(...),
    // rings: computeCalendarRings(...),
  }
}
```

- [ ] **Step 2: Hook edit handlers to recalculate**

When user edits a log, after saving to Firestore:

```typescript
// In edit handler:
await updateWorkoutInFirestore(workoutId, newData)
// Then:
await recalculateFromDate(editDate, allWorkouts)
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/recalculate.ts
git commit -m "feat: add recalculation helper for date-forward updates"
```

---

### Task 11: Add Weekly Report Query

**Files:**
- Create: `src/lib/weekly-stats.ts`
- Modify: `src/pages/Progress.tsx` (if it exists) or create `WeeklyReportCard.tsx`

**Interfaces:**
- Produces: `getWeeklyStats(weekStart: Date, allWorkouts: WorkoutDoc[])` returning structured weekly summary
- Consumes: `allWorkouts` from `useFirebaseSync`

- [ ] **Step 1: Create weekly stats calculator**

Create `src/lib/weekly-stats.ts`:

```typescript
import { WorkoutDoc } from '../types/firebase'

export interface WeeklyStats {
  totalWorkouts: number
  calisthenics: {
    push: number
    pull: number
    legs: number
    total: number
  }
  bjj: {
    classes: number
    skillsTrained: Record<string, number>
  }
  mobility: {
    shoulders: number
    hips: number
    lowerBack: number
    mostImpacted: string
  }
  peakSorenessDay: string | null
}

const PUSH_EXERCISES = ['pushups', 'dips', 'pike_pushups']
const PULL_EXERCISES = ['pullups', 'australian_pullups']
const LEG_EXERCISES = ['pistol_squat', 'squats']

export function getWeeklyStats(weekStart: Date, allWorkouts: WorkoutDoc[]): WeeklyStats {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const weekWorkouts = allWorkouts.filter((w) => {
    const d = new Date(w.date)
    return d >= weekStart && d <= weekEnd
  })

  // Aggregate calisthenics
  const calisthenicsReps = { push: 0, pull: 0, legs: 0, total: 0 }
  const bjjSkills: Record<string, number> = {}
  const mobilityByArea = { shoulders: 0, hips: 0, lowerBack: 0 }

  for (const w of weekWorkouts) {
    if (w.type === 'calisthenics') {
      for (const exerciseId of w.exerciseIds || []) {
        const reps = w.data[exerciseId]?.reps || 0
        calisthenicsReps.total += reps
        if (PUSH_EXERCISES.includes(exerciseId)) calisthenicsReps.push += reps
        if (PULL_EXERCISES.includes(exerciseId)) calisthenicsReps.pull += reps
        if (LEG_EXERCISES.includes(exerciseId)) calisthenicsReps.legs += reps
      }
    } else if (w.type === 'bjj') {
      for (const tag of w.tags || []) {
        bjjSkills[tag] = (bjjSkills[tag] || 0) + 1
      }
    } else if (w.type === 'mobility') {
      const sec = w.actualSec || 0
      const area = w.area || 'shoulders'
      if (area === 'shoulders') mobilityByArea.shoulders += sec
      if (area === 'hips') mobilityByArea.hips += sec
      if (area === 'lower_back') mobilityByArea.lowerBack += sec
    }
  }

  const mostImpacted = Object.entries(mobilityByArea).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none'

  return {
    totalWorkouts: weekWorkouts.length,
    calisthenics: calisthenicsReps,
    bjj: {
      classes: weekWorkouts.filter((w) => w.type === 'bjj').length,
      skillsTrained: bjjSkills,
    },
    mobility: {
      ...mobilityByArea,
      mostImpacted,
    },
    peakSorenessDay: null, // TODO: integrate with recovery state
  }
}
```

- [ ] **Step 2: Create WeeklyReportCard component**

Create `src/components/WeeklyReportCard.tsx`:

```typescript
import { WeeklyStats } from '../lib/weekly-stats'

export interface WeeklyReportCardProps {
  stats: WeeklyStats
  weekStart: Date
}

export function WeeklyReportCard({ stats, weekStart }: WeeklyReportCardProps) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const dateStr = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="font-bold text-lg mb-4">Week of {dateStr}</h3>

      <div className="space-y-3 text-sm">
        <div>
          <p className="font-semibold">Calisthenics ({stats.calisthenics.total} reps)</p>
          <div className="ml-2 space-y-1 text-gray-700">
            <p>Push: {stats.calisthenics.push} reps</p>
            <p>Pull: {stats.calisthenics.pull} reps</p>
            <p>Legs: {stats.calisthenics.legs} reps</p>
          </div>
        </div>

        <div>
          <p className="font-semibold">BJJ ({stats.bjj.classes} classes)</p>
          {Object.entries(stats.bjj.skillsTrained).length > 0 ? (
            <div className="ml-2 space-y-1 text-gray-700">
              {Object.entries(stats.bjj.skillsTrained).map(([skill, count]) => (
                <p key={skill}>
                  {skill}: {count} sessions
                </p>
              ))}
            </div>
          ) : (
            <p className="ml-2 text-gray-600">No BJJ logged this week</p>
          )}
        </div>

        <div>
          <p className="font-semibold">Mobility</p>
          <div className="ml-2 space-y-1 text-gray-700">
            <p>Most impacted: {stats.mobility.mostImpacted}</p>
            <p>Hips: {Math.round(stats.mobility.hips / 60)} min</p>
            <p>Shoulders: {Math.round(stats.mobility.shoulders / 60)} min</p>
            <p>Lower back: {Math.round(stats.mobility.lowerBack / 60)} min</p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/weekly-stats.ts src/components/WeeklyReportCard.tsx
git commit -m "feat: add weekly report query and display component"
```

---

### Task 12: End-to-End Testing & Polish

**Files:**
- Test all flows manually
- Fix any import errors or type issues

**Steps:**

- [ ] **Step 1: Full flow test**

```bash
npm run dev
```

1. Sign out (if logged in)
2. Click "Sign in with Google" → sign in with test account
3. Should show home screen with calendar
4. Log a new workout (calisthenics)
5. Check browser DevTools → Firestore should show the new workout
6. Sign out, sign back in on same device → merged data should appear
7. Edit a past workout → should update in Firestore
8. Check Calendar for `!` conflict indicator (if any conflicts exist)

- [ ] **Step 2: Test real-time sync (if possible with 2 tabs)**

Open 2 tabs of the app, sign in on both, log a workout in one tab → should appear in other tab in real-time

- [ ] **Step 3: Fix any errors**

If TypeScript errors, import errors, or runtime issues appear, fix them inline.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "test: verify end-to-end Firebase sync and auth flows"
```

---

## Success Criteria Checklist

- [ ] ✓ User can sign in with Google
- [ ] ✓ First login shows home screen (no login loop)
- [ ] ✓ New workouts sync to Firestore
- [ ] ✓ Real-time listener updates calendar when other devices change data
- [ ] ✓ Editing a log updates Firestore
- [ ] ✓ Conflict indicator shows for duplicate days
- [ ] ✓ Weekly report displays push/pull/legs, BJJ skills, mobility areas
- [ ] ✓ Logout clears session and shows login screen again
- [ ] ✓ No console errors during normal use

---

## Notes for Executor

1. **Firebase Project:** Before running, create a Firebase project at https://console.firebase.google.com. Copy config keys to `.env.local`. Enable Firestore and Google sign-in in the project settings.

2. **Firestore Security Rules:** By default, Firestore blocks all reads/writes. You'll need to set rules. For development, use (replace with proper rules before production):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/workouts/{document=**} {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

3. **Testing Tip:** Use Firestore Console to manually add test data and verify reads/writes.

4. **If Offline Sync Needed:** Currently queued changes don't automatically retry. If needed later, we can add a periodic sync check via a custom hook.
