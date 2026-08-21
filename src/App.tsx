import { useEffect, lazy, Suspense } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import BottomNav from './components/BottomNav'
import Today from './pages/Today'
import MobilityPage from './pages/MobilityPage'
import Bjj from './pages/Bjj'
import CalisthenicsPage from './pages/CalisthenicsPage'
import Recovery from './pages/Recovery'
import HiitPage from './pages/HiitPage'
import RunningPage from './pages/RunningPage'
import SkillsPage from './pages/SkillsPage'

const Progress = lazy(() => import('./pages/Progress'))
const Profile = lazy(() => import('./pages/Profile'))
const Calendar = lazy(() => import('./pages/Calendar'))
import { usePreferences } from './hooks/usePreferences'
import { useAuth } from './hooks/useAuth'
import { useFirebaseSync } from './hooks/useFirebaseSync'
import { ConflictWarning } from './components/ConflictWarning'
import { LoginScreen } from './components/LoginScreen'
import {
  setFirebaseSyncCallback,
  setBjjClassLogSyncCallback,
  setCalisthenicsLogSyncCallback,
  setRunningLogSyncCallback,
  setHealthMetricsSyncCallback,
  setBodyMeasurementSyncCallback,
  setHoldLogSyncCallback,
  setWeightLogSyncCallback,
} from './lib/sync'

function AppContent() {
  const { preferences } = usePreferences()
  const { user } = useAuth()
  const {
    conflictDays,
    isLoading,
    addWorkoutToFirestore,
    addBjjClassLogToFirestore,
    addCalisthenicsLogToFirestore,
    addRunningLogToFirestore,
    addHealthMetricsToFirestore,
    addBodyMeasurementToFirestore,
    addHoldLogToFirestore,
    addWeightLogToFirestore,
  } = useFirebaseSync(user)

  // Wire Firebase sync callbacks for all logging functions
  useEffect(() => {
    if (user) {
      setFirebaseSyncCallback(addWorkoutToFirestore)
      setBjjClassLogSyncCallback(addBjjClassLogToFirestore)
      setCalisthenicsLogSyncCallback(addCalisthenicsLogToFirestore)
      setRunningLogSyncCallback(addRunningLogToFirestore)
      setHealthMetricsSyncCallback(addHealthMetricsToFirestore)
      setBodyMeasurementSyncCallback(addBodyMeasurementToFirestore)
      setHoldLogSyncCallback(addHoldLogToFirestore)
      setWeightLogSyncCallback(addWeightLogToFirestore)
    } else {
      setFirebaseSyncCallback(null)
      setBjjClassLogSyncCallback(null)
      setCalisthenicsLogSyncCallback(null)
      setRunningLogSyncCallback(null)
      setHealthMetricsSyncCallback(null)
      setBodyMeasurementSyncCallback(null)
      setHoldLogSyncCallback(null)
      setWeightLogSyncCallback(null)
    }
  }, [user, addWorkoutToFirestore, addBjjClassLogToFirestore, addCalisthenicsLogToFirestore, addRunningLogToFirestore, addHealthMetricsToFirestore, addBodyMeasurementToFirestore, addHoldLogToFirestore, addWeightLogToFirestore])

  useEffect(() => {
    const root = document.documentElement
    if (preferences.darkMode) {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
  }, [preferences.darkMode])

  return (
    <HashRouter>
      <div className="min-h-screen bg-bg text-ink">
        <div
          className="mx-auto max-w-md px-4"
          style={{
            paddingTop: 'max(24px, env(safe-area-inset-top))',
            paddingBottom: 'calc(88px + env(safe-area-inset-bottom))'
          }}
        >
          {!isLoading && <ConflictWarning conflictDays={conflictDays} />}
          <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal" /></div>}>
            <Routes>
              <Route path="/" element={<Today />} />
              <Route path="/mobility" element={<MobilityPage />} />
              <Route path="/bjj" element={<Bjj />} />
              <Route path="/calisthenics" element={<CalisthenicsPage />} />
              <Route path="/recovery" element={<Recovery />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/hiit" element={<HiitPage />} />
              <Route path="/running" element={<RunningPage />} />
              <Route path="/skills" element={<SkillsPage />} />
            </Routes>
          </Suspense>
        </div>
        <BottomNav />
      </div>
    </HashRouter>
  )
}

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

  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}
