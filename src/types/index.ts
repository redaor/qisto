export type DebtType     = 'owed_to_me' | 'i_owe'
export type DebtStatus   = 'active' | 'paid' | 'archived'
export type Currency     = 'EUR' | 'DZD' | 'USD'
export type DebtCategory = 'loan' | 'rent' | 'food' | 'travel' | 'service' | 'other'
export type RepayStrategy = 'avalanche' | 'snowball' | 'equal'

export interface UserProfile {
  id: string
  salary_net: number
  fixed_charges: number
  currency: Currency
  debt_free_target: string | null
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
  start_date: string | null
  paid_at: string | null
  status: DebtStatus
  created_at: string
  interest_rate: number
  category: DebtCategory
  min_payment: number
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
  currency: Currency
  debt_free_target?: string | null
}

export interface DebtFormData {
  contact_name: string
  type: DebtType
  total_amount: number
  description: string
  due_date: string
  start_date: string
  interest_rate: number
  category: DebtCategory
  min_payment: number
}

export interface DebtWithUrgency extends Debt {
  daysUntilDue: number | null
  isUrgent: boolean
}

export interface WhatIfResult {
  months: number
  endDate: string
  totalInterest: number
}

export interface PersonGroup {
  contact_name: string
  debts: Debt[]
  totalOwed: number
  totalOwing: number
  net: number
}

export interface SharedLink {
  id: string
  debt_id: string
  token: string
  expires_at: string
  created_at: string
}
