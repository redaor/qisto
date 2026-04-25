import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Debt, UserProfile, DebtFormData, SalaryInput } from '@/types'

interface DebtStore {
  debts: Debt[]
  profile: UserProfile | null
  loading: boolean
  error: string | null

  fetchDebts: () => Promise<void>
  fetchProfile: () => Promise<void>
  addDebt: (data: DebtFormData) => Promise<void>
  recordPayment: (debtId: string, amount: number, note?: string) => Promise<void>
  updateSalary: (data: SalaryInput) => Promise<void>
  deleteDebt: (id: string) => Promise<void>
  clearError: () => void
}

export const useDebtStore = create<DebtStore>((set, get) => ({
  debts: [],
  profile: null,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchDebts: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ debts: data as Debt[], loading: false })
    }
  },

  fetchProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!error && data) {
      set({ profile: data as UserProfile })
    }
  },

  addDebt: async (formData: DebtFormData) => {
    set({ loading: true, error: null })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { set({ loading: false, error: 'Not authenticated' }); return }

    const { error } = await supabase.from('debts').insert({
      user_id: user.id,
      contact_name: formData.contact_name,
      type: formData.type,
      total_amount: formData.total_amount,
      remaining_amount: formData.total_amount,
      description: formData.description || null,
      due_date: formData.due_date || null,
    })

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      await get().fetchDebts()
    }
  },

  recordPayment: async (debtId: string, amount: number, note?: string) => {
    set({ loading: true, error: null })

    const debt = get().debts.find(d => d.id === debtId)
    if (!debt) { set({ loading: false }); return }

    const newRemaining = Math.max(0, debt.remaining_amount - amount)
    const newStatus = newRemaining === 0 ? 'paid' : 'active'

    const { error: payErr } = await supabase.from('payments').insert({
      debt_id: debtId,
      amount,
      note: note || null,
    })

    if (payErr) { set({ error: payErr.message, loading: false }); return }

    const { error: debtErr } = await supabase
      .from('debts')
      .update({ remaining_amount: newRemaining, status: newStatus })
      .eq('id', debtId)

    if (debtErr) {
      set({ error: debtErr.message, loading: false })
    } else {
      await get().fetchDebts()
    }
  },

  updateSalary: async (data: SalaryInput) => {
    set({ loading: true, error: null })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { set({ loading: false }); return }

    const { error } = await supabase
      .from('profiles')
      .update({ salary_net: data.salary_net, fixed_charges: data.fixed_charges, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ profile: { ...get().profile!, ...data }, loading: false })
    }
  },

  deleteDebt: async (id: string) => {
    set({ loading: true, error: null })
    const { error } = await supabase.from('debts').update({ status: 'archived' }).eq('id', id)

    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ debts: get().debts.filter(d => d.id !== id), loading: false })
    }
  },
}))
