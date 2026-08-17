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

## Git

- Default branch: `main`
