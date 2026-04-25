import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebtStore } from '@/store/useDebtStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { DebtType } from '@/types'

export function AddDebt() {
  const navigate = useNavigate()
  const { addDebt, loading } = useDebtStore()

  const [form, setForm] = useState({
    contact_name: '',
    type: 'owed_to_me' as DebtType,
    total_amount: '',
    description: '',
    due_date: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.contact_name || !form.total_amount) return

    await addDebt({
      contact_name: form.contact_name,
      type: form.type,
      total_amount: parseFloat(form.total_amount),
      description: form.description,
      due_date: form.due_date,
    })
    navigate('/debts')
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">New debt</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Type</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'owed_to_me', label: 'Owes me' },
              { value: 'i_owe',      label: 'I owe' },
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

        <Input
          label="Person's name"
          placeholder="Ali, Karim..."
          value={form.contact_name}
          onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
          required
        />

        <Input
          label="Amount"
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
          label="Description (optional)"
          placeholder="e.g. Loan for rent"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        />

        <Input
          label="Due date (optional)"
          type="date"
          value={form.due_date}
          onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
        />

        <Button type="submit" loading={loading} className="w-full mt-4">
          Save debt
        </Button>
      </form>
    </div>
  )
}
