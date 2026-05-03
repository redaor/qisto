import type { PaymentScenario } from '@/types'
import { formatCurrency } from '@/lib/formatters'

interface ScenarioCardProps {
  scenario: PaymentScenario
  highlight?: boolean
  selected?: boolean
  onSelect?: (scenario: PaymentScenario) => void
}

const colors = {
  Confortable: { ring: 'ring-blue-400',   bg: 'bg-blue-50',    text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-700',    selBg: 'bg-blue-500' },
  Équilibré:   { ring: 'ring-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', selBg: 'bg-emerald-500' },
  Rapide:      { ring: 'ring-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700',   selBg: 'bg-amber-500' },
}

export function ScenarioCard({ scenario, highlight = false, selected = false, onSelect }: ScenarioCardProps) {
  const color = colors[scenario.label as keyof typeof colors] ?? colors['Équilibré']

  return (
    <button
      type="button"
      onClick={() => onSelect?.(scenario)}
      className={`w-full text-left rounded-2xl p-5 border-2 transition-all active:scale-[0.98]
        ${selected
          ? `${color.bg} border-current ${color.text} ring-2 ${color.ring} shadow-md`
          : highlight
            ? `${color.bg} ring-2 ${color.ring} border-transparent`
            : `${color.bg} border-transparent hover:border-gray-200`
        }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-gray-900">{scenario.label}</span>
        <div className="flex items-center gap-2">
          {highlight && !selected && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color.badge}`}>
              Recommandé
            </span>
          )}
          {selected && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${color.selBg}`}>
              ✓ Sélectionné
            </span>
          )}
        </div>
      </div>

      <p className={`text-3xl font-bold ${color.text} mb-1`}>
        {formatCurrency(scenario.monthly)}<span className="text-base font-normal text-gray-400">/mois</span>
      </p>

      <div className="mt-3 pt-3 border-t border-white/60 flex justify-between text-sm">
        <span className="text-gray-500">{scenario.percentage}% du disponible</span>
        <span className="font-medium text-gray-700">{scenario.months} mois</span>
      </div>
      <p className="text-xs text-gray-400 mt-1">Libéré en {scenario.endDate}</p>
    </button>
  )
}
