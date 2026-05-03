import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebtStore } from '@/store/useDebtStore'
import { calcWhatIfSequential, calcTotals } from '@/lib/calculations'
import { formatCurrency } from '@/lib/formatters'

export function WhatIf() {
  const navigate = useNavigate()
  const { debts, profile, fetchDebts, fetchProfile } = useDebtStore()
  const [extra, setExtra] = useState(100)

  useEffect(() => { fetchDebts(); fetchProfile() }, [])

  const currency   = profile?.currency ?? 'EUR'
  const iOweDebts  = debts.filter(d => d.type === 'i_owe' && d.remaining_amount > 0)
  const { iOwe: totalDebt } = calcTotals(debts)

  const sim = calcWhatIfSequential(iOweDebts, extra)

  return (
    <div className="px-4 py-6 space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-xl font-bold">Et si je payais plus ?</h1>
      </div>

      {/* Slider */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-sm font-medium text-gray-700 mb-1">Paiement supplémentaire mensuel</p>
        <p className="text-xs text-gray-400 mb-4">En plus de vos paiements minimums</p>
        <input
          type="range"
          min={0}
          max={2000}
          step={10}
          value={extra}
          onChange={e => setExtra(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1 mb-3">
          <span>0</span>
          <span className="font-semibold text-emerald-600 text-base">{formatCurrency(extra, currency)}/mois</span>
          <span>2 000</span>
        </div>
      </div>

      {iOweDebts.length === 0 ? (
        <div className="bg-emerald-50 rounded-2xl p-6 text-center">
          <p className="font-semibold text-emerald-700">Aucune dette à rembourser !</p>
        </div>
      ) : (
        <>
          {/* Résumé global */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-2xl p-4">
              <p className="text-xs text-emerald-600 mb-1">Remboursé en</p>
              <p className="text-2xl font-bold text-emerald-700">{sim.totalMonths} mois</p>
              {sim.items.length > 0 && (
                <p className="text-[10px] text-emerald-500 mt-1">
                  Fin : {sim.items.reduce((latest, i) =>
                    i.months > latest.months ? i : latest
                  ).endDate}
                </p>
              )}
            </div>
            <div className="bg-orange-50 rounded-2xl p-4">
              <p className="text-xs text-orange-600 mb-1">Intérêts estimés</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(sim.totalInterest, currency)}</p>
            </div>
          </div>

          {/* Détail par dette — cohérent avec le résumé */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-1">
              Détail par dette
              <span className="ml-2 text-xs font-normal text-gray-400">
                ({formatCurrency(totalDebt, currency)} total)
              </span>
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Stratégie séquentielle — chaque dette soldée libère son minimum pour la suivante
            </p>
            <div className="space-y-3">
              {sim.items
                .slice()
                .sort((a, b) => a.months - b.months)
                .map((item, i) => {
                  const isLast = i === sim.items.length - 1
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between py-2.5 px-3 rounded-xl ${
                        isLast ? 'bg-emerald-50 border border-emerald-100' : 'border-b border-gray-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                            isLast ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {i + 1}
                          </span>
                          <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                        </div>
                        <p className="text-xs text-gray-400 ml-7">Fin : {item.endDate}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 text-sm">{item.months} mois</p>
                        {item.totalInterest > 0 && (
                          <p className="text-xs text-orange-500">+{formatCurrency(item.totalInterest, currency)}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>

            {/* Contrôle de cohérence visuel */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Dernière dette soldée</span>
              <span className="font-semibold text-emerald-600">
                {sim.items.length > 0
                  ? sim.items.reduce((l, i) => i.months > l.months ? i : l).endDate
                  : '—'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
