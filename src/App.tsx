import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { BottomNav } from '@/components/layout/BottomNav'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Dashboard }  from '@/pages/Dashboard'
import { Debts }      from '@/pages/Debts'
import { AddDebt }    from '@/pages/AddDebt'
import { DebtDetail } from '@/pages/DebtDetail'
import { Profile }    from '@/pages/Profile'
import { Login }      from '@/pages/Login'
import { Register }   from '@/pages/Register'

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto pb-20 min-h-screen">
      {children}
      <BottomNav />
    </div>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner />

  if (!user) {
    return (
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*"         element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <ProtectedLayout>
      <Routes>
        <Route path="/"          element={<Dashboard />} />
        <Route path="/debts"     element={<Debts />} />
        <Route path="/debts/:id" element={<DebtDetail />} />
        <Route path="/add"       element={<AddDebt />} />
        <Route path="/profile"   element={<Profile />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </ProtectedLayout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
