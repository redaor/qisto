import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Debt, Payment, UserProfile, DebtFormData, SalaryInput, RepayStrategy, SharedLink } from '@/types'

// Payment enriched with the debt's contact_name for cross-debt history views
export interface PaymentWithDebt extends Payment {
  contact_name: string
}

interface DebtStore {
  debts: Debt[]
  archivedDebts: Debt[]
  payments: Record<string, Payment[]>
  allPayments: PaymentWithDebt[]
  profile: UserProfile | null
  loading: boolean
  error: string | null
  strategy: RepayStrategy
  celebratingDebtId: string | null

  fetchDebts: () => Promise<void>
  fetchArchivedDebts: () => Promise<void>
  fetchProfile: () => Promise<void>
  fetchPayments: (debtId: string) => Promise<void>
  fetchAllPayments: () => Promise<void>
  addDebt: (data: DebtFormData) => Promise<void>
  recordPayment: (debtId: string, amount: number, note?: string) => Promise<void>
  updateSalary: (data: SalaryInput) => Promise<void>
  deleteDebt: (id: string) => Promise<void>
  setStrategy: (s: RepayStrategy) => void
  setCelebrating: (id: string | null) => void
  createSharedLink: (debtId: string) => Promise<SharedLink | null>
  clearError: () => void
}

export const useDebtStore = create<DebtStore>((set, get) => ({
  debts: [],
  archivedDebts: [],
  payments: {},
  allPayments: [],
  profile: null,
  loading: false,
  error: null,
  strategy: 'equal',
  celebratingDebtId: null,

  clearError: () => set({ error: null }),
  setStrategy: (strategy) => set({ strategy }),
  setCelebrating: (celebratingDebtId) => set({ celebratingDebtId }),

  fetchDebts: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('status', 'active')
      .order('remaining_amount', { ascending: false })
    if (error) set({ error: error.message, loading: false })
    else set({ debts: data as Debt[], loading: false })
  },

  fetchArchivedDebts: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .in('status', ['paid', 'archived'])
      .order('created_at', { ascending: false })
    if (error) set({ error: error.message, loading: false })
    else set({ archivedDebts: data as Debt[], loading: false })
  },

  fetchProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (!error && data) set({ profile: data as UserProfile })
  },

  fetchPayments: async (debtId: string) => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('debt_id', debtId)
      .order('paid_at', { ascending: false })
    if (!error && data) {
      set(state => ({
        payments: { ...state.payments, [debtId]: data as Payment[] }
      }))
    }
  },

  fetchAllPayments: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Join payments → debts to get contact_name in one query
    const { data, error } = await supabase
      .from('payments')
      .select('*, debts(contact_name)')
      .eq('debts.user_id', user.id)
      .order('paid_at', { ascending: false })
      .limit(50)
    if (!error && data) {
      const enriched = (data as (Payment & { debts: { contact_name: string } | null })[])
        .filter(p => p.debts !== null)
        .map(p => ({
          ...p,
          contact_name: p.debts!.contact_name,
        }))
      set({ allPayments: enriched })
    }
  },

  addDebt: async (formData: DebtFormData) => {
    set({ loading: true, error: null })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { set({ loading: false, error: 'Non authentifié' }); return }
    const { error } = await supabase.from('debts').insert({
      user_id: user.id,
      contact_name: formData.contact_name,
      type: formData.type,
      total_amount: formData.total_amount,
      remaining_amount: formData.total_amount,
      description: formData.description || null,
      due_date: formData.due_date || null,
      start_date: formData.start_date || null,
      interest_rate: formData.interest_rate || 0,
      category: formData.category || 'other',
      min_payment: formData.min_payment || 0,
    })
    if (error) set({ error: error.message, loading: false })
    else await get().fetchDebts()
  },

  recordPayment: async (debtId: string, amount: number, note?: string) => {
    set({ loading: true, error: null })
    const debt = get().debts.find(d => d.id === debtId)
    if (!debt) { set({ loading: false }); return }
    const newRemaining = Math.max(0, debt.remaining_amount - amount)
    const newStatus = newRemaining === 0 ? 'paid' : 'active'
    const now = new Date().toISOString()
    const { error: payErr } = await supabase.from('payments').insert({
      debt_id: debtId,
      amount,
      note: note || null,
      paid_at: now,
    })
    if (payErr) { set({ error: payErr.message, loading: false }); return }
    const { error: debtErr } = await supabase
      .from('debts')
      .update({
        remaining_amount: newRemaining,
        status: newStatus,
        ...(newRemaining === 0 ? { paid_at: now } : {}),
      })
      .eq('id', debtId)
    if (debtErr) set({ error: debtErr.message, loading: false })
    else {
      if (newRemaining === 0) get().setCelebrating(debtId)
      await get().fetchDebts()
      await get().fetchPayments(debtId)
      await get().fetchAllPayments()
    }
  },

  updateSalary: async (data: SalaryInput) => {
    set({ loading: true, error: null })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { set({ loading: false }); return }
    const { error } = await supabase
      .from('profiles')
      .update({
        salary_net: data.salary_net,
        fixed_charges: data.fixed_charges,
        currency: data.currency,
        debt_free_target: data.debt_free_target ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    if (error) set({ error: error.message, loading: false })
    else set({ profile: { ...get().profile!, ...data }, loading: false })
  },

  deleteDebt: async (id: string) => {
    set({ loading: true, error: null })
    const { error } = await supabase.from('debts').update({ status: 'archived' }).eq('id', id)
    if (error) set({ error: error.message, loading: false })
    else set({ debts: get().debts.filter(d => d.id !== id), loading: false })
  },

  createSharedLink: async (debtId: string) => {
    const { data, error } = await supabase
      .from('shared_links')
      .insert({ debt_id: debtId })
      .select()
      .single()
    if (error || !data) return null
    return data as SharedLink
  },
}))
