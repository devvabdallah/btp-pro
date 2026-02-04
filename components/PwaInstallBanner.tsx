'use client'

import { useEffect, useState } from 'react'
import Button from './ui/Button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PwaInstallBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Détecter si on est sur mobile (simple check)
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
      const isSmallScreen = window.innerWidth < 768
      return isMobileDevice || isSmallScreen
    }

    // Détecter si l'app est déjà installée (standalone mode)
    const checkStandalone = () => {
      // Vérifier display-mode via matchMedia
      const standalone = window.matchMedia('(display-mode: standalone)').matches
      // Vérifier aussi via window.navigator.standalone (iOS)
      const isStandaloneMode = standalone || (window.navigator as any).standalone === true
      return isStandaloneMode
    }

    // Vérifier localStorage pour "Plus tard"
    const checkDismissed = () => {
      const dismissedAt = localStorage.getItem('pwa-banner-dismissed')
      if (dismissedAt) {
        const dismissedTime = parseInt(dismissedAt, 10)
        const now = Date.now()
        const thirtyDays = 30 * 24 * 60 * 60 * 1000 // 30 jours en ms
        
        // Si moins de 30 jours se sont écoulés, ne pas afficher
        if (now - dismissedTime < thirtyDays) {
          return false
        } else {
          // Plus de 30 jours, supprimer la clé
          localStorage.removeItem('pwa-banner-dismissed')
        }
      }
      return true
    }

    // Initialiser les états
    const mobile = checkMobile()
    const standalone = checkStandalone()
    setIsMobile(mobile)
    setIsStandalone(standalone)

    // Si déjà installé ou pas mobile, ne rien faire
    if (standalone || !mobile) {
      return
    }

    // Vérifier si l'utilisateur a déjà cliqué "Plus tard"
    if (!checkDismissed()) {
      return
    }

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      // Empêcher le prompt par défaut
      e.preventDefault()
      // Stocker l'event pour l'utiliser plus tard
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Afficher le bandeau seulement si toujours mobile et pas standalone
      const stillMobile = checkMobile()
      const stillStandalone = checkStandalone()
      if (stillMobile && !stillStandalone) {
        setShowBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Vérifier à nouveau au resize
    const handleResize = () => {
      const mobile = checkMobile()
      const standalone = checkStandalone()
      setIsMobile(mobile)
      setIsStandalone(standalone)
      if (standalone || !mobile) {
        setShowBanner(false)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Réévaluer showBanner quand isMobile ou isStandalone change
  useEffect(() => {
    if (isStandalone || !isMobile) {
      setShowBanner(false)
    }
  }, [isMobile, isStandalone])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      // Afficher le prompt d'installation
      await deferredPrompt.prompt()
      
      // Attendre la réponse de l'utilisateur
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        // L'utilisateur a accepté, cacher le bandeau
        setShowBanner(false)
      }
      
      // Réinitialiser
      setDeferredPrompt(null)
    } catch (error) {
      console.error('Erreur lors de l\'installation PWA:', error)
      setShowBanner(false)
    }
  }

  const handleLater = () => {
    // Stocker le timestamp dans localStorage
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString())
    setShowBanner(false)
  }

  // Ne rien afficher si le bandeau ne doit pas être visible
  if (!showBanner || isStandalone || !isMobile) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 pwa-banner-slide-up">
      <div className="max-w-2xl mx-auto bg-gradient-to-br from-[#111827] to-[#020617] border border-white/10 rounded-2xl p-4 md:p-5 shadow-2xl shadow-black/50 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Texte */}
          <div className="flex-1">
            <h3 className="text-white font-semibold text-base md:text-lg mb-1">
              Installer BTP PRO
            </h3>
            <p className="text-gray-300 text-sm md:text-base">
              Accédez rapidement à vos devis et factures depuis votre écran d'accueil
            </p>
          </div>

          {/* Boutons */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleLater}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors whitespace-nowrap"
            >
              Plus tard
            </button>
            <Button
              onClick={handleInstall}
              variant="primary"
              size="sm"
              className="whitespace-nowrap"
            >
              Installer
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
