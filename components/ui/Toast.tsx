'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Toast() {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Lire le paramètre success depuis l'URL
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const successMessage = params.get('success')

    if (successMessage) {
      setMessage(decodeURIComponent(successMessage))
      setIsVisible(true)
      
      // Retirer le paramètre de l'URL après affichage
      params.delete('success')
      const newUrl = params.toString() 
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname
      router.replace(newUrl, { scroll: false })

      // Masquer après 4 secondes
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => setMessage(null), 300)
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [router])

  if (!message || !isVisible) return null

  return (
    <div
      className={`fixed top-4 right-4 z-50 bg-green-500/90 text-white px-6 py-4 rounded-2xl shadow-lg border border-green-400/50 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <p className="font-semibold">{message}</p>
    </div>
  )
}
