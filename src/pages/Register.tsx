import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-600">Qisto</h1>
          <p className="text-gray-500 mt-1 text-sm">Gérez vos dettes, restez en contrôle</p>
        </div>

        <form onSubmit={handleRegister} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-semibold text-lg text-gray-900">Créer un compte</h2>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Input
            label="Mot de passe"
            type="password"
            placeholder="Au moins 6 caractères"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <Button type="submit" loading={loading} className="w-full mt-2">
            Créer mon compte
          </Button>

          <p className="text-center text-sm text-gray-500">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-emerald-600 font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
