import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Today', icon: '☀️' },
  { to: '/mobility', label: 'Mobility', icon: '🧘' },
  { to: '/progress?tab=bjj', label: 'BJJ', icon: '🥋' },
  { to: '/progress?tab=calisthenics', label: 'Calisthenics', icon: '💪' },
  { to: '/recovery', label: 'Recovery', icon: '🪻' },
  { to: '/progress', label: 'Progress', icon: '📈' },
  { to: '/profile', label: 'Profile', icon: '⚙️' }
]

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex w-full justify-center">
        <div className="flex gap-2 px-3 py-2">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
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
