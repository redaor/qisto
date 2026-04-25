import type { PaymentScenario } from '@/types'
import { formatCurrency } from '@/lib/formatters'

interface ScenarioCardProps {
  scenario: PaymentScenario
  highlight?: boolean
}

const colors = {
  Comfortable: { ring: 'ring-blue-200',   bg: 'bg-blue-50',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700' },
  Balanced:    { ring: 'ring-emerald-200', bg: 'bg-emerald-50',text: 'text-emerald-700',badge: 'bg-emerald-100 text-emerald-700' },
  Fast:        { ring: 'ring-amber-200',   bg: 'bg-amber-50',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700' },
}

export function ScenarioCard({ scenario, highlight = false }: ScenarioCardProps) {
  const color = colors[scenario.label as keyof typeof colors] ?? colors.Balanced

  return (
    <div className={`rounded-2xl p-5 border ${color.bg} ${highlight ? `ring-2 ${color.ring}` : 'ring-0'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-gray-900">{scenario.label}</span>
        {highlight && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color.badge}`}>
            Recommended
          </span>
        )}
      </div>

      <p className={`text-3xl font-bold ${color.text} mb-1`}>
        {formatCurrency(scenario.monthly)}<span className="text-base font-normal text-gray-400">/mo</span>
      </p>

      <div className="mt-3 pt-3 border-t border-white/60 flex justify-between text-sm">
        <span className="text-gray-500">{scenario.percentage}% of available</span>
        <span className="font-medium text-gray-700">{scenario.months} months</span>
      </div>
      <p className="text-xs text-gray-400 mt-1">Free by {scenario.endDate}</p>
    </div>
  )
}
