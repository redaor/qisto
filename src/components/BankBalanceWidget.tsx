import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAccounts, getTransactions, matchTransactionsWithDebts } from '@/services/bridgeService'
import { formatCurrency } from '@/lib/formatters'
import type { BridgeAccount, SyncSuggestion } from '@/services/bridgeService'
import type { Debt } from '@/types'
import type { Currency } from '@/types'

interface Props {
  userId: string
  debts: Debt[]
  currency: Currency
}

export function BankBalanceWidget({ userId, debts, currency }: Props) {
  const navigate = useNavigate()
  const [accounts, setAccounts]     = useState<BridgeAccount[]>([])
  const [suggestions, setSuggestions] = useState<SyncSuggestion[]>([])
  const [syncing, setSyncing]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [synced, setSynced]         = useState(false)

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)
  const totalDebt    = debts.filter(d => d.type === 'i_owe').reduce((s, d) => s + d.remaining_amount, 0)
  const netEstimate  = totalBalance - totalDebt

  async function handleSync() {
    setSyncing(true)
    setError(null)
    try {
      const accs = await getAccounts(userId)
      setAccounts(accs)

      // Chercher les transactions sur le premier compte courant ou le premier compte
      const mainAccount = accs.find(a => a.type === 'checking') ?? accs[0]
      if (mainAccount) {
        const txs   = await getTransactions(userId, mainAccount.id)
        const found = matchTransactionsWithDebts(txs, debts)
        setSuggestions(found)
      }
      setSynced(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de synchronisation')
    } finally {
      setSyncing(false)
    }
  }

  if (!synced) {
    return (
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
            </div>
            <p className="font-semibold text-sm">Banque connectée</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors
                       rounded-xl px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {syncing ? (
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            )}
            {syncing ? 'Synchro…' : 'Synchroniser'}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-200 bg-red-500/20 rounded-lg px-3 py-2">{error}</p>
        )}

        <p className="text-indigo-200 text-xs">Synchronisez pour voir votre solde en temps réel</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Solde + Net */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
            </div>
            <p className="font-semibold text-sm">Solde bancaire</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-white/20 hover:bg-white/30 transition-colors rounded-xl p-1.5 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>

        <p className="text-3xl font-bold">{formatCurrency(totalBalance, currency)}</p>
        <p className="text-indigo-200 text-xs mt-1">{accounts.length} compte{accounts.length > 1 ? 's' : ''}</p>

        <div className="mt-4 pt-3 border-t border-white/20 grid grid-cols-2 gap-3">
          <div>
            <p className="text-indigo-200 text-xs">Dette restante</p>
            <p className="font-semibold text-sm">{formatCurrency(totalDebt, currency)}</p>
          </div>
          <div className="text-right">
            <p className="text-indigo-200 text-xs">Net estimé</p>
            <p className={`font-semibold text-sm ${netEstimate >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
              {netEstimate >= 0 ? '+' : ''}{formatCurrency(netEstimate, currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Comptes détail */}
      {accounts.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <p className="px-4 pt-3 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Comptes</p>
          {accounts.map((acc, i) => (
            <div
              key={acc.id}
              className={`flex items-center justify-between px-4 py-3 ${
                i < accounts.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{acc.name}</p>
                {acc.iban && <p className="text-xs text-gray-400">{acc.iban.slice(-8)}</p>}
              </div>
              <p className={`text-sm font-semibold ${acc.balance >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
                {formatCurrency(acc.balance, currency)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions de paiements détectés */}
      {suggestions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">💡</span>
            <p className="text-sm font-semibold text-amber-800">
              {suggestions.length} remboursement{suggestions.length > 1 ? 's' : ''} détecté{suggestions.length > 1 ? 's' : ''}
            </p>
          </div>
          {suggestions.slice(0, 3).map((s, i) => (
            <div key={i} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-amber-100">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{s.debt.contact_name}</p>
                <p className="text-[11px] text-gray-400 truncate">{s.transaction.description}</p>
              </div>
              <div className="text-right ml-3 flex-shrink-0">
                <p className="text-xs font-bold text-emerald-600">+{formatCurrency(s.transaction.amount, currency)}</p>
                <p className="text-[10px] text-gray-400">{Math.round(s.confidence * 100)}% sûr</p>
              </div>
            </div>
          ))}
          <button
            onClick={() => navigate('/bank/connect')}
            className="w-full text-xs text-amber-700 font-medium py-1.5 hover:text-amber-900 transition-colors"
          >
            Gérer les suggestions →
          </button>
        </div>
      )}
    </div>
  )
}
