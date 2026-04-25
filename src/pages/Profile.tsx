import { useEffect, useState } from 'react'
import { useDebtStore } from '@/store/useDebtStore'
import { ScenarioCard } from '@/components/profile/ScenarioCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { calcScenarios, calcTotals } from '@/lib/calculations'
import { formatCurrency } from '@/lib/formatters'
import { useAuth } from '@/hooks/useAuth'

export function Profile() {
  const { profile, fetchProfile, updateSalary, loading, debts, fetchDebts } = useDebtStore()
  const { user, signOut } = useAuth()

  const [salary, setSalary] = useState('')
  const [charges, setCharges] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchProfile()
    fetchDebts()
  }, [])

  useEffect(() => {
    if (profile) {
      setSalary(profile.salary_net.toString())
      setCharges(profile.fixed_charges.toString())
    }
  }, [profile])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateSalary({
      salary_net: parseFloat(salary) || 0,
      fixed_charges: parseFloat(charges) || 0,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const totalDebt = calcTotals(debts).iOwe
  const salaryNum = parseFloat(salary) || 0
  const chargesNum = parseFloat(charges) || 0
  const scenarios = calcScenarios(totalDebt, salaryNum, chargesNum)
  const available = salaryNum - chargesNum

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <button onClick={signOut} className="text-sm text-gray-400 hover:text-gray-600">
          Sign out
        </button>
      </div>

      <p className="text-sm text-gray-400">{user?.email}</p>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-1">Your income</h2>
        <p className="text-sm text-gray-400 mb-4">
          Used to calculate your recommended monthly payment
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Net monthly salary"
            type="number"
            prefix="€"
            placeholder="0"
            value={salary}
            onChange={e => setSalary(e.target.value)}
            min={0}
          />
          <Input
            label="Fixed monthly charges (rent, bills...)"
            type="number"
            prefix="€"
            placeholder="0"
            value={charges}
            onChange={e => setCharges(e.target.value)}
            min={0}
          />

          {available > 0 && (
            <div className="bg-emerald-50 rounded-xl p-3 text-sm text-emerald-700">
              Available after charges: <strong>{formatCurrency(available)}</strong>
            </div>
          )}
          {available < 0 && (
            <div className="bg-red-50 rounded-xl p-3 text-sm text-red-600">
              Your charges exceed your salary. Please review your figures.
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full">
            {saved ? 'Saved!' : 'Save'}
          </Button>
        </form>
      </div>

      {scenarios && totalDebt > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-1">Repayment scenarios</h2>
          <p className="text-sm text-gray-400 mb-4">
            Based on {formatCurrency(totalDebt)} total debt
          </p>
          <div className="space-y-3">
            {scenarios.map((s, i) => (
              <ScenarioCard key={s.label} scenario={s} highlight={i === 1} />
            ))}
          </div>
        </div>
      )}

      {scenarios === null && salaryNum > 0 && totalDebt === 0 && (
        <div className="bg-emerald-50 rounded-2xl p-5 text-center">
          <p className="font-semibold text-emerald-700">You have no active debts!</p>
        </div>
      )}
    </div>
  )
}
