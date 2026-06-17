export type PetSpecies = 'dog' | 'cat' | 'bird' | 'rabbit' | 'fish' | 'hamster' | 'other'
export type PetSex = 'male' | 'female'
export type DiaryType = 'vaccine' | 'deworming' | 'appointment' | 'grooming' | 'bath' | 'surgery' | 'medication' | 'exam' | 'weight' | 'note' | 'other'
export type ExpenseCategory = 'vet' | 'food' | 'grooming' | 'medicine' | 'accessory' | 'vaccine' | 'exam' | 'other'
export type Plan = 'free' | 'family' | 'premium'

export interface Profile {
  id: string
  name: string
  phone?: string
  city?: string
  state?: string
  avatar_url?: string
  plan: Plan
  trial_ends_at?: string
  created_at: string
  updated_at: string
}

export interface Pet {
  id: string
  user_id: string
  name: string
  species: PetSpecies
  breed?: string
  sex?: PetSex
  birth_date?: string
  weight_kg?: number
  ideal_weight?: number
  neutered: boolean
  microchip?: string
  color?: string
  vet_name?: string
  vet_phone?: string
  notes?: string
  photo_url?: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface WeightHistory {
  id: string
  pet_id: string
  weight_kg: number
  notes?: string
  measured_at: string
  created_at: string
}

export interface DiaryEntry {
  id: string
  pet_id: string
  type: DiaryType
  title: string
  description?: string
  occurred_at: string
  next_date?: string
  cost_brl?: number
  vet_name?: string
  product_name?: string
  document_url?: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  pet_id?: string
  diary_id?: string
  title: string
  body?: string
  type: string
  scheduled_at: string
  sent: boolean
  read: boolean
  created_at: string
}

export interface Expense {
  id: string
  pet_id: string
  category: ExpenseCategory
  title: string
  description?: string
  amount_brl: number
  expense_date: string
  notes?: string
  created_at: string
}

export interface NutritionReport {
  id: string
  pet_id: string
  weight_kg?: number
  age_months?: number
  activity?: string
  food_type?: string
  report_json?: Record<string, unknown>
  created_at: string
}

export interface TrainingPlan {
  id: string
  pet_id: string
  problem: string
  plan_7d?: Record<string, unknown>
  plan_30d?: Record<string, unknown>
  active: boolean
  created_at: string
}

export interface PetPersonality {
  id: string
  pet_id: string
  profile_text?: string
  nicknames?: string[]
  fun_facts?: string[]
  certificate_url?: string
  created_at: string
}

export const DIARY_TYPE_LABELS: Record<DiaryType, string> = {
  vaccine:     'Vacina',
  deworming:   'Vermífugo',
  appointment: 'Consulta',
  grooming:    'Tosa',
  bath:        'Banho',
  surgery:     'Cirurgia',
  medication:  'Medicamento',
  exam:        'Exame',
  weight:      'Pesagem',
  note:        'Anotação',
  other:       'Outro',
}

export const DIARY_TYPE_ICONS: Record<DiaryType, string> = {
  vaccine:     '💉',
  deworming:   '💊',
  appointment: '🩺',
  grooming:    '✂️',
  bath:        '🛁',
  surgery:     '🏥',
  medication:  '💊',
  exam:        '🔬',
  weight:      '⚖️',
  note:        '📝',
  other:       '📋',
}

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  vet:       'Veterinário',
  food:      'Ração/Alimentação',
  grooming:  'Banho/Tosa',
  medicine:  'Medicamentos',
  accessory: 'Acessórios',
  vaccine:   'Vacinas',
  exam:      'Exames',
  other:     'Outros',
}

export const SPECIES_LABELS: Record<PetSpecies, string> = {
  dog:     'Cachorro',
  cat:     'Gato',
  bird:    'Pássaro',
  rabbit:  'Coelho',
  fish:    'Peixe',
  hamster: 'Hamster',
  other:   'Outro',
}
