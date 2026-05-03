import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { initBridgeUser, getConnectUrl } from '@/services/bridgeService'
import { formatDate } from '@/lib/formatters'

interface BridgeConnection {
  connected_bank_name: string | null
  connected_at: string
  last_sync_at: string | null
}

export function BankConnect() {
  const { user } = useAuth()
  const [connection, setConnection] = useState<BridgeConnection | null>(null)
  const [loading, setLoading]       = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('bridge_connections')
      .select('connected_bank_name, connected_at, last_sync_at')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setConnection(data)
        setLoading(false)
      })
  }, [user])

  async function handleConnect() {
    if (!user) return
    setConnecting(true)
    setError(null)
    try {
      await initBridgeUser(user.id, user.email!)
      const url = await getConnectUrl(user.id)
      window.location.href = url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de connexion bancaire')
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    if (!user) return
    setLoading(true)
    await supabase.from('bridge_connections').delete().eq('user_id', user.id)
    setConnection(null)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full pb-24">
        <div className="px-4 pt-6 pb-4 bg-white sticky top-0 z-10 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Ma Banque</h1>
        </div>
        <div className="flex items-center justify-center flex-1">
          <svg className="animate-spin w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full pb-24">
      <div className="px-4 pt-6 pb-4 bg-white sticky top-0 z-10 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Ma Banque</h1>
        <p className="text-xs text-gray-400 mt-0.5">Synchronisation Open Banking</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex gap-2 items-start">
            <span className="text-red-500 flex-shrink-0">⚠️</span>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!connection ? (
          /* ── Pas encore connecté ── */
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">Connectez votre banque</h2>
              <p className="text-indigo-100 text-sm">
                Suivez vos remboursements en temps réel et détectez-les automatiquement grâce à l'Open Banking.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
              <h3 className="font-semibold text-gray-900 text-sm">Ce que vous obtenez</h3>
              {[
                ['Solde bancaire réel', 'Votre solde exact mis à jour'],
                ['Détection automatique', 'Les remboursements reçus sont détectés'],
                ['Sécurité totale', 'Connexion read-only via Bridge API (certifié DSP2)'],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{title}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl
                         bg-indigo-600 text-white text-sm font-semibold shadow-sm
                         hover:bg-indigo-700 active:scale-95 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Connexion en cours…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  Connecter ma banque
                </>
              )}
            </button>
          </div>
        ) : (
          /* ── Banque connectée ── */
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {connection.connected_bank_name ?? 'Banque connectée'}
                  </p>
                  <p className="text-xs text-emerald-600 font-medium">✓ Connexion active</p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-500 border-t border-gray-100 pt-3">
                <div className="flex justify-between">
                  <span>Connectée le</span>
                  <span className="font-medium text-gray-700">{formatDate(connection.connected_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dernière synchro</span>
                  <span className="font-medium text-gray-700">
                    {connection.last_sync_at ? formatDate(connection.last_sync_at) : 'Jamais'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl
                         border-2 border-indigo-200 text-indigo-600 text-sm font-medium
                         hover:bg-indigo-50 transition-all disabled:opacity-50"
            >
              {connecting ? 'Synchronisation…' : 'Synchroniser maintenant'}
            </button>

            <button
              onClick={handleDisconnect}
              className="w-full text-sm text-red-400 hover:text-red-600 py-2 transition-colors"
            >
              Déconnecter ma banque
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
