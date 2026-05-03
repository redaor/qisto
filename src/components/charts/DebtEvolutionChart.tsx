import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/formatters'
import type { Debt, Currency } from '@/types'

interface DebtEvolutionChartProps {
  debts: Debt[]
  currency: Currency
}

function buildEvolutionData(debts: Debt[]) {
  const months: { month: string; total: number }[] = []
  const now = new Date()

  for (let i = -3; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })

    const total = debts
      .filter(debt => new Date(debt.created_at) <= d)
      .reduce((sum, debt) => {
        const totalMonths = debt.due_date
          ? Math.max(1, Math.ceil((new Date(debt.due_date).getTime() - new Date(debt.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)))
          : 24
        const monthlyPay = debt.total_amount / totalMonths
        const remaining = Math.max(0, debt.remaining_amount - monthlyPay * Math.max(0, i))
        return sum + (i <= 0 ? debt.remaining_amount : remaining)
      }, 0)

    months.push({ month: label, total: Math.round(total) })
  }

  return months
}

const CustomTooltip = ({ active, payload, label, currency }: { active?: boolean; payload?: any[]; label?: string; currency: Currency }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-lg text-sm">
        <p className="text-gray-500 text-xs mb-1">{label}</p>
        <p className="font-bold text-gray-900">{formatCurrency(payload[0].value, currency)}</p>
      </div>
    )
  }
  return null
}

export function DebtEvolutionChart({ debts, currency }: DebtEvolutionChartProps) {
  if (debts.length === 0) return null
  const data = buildEvolutionData(debts)

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-1">Évolution des dettes</h3>
      <p className="text-xs text-gray-400 mb-4">Passé et projection future</p>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10B981" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#10B981"
            strokeWidth={2.5}
            fill="url(#debtGradient)"
            dot={false}
            activeDot={{ r: 5, fill: '#10B981' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
