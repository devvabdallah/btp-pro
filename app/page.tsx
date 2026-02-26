'use client'

import Link from 'next/link'
import Image from 'next/image'
import Button from '@/components/ui/Button'

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
    <div className="rounded-3xl border border-white/15 bg-white/5 p-3 md:p-4 shadow-[0_20px_80px_rgba(0,0,0,0.55)] transition-transform duration-300 hover:-translate-y-1">
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
      </div>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0a0e27]/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="shrink-0">
            <div className="w-10 h-10 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-white flex items-center justify-center">
              <Image
                src="/brand/logo.png"
                alt="BTP PRO"
                width={160}
                height={160}
                quality={100}
                priority
                className="block w-[90%] h-[90%] object-contain"
                style={{ imageRendering: "auto" }}
              />
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-2 md:gap-3 shrink-0">
            <Link href="/login">
              <button className="px-3 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base h-9 sm:h-auto rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 transition">
                Connexion
              </button>
            </Link>
            <Link href="/register">
              <button className="px-3 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base h-9 sm:h-auto rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold hover:scale-[1.03] transition">
                Inscription
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* 1) HERO Section */}
      <section className="w-full px-4 py-24 md:py-32 lg:py-36 md:px-8 relative">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-2xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-tight text-white mb-6 md:mb-8 sm:leading-[1.1]">
            Gérez vos devis, factures et chantiers.
            <br />
            Dans un seul outil professionnel.
          </h1>
          <p className="text-sm sm:text-base md:text-xl lg:text-2xl text-white/80 opacity-90 max-w-full sm:max-w-3xl mx-auto mb-10 md:mb-12 leading-relaxed px-4 sm:px-0">
            Conçu pour les artisans et petites entreprises du BTP.
            <br />
            Centralisez vos clients, documents et suivi chantier avec rigueur et simplicité.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Link href="/register" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-12 py-3 sm:py-5 h-auto sm:h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold shadow-lg shadow-orange-500/25 hover:brightness-105 transition-all duration-200 text-base sm:text-lg md:text-xl">
                Essayer gratuitement 5 jours
              </button>
            </Link>
            <p className="text-sm sm:text-base md:text-base text-white/60 opacity-90">
              Sans carte bancaire requise.
            </p>
          </div>
        </div>
      </section>

      {/* 2) PROOF / BENEFITS Section */}
      <section className="w-full px-4 py-20 md:py-24 md:px-8 relative">
        <div className="max-w-full sm:max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 space-y-4 sm:space-y-0">
            {/* Carte 1 */}
            <div className="bg-white/[0.08] bg-opacity-95 sm:bg-opacity-100 rounded-xl border border-white/10 p-8 transition-all duration-300 hover:border-orange-400/20">
              <div className="w-12 h-12 flex items-center justify-center mb-6 text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl sm:text-xl font-bold tracking-tight leading-tight text-white mb-4">
                Devis & factures instantanés
              </h3>
              <p className="text-sm sm:text-base text-white/70 opacity-90 sm:opacity-100 leading-relaxed">
                Créez, modifiez et envoyez vos devis en quelques secondes. Transformation en facture en 1 clic.
              </p>
            </div>

            {/* Carte 2 */}
            <div className="bg-white/[0.08] bg-opacity-95 sm:bg-opacity-100 rounded-xl border border-white/10 p-8 transition-all duration-300 hover:border-orange-400/20">
              <div className="w-12 h-12 flex items-center justify-center mb-6 text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-2xl sm:text-xl font-bold tracking-tight leading-tight text-white mb-4">
                Suivi chantier structuré
              </h3>
              <p className="text-sm sm:text-base text-white/70 opacity-90 sm:opacity-100 leading-relaxed">
                Centralisez vos rendez-vous, tâches et informations client au même endroit.
              </p>
            </div>

            {/* Carte 3 */}
            <div className="bg-white/[0.08] bg-opacity-95 sm:bg-opacity-100 rounded-xl border border-white/10 p-8 transition-all duration-300 hover:border-orange-400/20">
              <div className="w-12 h-12 flex items-center justify-center mb-6 text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl sm:text-xl font-bold tracking-tight leading-tight text-white mb-4">
                Gestion d'équipe simplifiée
              </h3>
              <p className="text-sm sm:text-base text-white/70 opacity-90 sm:opacity-100 leading-relaxed">
                Patron et employés travaillent ensemble avec des accès sécurisés.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3) VISUAL Section */}
      <section id="comment" className="w-full px-4 py-16 md:py-20 md:px-8 relative">
        <div className="max-w-full sm:max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-white text-center mb-12 md:mb-16">
            Tout votre BTP, au même endroit.
          </h2>
          
          <div className="space-y-4 sm:space-y-12 md:space-y-16">
            {/* Bloc 1 : Chantiers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
              <div>
                <h3 className="text-2xl sm:text-2xl md:text-3xl font-bold tracking-tight leading-tight text-white mb-5">
                  Chantiers clairs
                </h3>
                <p className="text-sm sm:text-base md:text-lg text-white/70 opacity-90 sm:opacity-100 leading-relaxed mb-0">
                  Suivez l'avancement, les infos et vos priorités en un coup d'œil.
                </p>
              </div>
              <div className="flex justify-center lg:justify-end">
                <div className="rounded-xl border border-white/10 shadow-xl shadow-black/30 overflow-hidden w-full max-w-[115%] lg:max-w-[120%]">
                  <img
                    src="/screens/chantiers.png"
                    alt="Écran chantiers BTP PRO"
                    className="w-full h-auto block"
                  />
                </div>
              </div>
            </div>

            {/* Bloc 2 : Devis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="order-2 lg:order-1 flex justify-center lg:justify-start">
                <div className="rounded-xl border border-white/10 shadow-xl shadow-black/30 overflow-hidden w-full max-w-[115%] lg:max-w-[120%]">
                  <img
                    src="/screens/devis.png"
                    alt="Écran devis BTP PRO"
                    className="w-full h-auto block"
                  />
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <h3 className="text-2xl sm:text-2xl md:text-3xl font-bold tracking-tight leading-tight text-white mb-5">
                  Devis → Facture en 1 clic
                </h3>
                <p className="text-sm sm:text-base md:text-lg text-white/70 opacity-90 sm:opacity-100 leading-relaxed mb-0">
                  Créez, modifiez et transformez vos devis sans friction.
                </p>
              </div>
            </div>

            {/* Bloc 3 : Clients */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
              <div>
                <h3 className="text-2xl sm:text-2xl md:text-3xl font-bold tracking-tight leading-tight text-white mb-5">
                  Clients centralisés
                </h3>
                <p className="text-sm sm:text-base md:text-lg text-white/70 opacity-90 sm:opacity-100 leading-relaxed mb-0">
                  Contacts et historique au même endroit, sans perdre de temps.
                </p>
              </div>
              <div className="flex justify-center lg:justify-end">
                <div className="rounded-xl border border-white/10 shadow-xl shadow-black/30 overflow-hidden w-full max-w-[115%] lg:max-w-[120%]">
                  <img
                    src="/clients.png"
                    alt="Écran clients BTP PRO"
                    className="w-full h-auto block"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4) PRICING Section */}
      <section className="w-full px-4 py-16 md:py-20 md:px-8 relative">
        <div className="max-w-full sm:max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-white mb-10 md:mb-12 text-center">
            Tarification simple
          </h2>
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-10 md:p-16 border border-white/10 shadow-xl shadow-black/30 bg-white/5 bg-opacity-95 sm:bg-opacity-100 max-w-full sm:max-w-2xl mx-auto">
            <div className="mb-8 text-center space-y-4 sm:space-y-0">
              <div className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-4">
                50€<span className="text-2xl md:text-3xl lg:text-4xl text-white/70">/mois</span>
              </div>
              <p className="text-sm sm:text-base md:text-xl lg:text-2xl text-white/70 opacity-90 sm:opacity-100 mb-6 leading-relaxed">
                Essai gratuit 5 jours
              </p>
              <p className="text-sm sm:text-base md:text-lg text-white/70 opacity-90 sm:opacity-100 leading-relaxed">
                Sans engagement
              </p>
            </div>
            <div className="text-center">
              <Link href="/register" className="inline-block w-full sm:w-auto">
                <button className="w-full sm:w-auto px-12 py-3 sm:py-5 h-auto sm:h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold shadow-lg shadow-orange-500/25 hover:brightness-105 transition-all duration-200 text-base sm:text-lg md:text-xl">
                  Essayer gratuitement 5 jours
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5) FINAL CTA Section */}
      <section className="w-full px-4 py-16 md:py-20 md:px-8 relative">
        <div className="max-w-full sm:max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-white mb-5 md:mb-6">
            Prêt à gagner du temps dès aujourd'hui ?
          </h2>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/80 opacity-90 sm:opacity-100 mb-8 md:mb-10 leading-relaxed">
            Essayez BTP PRO gratuitement pendant 5 jours. Sans carte bancaire.
          </p>
          <Link href="/register" className="inline-block w-full sm:w-auto">
            <button className="w-full sm:w-auto px-12 py-3 sm:py-5 h-auto sm:h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold shadow-lg shadow-orange-500/25 hover:brightness-105 transition-all duration-200 text-base sm:text-lg md:text-xl">
              Essayer gratuitement 5 jours
            </button>
          </Link>
        </div>
      </section>

      {/* 6) FOOTER */}
      <footer className="w-full px-4 py-12 md:py-16 md:px-8 relative border-t border-white/5">
        <div className="max-w-full sm:max-w-7xl mx-auto">
          <div className="flex flex-col items-center gap-6 text-center space-y-4 sm:space-y-0">
            <p className="text-sm sm:text-sm md:text-base text-white/60 opacity-90 sm:opacity-100 leading-relaxed">
              © {new Date().getFullYear()} BTP PRO. Tous droits réservés.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              <Link href="/login" className="text-white/50 hover:text-white/70 text-sm md:text-base transition opacity-90 sm:opacity-100">
                Connexion
              </Link>
              <span className="text-white/30">•</span>
              <Link href="/register" className="text-white/50 hover:text-white/70 text-sm md:text-base transition opacity-90 sm:opacity-100">
                Inscription
              </Link>
              <span className="text-white/30">•</span>
              <Link href="mailto:lavno.app@gmail.com" className="text-white/50 hover:text-white/70 text-sm md:text-base transition opacity-90 sm:opacity-100">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
