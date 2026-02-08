'use client'

import Link from 'next/link'
import Button from '@/components/ui/Button'
import Logo from '@/components/Logo'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 py-5 md:py-6">
          <Link href="/">
            <Logo size="md" showText={true} />
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/login">
              <Button variant="secondary" size="sm" className="border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50">
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
      <section className="w-full px-4 py-20 md:py-28 lg:py-36 md:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            {/* Texte à gauche */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-6 md:mb-8 leading-tight tracking-tight">
                Le logiciel simple pour gérer vos devis, factures et chantiers.
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-8 md:mb-10 leading-relaxed">
                Pensé pour les artisans du bâtiment : devis ultra-rapides, factures claires, suivi chantier et accès employé.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 md:gap-5 mb-6 md:mb-8 justify-center lg:justify-start">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 transition-shadow">
                    Essai gratuit 5 jours
                  </Button>
                </Link>
                <Link href="#how" className="w-full sm:w-auto">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50">
                    Voir comment ça marche
                  </Button>
                </Link>
              </div>
              <p className="text-sm md:text-base text-gray-500">
                Sans carte bancaire • Annulable à tout moment • 50€/mois après essai
              </p>
            </div>

            {/* Bloc visuel à droite */}
            <div className="flex items-center justify-center lg:justify-end">
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-gray-200 w-full max-w-md">
                <div className="mb-4">
                  <div className="h-2 w-2 rounded-full bg-gray-300 inline-block mr-2"></div>
                  <div className="h-2 w-2 rounded-full bg-gray-300 inline-block mr-2"></div>
                  <div className="h-2 w-2 rounded-full bg-gray-300 inline-block"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-gradient-to-r from-orange-400 to-orange-600 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-3 bg-gray-200 rounded w-4/6 mt-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 font-medium">Aperçu du logiciel</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bénéfices Section */}
      <section id="features" className="w-full px-4 py-20 md:py-28 lg:py-36 md:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 lg:gap-14">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl p-10 md:p-12 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Devis & factures en quelques minutes
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Crée, envoie, relance. PDF propre, paiement ensuite.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl p-10 md:p-12 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                <span className="text-3xl">📋</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Suivi de chantier clair
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Infos client, statut, notes et actions rapides (appeler / itinéraire).
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl p-10 md:p-12 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20">
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Fait pour petites équipes
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Patron + employés, permissions simples, sans usine à gaz.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche Section */}
      <section id="how" className="w-full px-4 py-20 md:py-28 lg:py-36 md:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 text-center mb-20 md:mb-24">
            Comment ça marche
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 lg:gap-14">
            {/* Étape 1 */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 text-white flex items-center justify-center font-bold text-3xl mb-6 mx-auto shadow-lg shadow-orange-500/20">
                1
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Crée ton entreprise
              </h3>
            </div>

            {/* Étape 2 */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 text-white flex items-center justify-center font-bold text-3xl mb-6 mx-auto shadow-lg shadow-orange-500/20">
                2
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Ajoute clients & chantiers
              </h3>
            </div>

            {/* Étape 3 */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 text-white flex items-center justify-center font-bold text-3xl mb-6 mx-auto shadow-lg shadow-orange-500/20">
                3
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Fais ton devis → facture
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* Pour qui Section */}
      <section className="w-full px-4 py-20 md:py-28 lg:py-36 md:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 text-center mb-20 md:mb-24">
            Pour qui ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12">
            {/* Patron */}
            <div className="bg-white rounded-2xl p-10 md:p-12 shadow-sm border border-gray-200">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20">
                <span className="text-4xl">👔</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Patron
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Pilotage, devis/factures, dashboard
              </p>
            </div>

            {/* Employé */}
            <div className="bg-white rounded-2xl p-10 md:p-12 shadow-sm border border-gray-200">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                <span className="text-4xl">👷</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Employé
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Chantiers, clients, tâches (accès limité)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final Section */}
      <section className="w-full px-4 py-20 md:py-28 lg:py-36 md:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 md:mb-8">
            Prêt à simplifier votre gestion ?
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 mb-10 md:mb-12 max-w-2xl mx-auto leading-relaxed">
            Commencez votre essai gratuit de 5 jours, sans carte bancaire.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 md:gap-5 justify-center">
            <Link href="/register" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 transition-shadow">
                Essai gratuit 5 jours
              </Button>
            </Link>
            <Link href="/login" className="text-orange-600 hover:text-orange-700 font-semibold text-lg transition-colors">
              Déjà client ? Me connecter
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full px-4 py-12 md:py-16 md:px-8 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4">
            <p className="text-gray-900 font-semibold text-lg md:text-xl">BTP PRO</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-gray-600 text-sm md:text-base">
              <span>lavno.app@gmail.com</span>
              <span className="hidden sm:inline text-gray-400">•</span>
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
