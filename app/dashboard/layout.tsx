'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'
import LogoutButton from '@/components/LogoutButton'
import CompanyStatusBadge from '@/components/CompanyStatusBadge'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'patron' | 'employe' | null>(null)
  const [isCompanyActive, setIsCompanyActive] = useState<boolean | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsCompanyActive(null)
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, entreprise_id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        setIsCompanyActive(null)
        router.replace('/login')
        return
      }

      setUserRole(profile.role as 'patron' | 'employe')

      // Vérifier si l'entreprise est active (pour patrons et employés)
      if (profile.entreprise_id) {
        try {
          const { checkCompanyActive } = await import('@/lib/subscription-check')
          const { active } = await checkCompanyActive(supabase, profile.entreprise_id)
          setIsCompanyActive(active)
        } catch (err) {
          // En cas d'erreur, on laisse null (afficher le menu par défaut)
          setIsCompanyActive(null)
        }
      } else {
        // Si pas d'entreprise_id, on laisse null
        setIsCompanyActive(null)
      }

      setLoading(false)
    }

    checkAuth()
  }, [router])

  // Empêcher le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  // Fermer le menu mobile lors de la navigation
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
        <p className="text-white">Chargement...</p>
      </div>
    )
  }

  const isPatron = userRole === 'patron'
  const basePath = isPatron ? '/dashboard/patron' : '/dashboard/employe'

  const patronNavItemsBase = [
    { label: 'Accueil', href: '/dashboard/patron' },
    { label: 'Devis', href: '/dashboard/patron/devis' },
    { label: 'Factures', href: '/dashboard/patron/factures' },
    { label: 'Clients', href: '/dashboard/patron/clients' },
    { label: 'Chantiers', href: '/dashboard/patron/chantiers' },
    { label: 'Agenda', href: '/dashboard/patron/agenda' },
    { label: 'Abonnement', href: '/dashboard/patron/abonnement' },
  ]

  // Masquer "Abonnement" si l'entreprise est active
  const patronNavItems = isCompanyActive === true
    ? patronNavItemsBase.filter(item => item.label !== 'Abonnement')
    : patronNavItemsBase

  const employeNavItems = [
    { label: 'Accueil', href: '/dashboard/employe' },
    { label: 'Chantiers', href: '/dashboard/employe/chantiers' },
    { label: 'Clients', href: '/dashboard/employe/clients' },
    { label: 'Agenda', href: '/dashboard/employe/agenda' },
  ]

  const navItems = isPatron ? patronNavItems : employeNavItems

  // Composant Sidebar réutilisable
  const SidebarContent = () => (
    <>
      <div className="p-7 md:p-8 border-b border-white/[0.08]">
        <Logo size="md" showText={true} />
      </div>

      <nav className="flex-1 p-5 md:p-6 space-y-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-white border border-yellow-500/30 shadow-sm shadow-yellow-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08]'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-5 md:p-6 border-t border-white/[0.08]">
        <LogoutButton />
      </div>
    </>
  )

  return (
    <div className={`${inter.className} min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0d1228] to-[#0a0e27] flex relative`}>
      {/* Fond avec grain subtil */}
      <div className="fixed inset-0 bg-[#0a0e27] opacity-90 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")`,
      }} />

      {/* Header mobile (visible uniquement sur mobile) */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#111827]/95 backdrop-blur-sm border-b border-white/[0.08] px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-gray-400 hover:text-white transition-colors duration-200"
          aria-label="Ouvrir le menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex-1 flex justify-center">
          <Logo size="sm" showText={true} />
        </div>
        <div className="w-10" /> {/* Spacer pour centrer le logo */}
      </header>

      {/* Sidebar Desktop (visible uniquement >= md) */}
      <aside className="hidden md:flex w-64 bg-[#111827]/95 backdrop-blur-sm border-r border-white/[0.08] flex-col fixed h-screen z-30">
        <SidebarContent />
      </aside>

      {/* Overlay mobile (visible uniquement sur mobile quand menu ouvert) */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Sidebar mobile */}
          <aside className="md:hidden fixed left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-[#111827]/98 backdrop-blur-md border-r border-white/[0.08] flex flex-col z-50 overflow-y-auto">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <Logo size="sm" showText={true} />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors duration-200"
                aria-label="Fermer le menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 w-full md:ml-64 pt-14 md:pt-0 relative z-10" data-dashboard="true">
        {/* Header avec badge statut (desktop) */}
        <header className="hidden md:block w-full px-4 md:px-6 lg:px-8 py-5 md:py-6 border-b border-white/[0.08] bg-[#0a0e27]/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-end">
            <CompanyStatusBadge />
          </div>
        </header>

        {/* Header mobile avec badge statut */}
        <div className="md:hidden w-full px-4 py-4 border-b border-white/[0.08] bg-[#0a0e27]/50 backdrop-blur-sm flex items-center justify-end">
          <CompanyStatusBadge />
        </div>
        
        {/* App Shell Premium - Conteneur principal avec largeur max et padding harmonisé */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-12 lg:py-16">
          {children}
        </div>
      </main>
    </div>
  )
}

