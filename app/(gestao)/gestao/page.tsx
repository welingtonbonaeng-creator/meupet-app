'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function GestaoRoot() {
  const router = useRouter()
  useEffect(() => { router.replace('/gestao/usuarios') }, [])
  return null
}
