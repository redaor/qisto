import type { RepayStrategy } from '@/types'

interface Props {
  value: RepayStrategy
  onChange: (s: RepayStrategy) => void
  hasInterest?: boolean
}

export function StrategySelector({ value, onChange, hasInterest = false }: Props) {
  const OPTIONS: { value: RepayStrategy; label: string; desc: string }[] = [
    {
      value: 'avalanche',
      label: 'Avalanche',
      desc: hasInterest
        ? 'Taux le plus élevé en premier'
        : 'Montant le plus grand en premier',
    },
    { value: 'snowball', label: 'Boule de neige', desc: 'Montant le plus faible en premier' },
    { value: 'equal',    label: 'Défaut',          desc: 'Ordre par défaut' },
  ]

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Stratégie de remboursement</p>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`py-2 px-2 rounded-xl text-xs font-medium border-2 transition-all text-center ${
              value === opt.value
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 bg-white text-gray-500'
            }`}
          >
            <p className="font-semibold">{opt.label}</p>
            <p className="text-[10px] mt-0.5 opacity-70 leading-tight">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
