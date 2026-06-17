'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Pet, DiaryEntry, WeightHistory, Expense } from '@/types'

export function usePets() {
  const supabase = createClient()
  const [pets, setPets]       = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('pets').select('*').eq('active', true).order('created_at')
    setPets(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createPet(pet: Partial<Pet>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase.from('pets').insert({ ...pet, user_id: user.id }).select().single()
    if (!error) setPets(p => [...p, data])
    return data
  }

  async function updatePet(id: string, updates: Partial<Pet>) {
    const { data, error } = await supabase.from('pets').update(updates).eq('id', id).select().single()
    if (!error) setPets(p => p.map(x => x.id === id ? data : x))
    return data
  }

  async function deletePet(id: string) {
    await supabase.from('pets').update({ active: false }).eq('id', id)
    setPets(p => p.filter(x => x.id !== id))
  }

  return { pets, loading, reload: load, createPet, updatePet, deletePet }
}

export function useDiary(petId?: string) {
  const supabase = createClient()
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!petId) { setLoading(false); return }
    supabase.from('pet_diary').select('*').eq('pet_id', petId).order('occurred_at', { ascending: false })
      .then(({ data }) => { setEntries(data || []); setLoading(false) })
  }, [petId])

  async function addEntry(entry: Partial<DiaryEntry>) {
    const { data, error } = await supabase.from('pet_diary').insert(entry).select().single()
    if (!error) setEntries(p => [data, ...p])
    return data
  }

  async function updateEntry(id: string, updates: Partial<DiaryEntry>) {
    const { data, error } = await supabase.from('pet_diary').update(updates).eq('id', id).select().single()
    if (!error) setEntries(p => p.map(x => x.id === id ? data : x))
    return data
  }

  async function deleteEntry(id: string) {
    await supabase.from('pet_diary').delete().eq('id', id)
    setEntries(p => p.filter(x => x.id !== id))
  }

  return { entries, loading, addEntry, updateEntry, deleteEntry }
}

export function useWeightHistory(petId?: string) {
  const supabase = createClient()
  const [history, setHistory] = useState<WeightHistory[]>([])

  useEffect(() => {
    if (!petId) return
    supabase.from('pet_weight_history').select('*').eq('pet_id', petId).order('measured_at')
      .then(({ data }) => setHistory(data || []))
  }, [petId])

  async function addWeight(entry: { pet_id: string; weight_kg: number; notes?: string; measured_at: string }) {
    const { data, error } = await supabase.from('pet_weight_history').insert(entry).select().single()
    if (!error) setHistory(p => [...p, data].sort((a, b) => a.measured_at.localeCompare(b.measured_at)))
    return data
  }

  return { history, addWeight }
}

export function useExpenses(petId?: string) {
  const supabase = createClient()
  const [expenses, setExpenses] = useState<Expense[]>([])

  useEffect(() => {
    if (!petId) return
    supabase.from('pet_expenses').select('*').eq('pet_id', petId).order('expense_date', { ascending: false })
      .then(({ data }) => setExpenses(data || []))
  }, [petId])

  async function addExpense(expense: Partial<Expense>) {
    const { data, error } = await supabase.from('pet_expenses').insert(expense).select().single()
    if (!error) setExpenses(p => [data, ...p])
    return data
  }

  async function deleteExpense(id: string) {
    await supabase.from('pet_expenses').delete().eq('id', id)
    setExpenses(p => p.filter(x => x.id !== id))
  }

  return { expenses, addExpense, deleteExpense }
}
