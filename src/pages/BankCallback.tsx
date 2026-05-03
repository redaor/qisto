import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { getAccounts } from '@/services/bridgeService'

export function BankCallback() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!user) return

    const itemId = searchParams.get('item_id')
    if (!itemId) {
      setStatus('error')
      setMessage('Paramètre item_id manquant')
      return
    }

    async function finalize() {
      try {
        // Récupérer les comptes pour obtenir le nom de la banque
        const accounts = await getAccounts(user!.id)
        const bankName = accounts[0]?.name
          ? accounts[0].name.split(' ')[0]   // "Boursorama Banque" → "Boursorama"
          : null

        // Sauvegarder le item_id et le nom de la banque dans bridge_connections
        await supabase
          .from('bridge_connections')
          .update({
            bridge_item_id:      itemId,
            connected_bank_name: bankName,
            connected_at:        new Date().toISOString(),
          })
          .eq('user_id', user!.id)

        setStatus('success')
        setMessage(bankName ? `${bankName} connectée avec succès` : 'Banque connectée avec succès')

        setTimeout(() => navigate('/treasury'), 2000)
      } catch (e) {
        setStatus('error')
        setMessage(e instanceof Error ? e.message : 'Erreur lors de la finalisation')
      }
    }

    finalize()
  }, [user, searchParams, navigate])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
      {status === 'loading' && (
        <div className="flex flex-col items-center gap-4 text-center">
          <svg className="animate-spin w-10 h-10 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className="text-gray-600 font-medium">Finalisation de la connexion…</p>
          <p className="text-sm text-gray-400">Récupération de vos informations bancaires</p>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{message}</p>
            <p className="text-sm text-gray-400 mt-1">Redirection en cours…</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">Connexion échouée</p>
            <p className="text-sm text-red-500 mt-1">{message}</p>
          </div>
          <button
            onClick={() => navigate('/bank/connect')}
            className="mt-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium"
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  )
}
