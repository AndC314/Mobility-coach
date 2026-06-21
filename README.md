# Mobility Coach

A installable, offline-first PWA that answers one question every day:

> **"Given how I feel today, what is the best 10–30 minutes I can do?"**

Built for a 41-year-old BJJ practitioner / calisthenics enthusiast managing
occasional lower back stiffness and hamstring tightness. Rule-based coaching,
not a generic tracker.

---

## Tech stack

- React + TypeScript + Vite
- TailwindCSS (dark mode by default, light mode toggle)
- React Router (`HashRouter` — works from a `file://`-served build too)
- Dexie (IndexedDB) for 100% local persistence — no backend, no login
- `vite-plugin-pwa` for installability ("Add to Home Screen")
- Recharts for trend charts

---

## Setup

```bash
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
npm run preview  # preview the production build
```

### Installing on iPhone (Safari)

1. Deploy `dist/` to any static host (Vercel, Netlify, GitHub Pages, etc.)
   — or run `npm run preview` and open that URL on your iPhone if on the
   same network.
2. Open the URL in **Safari** (must be Safari, not Chrome).
3. Tap the Share icon → **Add to Home Screen**.
4. Launch from the home screen — it runs full-screen, offline, with its
   own icon.

All data (sessions, phases, measurements, preferences) is stored in
IndexedDB on-device. Nothing is sent anywhere.

---

## Skill tree (Progress → Skill Tree)

A Sloth-style visual progress map across three branches, all derived from existing data (no new source of truth, no extra logging required):

- **Mobility** — 90/90, Straddle, Pike, each with 4 tiers matching their existing phase system.
- **Calisthenics** — L-sit, Handstand, Dragon Flag (from `measurements`) plus Plank, Hollow Body, Push-ups, Pull-ups, Squats, Bulgarian Split Squat, Australian Pull-ups, Dips (from the fundamentals tracker below), tiered from your best logged value per skill.
- **BJJ** — every tag in your personal Skill Map becomes a node; tier grows with how many logged classes reference it (exposure, not a self-assessed competency score).

Logic lives in `src/lib/skillTree.ts` — pure derivation, so it always matches whatever's shown elsewhere in the app.

## Calisthenics fundamentals (Progress → Calisthenics)

A fixed library of 8 foundational movements: Plank and Hollow Body (hold time in seconds), Push-ups, Pull-ups, Squats, Bulgarian Split Squat, Australian Pull-ups and Dips (rep count). Each log entry feeds the Skill Tree's Calisthenics branch directly and also creates a same-day session (so it shows up in Logs/streaks, same as BJJ and mobility). Logic in `src/data/calisthenics.ts` and `src/hooks/useCalisthenics.ts`.

## Data repair (Profile → Fix data issues)

Defensive tooling for two issues that could occur in earlier builds: duplicate session rows (same date/type/label logged more than once) and `NaN`/invalid numeric fields (e.g. "NaN min" durations from a since-fixed bug). Safe to run any time — `src/lib/dataRepair.ts` only removes exact duplicates (keeping the most complete one) and re-applies numeric sanitation; it never touches real progress data. The underlying `upsertTodaySession` (in `src/hooks/useSessions.ts`) also sanitizes all numeric inputs defensively going forward, so this class of bug shouldn't recur.

## Data export / import (Profile → Your data)

There is no backend and no login — all data lives in this browser's IndexedDB. To move data between devices or browsers:

1. On the source device: **Export backup** downloads a single JSON file with every table.
2. On the destination device: **Import backup file**, choosing **Merge** (adds without touching existing data, skips id collisions) or **Replace all** (clears local data first, requires confirmation).

Logic lives in `src/lib/dataTransfer.ts`. This is also a good manual backup mechanism on its own, independent of switching devices.

## App structure

```
src/
├── db/
│   └── db.ts                # Dexie schema + seed data + future-integration types
├── data/
│   ├── exercises.ts          # Morning routine, BJJ release, 90/90, Straddle, Pike progressions
│   └── recovery.ts            # Soreness area -> recovery sequence mapping
├── lib/
│   └── recommendation.ts     # Rule-based "coach" engine (Today's plan, streaks)
├── hooks/
│   ├── usePreferences.ts
│   ├── useSessions.ts
│   ├── useStreak.ts
│   ├── useTodayPlan.ts
│   └── usePhaseProgress.ts
├── components/
│   ├── BottomNav.tsx
│   ├── Card.tsx
│   ├── ProgressRing.tsx
│   ├── Timer.tsx
│   ├── ExerciseCard.tsx
│   ├── ProgressionHeader.tsx
│   └── TrainingCalendar.tsx  # streak stats, weekly goal, month calendar, session log
├── pages/
│   ├── Today.tsx              # homepage: recovery score, streak, recommended routine
│   ├── Mobility.tsx           # Morning / Post-BJJ / 90-90 / Straddle / Pike
│   ├── Recovery.tsx           # "Where are you sore?" -> generated sequence
│   ├── Progress.tsx           # Logs (calendar) + Trends (charts, measurements)
│   └── Profile.tsx            # BJJ days, session duration, goal, dark mode
├── App.tsx
└── main.tsx
```

---

## Recommendation engine (`src/lib/recommendation.ts`)

Rules currently implemented:

| Condition (yesterday) | Recommendation |
|---|---|
| **BJJ** | Morning mobility + Hip recovery + Neck decompression. Avoids max pancake stretch and heavy compression. |
| **Rest** | Morning mobility + Pancake (Straddle) progression + Pike / L-sit compression — pushes phase progress. |
| **Mobility day** | Morning mobility + full 90/90 + Straddle + Pike block. |

Additional soreness logged today (via the Recovery tab) is appended as
extra recovery items regardless of the above.

**Recovery score** is currently a deterministic heuristic:
`100 − (12 if BJJ yesterday) − (6 × sore areas today) + (streak bonus, capped)`.

---

## Persistence (Dexie / IndexedDB)

Tables: `sessions`, `phaseProgress`, `measurements`, `sorenessLogs`,
`bjjLogs`, `preferences`, `healthMetrics`.

`ensureSeedData()` runs on first load to create:
- a singleton `preferences` row (BJJ days, session duration, goal, dark mode, weekly goal)
- initial `phaseProgress` rows for 90/90 / Straddle / Pike, all starting at Phase 1

---

## Future integrations (interfaces ready, not implemented)

The `healthMetrics` table and `HealthSource` type already exist in
`src/db/db.ts` for:

- Apple Health companion app
- Garmin sync
- Sleep score, HRV, resting HR, training readiness

When these are added, `generateTodayPlan()` in `recommendation.ts` is the
single place to wire real biometric data into the recovery score and
recommendation logic — no schema changes needed.

---

## Known content notes

- **Cat-Cow** has a `caution` field: if the Cat→Cow (extension) transition
  causes sharp pain after a back spasm, do Cat-only (rounding) until
  pain-free. Same caution applies to the anterior pelvic tilt cues in
  Pelvic Clock, 90/90, and the Seated Pelvic Tilt.
- All exercise content (setup / cue / feel / checkpoint / sets) is reused
  verbatim from the original `mobility-tracker.tsx` component.

---

## Icons

`public/icons/icon-192.png` and `icon-512.png` are simple generated
placeholders. Replace with your own branded icons before a real deployment
(same filenames, same sizes, referenced from `manifest.json` and
`vite.config.ts`).
