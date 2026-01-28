"use client"

import {
  useToast,
} from "@/components/ui/use-toast"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function Toaster() {
  const { toasts, toast } = useToast()
  const router = useRouter()
  const [hasCheckedUrl, setHasCheckedUrl] = useState(false)

  useEffect(() => {
    // Lire le paramètre success depuis l'URL une seule fois au montage
    if (typeof window === 'undefined' || hasCheckedUrl) return

    const params = new URLSearchParams(window.location.search)
    const successMessage = params.get('success')

    if (successMessage) {
      toast({
        title: decodeURIComponent(successMessage),
        variant: "default",
      })
      
      // Retirer le paramètre de l'URL après affichage
      params.delete('success')
      const newUrl = params.toString() 
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname
      router.replace(newUrl, { scroll: false })
    }
    
    setHasCheckedUrl(true)
  }, [router, toast, hasCheckedUrl])

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toastItem) => (
        <div
          key={toastItem.id}
          className="bg-green-500/90 text-white px-6 py-4 rounded-2xl shadow-lg border border-green-400/50 transition-all duration-300 animate-in slide-in-from-top-5"
        >
          <p className="font-semibold">{toastItem.title}</p>
          {toastItem.description && (
            <p className="text-sm mt-1 opacity-90">{toastItem.description}</p>
          )}
        </div>
      ))}
    </div>
  )
}
