import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, getInitials } from '@/lib/formatters'
import { DebtProgressBar } from '@/components/debt/DebtProgressBar'
import type { Debt } from '@/types'

export function SharedDebt() {
  const { token } = useParams<{ token: string }>()
  const [debt, setDebt]       = useState<Debt | null>(null)
  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!token) return
    ;(async () => {
      const { data: link } = await supabase
        .from('shared_links')
        .select('*, debts(*)')
        .eq('token', token)
        .single()

      setLoading(false)

      if (!link) { setExpired(true); return }
      if (new Date(link.expires_at) < new Date()) { setExpired(true); return }

      setDebt(link.debts as Debt)
    })()
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    )
  }

  if (expired || !debt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Lien expiré</h1>
        <p className="text-gray-400 text-sm">Ce lien de partage n'est plus valide.</p>
      </div>
    )
  }

  const paid = debt.total_amount - debt.remaining_amount
  const currency = 'EUR'

  return (
    <div className="max-w-md mx-auto px-4 py-10 space-y-5">
      <div className="text-center mb-6">
        <div className="text-3xl font-bold text-gray-900">Qisto</div>
        <p className="text-gray-400 text-sm mt-1">Suivi de dette partagé</p>
      </div>

      <div className={`rounded-3xl p-5 text-white ${debt.type === 'owed_to_me' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
            {getInitials(debt.contact_name)}
          </div>
          <div>
            <h2 className="text-xl font-bold">{debt.contact_name}</h2>
            <p className="text-white/70 text-sm mt-0.5">
              {debt.type === 'owed_to_me' ? 'Doit rembourser' : 'À rembourser'}
            </p>
          </div>
        </div>

        <p className="text-white/70 text-sm mb-1">Montant restant</p>
        <p className="text-4xl font-bold">{formatCurrency(debt.remaining_amount, currency)}</p>

        <div className="mt-4 bg-white/10 rounded-2xl p-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-white/60 text-xs">Total initial</p>
            <p className="font-semibold">{formatCurrency(debt.total_amount, currency)}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Déjà remboursé</p>
            <p className="font-semibold">{formatCurrency(paid, currency)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <DebtProgressBar total={debt.total_amount} remaining={debt.remaining_amount} />
        {debt.due_date && (
          <p className="text-xs text-gray-400 mt-3">Échéance : {formatDate(debt.due_date)}</p>
        )}
        {debt.description && (
          <p className="text-sm text-gray-500 mt-2">{debt.description}</p>
        )}
      </div>

      <p className="text-center text-xs text-gray-300">Partagé via Qisto · Vue lecture seule</p>
    </div>
  )
}
