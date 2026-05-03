import { useState, useMemo, useCallback, useEffect } from 'react'
import { useDebtStore } from '@/store/useDebtStore'
import { distributeAmount, calcTotals } from '@/lib/calculations'
import type { DistributionItem } from '@/lib/calculations'
import { formatCurrency, getCurrencySymbol } from '@/lib/formatters'
import type { Currency, RepayStrategy, Debt } from '@/types'
import type { RawTransaction } from '@/lib/pdfParser'

const THRESHOLD_LOW = 50
const LS_TXS_KEY    = 'qisto_imported_txs'

function loadImportedBalance(): number | null {
  try {
    const raw = localStorage.getItem(LS_TXS_KEY)
    if (!raw) return null
    const parsed: { date: string; label: string; amount: number }[] = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    const txs = parsed as Pick<RawTransaction, 'amount'>[]
    return Math.round(txs.reduce((sum, t) => sum + t.amount, 0))
  } catch {
    return null
  }
}

// ─── Sous-composant : carte de dette dans le plan ────────────────────────────
function PlanDebtCard({
  item,
  index,
  currency,
}: {
  item: DistributionItem
  index: number
  currency: Currency
}) {
  const isFull = item.newRemaining === 0
  const pct    = Math.round((item.allocated / item.debt.remaining_amount) * 100)
  const progressPct = Math.round(
    ((item.debt.total_amount - item.newRemaining) / item.debt.total_amount) * 100
  )

  return (
    <div className={`bg-white rounded-2xl p-4 border transition-all ${
      isFull ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <p className="font-medium text-gray-900 text-sm truncate">{item.debt.contact_name}</p>
          {isFull && (
            <span className="text-xs bg-emerald-500 text-white rounded-full px-2 py-0.5 flex-shrink-0">
              Soldé !
            </span>
          )}
        </div>
        <span className="text-sm font-bold text-emerald-600 flex-shrink-0 ml-2">
          −{formatCurrency(item.allocated, currency)}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
        <span>Restant après : {formatCurrency(item.newRemaining, currency)}</span>
        <span>{pct}% remboursé</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Sous-composant : mode manuel ────────────────────────────────────────────
function ManualMode({
  debts,
  safeToPay,
  currency,
  symbol,
  onValidate,
  onCancel,
  submitting,
}: {
  debts: Debt[]
  safeToPay: number
  currency: Currency
  symbol: string
  onValidate: (amounts: Record<string, number>) => Promise<void>
  onCancel: () => void
  submitting: boolean
}) {
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(debts.map(d => [d.id, '']))
  )

  const totalAllocated = useMemo(() =>
    Object.values(amounts).reduce((sum, v) => sum + (parseFloat(v) || 0), 0),
    [amounts]
  )

  const remaining  = safeToPay - totalAllocated
  const isOverflow = totalAllocated > safeToPay + 0.01
  const hasAny     = totalAllocated > 0.01
  const canSubmit  = hasAny && !isOverflow && !submitting

  function setAmount(id: string, val: string) {
    setAmounts(prev => ({ ...prev, [id]: val }))
  }

  async function handleSubmit() {
    const parsed: Record<string, number> = {}
    for (const [id, v] of Object.entries(amounts)) {
      const n = parseFloat(v) || 0
      if (n > 0) parsed[id] = n
    }
    await onValidate(parsed)
  }

  return (
    <div className="space-y-3">
      {/* Budget tracker */}
      <div className={`rounded-2xl p-4 text-center transition-all ${
        isOverflow ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-100'
      }`}>
        <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
          isOverflow ? 'text-red-400' : 'text-emerald-500'
        }`}>
          {isOverflow ? 'Dépassement' : 'Il reste à répartir'}
        </p>
        <p className={`text-3xl font-bold transition-all ${
          isOverflow ? 'text-red-600' : 'text-emerald-700'
        }`}>
          {isOverflow
            ? `−${formatCurrency(totalAllocated - safeToPay, currency)}`
            : formatCurrency(Math.max(0, remaining), currency)
          }
        </p>
        {!isOverflow && (
          <p className="text-xs text-emerald-500 mt-1">
            sur {formatCurrency(safeToPay, currency)} disponibles
          </p>
        )}
        {isOverflow && (
          <p className="text-xs text-red-500 mt-1">
            Réduisez les montants pour rester dans le budget
          </p>
        )}
      </div>

      {/* Liste des dettes avec champs */}
      <div className="space-y-2">
        {debts.map(debt => {
          const val = amounts[debt.id] ?? ''
          const num = parseFloat(val) || 0
          const exceedsDebt = num > debt.remaining_amount
          return (
            <div key={debt.id} className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{debt.contact_name}</p>
                  <p className="text-xs text-gray-400">
                    Doit : {formatCurrency(debt.remaining_amount, currency)}
                  </p>
                </div>
                <div className="relative ml-3 flex-shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
                    {symbol}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={debt.remaining_amount}
                    placeholder="0"
                    value={val}
                    onChange={e => setAmount(debt.id, e.target.value)}
                    className={`w-28 rounded-xl border pl-7 pr-3 py-2 text-sm text-right outline-none transition-all
                      focus:ring-2 focus:ring-emerald-100
                      ${exceedsDebt
                        ? 'border-orange-300 bg-orange-50 focus:border-orange-400'
                        : num > 0
                          ? 'border-emerald-300 bg-emerald-50 focus:border-emerald-400'
                          : 'border-gray-200 focus:border-emerald-500'
                      }`}
                  />
                </div>
              </div>
              {exceedsDebt && (
                <p className="text-[11px] text-orange-500">
                  Dépasse le solde — max {formatCurrency(debt.remaining_amount, currency)}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl
                     bg-emerald-600 text-white text-sm font-semibold shadow-sm
                     hover:bg-emerald-700 active:scale-95 transition-all
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {submitting ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Enregistrement…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              Valider les paiements manuels
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}

// ─── Groupement par mois ─────────────────────────────────────────────────────
import type { PaymentWithDebt } from '@/store/useDebtStore'

interface MonthGroup {
  key: string        // "2026-05"
  label: string      // "Mai 2026"
  total: number
  payments: PaymentWithDebt[]
}

function groupByMonth(payments: PaymentWithDebt[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>()
  for (const p of payments) {
    const d     = new Date(p.paid_at)
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    if (!map.has(key)) map.set(key, { key, label, total: 0, payments: [] })
    const g = map.get(key)!
    g.payments.push(p)
    g.total += p.amount
  }
  return [...map.values()].sort((a, b) => b.key.localeCompare(a.key))
}

function PaymentHistoryByMonth({
  payments,
  currency,
}: {
  payments: PaymentWithDebt[]
  currency: Currency
}) {
  const groups = useMemo(() => groupByMonth(payments), [payments])

  // Le mois le plus récent (index 0) est ouvert par défaut
  const [openKeys, setOpenKeys] = useState<Set<string>>(
    () => new Set(groups.length > 0 ? [groups[0].key] : [])
  )

  // Si un nouveau groupe arrive (paiement venant d'être validé), l'ouvrir
  useMemo(() => {
    if (groups.length > 0) {
      setOpenKeys(prev => {
        if (prev.has(groups[0].key)) return prev
        return new Set([groups[0].key, ...prev])
      })
    }
  }, [groups])

  function toggle(key: string) {
    setOpenKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-2">
      {/* En-tête global */}
      <div className="flex items-center justify-between px-1">
        <h2 className="font-semibold text-gray-900 text-sm">Historique des paiements</h2>
        <span className="text-xs text-gray-400">
          {payments.length} paiement{payments.length > 1 ? 's' : ''}
        </span>
      </div>

      {groups.map(group => {
        const isOpen = openKeys.has(group.key)
        return (
          <div key={group.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* ── Header cliquable ── */}
            <button
              onClick={() => toggle(group.key)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {/* Flèche */}
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
                {/* Mois + nb paiements */}
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800 capitalize">{group.label}</p>
                  <p className="text-[11px] text-gray-400">
                    {group.payments.length} paiement{group.payments.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {/* Total du mois */}
              <span className={`text-sm font-bold transition-colors ${isOpen ? 'text-emerald-600' : 'text-gray-500'}`}>
                −{formatCurrency(group.total, currency)}
              </span>
            </button>

            {/* ── Détail dépliable ── */}
            {isOpen && (
              <div className="border-t border-gray-50 divide-y divide-gray-50">
                {group.payments.map((p, i) => {
                  const isLast = i === group.payments.length - 1
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      {/* Timeline dot */}
                      <div className="relative flex flex-col items-center flex-shrink-0">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                          </svg>
                        </div>
                        {!isLast && <div className="absolute top-7 w-px h-full bg-gray-100" />}
                      </div>
                      {/* Nom + note */}
                      <div className="flex-1 min-w-0 pb-0.5">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.contact_name}</p>
                        {p.note && <p className="text-xs text-gray-400 truncate">{p.note}</p>}
                      </div>
                      {/* Montant + date */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-emerald-600">
                          −{formatCurrency(p.amount, currency)}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {new Date(p.paid_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
type PlanMode = 'auto' | 'manual'

export function Treasury() {
  const { debts, profile, strategy, recordPayment, fetchAllPayments, allPayments } = useDebtStore()

  const currency: Currency = profile?.currency ?? 'EUR'
  const symbol = getCurrencySymbol(currency)

  // Charger l'historique au montage et à chaque retour sur la page
  useEffect(() => {
    fetchAllPayments()
  }, [])

  const [balance, setBalance]     = useState('')
  const [expenses, setExpenses]   = useState('')
  const [showPlan, setShowPlan]   = useState(false)
  const [planMode, setPlanMode]   = useState<PlanMode>('auto')
  const [syncFlash, setSyncFlash] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const importedBalance = loadImportedBalance()

  function handleSyncBalance() {
    const imported = loadImportedBalance()
    if (imported === null) return
    setBalance(String(imported))
    setShowPlan(false)
    setSyncFlash(true)
    setTimeout(() => setSyncFlash(false), 1500)
  }

  const balanceNum  = parseFloat(balance)  || 0
  const expensesNum = parseFloat(expenses) || 0
  const safeToPay   = balanceNum - expensesNum
  const totalDebt   = calcTotals(debts).iOwe

  const distribution = useMemo<{ items: DistributionItem[]; totalRemaining: number } | null>(() => {
    if (!showPlan || planMode !== 'auto' || safeToPay <= 0 || debts.length === 0) return null
    return distributeAmount(debts, safeToPay, strategy as RepayStrategy)
  }, [showPlan, planMode, safeToPay, debts, strategy])

  const hasInputs   = balance !== '' || expenses !== ''
  const isSafe      = hasInputs && safeToPay > THRESHOLD_LOW
  const isDanger    = hasInputs && safeToPay <= THRESHOLD_LOW
  const activeDebts = debts.filter(d => d.type === 'i_owe' && d.remaining_amount > 0)

  function handleDistribute() {
    setShowPlan(true)
    setPlanMode('auto')
    setSuccessMsg(null)
    setTimeout(() => {
      document.getElementById('distribution-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  function handleReset() {
    setShowPlan(false)
    setSuccessMsg(null)
    setPlanMode('auto')
  }

  // Applique une liste de { debtId → amount } en séquence
  const applyPayments = useCallback(async (payments: Record<string, number>, note?: string) => {
    setSubmitting(true)
    try {
      for (const [debtId, amount] of Object.entries(payments)) {
        if (amount > 0) await recordPayment(debtId, amount, note ?? 'Répartition Trésorerie')
      }
      const count = Object.keys(payments).length
      const total = Object.values(payments).reduce((s, v) => s + v, 0)
      setSuccessMsg(
        `${count} paiement${count > 1 ? 's' : ''} enregistré${count > 1 ? 's' : ''} · ${formatCurrency(total, currency)}`
      )
      setShowPlan(false)
      setPlanMode('auto')
    } finally {
      setSubmitting(false)
    }
  }, [recordPayment, currency])

  // Validation du plan automatique
  async function handleValidateAuto() {
    if (!distribution) return
    const payments: Record<string, number> = {}
    for (const item of distribution.items) {
      if (item.allocated > 0) payments[item.debt.id] = item.allocated
    }
    await applyPayments(payments)
  }

  // Validation du plan manuel
  async function handleValidateManual(amounts: Record<string, number>) {
    await applyPayments(amounts, 'Paiement manuel Trésorerie')
  }

  return (
    <div className="flex flex-col h-full pb-24">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-4 bg-white sticky top-0 z-10 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Mon Compte</h1>
        <p className="text-xs text-gray-400 mt-0.5">Capacité de remboursement réelle</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

        {/* ── Notification succès ─────────────────────────────────────── */}
        {successMsg && (
          <div className="flex items-center gap-3 bg-emerald-500 rounded-2xl px-4 py-3.5 shadow-sm">
            <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">Paiement enregistré !</p>
              <p className="text-white/80 text-xs truncate">{successMsg}</p>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-white/60 hover:text-white text-lg leading-none">
              ×
            </button>
          </div>
        )}

        {/* ── Formulaire de saisie ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          {/* Solde */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Solde actuel du compte</label>
              {importedBalance !== null && (
                <button
                  type="button"
                  onClick={handleSyncBalance}
                  className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-all ${
                    syncFlash
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'
                  }`}
                >
                  <svg className={`w-3.5 h-3.5 transition-transform ${syncFlash ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {syncFlash ? 'Récupéré !' : 'Récupérer mon solde'}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-2">Combien avez-vous sur votre compte bancaire maintenant ?</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">{symbol}</span>
              <input
                type="number" inputMode="decimal" min={0} placeholder="0"
                value={balance}
                onChange={e => { setBalance(e.target.value); handleReset() }}
                className={`w-full rounded-xl border bg-white pl-8 pr-4 py-3 text-sm
                  placeholder:text-gray-400 outline-none transition-all
                  focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100
                  ${syncFlash ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-gray-200'}`}
              />
            </div>
            {importedBalance === null && (
              <p className="text-[11px] text-gray-400 mt-1.5">
                Importez un relevé dans{' '}
                <span className="text-indigo-500 font-medium">Profil → Réglages</span>{' '}
                pour activer la récupération automatique.
              </p>
            )}
          </div>

          {/* Dépenses */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Dépenses obligatoires restantes ce mois-ci
            </label>
            <p className="text-xs text-gray-400 mb-2">Loyer à venir, courses, factures… ce qui doit encore sortir.</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">{symbol}</span>
              <input
                type="number" inputMode="decimal" min={0} placeholder="0"
                value={expenses}
                onChange={e => { setExpenses(e.target.value); handleReset() }}
                className="w-full rounded-xl border border-gray-200 bg-white pl-8 pr-4 py-3 text-sm
                  placeholder:text-gray-400 outline-none
                  focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>
        </div>

        {/* ── Résultat ────────────────────────────────────────────────── */}
        {hasInputs && (
          <div className={`rounded-2xl p-5 transition-all ${
            isSafe ? 'bg-emerald-500' : isDanger ? 'bg-red-500' : 'bg-gray-100'
          }`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
              isSafe || isDanger ? 'text-white/70' : 'text-gray-400'
            }`}>
              {isSafe ? 'SAFE TO PAY' : isDanger ? 'ALERTE' : 'Disponible'}
            </p>
            <p className={`text-4xl font-bold ${isSafe || isDanger ? 'text-white' : 'text-gray-700'}`}>
              {formatCurrency(safeToPay, currency)}
            </p>
            <p className={`text-sm mt-2 ${isSafe || isDanger ? 'text-white/80' : 'text-gray-500'}`}>
              {isSafe
                ? `Vous pouvez rembourser ${formatCurrency(safeToPay, currency)} aujourd'hui en toute sécurité.`
                : isDanger
                ? "Attention, gardez cet argent pour vos frais. Ne remboursez pas de dettes aujourd'hui."
                : `Solde ${symbol}${balanceNum} − charges ${symbol}${expensesNum}`}
            </p>
            {balanceNum > 0 && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className={isSafe || isDanger ? 'text-white/60' : 'text-gray-400'}>Marge disponible</span>
                  <span className={`font-semibold ${isSafe || isDanger ? 'text-white' : 'text-gray-600'}`}>
                    {Math.round((Math.max(0, safeToPay) / balanceNum) * 100)}%
                  </span>
                </div>
                <div className={`h-1.5 rounded-full ${isSafe || isDanger ? 'bg-white/20' : 'bg-gray-200'}`}>
                  <div
                    className={`h-full rounded-full transition-all ${isSafe ? 'bg-white' : isDanger ? 'bg-white/50' : 'bg-gray-400'}`}
                    style={{ width: `${Math.min(100, Math.round((Math.max(0, safeToPay) / balanceNum) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Bouton répartir ─────────────────────────────────────────── */}
        {isSafe && activeDebts.length > 0 && !showPlan && (
          <button
            onClick={handleDistribute}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl
                       bg-emerald-600 text-white text-sm font-semibold shadow-sm
                       hover:bg-emerald-700 active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Répartir {formatCurrency(safeToPay, currency)} intelligemment
          </button>
        )}

        {isSafe && activeDebts.length === 0 && (
          <div className="bg-emerald-50 rounded-2xl p-4 text-center">
            <p className="text-sm font-semibold text-emerald-700">Aucune dette active à rembourser !</p>
          </div>
        )}

        {isDanger && (
          <div className="bg-red-50 rounded-2xl p-4 flex gap-3 items-start">
            <span className="text-xl flex-shrink-0">🛑</span>
            <div>
              <p className="text-sm font-semibold text-red-700">Ne touchez pas à cet argent</p>
              <p className="text-xs text-red-500 mt-0.5">
                Votre solde disponible est insuffisant pour rembourser des dettes en toute sécurité. Attendez votre prochain virement.
              </p>
            </div>
          </div>
        )}

        {/* ── Plan de répartition ─────────────────────────────────────── */}
        {showPlan && (
          <div id="distribution-result" className="space-y-3">

            {/* ── Mode automatique ── */}
            {planMode === 'auto' && distribution && distribution.items.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Plan de répartition</h2>
                  <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2.5 py-1">
                    {strategy === 'avalanche' ? 'Avalanche' : strategy === 'snowball' ? 'Boule de neige' : 'Égal'}
                  </span>
                </div>

                <p className="text-xs text-gray-400">
                  {formatCurrency(safeToPay, currency)} répartis sur{' '}
                  {distribution.items.length} dette{distribution.items.length > 1 ? 's' : ''} prioritaire{distribution.items.length > 1 ? 's' : ''}
                </p>

                <div className="space-y-2">
                  {distribution.items.map((item, i) => (
                    <PlanDebtCard key={item.debt.id} item={item} index={i} currency={currency} />
                  ))}
                </div>

                {/* Résumé */}
                <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between text-sm">
                  <span className="text-gray-500">Dette restante après paiement</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(distribution.totalRemaining, currency)}
                  </span>
                </div>

                {totalDebt > 0 && (
                  <div className="bg-indigo-50 rounded-2xl p-3 text-xs text-indigo-600 text-center">
                    Progression globale après ce paiement :{' '}
                    <strong>
                      {Math.round(((totalDebt - distribution.totalRemaining) / totalDebt) * 100)}%
                    </strong>{' '}
                    de vos dettes remboursées
                  </div>
                )}

                {/* Zone d'action */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleValidateAuto}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl
                               bg-emerald-600 text-white text-sm font-semibold shadow-sm
                               hover:bg-emerald-700 active:scale-95 transition-all
                               disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Enregistrement…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                        </svg>
                        Valider ce paiement
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setPlanMode('manual')}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl
                               border-2 border-gray-200 text-gray-600 text-sm font-medium
                               hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50
                               transition-all disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    Personnaliser les montants
                  </button>

                  <button
                    onClick={handleReset}
                    className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
                  >
                    Masquer le plan
                  </button>
                </div>
              </>
            )}

            {/* ── Mode manuel ── */}
            {planMode === 'manual' && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Personnaliser les montants</h2>
                  <button
                    onClick={() => setPlanMode('auto')}
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                    </svg>
                    Plan auto
                  </button>
                </div>
                <ManualMode
                  debts={activeDebts}
                  safeToPay={safeToPay}
                  currency={currency}
                  symbol={symbol}
                  onValidate={handleValidateManual}
                  onCancel={handleReset}
                  submitting={submitting}
                />
              </>
            )}
          </div>
        )}

        {/* ── État vide ───────────────────────────────────────────────── */}
        {!hasInputs && allPayments.length === 0 && (
          <div className="bg-gray-50 rounded-2xl p-6 text-center border border-dashed border-gray-200">
            <p className="text-3xl mb-3">🏦</p>
            <p className="text-sm font-medium text-gray-600">Saisissez votre solde bancaire</p>
            <p className="text-xs text-gray-400 mt-1">
              Nous calculerons en temps réel combien vous pouvez rembourser aujourd'hui en toute sécurité.
            </p>
          </div>
        )}

        {/* ── Historique des paiements (groupé par mois) ──────────────── */}
        {allPayments.length > 0 && (
          <PaymentHistoryByMonth payments={allPayments} currency={currency} />
        )}

      </div>
    </div>
  )
}
