'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function SpaRedirectHandler() {
  const router = useRouter()
  useEffect(() => {
    const redirect = sessionStorage.getItem('spa_redirect')
    if (redirect && redirect !== '/') {
      sessionStorage.removeItem('spa_redirect')
      router.replace(redirect)
    }
  }, [router])
  return null
}
