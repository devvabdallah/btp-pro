'use client'

import Link from 'next/link'
import Button from '@/components/ui/Button'
import Logo from '@/components/Logo'

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
      <section className="w-full px-4 py-20 md:py-28 lg:py-36 md:px-8 bg-gradient-to-br from-[#0a0e27] via-[#0d1228] to-[#0a0e27]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Texte centré */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 md:mb-8 leading-tight tracking-tight">
                Le logiciel simple pour gérer devis, factures et chantiers.
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 mb-8 md:mb-10 leading-relaxed">
                Pensé pour les artisans et petites équipes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 md:gap-5 mb-6 md:mb-8 justify-center lg:justify-start">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-shadow">
                    Essai gratuit 5 jours
                  </Button>
                </Link>
                <Link href="#how" className="w-full sm:w-auto">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto border-white/20 text-gray-300 hover:border-white/30 hover:bg-white/5">
                    Voir comment ça marche
                  </Button>
                </Link>
              </div>
              <p className="text-sm md:text-base text-gray-400">
                Sans carte bancaire • Annulable à tout moment • 50€/mois après essai
              </p>
            </div>

            {/* Screenshot principal */}
            <div className="flex items-center justify-center lg:justify-end">
              <div className="relative w-full max-w-2xl">
                <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-3 md:p-4 shadow-2xl shadow-black/50 border border-white/10 overflow-hidden">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500/50"></div>
                    <div className="h-2 w-2 rounded-full bg-yellow-500/50"></div>
                    <div className="h-2 w-2 rounded-full bg-green-500/50"></div>
                  </div>
                  <div className="relative rounded-lg overflow-hidden bg-[#0a0e27]">
                    <img 
                      src="/screenshots/dashboard-hero.png" 
                      alt="Aperçu du dashboard BTP PRO"
                      className="w-full h-auto"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.parentElement!.innerHTML = '<div class="h-96 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center"><p class="text-gray-400 text-sm">Screenshot Dashboard</p></div>'
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0e27] to-transparent pointer-events-none"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Pourquoi BTP PRO */}
      <section id="features" className="w-full px-4 py-20 md:py-28 lg:py-36 md:px-8 bg-gradient-to-br from-[#0a0e27] to-[#0d1228]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 lg:gap-12">
            {/* Card 1 */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8 md:p-10 border border-white/10 shadow-xl shadow-black/30 backdrop-blur-sm hover:border-orange-500/30 transition-all">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Devis & factures rapides
              </h3>
              <p className="text-lg text-gray-300 leading-relaxed">
                Crée, envoie, relance. PDF propre, paiement ensuite.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8 md:p-10 border border-white/10 shadow-xl shadow-black/30 backdrop-blur-sm hover:border-blue-500/30 transition-all">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
                <span className="text-3xl">📋</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Suivi chantier clair
              </h3>
              <p className="text-lg text-gray-300 leading-relaxed">
                Infos client, statut, notes et actions rapides.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-8 md:p-10 border border-white/10 shadow-xl shadow-black/30 backdrop-blur-sm hover:border-orange-500/30 transition-all">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30">
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Fait pour petites équipes
              </h3>
              <p className="text-lg text-gray-300 leading-relaxed">
                Patron + employés, permissions simples.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section Aperçu du logiciel */}
      <section className="w-full px-4 py-20 md:py-28 lg:py-36 md:px-8 bg-gradient-to-br from-[#0a0e27] to-[#0d1228]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6">
              Un aperçu de BTP PRO
            </h2>
            <p className="text-xl md:text-2xl text-gray-300">
              Tout votre quotidien artisan, au même endroit.
            </p>
          </div>

          {/* Grille de 4 screenshots */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 lg:gap-12">
            {/* Screenshot Clients */}
            <div className="relative group">
              <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-3 md:p-4 shadow-2xl shadow-black/50 border border-white/10 overflow-hidden">
                <div className="absolute top-4 left-4 z-10">
                  <span className="bg-orange-500/90 text-white text-xs md:text-sm font-semibold px-3 py-1.5 rounded-lg backdrop-blur-sm">
                    Clients
                  </span>
                </div>
                <div className="relative rounded-lg overflow-hidden bg-[#0a0e27] mt-8">
                  <img 
                    src="/screenshots/clients.png" 
                    alt="Gestion des clients BTP PRO"
                    className="w-full h-auto"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.parentElement!.innerHTML = '<div class="h-64 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center"><p class="text-gray-400 text-sm">Screenshot Clients</p></div>'
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none"></div>
                </div>
              </div>
            </div>

            {/* Screenshot Chantiers */}
            <div className="relative group">
              <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-3 md:p-4 shadow-2xl shadow-black/50 border border-white/10 overflow-hidden">
                <div className="absolute top-4 left-4 z-10">
                  <span className="bg-blue-500/90 text-white text-xs md:text-sm font-semibold px-3 py-1.5 rounded-lg backdrop-blur-sm">
                    Chantiers
                  </span>
                </div>
                <div className="relative rounded-lg overflow-hidden bg-[#0a0e27] mt-8">
                  <img 
                    src="/screenshots/chantiers.png" 
                    alt="Suivi des chantiers BTP PRO"
                    className="w-full h-auto"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.parentElement!.innerHTML = '<div class="h-64 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center"><p class="text-gray-400 text-sm">Screenshot Chantiers</p></div>'
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none"></div>
                </div>
              </div>
            </div>

            {/* Screenshot Devis */}
            <div className="relative group">
              <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-3 md:p-4 shadow-2xl shadow-black/50 border border-white/10 overflow-hidden">
                <div className="absolute top-4 left-4 z-10">
                  <span className="bg-orange-500/90 text-white text-xs md:text-sm font-semibold px-3 py-1.5 rounded-lg backdrop-blur-sm">
                    Devis
                  </span>
                </div>
                <div className="relative rounded-lg overflow-hidden bg-[#0a0e27] mt-8">
                  <img 
                    src="/screenshots/devis.png" 
                    alt="Création de devis BTP PRO"
                    className="w-full h-auto"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.parentElement!.innerHTML = '<div class="h-64 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center"><p class="text-gray-400 text-sm">Screenshot Devis</p></div>'
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none"></div>
                </div>
              </div>
            </div>

            {/* Screenshot Factures */}
            <div className="relative group">
              <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-3 md:p-4 shadow-2xl shadow-black/50 border border-white/10 overflow-hidden">
                <div className="absolute top-4 left-4 z-10">
                  <span className="bg-green-500/90 text-white text-xs md:text-sm font-semibold px-3 py-1.5 rounded-lg backdrop-blur-sm">
                    Factures
                  </span>
                </div>
                <div className="relative rounded-lg overflow-hidden bg-[#0a0e27] mt-8">
                  <img 
                    src="/screenshots/factures.png" 
                    alt="Gestion des factures BTP PRO"
                    className="w-full h-auto"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.parentElement!.innerHTML = '<div class="h-64 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center"><p class="text-gray-400 text-sm">Screenshot Factures</p></div>'
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche Section */}
      <section id="how" className="w-full px-4 py-20 md:py-28 lg:py-36 md:px-8 bg-gradient-to-br from-[#0d1228] to-[#0f1429]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-16 md:mb-20">
            Comment ça marche
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 lg:gap-14">
            {/* Étape 1 */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-center font-bold text-3xl mb-6 mx-auto shadow-lg shadow-orange-500/30">
                1
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Crée ton entreprise
              </h3>
            </div>

            {/* Étape 2 */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-center font-bold text-3xl mb-6 mx-auto shadow-lg shadow-orange-500/30">
                2
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Ajoute clients & chantiers
              </h3>
            </div>

            {/* Étape 3 */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-center font-bold text-3xl mb-6 mx-auto shadow-lg shadow-orange-500/30">
                3
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Devis → facture → paiement
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* Pour qui Section */}
      <section className="w-full px-4 py-20 md:py-28 lg:py-36 md:px-8 bg-gradient-to-br from-[#0a0e27] to-[#0d1228]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-16 md:mb-20">
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
                Pilotage, devis/factures, dashboard
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
      <section className="w-full px-4 py-20 md:py-28 lg:py-36 md:px-8 bg-gradient-to-br from-[#0a0e27] to-[#0d1228]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 md:mb-8">
            Prêt à simplifier votre gestion ?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 md:gap-5 justify-center">
            <Link href="/register" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-shadow">
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
