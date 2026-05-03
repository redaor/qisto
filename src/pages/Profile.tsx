import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebtStore } from '@/store/useDebtStore'
import { ScenarioCard } from '@/components/profile/ScenarioCard'
import { CsvImport } from '@/components/profile/CsvImport'
import { BudgetAdvisor } from '@/components/profile/BudgetAdvisor'
import { BankBalanceWidget } from '@/components/BankBalanceWidget'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DebtEvolutionChart } from '@/components/charts/DebtEvolutionChart'
import { calcScenarios, calcTotals, isDebtFreeTargetAchievable } from '@/lib/calculations'
import { formatCurrency } from '@/lib/formatters'
import { exportDebtsPDF } from '@/lib/exportPdf'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { Currency } from '@/types'
import type { PaymentScenario } from '@/types'
import type { RawTransaction } from '@/lib/pdfParser'

type Tab = 'dashboard' | 'bank' | 'simulation' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard',  label: 'Bilan',      icon: '🧠' },
  { id: 'bank',       label: 'Banque',     icon: '🏦' },
  { id: 'simulation', label: 'Simulation', icon: '📈' },
  { id: 'settings',   label: 'Réglages',   icon: '⚙️' },
]

const CURRENCIES: { value: Currency; label: string; flag: string }[] = [
  { value: 'EUR', label: 'Euro',   flag: '🇪🇺' },
  { value: 'DZD', label: 'Dinar',  flag: '🇩🇿' },
  { value: 'USD', label: 'Dollar', flag: '🇺🇸' },
]

const LS_TXS_KEY      = 'qisto_imported_txs'
const LS_SCENARIO_KEY = 'qisto_selected_scenario'

// RawTransaction dates are serialized as strings in JSON — restore them
function deserializeTxs(raw: string): RawTransaction[] {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((t: { date: string; label: string; amount: number }) => ({
      ...t,
      date: new Date(t.date),
    }))
  } catch {
    return []
  }
}

