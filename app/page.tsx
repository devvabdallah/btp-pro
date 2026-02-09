'use client'

import Link from 'next/link'
import { useState } from 'react'
import Button from '@/components/ui/Button'
import Logo from '@/components/Logo'

interface ScreenshotImgProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  loading?: 'lazy' | 'eager'
  decoding?: 'async' | 'auto' | 'sync'
}

function ScreenshotImg({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'eager',
  decoding = 'async',
}: ScreenshotImgProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-3 md:p-4 shadow-[0_20px_80px_rgba(0,0,0,0.55)] transition-transform duration-300 hover:-translate-y-1">
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`block w-full h-auto rounded-2xl ${className}`}
        loading={loading}
        decoding={decoding}
      />
    </div>
  )
}

function MockScreenshot({ label }: { label: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-8 md:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.55)] min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-4 rounded-xl bg-white/10 flex items-center justify-center">
          <span className="text-4xl">📱</span>
        </div>
        <p className="text-white/60 text-lg">{label}</p>
      </div>
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border border-white/10 rounded-xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <span className="text-white font-semibold text-lg">{question}</span>
        <span className={`text-orange-400 text-2xl transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="px-6 py-4 border-t border-white/10">
          <p className="text-gray-300 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0d1228] to-[#0a0e27]">
      {/* Header */}
      <header className="w-full bg-[#0a0e27]/95 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50 shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 py-5 md:py-6">
          <Link href="/">
            <Logo size="md" showText={true} />
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/login">
              <Button variant="secondary" size="sm" className="border-white/20 text-gray-300 hover:border-white/30 hover:bg-white/5">
                Connexion
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm" className="relative">
                Inscription
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 1) HERO Section */}
      <section className="w-full px-4 py-20 md:py-28 md:px-8 bg-gradient-to-br from-[#0a0e27] via-[#0d1228] to-[#0a0e27]">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6 md:mb-8">
            BTP PRO — Devis & factures en 30 secondes
          </h1>
          <p className="text-xl md:text-2xl text-white/70 mb-10 md:mb-12 leading-relaxed">
            Pour artisans et petites équipes
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link href="/register" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-lg shadow-orange-500/20 hover:brightness-110 hover:shadow-xl hover:shadow-orange-500/30 transition-all text-lg px-8 py-4">
                Essai gratuit 5 jours
              </Button>
            </Link>
            <Link href="#comment" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto border-white/20 text-white hover:border-white/30 hover:bg-white/5 text-lg px-8 py-4">
                Voir une démo
              </Button>
            </Link>
          </div>
          <p className="text-base md:text-lg text-white/50">
            Sans carte bancaire. Annulable.
          </p>
        </div>
      </section>

      {/* 2) PROOF / BENEFITS Section */}
      <section className="w-full px-4 py-16 md:py-20 md:px-8 bg-gradient-to-br from-[#0d1228] to-[#0f1429]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Carte 1 */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8 md:p-10 border border-white/10 shadow-xl shadow-black/30 backdrop-blur-sm">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Devis → Facture en 1 clic
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Transforme ton devis en facture instantanément, sans ressaisie.
              </p>
            </div>

            {/* Carte 2 */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8 md:p-10 border border-white/10 shadow-xl shadow-black/30 backdrop-blur-sm">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
                <span className="text-3xl">📋</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Suivi chantiers ultra simple
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Centralise tous tes chantiers, clients et documents au même endroit.
              </p>
            </div>

            {/* Carte 3 */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8 md:p-10 border border-white/10 shadow-xl shadow-black/30 backdrop-blur-sm">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30">
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Accès Employés + Patron
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Employés (accès limité) et Patron (dashboard complet) sur la même plateforme.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3) COMMENT ÇA MARCHE Section */}
      <section id="comment" className="w-full px-4 py-16 md:py-20 md:px-8 bg-gradient-to-br from-[#0a0e27] to-[#0d1228]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white text-center mb-12 md:mb-16">
            Comment ça marche
          </h2>
          <div className="space-y-12 md:space-y-16">
            {/* Étape 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-500 text-white font-bold text-xl mb-6">
                  1
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Crée ton compte
                </h3>
                <p className="text-lg text-white/70 leading-relaxed">
                  Inscris-toi en 2 minutes, commence immédiatement ton essai gratuit.
                </p>
              </div>
              <div className="flex items-center justify-center lg:justify-end">
                <div className="w-full max-w-md">
                  <MockScreenshot label="Création de compte" />
                </div>
              </div>
            </div>

            {/* Étape 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="flex items-center justify-center lg:justify-start order-2 lg:order-1">
                <div className="w-full max-w-md">
                  <ScreenshotImg 
                    src="/screens/devis.png" 
                    alt="Écran création de devis – BTP PRO"
                    width={1200}
                    height={800}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
              <div className="text-center lg:text-left order-1 lg:order-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-500 text-white font-bold text-xl mb-6">
                  2
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Fais ton 1er devis
                </h3>
                <p className="text-lg text-white/70 leading-relaxed">
                  Ajoute tes clients, crée ton premier devis en quelques clics.
                </p>
              </div>
            </div>

            {/* Étape 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-500 text-white font-bold text-xl mb-6">
                  3
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Convertis en facture & encaisse
                </h3>
                <p className="text-lg text-white/70 leading-relaxed">
                  Transforme ton devis accepté en facture, envoie-la et suis le paiement.
                </p>
              </div>
              <div className="flex items-center justify-center lg:justify-end">
                <div className="w-full max-w-md">
                  <ScreenshotImg 
                    src="/screens/chantiers.png" 
                    alt="Écran gestion factures – BTP PRO"
                    width={1200}
                    height={800}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4) CAPTURES Section */}
      <section className="w-full px-4 py-16 md:py-20 md:px-8 bg-gradient-to-br from-[#0d1228] to-[#0f1429]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white text-center mb-12 md:mb-16">
            Aperçu du logiciel
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <ScreenshotImg 
              src="/screens/devis.png" 
              alt="Écran Mes devis – BTP PRO"
              width={1200}
              height={800}
              loading="lazy"
              decoding="async"
            />
            <ScreenshotImg 
              src="/screens/chantiers.png" 
              alt="Écran Mes chantiers – BTP PRO"
              width={1200}
              height={800}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>

      {/* 5) PRICING Section */}
      <section className="w-full px-4 py-16 md:py-20 md:px-8 bg-gradient-to-br from-[#0a0e27] to-[#0d1228]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-8 md:mb-12">
            Tarification simple
          </h2>
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-10 md:p-16 border border-white/10 shadow-xl shadow-black/30 backdrop-blur-sm">
            <div className="mb-8">
              <div className="text-5xl md:text-7xl font-bold text-white mb-4">
                50€<span className="text-2xl md:text-3xl text-white/60">/mois</span>
              </div>
              <p className="text-xl md:text-2xl text-white/70 mb-6">
                Essai gratuit 5 jours
              </p>
              <p className="text-lg text-white/60">
                Sans engagement
              </p>
            </div>
            <Link href="/register" className="inline-block">
              <Button variant="primary" size="lg" className="shadow-lg shadow-orange-500/20 hover:brightness-110 hover:shadow-xl hover:shadow-orange-500/30 transition-all text-lg px-10 py-5">
                Commencer l'essai
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 6) FAQ Section */}
      <section className="w-full px-4 py-16 md:py-20 md:px-8 bg-gradient-to-br from-[#0d1228] to-[#0f1429]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white text-center mb-12 md:mb-16">
            Questions fréquentes
          </h2>
          <div className="space-y-4">
            <FAQItem
              question="Faut-il une carte bancaire ?"
              answer="Non, l'essai gratuit de 5 jours ne nécessite aucune carte bancaire. Tu peux tester BTP PRO sans engagement."
            />
            <FAQItem
              question="Je peux annuler quand ?"
              answer="À tout moment, sans frais ni engagement. Annule depuis ton tableau de bord en quelques clics."
            />
            <FAQItem
              question="Mes employés voient quoi ?"
              answer="Les employés ont accès aux chantiers, clients et tâches qui leur sont assignés. Ils ne voient pas les données financières ni le dashboard patron."
            />
            <FAQItem
              question="Puis-je exporter mes factures ?"
              answer="Oui, toutes tes factures peuvent être exportées en PDF depuis l'interface. Tu gardes le contrôle total sur tes documents."
            />
          </div>
        </div>
      </section>

      {/* 7) FOOTER */}
      <footer className="w-full px-4 py-12 md:py-16 md:px-8 bg-[#0a0e27] border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-white font-semibold text-lg md:text-xl">
              © BTP PRO
            </p>
            <div className="flex items-center gap-4 md:gap-6">
              <Link href="/login" className="text-gray-400 hover:text-white transition-colors">
                Connexion
              </Link>
              <Link href="/register" className="text-gray-400 hover:text-white transition-colors">
                Inscription
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
