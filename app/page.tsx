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
    <div className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur p-3 md:p-4 shadow-[0_20px_80px_rgba(0,0,0,0.55)] transition-transform duration-300 hover:-translate-y-1">
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
    <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-8 md:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.55)] min-h-[400px] flex items-center justify-center bg-white/5">
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-4 rounded-xl bg-white/10 flex items-center justify-center">
          <span className="text-4xl">📱</span>
        </div>
        <p className="text-white/70 text-lg">{label}</p>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen relative bg-[#0a0e27] overflow-hidden">
      {/* Fond premium avec halos */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#0a0e27]"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute inset-0 bg-white/[0.02]"></div>
      </div>
      {/* Header */}
      <header className="w-full bg-[#0a0e27]/95 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50 shadow-lg shadow-black/20 relative min-h-[72px]">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo size="md" showText={true} />
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/login">
              <button className="px-6 py-2.5 rounded-xl border border-white/20 text-gray-300 hover:bg-white/5 transition-all duration-200">
                Connexion
              </button>
            </Link>
            <Link href="/register">
              <button className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-[#0a0e27] font-semibold shadow-lg hover:scale-[1.03] transition-all duration-200">
                Inscription
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* 1) HERO Section */}
      <section className="w-full px-4 py-20 md:py-28 md:px-8 relative">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6 md:mb-8">
            BTP PRO — Devis & factures sans prise de tête
          </h1>
          <p className="text-xl md:text-2xl text-white/70 mb-10 md:mb-12 leading-relaxed">
            Pensé pour artisans et petites équipes. Devis, factures PDF et suivi chantier, au même endroit.
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
          <p className="text-base md:text-lg text-white/70">
            Sans carte bancaire. Annulable.
          </p>
        </div>
      </section>

      {/* 2) PROOF / BENEFITS Section */}
      <section className="w-full px-4 py-16 md:py-20 md:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Carte 1 */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8 md:p-10 border border-white/10 shadow-xl shadow-black/30 backdrop-blur-sm bg-white/5">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Devis → Facture en 1 clic
              </h3>
              <p className="text-white/70 leading-relaxed">
                Transforme un devis en facture PDF, prêt à envoyer.
              </p>
            </div>

            {/* Carte 2 */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8 md:p-10 border border-white/10 shadow-xl shadow-black/30 backdrop-blur-sm bg-white/5">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
                <span className="text-3xl">📋</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Suivi chantiers clair
              </h3>
              <p className="text-white/70 leading-relaxed">
                Clients, chantiers, statuts : tout est centralisé.
              </p>
            </div>

            {/* Carte 3 */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8 md:p-10 border border-white/10 shadow-xl shadow-black/30 backdrop-blur-sm bg-white/5">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30">
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Patron + Employés
              </h3>
              <p className="text-white/70 leading-relaxed">
                Accès limité pour l'équipe, contrôle total côté patron.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3) COMMENT ÇA MARCHE Section */}
      <section id="comment" className="w-full px-4 py-16 md:py-20 md:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white text-center mb-12 md:mb-16">
            Comment ça marche
          </h2>
          <div className="space-y-12 md:space-y-16">
            {/* Étape 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center border border-white/10 rounded-2xl p-6 md:p-8 bg-white/5 backdrop-blur-sm">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-500 text-white font-bold text-xl mb-6">
                  1
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Crée ton compte
                </h3>
                <p className="text-lg text-white/70 leading-relaxed">
                  Inscription rapide. Essai lancé.
                </p>
              </div>
              <div className="flex items-center justify-center lg:justify-end">
                <div className="w-full max-w-md">
                  <MockScreenshot label="Création de compte" />
                </div>
              </div>
            </div>

            {/* Étape 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center border border-white/10 rounded-2xl p-6 md:p-8 bg-white/5 backdrop-blur-sm">
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
                  Clients + devis en quelques clics.
                </p>
              </div>
            </div>

            {/* Étape 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center border border-white/10 rounded-2xl p-6 md:p-8 bg-white/5 backdrop-blur-sm">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-500 text-white font-bold text-xl mb-6">
                  3
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Suis tes chantiers & facture
                </h3>
                <p className="text-lg text-white/70 leading-relaxed">
                  Chantiers + facture PDF prêts à envoyer.
                </p>
              </div>
              <div className="flex items-center justify-center lg:justify-end">
                <div className="w-full max-w-md">
                  <ScreenshotImg 
                    src="/screens/chantiers.png" 
                    alt="Écran gestion chantiers – BTP PRO"
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

      {/* 4) PRICING Section */}
      <section className="w-full px-4 py-16 md:py-20 md:px-8 relative">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-8 md:mb-12">
            Tarification simple
          </h2>
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-10 md:p-16 border border-white/10 shadow-xl shadow-black/30 backdrop-blur-sm bg-white/5">
            <div className="mb-8">
              <div className="text-5xl md:text-7xl font-bold text-white mb-4">
                50€<span className="text-2xl md:text-3xl text-white/70">/mois</span>
              </div>
              <p className="text-xl md:text-2xl text-white/70 mb-6">
                Essai gratuit 5 jours
              </p>
              <p className="text-lg text-white/70">
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

      {/* 5) FOOTER */}
      <footer className="w-full px-4 py-12 md:py-16 md:px-8 relative border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center gap-6 text-center">
            <p className="text-white font-semibold text-lg md:text-xl">
              BTP PRO
            </p>
            <p className="text-white/70 text-base md:text-lg">
              Contact : lavno.app@gmail.com • 0631492208
            </p>
            <p className="text-white/50 text-sm mt-2">
              © {new Date().getFullYear()} BTP PRO
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