export function Profile() {
  const navigate = useNavigate()
  const { profile, fetchProfile, updateSalary, loading, debts, fetchDebts } = useDebtStore()
  const { user, signOut } = useAuth()

  const [activeTab, setActiveTab]               = useState<Tab>('dashboard')
  const [salary, setSalary]                     = useState('')
  const [charges, setCharges]                   = useState('')
  const [currency, setCurrency]                 = useState<Currency>('EUR')
  const [debtFreeTarget, setDebtFreeTarget]     = useState('')
  const [saved, setSaved]                       = useState(false)
  const [exporting, setExporting]               = useState(false)
  const [selectedScenario, setSelectedScenario] = useState<PaymentScenario | null>(() => {
    try { return JSON.parse(localStorage.getItem(LS_SCENARIO_KEY) ?? 'null') } catch { return null }
  })
  const [importedTxs, setImportedTxs]           = useState<RawTransaction[]>(() => {
    const raw = localStorage.getItem(LS_TXS_KEY)
    return raw ? deserializeTxs(raw) : []
  })
  const [hasBankConnection, setHasBankConnection] = useState(false)

  // ── Persistance des transactions importées ────────────────────────────────
  useEffect(() => {
    if (importedTxs.length > 0) {
      localStorage.setItem(LS_TXS_KEY, JSON.stringify(importedTxs))
    }
  }, [importedTxs])

  // ── Persistance du scénario sélectionné ──────────────────────────────────
  useEffect(() => {
    if (selectedScenario) {
      localStorage.setItem(LS_SCENARIO_KEY, JSON.stringify(selectedScenario))
    } else {
      localStorage.removeItem(LS_SCENARIO_KEY)
    }
  }, [selectedScenario])

  useEffect(() => {
    fetchProfile()
    fetchDebts()
    if (user) {
      supabase
        .from('bridge_connections')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => setHasBankConnection(!!data))
    }
  }, [user])

  useEffect(() => {
    if (profile) {
      setSalary(profile.salary_net.toString())
      setCharges(profile.fixed_charges.toString())
      setCurrency(profile.currency)
      setDebtFreeTarget(profile.debt_free_target ?? '')
    }
  }, [profile])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateSalary({
      salary_net:       parseFloat(salary)  || 0,
      fixed_charges:    parseFloat(charges) || 0,
      currency,
      debt_free_target: debtFreeTarget || null,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleExport = async () => {
    setExporting(true)
    try { exportDebtsPDF(debts, profile) }
    finally { setExporting(false) }
  }

  const handleSelectScenario = (s: PaymentScenario) => {
    setSelectedScenario(prev => prev?.label === s.label ? null : s)
  }

  // ── Valeurs dérivées (partagées entre onglets) ────────────────────────────
  const totalDebt   = calcTotals(debts).iOwe
  const salaryNum   = parseFloat(salary)  || 0
  const chargesNum  = parseFloat(charges) || 0
  const scenarios   = calcScenarios(totalDebt, salaryNum, chargesNum)
  const available   = salaryNum - chargesNum
  const currSymbol  = currency === 'EUR' ? '€' : currency === 'DZD' ? 'DA' : '$'
  const monthlyDebt = debts.reduce((s, d) => s + (d.min_payment ?? 0), 0)
  const targetAchievable = isDebtFreeTargetAchievable(totalDebt, available, debtFreeTarget || null)

  // Mensualité affichée dans le dashboard : scénario sélectionné > 30% dispo > min_payments
  const nextAdvised = selectedScenario?.monthly
    ?? Math.max(monthlyDebt, Math.round(available * 0.3))

  return (
    <div className="flex flex-col h-full pb-24">

      {/* ── En-tête + onglets (sticky) ───────────────────────────────────── */}
      <div className="px-4 pt-6 pb-0 bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profil</h1>
            <p className="text-xs text-gray-400 truncate max-w-[200px]">{user?.email}</p>
          </div>
          <button onClick={signOut} className="text-sm text-gray-400 hover:text-red-500 transition-colors">
            Déconnexion
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors relative
                ${activeTab === tab.id ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span className="leading-none">{tab.label}</span>
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu scrollable ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

        {/* ════════════════════════════════════════════════════════════
            ONGLET 1 — TABLEAU DE BORD
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <>
            {/* Carte mensualité conseillée */}
            {salaryNum > 0 && (
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-sm">
                <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-1">
                  {selectedScenario ? `Plan sélectionné : ${selectedScenario.label}` : 'Prochaine échéance conseillée'}
                </p>
                <p className="text-3xl font-bold">{formatCurrency(nextAdvised, currency)}<span className="text-base font-normal text-white/70">/mois</span></p>
                <p className="text-white/70 text-xs mt-1">
                  {available > 0
                    ? `Disponible après charges : ${formatCurrency(available, currency)}/mois`
                    : 'Saisissez votre salaire dans Réglages'}
                </p>
                {totalDebt > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
                    <span className="text-white/80">Dette totale restante</span>
                    <span className="font-semibold">{formatCurrency(totalDebt, currency)}</span>
                  </div>
                )}
                {selectedScenario && (
                  <button
                    onClick={() => setSelectedScenario(null)}
                    className="mt-2 text-[10px] text-white/50 hover:text-white/80 underline underline-offset-2"
                  >
                    Réinitialiser le plan
                  </button>
                )}
              </div>
            )}

            {/* Analyseur budgétaire compact */}
            {importedTxs.length > 0 ? (
              <BudgetAdvisor
                compact
                rawTransactions={importedTxs}
                income={salaryNum}
                fixedCharges={chargesNum}
                totalDebt={totalDebt}
                monthlyDebt={monthlyDebt}
                currency={currency}
              />
            ) : (
              <div
                onClick={() => setActiveTab('settings')}
                className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-4 cursor-pointer hover:bg-indigo-100 transition-colors"
              >
                <span className="text-2xl">📂</span>
                <div>
                  <p className="text-sm font-semibold text-indigo-800">Importer un relevé bancaire</p>
                  <p className="text-xs text-indigo-500">PDF ou CSV — analyse automatique de vos dépenses</p>
                </div>
                <svg className="w-4 h-4 text-indigo-400 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            )}

            {salaryNum === 0 && (
              <div className="bg-gray-50 rounded-2xl p-5 text-center border border-dashed border-gray-200">
                <p className="text-sm font-medium text-gray-500">Aucune donnée</p>
                <p className="text-xs text-gray-400 mt-1">
                  Renseignez votre salaire dans{' '}
                  <button onClick={() => setActiveTab('settings')} className="text-emerald-600 font-semibold underline underline-offset-2">
                    Réglages
                  </button>
                </p>
              </div>
            )}

            {debts.length === 0 && salaryNum > 0 && (
              <div className="bg-emerald-50 rounded-2xl p-6 text-center">
                <p className="font-semibold text-emerald-700">Aucune dette active !</p>
                <p className="text-sm text-emerald-600 mt-1">Félicitations, vous êtes libéré !</p>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            ONGLET 2 — BANQUE (OPEN BANKING)
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'bank' && (
          <>
            {hasBankConnection && user ? (
              <BankBalanceWidget
                userId={user.id}
                debts={debts}
                currency={currency}
              />
            ) : (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold mb-2">Open Banking</h2>
                  <p className="text-indigo-100 text-sm">
                    Synchronisez votre banque pour suivre vos remboursements en temps réel.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/bank/connect')}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl
                             bg-indigo-600 text-white text-sm font-semibold shadow-sm
                             hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  Connecter ma banque
                </button>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            ONGLET 3 — SIMULATION & DETTE
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'simulation' && (
          <>
            {totalDebt === 0 && (
              <div className="bg-emerald-50 rounded-2xl p-6 text-center">
                <p className="text-2xl mb-2">🎉</p>
                <p className="font-semibold text-emerald-700">Aucune dette à simuler</p>
                <p className="text-sm text-emerald-600 mt-1">Ajoutez des dettes pour voir les projections.</p>
              </div>
            )}

            {debts.length > 0 && (
              <DebtEvolutionChart debts={debts} currency={currency} />
            )}

            {scenarios && totalDebt > 0 && (
              <div>
                <h2 className="font-semibold text-gray-900 mb-1">Scénarios de remboursement</h2>
                <p className="text-sm text-gray-400 mb-1">
                  Basé sur {formatCurrency(totalDebt, currency)} de dettes totales
                </p>
                {selectedScenario && (
                  <p className="text-xs text-emerald-600 font-medium mb-3">
                    Plan actif : <strong>{selectedScenario.label}</strong> — {formatCurrency(selectedScenario.monthly, currency)}/mois
                  </p>
                )}
                <div className="space-y-3">
                  {scenarios.map((s, i) => (
                    <ScenarioCard
                      key={s.label}
                      scenario={s}
                      highlight={i === 1}
                      selected={selectedScenario?.label === s.label}
                      onSelect={handleSelectScenario}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-3">
                  Appuyez sur un scénario pour le sélectionner comme plan actif
                </p>
              </div>
            )}

            {totalDebt > 0 && (
              <button
                onClick={() => navigate('/whatif')}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl
                           border-2 border-emerald-200 text-emerald-600 text-sm font-medium
                           hover:bg-emerald-50 transition-all"
              >
                <span>💡</span>
                Et si je payais plus ? Simuler
              </button>
            )}

            {salaryNum === 0 && (
              <p className="text-xs text-center text-gray-400">
                Renseignez votre salaire dans{' '}
                <button onClick={() => setActiveTab('settings')} className="text-emerald-600 font-semibold underline underline-offset-2">
                  Réglages
                </button>{' '}
                pour voir les scénarios.
              </p>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            ONGLET 3 — RÉGLAGES & DONNÉES
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <>
            {/* Export PDF */}
            <button
              onClick={handleExport}
              disabled={exporting || debts.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl
                         border-2 border-dashed border-gray-200 text-gray-500 text-sm font-medium
                         hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {exporting ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              {exporting ? 'Génération en cours...' : 'Exporter mes dettes en PDF'}
            </button>

            {/* Import relevé */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-1">Importer un relevé</h2>
              <p className="text-sm text-gray-400 mb-4">Analyse automatique de vos revenus et dépenses</p>

              {/* ── Résumé du relevé en mémoire ── */}
              {importedTxs.length > 0 && (() => {
                // Calculer min/max des dates des transactions
                const dates = importedTxs.map(t => t.date.getTime()).filter(Boolean)
                const minDate = new Date(Math.min(...dates))
                const maxDate = new Date(Math.max(...dates))

                // Label du mois : si toutes les dates sont dans le même mois → "Mars 2026",
                // sinon "Jan → Mar 2026"
                const isSameMonth =
                  minDate.getMonth() === maxDate.getMonth() &&
                  minDate.getFullYear() === maxDate.getFullYear()
                const monthLabel = isSameMonth
                  ? maxDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                  : `${minDate.toLocaleDateString('fr-FR', { month: 'short' })} → ${maxDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`

                // Détecter l'obsolescence : le mois max du relevé est-il avant le mois en cours ?
                const now = new Date()
                const relevéYear  = maxDate.getFullYear()
                const relevéMonth = maxDate.getMonth()
                const isStale =
                  relevéYear < now.getFullYear() ||
                  (relevéYear === now.getFullYear() && relevéMonth < now.getMonth())
                // "vieux de combien de mois ?"
                const monthsOld =
                  (now.getFullYear() - relevéYear) * 12 + (now.getMonth() - relevéMonth)

                // Totaux revenus / charges depuis les transactions brutes
                const totalIncome  = importedTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
                const totalCharges = importedTxs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)

                return (
                  <div className="mb-4 space-y-3">
                    {/* Alerte obsolescence */}
                    {isStale && (
                      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-3">
                        <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
                        <div>
                          <p className="text-xs font-semibold text-amber-800">
                            Données datant de {maxDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                            {monthsOld > 1 ? ` (${monthsOld} mois)` : ''}
                          </p>
                          <p className="text-xs text-amber-700 mt-0.5">
                            Importez votre dernier relevé pour une analyse précise.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Carte de synthèse */}
                    <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                      {/* En-tête : mois + nb transactions + bouton effacer */}
                      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm">📄</span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-700 truncate capitalize">
                              Relevé actuel : {monthLabel}
                            </p>
                            <p className="text-[11px] text-gray-400">{importedTxs.length} transactions</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setImportedTxs([])
                            localStorage.removeItem(LS_TXS_KEY)
                          }}
                          className="text-xs text-red-400 hover:text-red-600 font-medium flex-shrink-0 ml-2"
                        >
                          Effacer
                        </button>
                      </div>

                      {/* Résumé revenus / charges */}
                      <div className="grid grid-cols-2 divide-x divide-gray-100">
                        <div className="px-3 py-2.5 text-center">
                          <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-0.5">
                            Revenus
                          </p>
                          <p className="text-base font-bold text-emerald-700">
                            {formatCurrency(Math.round(totalIncome), currency)}
                          </p>
                        </div>
                        <div className="px-3 py-2.5 text-center">
                          <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide mb-0.5">
                            Dépenses
                          </p>
                          <p className="text-base font-bold text-red-600">
                            {formatCurrency(Math.round(totalCharges), currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              <CsvImport
                currency={currency}
                onApply={(income, ch, rawTxs) => {
                  setSalary(String(income))
                  setCharges(String(ch))
                  setImportedTxs(rawTxs)
                }}
              />
            </div>

            {/* Formulaire manuel */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-1">Saisie manuelle</h2>
              <p className="text-sm text-gray-400 mb-4">Devise, salaire, charges et objectif</p>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Devise</p>
                  <div className="grid grid-cols-3 gap-2">
                    {CURRENCIES.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCurrency(c.value)}
                        className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all flex flex-col items-center gap-0.5 ${
                          currency === c.value
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 bg-white text-gray-500'
                        }`}
                      >
                        <span className="text-lg">{c.flag}</span>
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Salaire net mensuel"
                  type="number"
                  prefix={currSymbol}
                  placeholder="0"
                  value={salary}
                  onChange={e => setSalary(e.target.value)}
                  min={0}
                />

                <Input
                  label="Charges fixes mensuelles (loyer, factures...)"
                  type="number"
                  prefix={currSymbol}
                  placeholder="0"
                  value={charges}
                  onChange={e => setCharges(e.target.value)}
                  min={0}
                />

                <Input
                  label="Objectif sans dette (date)"
                  type="date"
                  value={debtFreeTarget}
                  onChange={e => setDebtFreeTarget(e.target.value)}
                />

                {debtFreeTarget && totalDebt > 0 && (
                  <div className={`rounded-xl p-3 text-sm flex items-center gap-2 ${
                    targetAchievable ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
                  }`}>
                    <span>{targetAchievable ? '✅' : '⚠️'}</span>
                    <span>
                      {targetAchievable
                        ? 'Objectif atteignable avec votre budget actuel !'
                        : 'Objectif ambitieux — augmentez vos remboursements ou repoussez la date.'}
                    </span>
                  </div>
                )}

                {available > 0 && (
                  <div className="bg-emerald-50 rounded-xl p-3 text-sm text-emerald-700 flex items-center gap-2">
                    <span>Disponible après charges : <strong>{formatCurrency(available, currency)}</strong></span>
                  </div>
                )}

                {available < 0 && salaryNum > 0 && (
                  <div className="bg-red-50 rounded-xl p-3 text-sm text-red-600">
                    Vos charges dépassent votre salaire. Vérifiez vos chiffres.
                  </div>
                )}

                <Button type="submit" loading={loading} className="w-full">
                  {saved ? 'Enregistré !' : 'Enregistrer'}
                </Button>
              </form>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
