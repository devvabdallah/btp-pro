import type { Metadata } from 'next'
import './globals.css'
import { ClientProviders } from '@/components/ClientProviders'

export const metadata: Metadata = {
  title: 'BTP PRO - Devis et factures pour artisans',
  description: 'Faites vos devis et vos factures très rapidement.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-[#0a0e27] text-[#f5f5f5] antialiased text-[16px] sm:text-[15px] md:text-[16px] leading-relaxed">
        {children}
        <ClientProviders />
      </body>
    </html>
  )
}

