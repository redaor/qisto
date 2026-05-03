import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency } from '@/lib/formatters'
import type { Currency } from '@/types'

interface DebtDonutProps {
  owedToMe: number
  iOwe: number
  currency: Currency
}

const COLORS = ['#10B981', '#EF4444']

const CustomTooltip = ({ active, payload, currency }: { active?: boolean; payload?: any[]; currency: Currency }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-lg text-sm">
        <p className="font-semibold text-gray-900">{payload[0].name}</p>
        <p style={{ color: payload[0].payload.fill }} className="font-bold">
          {formatCurrency(payload[0].value, currency)}
        </p>
      </div>
    )
  }
  return null
}

export function DebtDonut({ owedToMe, iOwe, currency }: DebtDonutProps) {
  const total = owedToMe + iOwe
  if (total === 0) return null

  const data = [
    { name: 'On me doit', value: owedToMe, fill: COLORS[0] },
    { name: 'Je dois',    value: iOwe,     fill: COLORS[1] },
  ].filter(d => d.value > 0)

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4">Répartition</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.fill} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Legend
            formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center -mt-2">
        <p className="text-xs text-gray-400">Total actif</p>
        <p className="text-lg font-bold text-gray-900">{formatCurrency(total, currency)}</p>
      </div>
    </div>
  )
}
