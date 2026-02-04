'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'
import LogoutButton from '@/components/LogoutButton'
import CompanyStatusBadge from '@/components/CompanyStatusBadge'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'patron' | 'employe' | null>(null)
  const [isCompanyActive, setIsCompanyActive] = useState<boolean | null>(null)

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
  ]

  const navItems = isPatron ? patronNavItems : employeNavItems

  return (
    <div className="min-h-screen bg-[#0a0e27] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111827] border-r border-[#2a2f4a] flex flex-col fixed h-screen">
        <div className="p-6 border-b border-[#2a2f4a]">
          <Logo size="md" showText={true} />
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-white border border-yellow-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-[#1a1f3a]'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-[#2a2f4a]">
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        {/* Header avec badge statut */}
        <header className="w-full px-4 md:px-8 py-4 border-b border-[#2a2f4a] bg-[#0a0e27]">
          <div className="max-w-7xl mx-auto flex items-center justify-end">
            <CompanyStatusBadge />
          </div>
        </header>
        
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}

