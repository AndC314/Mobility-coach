import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Today from './pages/Today'
import Mobility from './pages/Mobility'
import Recovery from './pages/Recovery'
import Progress from './pages/Progress'
import Profile from './pages/Profile'
import { usePreferences } from './hooks/usePreferences'
import { useAuth } from './hooks/useAuth'
import { useFirebaseSync } from './hooks/useFirebaseSync'
import { ConflictWarning } from './components/ConflictWarning'
import { LoginScreen } from './components/LoginScreen'

function AppContent() {
  const { preferences } = usePreferences()
  const { user } = useAuth()
  const { conflictDays, isLoading } = useFirebaseSync(user)

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
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/mobility" element={<Mobility />} />
            <Route path="/recovery" element={<Recovery />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
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

  return <AppContent />
}
