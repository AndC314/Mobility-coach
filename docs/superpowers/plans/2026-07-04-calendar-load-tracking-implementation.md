# Calendar, Load Tracking & Custom Exercises Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add calendar with activity load ring, BJJ split timer, new exercises, custom exercise system, and progressive overload tracking to mobility-coach.

**Architecture:** Modular approach: (1) extend data layer with exercises, (2) build load calculation engine (per-muscle → push/pull/legs → overall %), (3) create calendar UI with load ring, (4) implement BJJ split timer, (5) custom exercise system (form + storage + integration), (6) fix radar weekly averages.

**Tech Stack:** React, TypeScript, Dexie (IndexedDB), SVG (load ring), TailwindCSS, Firebase (data sync)

## Global Constraints

- Load calculation: push-pull-legs averaging (not max)
- Calisthenics: per-muscle target = 45–60 reps for 100% load
- Mobility: per-day target = 30 mins for 100% load
- BJJ: 1 min sparring = 3 mins equivalent for load
- Stagnation penalty: applies after 5 consecutive days same volume
- Calendar: month view, current month only, with hover tooltip breakdown
- Radar: weekly averages (7-day rolling), not daily

---

## Task List

### Task 1: Add 9 Calisthenics Exercises to Data

**Files:**
- Modify: `src/data/calisthenics.ts`

**Interfaces:**
- Consumes: Existing `CalisthenicsExerciseDef` type (already in file)
- Produces: 9 new exercises added to `CALISTHENICS_EXERCISES` array

- [ ] **Step 1: Read current calisthenics.ts to understand structure**
- [ ] **Step 2: Add the 9 new exercises to CALISTHENICS_EXERCISES array**
- [ ] **Step 3: Verify side_plank and dead_bug already exist**
- [ ] **Step 4: Run TypeScript check**
- [ ] **Step 5: Commit**

---

### Task 2: Add 6 Mobility Exercises to Data

**Files:**
- Modify: `src/data/mobilityExercises.ts`

**Interfaces:**
- Consumes: Existing `MobilityExercise` type
- Produces: 6 new mobility exercises added to `MOBILITY_EXERCISES` array

- [ ] **Step 1: Verify existing mobility exercises**
- [ ] **Step 2: Add 6 missing mobility exercises**
- [ ] **Step 3: Run TypeScript check**
- [ ] **Step 4: Commit**

---

### Task 3: Extend Database Schema for Custom Exercises

**Files:**
- Modify: `src/db/db.ts`

**Interfaces:**
- Consumes: Existing Dexie schema structure
- Produces: `CustomExercise` type and `customExercises` table

- [ ] **Step 1: Read db.ts to understand schema structure**
- [ ] **Step 2: Add CustomExercise type**
- [ ] **Step 3: Add customExercises table to db.version().stores()**
- [ ] **Step 4: Add type declaration for table**
- [ ] **Step 5: Run TypeScript check**
- [ ] **Step 6: Commit**

---

### Task 4: Create Muscle Grouping Utility

**Files:**
- Create: `src/lib/muscleGrouping.ts`

**Interfaces:**
- Consumes: `CalisthenicsExerciseId`, `EXERCISE_MUSCLES` from muscleMap
- Produces: Functions `getExerciseMuscles()`, `getMuscleGroup()`, `calculateCategoryLoad()`, `calculateOverallCalisthenicsLoad()`

- [ ] **Step 1: Create muscleGrouping.ts**
- [ ] **Step 2: Run TypeScript check**
- [ ] **Step 3: Commit**

---

### Task 5: Create Stagnation Detection Engine

**Files:**
- Create: `src/lib/stagnationDetection.ts`

**Interfaces:**
- Consumes: `CalisthenicsLog` type, date utilities
- Produces: `detectStagnation()`, `applyStagnationPenalty()` functions

- [ ] **Step 1: Create stagnationDetection.ts**
- [ ] **Step 2: Run TypeScript check**
- [ ] **Step 3: Commit**

---

### Task 6: Create Daily Load Calculation Engine

**Files:**
- Create: `src/lib/loadCalculation.ts`

**Interfaces:**
- Consumes: `CalisthenicsLog`, `BjjLog`, `Session` types; muscle grouping utils; stagnation detection
- Produces: `calculateDailyLoad()`, `type DailyLoad` interface

- [ ] **Step 1: Create loadCalculation.ts**
- [ ] **Step 2: Run TypeScript check**
- [ ] **Step 3: Commit**

---

### Task 7: Create Training Calendar Component with Load Ring

**Files:**
- Create: `src/components/TrainingCalendar.tsx`

**Interfaces:**
- Consumes: `DailyLoad` (from Task 6), date utilities
- Produces: `TrainingCalendar` component that renders month view with load rings

- [ ] **Step 1: Create TrainingCalendar.tsx**
- [ ] **Step 2: Run TypeScript check**
- [ ] **Step 3: Commit**

---

### Task 8: Create Calendar Day Cell with Load Ring

**Files:**
- Create: `src/components/CalendarDay.tsx`

**Interfaces:**
- Consumes: `DailyLoad` type
- Produces: `CalendarDay` component with SVG load ring and hover tooltip

- [ ] **Step 1: Create CalendarDay.tsx**
- [ ] **Step 2: Run TypeScript check**
- [ ] **Step 3: Commit**

---

### Task 9: Create Calendar Page

**Files:**
- Create: `src/pages/Calendar.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `TrainingCalendar` component
- Produces: Page component for `/calendar` route

- [ ] **Step 1: Create Calendar.tsx**
- [ ] **Step 2: Update App.tsx to add route**
- [ ] **Step 3: Run TypeScript check**
- [ ] **Step 4: Commit**

---

### Task 10: Create BJJ Split Timer Component

**Files:**
- Create: `src/components/BjjSplitTimer.tsx`
- Modify: `src/pages/Bjj.tsx`

**Interfaces:**
- Consumes: `useCountdown` or similar hook (or create inline state)
- Produces: `BjjSplitTimer` component with technical/sparring modes

- [ ] **Step 1: Create BjjSplitTimer.tsx**
- [ ] **Step 2: Replace timer in BJJ page**
- [ ] **Step 3: Run TypeScript check**
- [ ] **Step 4: Commit**

---

### Task 11: Create Custom Exercise Form

**Files:**
- Create: `src/components/CustomExerciseForm.tsx`

**Interfaces:**
- Consumes: `db`, `CustomExercise` type
- Produces: Form component that saves custom exercises to database

- [ ] **Step 1: Create CustomExerciseForm.tsx**
- [ ] **Step 2: Run TypeScript check**
- [ ] **Step 3: Commit**

---

### Task 12: Fix Radar Visualization with Weekly Averages

**Files:**
- Modify: `src/hooks/useRecoveryReadiness.ts`
- Create: `src/hooks/useWeeklyTrainingVolume.ts`
- Modify: `src/components/SkillRadar.tsx`

**Interfaces:**
- Consumes: Existing logs tables
- Produces: Corrected `useRecoveryReadiness` and new `useWeeklyTrainingVolume` hook

- [ ] **Step 1: Create useWeeklyTrainingVolume.ts**
- [ ] **Step 2: Update useRecoveryReadiness to calculate mobility**
- [ ] **Step 3: Update SkillRadar.tsx axis mapping**
- [ ] **Step 4: Run TypeScript check**
- [ ] **Step 5: Commit**

---

## Completed Tasks

(None yet)
