import type { PaymentScenario } from '@/types'

function addMonths(date: Date, months: number): string {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function calcScenarios(
  totalDebt: number,
  salaryNet: number,
  fixedCharges: number
): PaymentScenario[] | null {
  const available = salaryNet - fixedCharges
  if (available <= 0 || totalDebt <= 0) return null

  const scenarios = [
    { label: 'Comfortable', percentage: 0.20 },
    { label: 'Balanced',    percentage: 0.25 },
    { label: 'Fast',        percentage: 0.30 },
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
