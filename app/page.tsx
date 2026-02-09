'use client'

import Link from 'next/link'
import Button from '@/components/ui/Button'
import Logo from '@/components/Logo'

interface ScreenshotImgProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  style?: React.CSSProperties
  loading?: 'lazy' | 'eager'
  decoding?: 'async' | 'auto' | 'sync'
}

function ScreenshotImg({
  src,
  alt,
  width,
  height,
  className = '',
  style = {},
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
        className="block w-full h-auto rounded-2xl"
        style={style}
        loading={loading}
        decoding={decoding}
      />
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
                Me connecter
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm" className="relative">
                Créer un compte
                <span className="ml-1.5 text-xs font-normal opacity-90">(5 jours gratuits)</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full px-4 py-16 md:py-20 md:px-8 bg-gradient-to-br from-[#0a0e27] via-[#0d1228] to-[#0a0e27]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-center">
            {/* Texte à gauche */}
            <div className="text-center lg:text-left">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4 md:mb-6">
                Le logiciel simple pour gérer devis et chantiers.
              </h1>
              <p className="text-base md:text-lg text-white/70 leading-relaxed mb-6 md:mb-8">
                Pensé pour les artisans et petites équipes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-center lg:justify-start">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-lg shadow-orange-500/20 hover:brightness-110 hover:shadow-xl hover:shadow-orange-500/30 transition-all">
                    Essai gratuit 5 jours
                  </Button>
                </Link>
              </div>
              <p className="text-sm md:text-base text-white/50">
                Sans carte bancaire • Annulable à tout moment • 50€/mois après essai
              </p>
            </div>

            {/* Screenshot principal */}
            <div className="flex items-center justify-center lg:justify-end">
              <div className="w-full max-w-3xl">
                <ScreenshotImg 
                  src="/screens/chantiers.png" 
                  alt="Écran Mes chantiers – BTP PRO"
                  width={1200}
                  height={800}
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Chantiers */}
      <section className="w-full px-4 py-16 md:py-20 md:px-8 bg-gradient-to-br from-[#0d1228] to-[#0f1429]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-center">
            {/* Screenshot à gauche */}
            <div className="flex items-center justify-center lg:justify-start order-2 lg:order-1">
              <div className="w-full max-w-3xl">
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

            {/* Texte à droite */}
            <div className="text-center lg:text-left order-1 lg:order-2">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4 md:mb-6">
                Chantiers, au carré.
              </h2>
              <p className="text-base md:text-lg text-white/70 leading-relaxed">
                Tout est centralisé, sans friction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section Devis */}
      <section className="w-full px-4 py-16 md:py-20 md:px-8 bg-gradient-to-br from-[#0a0e27] to-[#0d1228]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-center">
            {/* Texte à gauche */}
            <div className="text-center lg:text-left">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4 md:mb-6">
                Devis
              </h2>
              <p className="text-base md:text-lg text-white/70 leading-relaxed">
                Créer, envoyer, c'est réglé.
              </p>
            </div>

            {/* Screenshot à droite */}
            <div className="flex items-center justify-center lg:justify-end">
              <div className="w-full max-w-3xl">
                <ScreenshotImg 
                  src="/screens/devis.png" 
                  alt="Écran Mes devis – BTP PRO"
                  width={1200}
                  height={800}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Clients */}
      <section className="w-full px-4 py-16 md:py-20 md:px-8 bg-gradient-to-br from-[#0d1228] to-[#0f1429]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-center">
            {/* Screenshot à gauche */}
            <div className="flex items-center justify-center lg:justify-start order-2 lg:order-1">
              <div className="w-full max-w-3xl">
                <ScreenshotImg 
                  src="/screens/clients.png" 
                  alt="Écran Mes clients – BTP PRO"
                  width={1200}
                  height={800}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>

            {/* Texte à droite */}
            <div className="text-center lg:text-left order-1 lg:order-2">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4 md:mb-6">
                Clients
              </h2>
              <p className="text-base md:text-lg text-white/70 leading-relaxed">
                Retrouve un client en 2 secondes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pour qui Section */}
      <section className="w-full px-4 py-16 md:py-20 md:px-8 bg-gradient-to-br from-[#0d1228] to-[#0f1429]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white text-center mb-12 md:mb-16">
            Pour qui ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
            {/* Patron */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-10 md:p-12 border border-white/10 shadow-xl shadow-black/30 backdrop-blur-sm">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30">
                <span className="text-4xl">👔</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Patron
              </h3>
              <p className="text-lg text-gray-300 leading-relaxed">
                Pilotage, devis, dashboard
              </p>
            </div>

            {/* Employé */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-10 md:p-12 border border-white/10 shadow-xl shadow-black/30 backdrop-blur-sm">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
                <span className="text-4xl">👷</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Employé
              </h3>
              <p className="text-lg text-gray-300 leading-relaxed">
                Chantiers, clients, tâches (accès limité)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final Section */}
      <section className="w-full px-4 py-16 md:py-20 md:px-8 bg-gradient-to-br from-[#0a0e27] to-[#0d1228]">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6 md:mb-8">
            Prêt à simplifier votre gestion ?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-lg shadow-orange-500/20 hover:brightness-110 hover:shadow-xl hover:shadow-orange-500/30 transition-all">
                Essai gratuit 5 jours
              </Button>
            </Link>
            <Link href="/login" className="text-orange-400 hover:text-orange-300 font-semibold text-lg transition-colors">
              Déjà client ? Me connecter
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full px-4 py-12 md:py-16 md:px-8 bg-[#0a0e27] border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4">
            <p className="text-white font-semibold text-lg md:text-xl">BTP PRO</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-gray-400 text-sm md:text-base">
              <span>lavno.app@gmail.com</span>
              <span className="hidden sm:inline text-gray-600">•</span>
              <span>+33 06 31 49 22 08</span>
            </div>
            <p className="text-gray-500 text-xs md:text-sm mt-6">
              © BTP PRO — Tous droits réservés
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
