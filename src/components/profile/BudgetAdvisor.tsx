import { useState, useRef } from 'react'
import { analyzeBudget } from '@/lib/budgetAdvisor'
import type { RawTransaction } from '@/lib/pdfParser'
import type { Currency } from '@/types'
import { formatCurrency } from '@/lib/formatters'

interface Props {
  rawTransactions: RawTransaction[]
  income: number
  fixedCharges: number
  totalDebt: number
  monthlyDebt: number
  currency: Currency
  compact?: boolean
}

const CATEGORY_COLORS = {
  fixed:        { bg: 'bg-red-50',    text: 'text-red-600',    badge: 'bg-red-100 text-red-600',    dot: 'bg-red-400',    label: 'Fixe' },
  subscription: { bg: 'bg-amber-50',  text: 'text-amber-600',  badge: 'bg-amber-100 text-amber-600', dot: 'bg-amber-400',  label: 'Abonnement' },
  income:       { bg: 'bg-emerald-50', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-600', dot: 'bg-emerald-400', label: 'Revenu' },
  variable:     { bg: 'bg-gray-50',   text: 'text-gray-600',   badge: 'bg-gray-100 text-gray-500',  dot: 'bg-gray-300',   label: 'Variable' },
}

export function BudgetAdvisor({ rawTransactions, income, fixedCharges, totalDebt, monthlyDebt, currency, compact = false }: Props) {
  const [loyer, setLoyer]               = useState('')
  const [autres, setAutres]             = useState('')
  const [showTxs, setShowTxs]           = useState(false)
  const [expanded, setExpanded]         = useState(true)
  const [committedLoyer, setCommLoyer]  = useState(0)
  const [committedAutres, setCommAutres]= useState(0)
  const [pulse, setPulse]               = useState(false)
  const capacityRef                     = useRef<HTMLDivElement>(null)

  const handleRecalculate = () => {
    setCommLoyer(parseFloat(loyer) || 0)
    setCommAutres(parseFloat(autres) || 0)
    setPulse(true)
    setTimeout(() => setPulse(false), 600)
    capacityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const hiddenExpenses = committedLoyer + committedAutres
  const advice = analyzeBudget(income, fixedCharges, totalDebt, monthlyDebt, rawTransactions, hiddenExpenses)

  const pendingHidden = (parseFloat(loyer) || 0) + (parseFloat(autres) || 0)
  const hasPendingChange = pendingHidden !== hiddenExpenses

  const subGroups = advice.categorized
    .filter(c => c.category === 'subscription')
    .reduce<Record<string, number>>((acc, c) => {
      acc[c.subcategory] = (acc[c.subcategory] ?? 0) + Math.abs(c.tx.amount)
      return acc
    }, {})

  return (
    <div className="bg-white border border-indigo-100 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-white text-base">🧠</span>
          <div className="text-left">
            <p className="text-white font-semibold text-sm">Analyseur Budgétaire</p>
            <p className="text-white/70 text-xs">
              {advice.categorized.length} transactions analysées
            </p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-white/70 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {expanded && (
        <div className="p-4 space-y-4">

          {/* Alertes */}
          {(advice.subscriptionAlert || advice.capacityAlert) && (
            <div className="space-y-2">
              {advice.subscriptionAlert && (
                <div className="flex items-start gap-2 bg-amber-50 rounded-xl px-3 py-2.5">
                  <span className="text-amber-500 mt-0.5">⚠️</span>
                  <p className="text-xs text-amber-700 flex-1">
                    <strong>Abonnements élevés</strong> — {Math.round(advice.subscriptionRatio * 100)}% de vos revenus
                    ({formatCurrency(advice.subscriptionTotal, currency)}/mois)
                  </p>
                </div>
              )}
              {advice.capacityAlert && (
                <div className="flex items-start gap-2 bg-red-50 rounded-xl px-3 py-2.5">
                  <span className="text-red-500 mt-0.5">🚨</span>
                  <p className="text-xs text-red-700 flex-1">
                    <strong>Capacité insuffisante</strong> — remboursement dette ({formatCurrency(advice.monthlyDebt, currency)}) supérieur à votre capacité réelle ({formatCurrency(advice.realCapacity, currency)})
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Capacité réelle */}
          <div ref={capacityRef} className={`grid grid-cols-2 gap-2 transition-all duration-300 ${pulse ? 'scale-[1.02]' : 'scale-100'}`}>
            <div className="bg-indigo-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-indigo-500 uppercase tracking-wide font-semibold mb-1">Revenus</p>
              <p className="text-lg font-bold text-indigo-700">{formatCurrency(advice.income, currency)}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${advice.realCapacity > 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <p className="text-[10px] uppercase tracking-wide font-semibold mb-1 text-gray-500">Capacité réelle</p>
              <p className={`text-lg font-bold ${advice.realCapacity > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {formatCurrency(advice.realCapacity, currency)}
              </p>
            </div>
          </div>

          {/* Conseils (toujours visibles) */}
          {advice.suggestions.length > 0 && (
            <div className="space-y-2">
              {advice.suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2 bg-indigo-50 rounded-xl px-3 py-2.5">
                  <span className="text-indigo-400 mt-0.5 flex-shrink-0">💡</span>
                  <p className="text-xs text-indigo-800">{s}</p>
                </div>
              ))}
              {advice.monthsSaved > 0 && (
                <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-3 py-2.5">
                  <span className="text-emerald-500 flex-shrink-0">🚀</span>
                  <p className="text-xs text-emerald-800 font-semibold">
                    En réduisant vos abonnements, vous pourriez solder vos dettes <strong>{advice.monthsSaved} mois plus tôt</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Sections détail — masquées en mode compact */}
          {!compact && (
            <>
              {/* Décomposition */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Décomposition</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Revenus</span>
                    <span className="font-semibold text-emerald-600">+{formatCurrency(advice.income, currency)}</span>
                  </div>
                  {advice.fixedCharges > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Charges fixes</span>
                      <span className="font-semibold text-red-500">−{formatCurrency(advice.fixedCharges, currency)}</span>
                    </div>
                  )}
                  {advice.subscriptionTotal > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Abonnements détectés</span>
                      <span className={`font-semibold ${advice.subscriptionAlert ? 'text-amber-500' : 'text-red-500'}`}>
                        −{formatCurrency(advice.subscriptionTotal, currency)}
                      </span>
                    </div>
                  )}
                  {advice.hiddenExpenses > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Dépenses invisibles</span>
                      <span className="font-semibold text-red-500">−{formatCurrency(advice.hiddenExpenses, currency)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-1.5 flex justify-between font-semibold">
                    <span className="text-gray-700">Capacité réelle</span>
                    <span className={advice.realCapacity >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {formatCurrency(advice.realCapacity, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Abonnements détaillés */}
              {Object.keys(subGroups).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Abonnements détectés</p>
                  <div className="space-y-1">
                    {Object.entries(subGroups).sort((a, b) => b[1] - a[1]).map(([label, amount]) => (
                      <div key={label} className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                          <span className="text-xs text-amber-800">{label}</span>
                        </div>
                        <span className="text-xs font-semibold text-amber-700">
                          −{formatCurrency(amount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dépenses invisibles */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dépenses non tracées</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Loyer / Logement</label>
                    <input
                      type="number"
                      value={loyer}
                      onChange={e => setLoyer(e.target.value)}
                      placeholder="0"
                      min={0}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Nourriture / Transport</label>
                    <input
                      type="number"
                      value={autres}
                      onChange={e => setAutres(e.target.value)}
                      placeholder="0"
                      min={0}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-indigo-300"
                    />
                  </div>
                </div>
                <button
                  onClick={handleRecalculate}
                  className={`w-full py-2 rounded-xl text-sm font-semibold transition-all ${
                    hasPendingChange
                      ? 'bg-indigo-500 text-white hover:bg-indigo-600 active:scale-[0.98]'
                      : 'bg-indigo-100 text-indigo-400 cursor-default'
                  }`}
                >
                  {hasPendingChange ? '↻ Recalculer ma capacité' : '✓ Capacité à jour'}
                </button>
              </div>

              {/* Liste transactions catégorisées */}
              <button
                onClick={() => setShowTxs(v => !v)}
                className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-gray-600 py-1"
              >
                <span>Voir le détail des catégories</span>
                <svg className={`w-3.5 h-3.5 transition-transform ${showTxs ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              {showTxs && (
                <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
                  {advice.categorized.map((c, i) => {
                    const col = CATEGORY_COLORS[c.category]
                    return (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${col.dot}`} />
                        <span className="text-gray-400 w-16 flex-shrink-0">
                          {c.tx.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        </span>
                        <span className="text-gray-600 flex-1 truncate">{c.tx.label || '—'}</span>
                        <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${col.badge}`}>
                          {col.label}
                        </span>
                        <span className={`font-semibold flex-shrink-0 ${c.tx.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {c.tx.amount >= 0 ? '+' : ''}{c.tx.amount.toFixed(2)}€
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

        </div>
      )}
    </div>
  )
}
