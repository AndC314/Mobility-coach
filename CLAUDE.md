# Mobility Coach — Claude Code Instructions

## Environment

- `npm install` / `npm run build` / `npx tsc` will NOT work — this machine is behind a VPN that blocks npm registry.
- Do NOT attempt to install dependencies or run build commands.
- Validate code correctness by reading files and checking types manually.

## Stack

- React 18 + TypeScript + Vite + Tailwind CSS
- Dexie (IndexedDB) for offline-first local storage
- Firebase/Firestore for cross-device sync
- PWA (installable, offline-capable)

## Key Architecture

- `src/db/db.ts` — Dexie schema, all table interfaces and type definitions
- `src/hooks/useFirebaseSync.ts` — Bidirectional Firestore sync (onSnapshot listeners + catchUpSync push)
- `src/lib/firebase-workout-sync.ts` — Global sync callbacks, type converters
- `src/data/calisthenics.ts` — Exercise definitions
- `src/data/muscleMap.ts` — Exercise → muscle activation mappings
- `src/data/progressionChains.ts` — Skill tree progression chains

## Key Fixes & Gotchas

### Firestore rejects `undefined` values
`addDoc()` throws if any field in the document object is `undefined`. All optional fields (`notes`, `sets`, `technicalMins`, `sparringMins`) must be stripped before writing. Use the `stripUndefined()` helper in `useFirebaseSync.ts`, or conditionally include fields only when `!= null`.

### Firestore security rules must use `{document=**}`
Subcollections (`calisthenicsLogs`, `bjjClassLogs`, `workouts`, etc.) under `users/{uid}` need a wildcard rule to be accessible. Without `match /{document=**}`, only explicitly named subcollections work.

### Cross-device sync architecture
- `onSnapshot` listeners (Firestore → local) run continuously while logged in
- `catchUpSync` runs once on login to push local-only records to Firestore
- The `addCalisthenicsLogToFirestore` / `addBjjClassLogToFirestore` callbacks in `firebase-workout-sync.ts` handle real-time writes from the app

### Firebase auth/unauthorized-domain
If login fails with this error, the hosting domain must be added in Firebase Console → Auth → Settings → Authorized domains.

### Supercompensation model
- Located in `src/lib/supercompensation.ts`
- Hard session (volume ≥ 70% of running best): fatigue dip → power-law recovery → adaptation above baseline
- Maintenance session (below threshold): small dip → recovers to same level
- No training: exponential decay back to baseline (100)

## Git

- Default branch: `main`
