import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDebtStore } from '@/store/useDebtStore'
import { DebtCard } from '@/components/debt/DebtCard'
import { PersonGroupCard } from '@/components/debt/PersonGroupCard'
import { StrategySelector } from '@/components/debt/StrategySelector'
import { PaymentModal } from '@/components/debt/PaymentModal'
import { ArchivedDebtCard } from '@/components/debt/ArchivedDebtCard'
import { ArchivedDebtModal } from '@/components/debt/ArchivedDebtModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { sortDebtsByStrategy, groupDebtsByPerson, distributeAmount } from '@/lib/calculations'
import { formatCurrency } from '@/lib/formatters'
import type { Debt, DebtType } from '@/types'

type Filter   = 'all' | DebtType | 'archived'
type ViewMode = 'list' | 'group'

export function Debts() {
  const {
    debts, archivedDebts, loading,
    fetchDebts, fetchArchivedDebts, fetchProfile,
    profile, strategy, setStrategy,
  } = useDebtStore()

  const [filter, setFilter]       = useState<Filter>('all')
  const [viewMode, setViewMode]   = useState<ViewMode>('list')
  const [payingDebtId, setPayingDebtId]       = useState<string | null>(null)
  const [selectedArchived, setSelectedArchived] = useState<Debt | null>(null)

  // Répartiteur Intelligent
  const [showDistrib, setShowDistrib]   = useState(false)
  const [distribAmount, setDistribAmount] = useState('')
  const [distribResult, setDistribResult] = useState<ReturnType<typeof distributeAmount> | null>(null)

  useEffect(() => { fetchDebts(); fetchProfile() }, [])

  useEffect(() => {
    if (filter === 'archived') fetchArchivedDebts()
  }, [filter])

  const currency   = profile?.currency ?? 'EUR'
  const hasInterest = debts.some(d => (d.interest_rate ?? 0) > 0)

  const activeFiltered = filter === 'all'
    ? debts
    : filter === 'archived'
      ? []
      : debts.filter(d => d.type === filter)

  const sorted = sortDebtsByStrategy(activeFiltered, strategy)
  const groups = groupDebtsByPerson(activeFiltered)

  const payingDebt = payingDebtId ? debts.find(d => d.id === payingDebtId) : null

  const tabs: { value: Filter; label: string }[] = [
    { value: 'all',        label: 'Toutes' },
    { value: 'owed_to_me', label: 'On me doit' },
    { value: 'i_owe',      label: 'Je dois' },
    { value: 'archived',   label: 'Archivées' },
  ]

  const handleDistrib = () => {
    const amount = parseFloat(distribAmount)
    if (!amount || amount <= 0) return
    const result = distributeAmount(debts, amount, strategy)
    setDistribResult(result)
  }

  const resetDistrib = () => {
    setDistribResult(null)
    setDistribAmount('')
  }

  return (
    <div className="px-4 py-6 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dettes</h1>
        <div className="flex items-center gap-2">
          {filter !== 'archived' && (
            <button
              onClick={() => setViewMode(v => v === 'list' ? 'group' : 'list')}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              title={viewMode === 'list' ? 'Vue groupée' : 'Vue liste'}
            >
              {viewMode === 'list' ? (
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                </svg>
              )}
            </button>
          )}
          <Link to="/add"><Button size="sm">+ Ajouter</Button></Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap px-2 ${
              filter === tab.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Archived tab */}
      {filter === 'archived' ? (
        loading ? <LoadingSpinner /> : archivedDebts.length === 0 ? (
          <EmptyState
            title="Aucune dette archivée"
            description="Les dettes soldées apparaîtront ici"
          />
        ) : (
          <>
            <div className="flex items-center gap-2 px-1">
              <span className="text-lg">🏆</span>
              <p className="text-sm font-semibold text-gray-700">
                {archivedDebts.filter(d => d.status === 'paid').length} dette{archivedDebts.filter(d => d.status === 'paid').length > 1 ? 's' : ''} soldée{archivedDebts.filter(d => d.status === 'paid').length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="space-y-3">
              {archivedDebts.map(debt => (
                <ArchivedDebtCard
                  key={debt.id}
                  debt={debt}
                  currency={currency}
                  onClick={() => setSelectedArchived(debt)}
                />
              ))}
            </div>
          </>
        )
      ) : (
        <>
          {viewMode === 'list' && (
            <StrategySelector value={strategy} onChange={setStrategy} hasInterest={hasInterest} />
          )}

          {/* Répartiteur Intelligent — visible uniquement sur "Je dois" ou "Toutes" */}
          {(filter === 'all' || filter === 'i_owe') && debts.some(d => d.type === 'i_owe') && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => { setShowDistrib(v => !v); resetDistrib() }}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Répartiteur intelligent</p>
                    <p className="text-xs text-gray-400">Distribuer une somme selon ta stratégie</p>
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${showDistrib ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              {showDistrib && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
                  {!distribResult ? (
                    <>
                      <Input
                        label="Montant à répartir"
                        type="number"
                        prefix="€"
                        placeholder="0"
                        min={0.01}
                        step={0.01}
                        value={distribAmount}
                        onChange={e => setDistribAmount(e.target.value)}
                      />
                      <p className="text-xs text-gray-400">
                        Stratégie active : <span className="font-medium text-gray-600 capitalize">{strategy}</span>
                      </p>
                      <Button
                        className="w-full"
                        disabled={!distribAmount || parseFloat(distribAmount) <= 0}
                        onClick={handleDistrib}
                      >
                        Calculer la répartition
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {distribResult.items.map(item => (
                          <div key={item.debt.id} className="flex items-center justify-between bg-emerald-50 rounded-xl px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{item.debt.contact_name}</p>
                              <p className="text-xs text-gray-400">
                                Reste : {formatCurrency(item.newRemaining, currency)}
                              </p>
                            </div>
                            <p className="font-bold text-emerald-600">
                              − {formatCurrency(item.allocated, currency)}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="bg-gray-50 rounded-xl px-3 py-2 flex items-center justify-between">
                        <p className="text-sm text-gray-500">Total restant après</p>
                        <p className="font-bold text-gray-800">{formatCurrency(distribResult.totalRemaining, currency)}</p>
                      </div>
                      <button
                        onClick={resetDistrib}
                        className="text-sm text-emerald-600 font-medium w-full text-center pt-1"
                      >
                        Nouvelle simulation
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {loading ? <LoadingSpinner /> : activeFiltered.length === 0 ? (
            <EmptyState
              title="Aucune dette ici"
              description="Ajoutez votre première dette pour commencer le suivi"
              action={<Link to="/add"><Button size="sm">Ajouter une dette</Button></Link>}
            />
          ) : viewMode === 'list' ? (
            <div className="space-y-3">
              {sorted.map(debt => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  currency={currency}
                  onPay={debt.type === 'i_owe' ? () => setPayingDebtId(debt.id) : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map(g => (
                <PersonGroupCard key={g.contact_name} group={g} currency={currency} />
              ))}
            </div>
          )}
        </>
      )}

      {payingDebt && (
        <PaymentModal
          debtId={payingDebt.id}
          remaining={payingDebt.remaining_amount}
          defaultAmount={payingDebt.min_payment > 0 ? payingDebt.min_payment : undefined}
          onClose={() => setPayingDebtId(null)}
        />
      )}

      {selectedArchived && (
        <ArchivedDebtModal
          debt={selectedArchived}
          currency={currency}
          onClose={() => setSelectedArchived(null)}
        />
      )}
    </div>
  )
}
