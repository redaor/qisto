import { useEffect } from 'react'
import type { Debt, Currency } from '@/types'
import { useDebtStore } from '@/store/useDebtStore'
import { formatCurrency, formatDate, formatShortDate, getInitials, calcRepaymentDuration } from '@/lib/formatters'

interface Props {
  debt: Debt
  currency: Currency
  onClose: () => void
}

const STRATEGY_LABELS: Record<string, string> = {
  avalanche: '🌊 Avalanche',
  snowball:  '⛄ Boule de neige',
  equal:     '⚖️ Défaut',
}

export function ArchivedDebtModal({ debt, currency, onClose }: Props) {
  const { payments, fetchPayments, strategy } = useDebtStore()
  const debtPayments = payments[debt.id] ?? []

  useEffect(() => {
    fetchPayments(debt.id)
  }, [debt.id])

  const isPaid    = debt.status === 'paid'
  const startDate = debt.start_date ?? debt.created_at
  const endDate   = debt.paid_at ?? debt.created_at
  const duration  = isPaid ? calcRepaymentDuration(startDate, endDate) : null
  const totalPaid = debt.total_amount - debt.remaining_amount

  // Première et dernière date de paiement
  const sortedPayments = [...debtPayments].sort(
    (a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime()
  )
  const firstPayment = sortedPayments[0]
  const lastPayment  = sortedPayments[sortedPayments.length - 1]

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className={`px-5 pt-5 pb-4 ${isPaid ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-gray-500 to-gray-600'}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                {getInitials(debt.contact_name)}
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-tight">{debt.contact_name}</p>
                <span className="inline-flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full mt-1">
                  {isPaid ? '🏆 Soldée' : 'Archivée'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Montant principal */}
          <p className="text-white/70 text-xs mb-0.5">Total remboursé</p>
          <p className="text-white font-bold text-3xl">{formatCurrency(totalPaid, currency)}</p>

          {debt.paid_at && (
            <p className="text-white/70 text-xs mt-1">Le {formatDate(debt.paid_at)}</p>
          )}
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Durée */}
          {isPaid && duration && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">⏱</span>
              <div>
                <p className="text-xs text-amber-600 uppercase tracking-wide font-semibold">Durée de remboursement</p>
                <p className="text-amber-800 font-bold text-sm">Réglé en {duration}</p>
              </div>
            </div>
          )}

          {/* Comparaison montants */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Dette initiale</p>
              <p className="font-bold text-gray-800">{formatCurrency(debt.total_amount, currency)}</p>
            </div>
            <div className="bg-emerald-50 rounded-2xl px-4 py-3">
              <p className="text-[10px] text-emerald-600 uppercase tracking-wide mb-1">Remboursé</p>
              <p className="font-bold text-emerald-700">{formatCurrency(totalPaid, currency)}</p>
            </div>
            {debt.interest_rate > 0 && (
              <div className="bg-orange-50 rounded-2xl px-4 py-3">
                <p className="text-[10px] text-orange-500 uppercase tracking-wide mb-1">Taux APR</p>
                <p className="font-bold text-orange-700">{debt.interest_rate}%</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Stratégie</p>
              <p className="font-bold text-gray-700 text-xs">{STRATEGY_LABELS[strategy] ?? '⚖️ Défaut'}</p>
            </div>
          </div>

          {/* Résumé paiements */}
          {debtPayments.length > 0 && firstPayment && lastPayment && (
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Résumé</p>
              <p className="text-sm text-gray-700">
                <span className="font-bold">{debtPayments.length}</span> paiement{debtPayments.length > 1 ? 's' : ''} effectué{debtPayments.length > 1 ? 's' : ''}
              </p>
              {debtPayments.length > 1 ? (
                <p className="text-xs text-gray-400 mt-0.5">
                  Du {formatShortDate(firstPayment.paid_at)} au {formatShortDate(lastPayment.paid_at)}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5">
                  Le {formatDate(firstPayment.paid_at)}
                </p>
              )}
            </div>
          )}

          {/* Frise chronologique */}
          {debtPayments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Historique</p>
              <div className="space-y-0">
                {sortedPayments.map((payment, index) => (
                  <div key={payment.id} className="relative flex gap-3">
                    {index < sortedPayments.length - 1 && (
                      <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-emerald-100" />
                    )}
                    <div className="relative z-10 w-8 h-8 mt-0.5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(payment.amount, currency)}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(payment.paid_at)}</p>
                      </div>
                      {payment.note && (
                        <p className="text-xs text-gray-500 mt-0.5">{payment.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {debtPayments.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-4">Aucun historique de paiement</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
