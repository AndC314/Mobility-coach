import { NavLink } from 'react-router-dom'
import { usePreferences } from '../hooks/usePreferences'

interface TabDef {
  to: string
  label: string
  icon: string
  sport?: string
}

const TABS: TabDef[] = [
  { to: '/', label: 'Today', icon: '☀️' },
  { to: '/mobility', label: 'Mobility', icon: '🧘', sport: 'mobility' },
  { to: '/bjj', label: 'BJJ', icon: '🥋', sport: 'bjj' },
  { to: '/calisthenics', label: 'Calisthenics', icon: '💪', sport: 'calisthenics' },
  { to: '/running', label: 'Running', icon: '🏃', sport: 'running' },
  { to: '/hiit', label: 'Challenges', icon: '🔥', sport: 'elite_forces' },
  { to: '/health', label: 'Health', icon: '❤️' },
  { to: '/recovery', label: 'Recovery', icon: '🪻' },
  { to: '/progress', label: 'Progress', icon: '📈' },
  { to: '/profile', label: 'Profile', icon: '⚙️' },
]

export default function BottomNav() {
  const { preferences } = usePreferences()
  const activeSports = preferences.activeSports ?? ['mobility', 'bjj', 'calisthenics', 'running', 'elite_forces']

  const visibleTabs = TABS.filter(tab => !tab.sport || activeSports.includes(tab.sport))

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex gap-1 px-2 py-2 mx-auto">
          {visibleTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors shrink-0 ${
                  isActive ? 'text-accent bg-accent/10' : 'text-muted'
                }`
              }
            >
              <span className="text-2xl leading-none">{tab.icon}</span>
              <span className="text-[11px]">{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
