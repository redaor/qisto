export type DebtType = 'owed_to_me' | 'i_owe'
export type DebtStatus = 'active' | 'paid' | 'archived'

export interface UserProfile {
  id: string
  salary_net: number
  fixed_charges: number
  currency: string
  updated_at: string
}

export interface Debt {
  id: string
  user_id: string
  contact_name: string
  type: DebtType
  total_amount: number
  remaining_amount: number
  description: string | null
  due_date: string | null
  status: DebtStatus
  created_at: string
}

export interface Payment {
  id: string
  debt_id: string
  amount: number
  paid_at: string
  note: string | null
}

export interface PaymentScenario {
  label: string
  percentage: number
  monthly: number
  months: number
  endDate: string
}

export interface SalaryInput {
  salary_net: number
  fixed_charges: number
}

export interface DebtFormData {
  contact_name: string
  type: DebtType
  total_amount: number
  description: string
  due_date: string
}
