import { NavLink } from 'react-router-dom'

const items = [
  {
    to: '/',
    label: 'Accueil',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-emerald-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
      </svg>
    )
  },
  {
    to: '/debts',
    label: 'Dettes',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-emerald-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
    )
  },
  {
    to: '/add',
    label: 'Ajouter',
    icon: (_: boolean) => (
      <div className="w-12 h-12 -mt-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
        </svg>
      </div>
    )
  },
  {
    to: '/treasury',
    label: 'Compte',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-emerald-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
      </svg>
    )
  },
  {
    to: '/profile',
    label: 'Profil',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-emerald-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
      </svg>
    )
  },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-area-pb">
      <div className="max-w-md mx-auto flex items-end justify-around px-2 h-16">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className="flex flex-col items-center gap-0.5 py-2 px-3"
          >
            {({ isActive }) => (
              <>
                {item.icon(isActive)}
                <span className={`text-xs ${isActive ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
