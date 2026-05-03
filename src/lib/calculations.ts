import type { PaymentScenario, Debt, RepayStrategy, WhatIfResult, PersonGroup } from '@/types'

function addMonths(date: Date, months: number): string {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export function calcScenarios(
  totalDebt: number,
  salaryNet: number,
  fixedCharges: number
): PaymentScenario[] | null {
  const available = salaryNet - fixedCharges
  if (available <= 0 || totalDebt <= 0) return null

  const scenarios = [
    { label: 'Confortable', percentage: 0.20 },
    { label: 'Équilibré',   percentage: 0.25 },
    { label: 'Rapide',      percentage: 0.30 },
  ]

  return scenarios.map(({ label, percentage }) => {
    const monthly = Math.round(available * percentage)
    const months = monthly > 0 ? Math.ceil(totalDebt / monthly) : 999
    return {
      label,
      percentage: percentage * 100,
      monthly,
      months,
      endDate: addMonths(new Date(), months),
    }
  })
}

export function calcProgress(total: number, remaining: number): number {
  if (total === 0) return 100
  return Math.round(((total - remaining) / total) * 100)
}

export function calcTotals(debts: { type: string; remaining_amount: number }[]) {
  const owedToMe = debts
    .filter(d => d.type === 'owed_to_me')
    .reduce((sum, d) => sum + d.remaining_amount, 0)

  const iOwe = debts
    .filter(d => d.type === 'i_owe')
    .reduce((sum, d) => sum + d.remaining_amount, 0)

  return { owedToMe, iOwe, net: owedToMe - iOwe }
}

export function calcMonthsToPayoff(
  principal: number,
  annualRate: number,
  monthlyPayment: number
): number {
  if (principal <= 0) return 0
  if (annualRate <= 0) {
    return monthlyPayment > 0 ? Math.ceil(principal / monthlyPayment) : 999
  }
  const r = annualRate / 100 / 12
  if (monthlyPayment <= principal * r) return 999
  return Math.ceil(-Math.log(1 - (principal * r) / monthlyPayment) / Math.log(1 + r))
}

export function calcWhatIf(
  debt: Debt,
  extraMonthly: number
): WhatIfResult {
  const principal = debt.remaining_amount
  const annualRate = debt.interest_rate ?? 0
  const base = Math.max(debt.min_payment || 10, 10)
  const monthly = base + extraMonthly

  const months = calcMonthsToPayoff(principal, annualRate, monthly)

  let totalInterest = 0
  if (annualRate > 0 && months < 999) {
    totalInterest = Math.max(0, monthly * months - principal)
  }

  return {
    months,
    endDate: addMonths(new Date(), months),
    totalInterest: Math.round(totalInterest),
  }
}

export interface WhatIfSequentialItem {
  id: string
  name: string
  months: number           // mois depuis aujourd'hui jusqu'au solde de cette dette
  endDate: string
  totalInterest: number
}

export interface WhatIfSequentialResult {
  items: WhatIfSequentialItem[]
  totalMonths: number       // mois jusqu'à la dernière dette soldée
  totalInterest: number
}

/**
 * Simulation séquentielle : on rembourse les minimums sur toutes les dettes
 * actives chaque mois, puis on applique `extraMonthly` sur la prioritaire
 * (ordre : montant décroissant = avalanche sans taux, sinon taux décroissant).
 * Quand une dette est soldée, son minimum s'ajoute à l'extra du mois suivant
 * (effet boule de neige).
 */
export function calcWhatIfSequential(
  debts: Debt[],
  extraMonthly: number
): WhatIfSequentialResult {
  if (!debts.length) return { items: [], totalMonths: 0, totalInterest: 0 }

  // Trier : taux décroissant si taux présents, sinon montant décroissant
  const hasRate = debts.some(d => (d.interest_rate ?? 0) > 0)
  const sorted = [...debts].sort((a, b) =>
    hasRate
      ? (b.interest_rate ?? 0) - (a.interest_rate ?? 0)
      : b.remaining_amount - a.remaining_amount
  )

  // État mutable de la simulation
  type State = {
    id: string
    name: string
    remaining: number
    rate: number          // taux mensuel (0 si pas d'intérêt)
    minPayment: number
    paidOffAt: number | null
    interestPaid: number
  }

  const states: State[] = sorted.map(d => ({
    id: d.id,
    name: d.contact_name,
    remaining: d.remaining_amount,
    rate: (d.interest_rate ?? 0) / 100 / 12,
    minPayment: Math.max(d.min_payment || 10, 10),
    paidOffAt: null,
    interestPaid: 0,
  }))

  let month = 0
  const MAX_MONTHS = 600  // garde-fou 50 ans

  while (states.some(s => s.paidOffAt === null) && month < MAX_MONTHS) {
    month++

    // Budget ce mois = extra + minimums des dettes déjà soldées (cascade)
    const freedMins = states
      .filter(s => s.paidOffAt !== null)
      .reduce((sum, s) => sum + s.minPayment, 0)
    let extraThisMonth = extraMonthly + freedMins

    for (const s of states) {
      if (s.paidOffAt !== null) continue

      // Intérêts du mois
      const interest = s.remaining * s.rate
      s.remaining += interest
      s.interestPaid += interest

      // Paiement minimum (sauf si c'est la prioritaire — on ajoute l'extra après)
      const isPriority = states.find(x => x.paidOffAt === null) === s
      let payment = s.minPayment
      if (isPriority) {
        payment = Math.min(s.remaining, s.minPayment + extraThisMonth)
        extraThisMonth = 0  // l'extra est consommé
      }

      s.remaining = Math.max(0, s.remaining - payment)
      if (s.remaining === 0) s.paidOffAt = month
    }
  }

  const items: WhatIfSequentialItem[] = states.map(s => ({
    id: s.id,
    name: s.name,
    months: s.paidOffAt ?? MAX_MONTHS,
    endDate: addMonths(new Date(), s.paidOffAt ?? MAX_MONTHS),
    totalInterest: Math.round(s.interestPaid),
  }))

  const totalMonths = Math.max(...items.map(i => i.months))
  const totalInterest = items.reduce((sum, i) => sum + i.totalInterest, 0)

  return { items, totalMonths, totalInterest }
}

export function sortDebtsByStrategy(debts: Debt[], strategy: RepayStrategy): Debt[] {
  const copy = [...debts]
  if (strategy === 'avalanche') {
    const hasInterest = copy.some(d => (d.interest_rate ?? 0) > 0)
    if (hasInterest) {
      return copy.sort((a, b) => (b.interest_rate ?? 0) - (a.interest_rate ?? 0))
    }
    // mode amis : pas d'intérêt → attaquer le plus gros montant en premier
    return copy.sort((a, b) => b.remaining_amount - a.remaining_amount)
  }
  if (strategy === 'snowball') {
    return copy.sort((a, b) => a.remaining_amount - b.remaining_amount)
  }
  return copy
}

export interface DistributionItem {
  debt: Debt
  allocated: number
  newRemaining: number
}

export function distributeAmount(
  debts: Debt[],
  amount: number,
  strategy: RepayStrategy
): { items: DistributionItem[]; totalRemaining: number } {
  const sorted = sortDebtsByStrategy(
    debts.filter(d => d.type === 'i_owe' && d.remaining_amount > 0),
    strategy
  )
  let left = amount
  const items: DistributionItem[] = []

  for (const debt of sorted) {
    if (left <= 0) break
    const allocated = Math.min(left, debt.remaining_amount)
    items.push({
      debt,
      allocated,
      newRemaining: Math.max(0, debt.remaining_amount - allocated),
    })
    left -= allocated
  }

  const totalRemaining = debts
    .filter(d => d.type === 'i_owe')
    .reduce((sum, d) => {
      const item = items.find(i => i.debt.id === d.id)
      return sum + (item ? item.newRemaining : d.remaining_amount)
    }, 0)

  return { items, totalRemaining }
}

export function groupDebtsByPerson(debts: Debt[]): PersonGroup[] {
  const map = new Map<string, PersonGroup>()
  for (const d of debts) {
    const key = d.contact_name.toLowerCase().trim()
    if (!map.has(key)) {
      map.set(key, { contact_name: d.contact_name, debts: [], totalOwed: 0, totalOwing: 0, net: 0 })
    }
    const g = map.get(key)!
    g.debts.push(d)
    if (d.type === 'owed_to_me') g.totalOwed += d.remaining_amount
    else g.totalOwing += d.remaining_amount
    g.net = g.totalOwed - g.totalOwing
  }
  return Array.from(map.values()).sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
}

export function isDebtFreeTargetAchievable(
  totalDebt: number,
  available: number,
  targetDateStr: string | null
): boolean {
  if (!targetDateStr || available <= 0 || totalDebt <= 0) return false
  const months = Math.ceil((new Date(targetDateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
  if (months <= 0) return false
  return available * months >= totalDebt
}
