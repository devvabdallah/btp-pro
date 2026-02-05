'use client'

import Link from 'next/link'
import Button from '@/components/ui/Button'
import Logo from '@/components/Logo'
import { useEffect, useRef } from 'react'

export default function Home() {
  const sectionRefs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0')
          }
        })
      },
      { threshold: 0.1 }
    )

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <main className="min-h-screen bg-[#0a0e27]">
      {/* Header */}
      <header className="w-full bg-[#020617]/95 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50 shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 py-5 md:py-6">
          <Link href="/">
            <Logo size="md" showText={true} />
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/login">
              <Button variant="secondary" size="sm">
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
      <section className="w-full px-4 py-20 md:py-32 md:px-8 bg-gradient-to-b from-[#0a0e27] via-[#0f1429] to-[#020617] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-orange-500/5"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              L'application BTP pour gérer vos devis et factures simplement
            </h1>
            <h2 className="text-xl md:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed">
              Une solution conçue pour les professionnels du bâtiment souhaitant gagner du temps et structurer leur gestion quotidienne.
            </h2>
            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              BTP PRO centralise vos devis, factures, clients et chantiers dans une interface claire, rapide et accessible sur ordinateur et mobile.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/register" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-xl shadow-yellow-500/30 hover:shadow-2xl hover:shadow-yellow-500/40 transition-shadow">
                  Créer un compte
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto border-white/20 hover:border-white/40">
                  Me connecter
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Avant / Après Section */}
      <section 
        ref={(el) => { sectionRefs.current[0] = el }}
        className="w-full px-4 py-24 md:py-28 md:px-8 bg-[#111827] opacity-0 translate-y-8 transition-all duration-700"
      >
        <div className="max-w-6xl mx-auto">
          <h3 className="text-4xl md:text-5xl font-bold text-white text-center mb-16 md:mb-20">
            Avec ou sans BTP PRO
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
            {/* Sans BTP PRO */}
            <div className="bg-gradient-to-br from-[#020617] to-[#0a0e27] rounded-3xl p-8 md:p-10 border-2 border-red-500/30 shadow-xl shadow-red-500/10 hover:shadow-2xl hover:shadow-red-500/20 transition-shadow">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
                  <span className="text-4xl">❌</span>
                </div>
                <h4 className="text-2xl md:text-3xl font-bold text-white">Sans BTP PRO</h4>
              </div>
              <ul className="space-y-5 md:space-y-6">
                <li className="flex items-start gap-4">
                  <span className="text-red-400 text-xl mt-0.5 font-bold">•</span>
                  <span className="text-gray-100 text-[17px] md:text-base leading-relaxed">Beaucoup de temps passé à préparer les devis et factures.</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-red-400 text-xl mt-0.5 font-bold">•</span>
                  <span className="text-gray-100 text-[17px] md:text-base leading-relaxed">Difficile de retrouver l'historique des documents.</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-red-400 text-xl mt-0.5 font-bold">•</span>
                  <span className="text-gray-100 text-[17px] md:text-base leading-relaxed">Organisation différente d'un chantier à l'autre.</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-red-400 text-xl mt-0.5 font-bold">•</span>
                  <span className="text-gray-100 text-[17px] md:text-base leading-relaxed">Risque d'erreurs dans les montants ou les informations clients.</span>
                </li>
              </ul>
            </div>

            {/* Avec BTP PRO */}
            <div className="bg-gradient-to-br from-[#020617] to-[#0a0e27] rounded-3xl p-8 md:p-10 border-2 border-yellow-500/40 shadow-xl shadow-yellow-500/20 hover:shadow-2xl hover:shadow-yellow-500/30 transition-shadow">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/40">
                  <span className="text-4xl">✅</span>
                </div>
                <h4 className="text-2xl md:text-3xl font-bold text-white">Avec BTP PRO</h4>
              </div>
              <ul className="space-y-5 md:space-y-6">
                <li className="flex items-start gap-4">
                  <span className="text-yellow-400 text-xl mt-0.5 font-bold">•</span>
                  <span className="text-gray-100 text-[17px] md:text-base leading-relaxed">Tous vos devis et factures au même endroit.</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-yellow-400 text-xl mt-0.5 font-bold">•</span>
                  <span className="text-gray-100 text-[17px] md:text-base leading-relaxed">Modèles pensés pour le BTP, faciles à remplir.</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-yellow-400 text-xl mt-0.5 font-bold">•</span>
                  <span className="text-gray-100 text-[17px] md:text-base leading-relaxed">Vue d'ensemble sur vos documents.</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-yellow-400 text-xl mt-0.5 font-bold">•</span>
                  <span className="text-gray-100 text-[17px] md:text-base leading-relaxed">Moins de temps passé sur l'administratif.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pourquoi BTP PRO Section */}
      <section 
        ref={(el) => { sectionRefs.current[1] = el }}
        className="w-full px-4 py-24 md:py-28 md:px-8 bg-[#0a0e27] opacity-0 translate-y-8 transition-all duration-700"
      >
        <div className="max-w-6xl mx-auto">
          <h3 className="text-4xl md:text-5xl font-bold text-white text-center mb-16 md:mb-20">
            Pourquoi utiliser BTP PRO ?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            <div className="bg-gradient-to-br from-[#111827] to-[#020617] rounded-3xl p-8 border border-white/10 shadow-lg hover:shadow-xl hover:shadow-yellow-500/10 transition-all hover:border-yellow-500/30">
              <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 flex items-center justify-center mb-6 border border-yellow-500/30">
                <span className="text-4xl">👷</span>
              </div>
              <h4 className="text-xl md:text-2xl font-bold text-white mb-4">Pensé pour les artisans du BTP</h4>
              <p className="text-gray-100 text-[17px] md:text-base leading-relaxed">
                Vocabulaire simple, pas de jargon technique. Une interface claire pour les maçons, plombiers, électriciens et tous les artisans.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#111827] to-[#020617] rounded-3xl p-8 border border-white/10 shadow-lg hover:shadow-xl hover:shadow-yellow-500/10 transition-all hover:border-yellow-500/30">
              <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 flex items-center justify-center mb-6 border border-yellow-500/30">
                <span className="text-4xl">⚡</span>
              </div>
              <h4 className="text-xl md:text-2xl font-bold text-white mb-4">Devis et factures plus rapides à préparer</h4>
              <p className="text-gray-100 text-[17px] md:text-base leading-relaxed">
                Modèles adaptés au BTP, champs clairs et organisés. Vous gagnez du temps sur la préparation de vos documents.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#111827] to-[#020617] rounded-3xl p-8 border border-white/10 shadow-lg hover:shadow-xl hover:shadow-yellow-500/10 transition-all hover:border-yellow-500/30">
              <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 flex items-center justify-center mb-6 border border-yellow-500/30">
                <span className="text-4xl">📁</span>
              </div>
              <h4 className="text-xl md:text-2xl font-bold text-white mb-4">Tout centralisé, plus facile à retrouver</h4>
              <p className="text-gray-100 text-[17px] md:text-base leading-relaxed">
                Historique complet, organisation claire. Vous retrouvez rapidement n'importe quel devis ou facture.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#111827] to-[#020617] rounded-3xl p-8 border border-white/10 shadow-lg hover:shadow-xl hover:shadow-yellow-500/10 transition-all hover:border-yellow-500/30">
              <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 flex items-center justify-center mb-6 border border-yellow-500/30">
                <span className="text-4xl">👥</span>
              </div>
              <h4 className="text-xl md:text-2xl font-bold text-white mb-4">Adapté aux petites équipes</h4>
              <p className="text-gray-100 text-[17px] md:text-base leading-relaxed">
                Le patron peut inviter ses employés. Plusieurs personnes peuvent utiliser l'outil pour une meilleure organisation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche Section */}
      <section 
        ref={(el) => { sectionRefs.current[2] = el }}
        className="w-full px-4 py-24 md:py-28 md:px-8 bg-[#111827] opacity-0 translate-y-8 transition-all duration-700"
      >
        <div className="max-w-6xl mx-auto">
          <h3 className="text-4xl md:text-5xl font-bold text-white text-center mb-16">
            Comment ça marche ?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            <div className="bg-gradient-to-br from-[#020617] to-[#0a0e27] rounded-3xl p-8 border border-white/10 shadow-lg hover:shadow-xl hover:shadow-yellow-500/10 transition-all hover:border-yellow-500/30">
              <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-[#0a0e27] flex items-center justify-center font-bold text-2xl mb-6 shadow-lg shadow-yellow-500/30">
                1
              </div>
              <h4 className="text-xl font-bold text-white mb-4">Créer un compte</h4>
              <p className="text-gray-100 text-sm md:text-base leading-relaxed">
                Inscrivez-vous en tant que patron ou employé. C'est simple et rapide.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#020617] to-[#0a0e27] rounded-3xl p-8 border border-white/10 shadow-lg hover:shadow-xl hover:shadow-yellow-500/10 transition-all hover:border-yellow-500/30">
              <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-[#0a0e27] flex items-center justify-center font-bold text-2xl mb-6 shadow-lg shadow-yellow-500/30">
                2
              </div>
              <h4 className="text-xl font-bold text-white mb-4">Organiser votre entreprise</h4>
              <p className="text-gray-100 text-sm md:text-base leading-relaxed">
                Pour le patron : renseignez votre entreprise et invitez vos employés avec un code simple.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#020617] to-[#0a0e27] rounded-3xl p-8 border border-white/10 shadow-lg hover:shadow-xl hover:shadow-yellow-500/10 transition-all hover:border-yellow-500/30">
              <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-[#0a0e27] flex items-center justify-center font-bold text-2xl mb-6 shadow-lg shadow-yellow-500/30">
                3
              </div>
              <h4 className="text-xl font-bold text-white mb-4">Créer vos devis</h4>
              <p className="text-gray-100 text-sm md:text-base leading-relaxed">
                Utilisez les modèles adaptés au BTP pour préparer vos devis plus rapidement.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#020617] to-[#0a0e27] rounded-3xl p-8 border border-white/10 shadow-lg hover:shadow-xl hover:shadow-yellow-500/10 transition-all hover:border-yellow-500/30">
              <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-[#0a0e27] flex items-center justify-center font-bold text-2xl mb-6 shadow-lg shadow-yellow-500/30">
                4
              </div>
              <h4 className="text-xl font-bold text-white mb-4">Transformer en facture</h4>
              <p className="text-gray-100 text-sm md:text-base leading-relaxed">
                Une fois le devis accepté, transformez-le en facture en quelques clics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pour qui Section */}
      <section 
        ref={(el) => { sectionRefs.current[3] = el }}
        className="w-full px-4 py-24 md:py-28 md:px-8 bg-[#0a0e27] opacity-0 translate-y-8 transition-all duration-700"
      >
        <div className="max-w-5xl mx-auto">
          <h3 className="text-4xl md:text-5xl font-bold text-white text-center mb-16">
            Pour qui est faite BTP PRO ?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="bg-gradient-to-br from-[#111827] to-[#020617] rounded-3xl p-8 border border-white/10 shadow-lg hover:shadow-xl hover:shadow-yellow-500/10 transition-all hover:border-yellow-500/30 text-center">
              <div className="text-6xl mb-6">🔨</div>
              <h4 className="text-xl md:text-2xl font-bold text-white mb-4">Artisans seuls</h4>
              <p className="text-gray-100 text-sm md:text-base leading-relaxed">
                Maçons, plombiers, électriciens, couvreurs... Tous les artisans du BTP qui veulent simplifier leur gestion.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#111827] to-[#020617] rounded-3xl p-8 border border-white/10 shadow-lg hover:shadow-xl hover:shadow-yellow-500/10 transition-all hover:border-yellow-500/30 text-center">
              <div className="text-6xl mb-6">👷‍♂️</div>
              <h4 className="text-xl md:text-2xl font-bold text-white mb-4">Petites équipes BTP</h4>
              <p className="text-gray-100 text-sm md:text-base leading-relaxed">
                Équipes de 2 à 10 personnes qui travaillent ensemble et ont besoin d'une organisation simple.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#111827] to-[#020617] rounded-3xl p-8 border border-white/10 shadow-lg hover:shadow-xl hover:shadow-yellow-500/10 transition-all hover:border-yellow-500/30 text-center">
              <div className="text-6xl mb-6">🏢</div>
              <h4 className="text-xl md:text-2xl font-bold text-white mb-4">Entreprises</h4>
              <p className="text-gray-100 text-sm md:text-base leading-relaxed">
                Entreprises qui cherchent une solution simple et efficace pour leurs devis et factures, sans complexité inutile.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final Section */}
      <section 
        ref={(el) => { sectionRefs.current[4] = el }}
        className="w-full px-4 py-24 md:py-28 md:px-8 bg-gradient-to-b from-[#111827] via-[#0a0e27] to-[#020617] opacity-0 translate-y-8 transition-all duration-700 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-orange-500/5"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h3 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 md:mb-10">
            Envie de simplifier vos devis et factures ?
          </h3>
          <p className="text-lg md:text-xl text-gray-100 mb-10 md:mb-12 max-w-2xl mx-auto leading-relaxed">
            Gagnez du temps sur l'administratif et organisez mieux vos documents. Tout au même endroit, facile à retrouver.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 md:gap-5 justify-center items-center">
            <Link href="/register" className="w-full sm:w-auto max-w-xs sm:max-w-none">
              <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-2xl shadow-yellow-500/40 hover:shadow-yellow-500/50 transition-shadow text-lg px-10 py-5 md:py-6">
                Créer un compte
              </Button>
            </Link>
            <Link href="/login" className="text-yellow-400 hover:text-yellow-300 font-semibold text-lg transition-colors">
              Déjà client ? Me connecter
            </Link>
          </div>
        </div>
      </section>

      {/* Footer contact minimal */}
      <footer className="w-full px-4 py-10 md:py-12 md:px-8 bg-[#020617] border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-3">
            <p className="text-white font-semibold text-base md:text-lg">BTP PRO</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-gray-300 text-sm md:text-base">
              <span>lavno.app@gmail.com</span>
              <span className="hidden sm:inline text-gray-500">•</span>
              <span>+33 06 31 49 22 08</span>
            </div>
            <p className="text-gray-400 text-xs md:text-sm mt-4">
              © BTP PRO — Tous droits réservés
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
