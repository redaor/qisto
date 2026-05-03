import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebtStore } from '@/store/useDebtStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { DebtType, DebtCategory } from '@/types'

const CATEGORIES: { value: DebtCategory; label: string; icon: string }[] = [
  { value: 'loan',    label: 'Prêt',       icon: '🏦' },
  { value: 'rent',    label: 'Loyer',      icon: '🏠' },
  { value: 'food',    label: 'Nourriture', icon: '🍽️' },
  { value: 'travel',  label: 'Voyage',     icon: '✈️' },
  { value: 'service', label: 'Service',    icon: '🔧' },
  { value: 'other',   label: 'Autre',      icon: '📦' },
]

export function AddDebt() {
  const navigate = useNavigate()
  const { addDebt, loading } = useDebtStore()
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [hasInterest, setHasInterest]   = useState(false)

  const [form, setForm] = useState({
    contact_name:  '',
    type:          'owed_to_me' as DebtType,
    total_amount:  '',
    description:   '',
    due_date:      '',
    start_date:    '',
    category:      'other' as DebtCategory,
    interest_rate: '',
    min_payment:   '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.contact_name || !form.total_amount) return

    await addDebt({
      contact_name:  form.contact_name,
      type:          form.type,
      total_amount:  parseFloat(form.total_amount),
      description:   form.description,
      due_date:      form.due_date,
      start_date:    form.start_date,
      category:      form.category,
      interest_rate: hasInterest ? parseFloat(form.interest_rate) || 0 : 0,
      min_payment:   parseFloat(form.min_payment) || 0,
    })
    navigate('/debts')
  }

  return (
    <div className="px-4 py-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Nouvelle dette</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Type</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'owed_to_me', label: 'On me doit' },
              { value: 'i_owe',      label: 'Je dois' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, type: opt.value as DebtType }))}
                className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                  form.type === opt.value
                    ? opt.value === 'owed_to_me'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-red-400 bg-red-50 text-red-700'
                    : 'border-gray-200 bg-white text-gray-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Catégorie</p>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                className={`py-2.5 rounded-xl text-xs font-medium border-2 transition-all flex flex-col items-center gap-1 ${
                  form.category === cat.value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 bg-white text-gray-500'
                }`}
              >
                <span className="text-base">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Nom de la personne"
          placeholder="Ali, Karim..."
          value={form.contact_name}
          onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
          required
        />

        <Input
          label="Montant"
          type="number"
          prefix="€"
          placeholder="0"
          min={0.01}
          step={0.01}
          value={form.total_amount}
          onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))}
          required
        />

        <Input
          label="Description (optionnel)"
          placeholder="ex. Prêt pour le loyer"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        />

        <Input
          label="Date de début"
          type="date"
          value={form.start_date}
          onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
        />

        <Input
          label="Date d'échéance (optionnel)"
          type="date"
          value={form.due_date}
          onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
        />

        {/* Checkbox intérêt */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setHasInterest(v => !v)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
              hasInterest ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white'
            }`}
          >
            {hasInterest && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
              </svg>
            )}
          </div>
          <span className="text-sm text-gray-700">Cette dette a des intérêts</span>
        </label>

        {hasInterest && (
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 space-y-3">
            <Input
              label="Taux d'intérêt annuel (APR %)"
              type="number"
              placeholder="0"
              min={0}
              max={100}
              step={0.1}
              value={form.interest_rate}
              onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))}
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="text-sm text-emerald-600 font-medium flex items-center gap-1"
        >
          <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
          Options avancées
        </button>

        {showAdvanced && (
          <div className="space-y-4 bg-gray-50 rounded-2xl p-4">
            <Input
              label="Paiement minimum mensuel"
              type="number"
              prefix="€"
              placeholder="0"
              min={0}
              step={0.01}
              value={form.min_payment}
              onChange={e => setForm(f => ({ ...f, min_payment: e.target.value }))}
            />
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full mt-4">
          Enregistrer la dette
        </Button>
      </form>
    </div>
  )
}
