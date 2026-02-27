import type { Metadata } from 'next'
import './globals.css'
import { ClientProviders } from '@/components/ClientProviders'

export const metadata: Metadata = {
  title: 'BEXORIA - Devis et factures pour artisans',
  description: 'Faites vos devis et vos factures très rapidement.',
  manifest: '/manifest.webmanifest',
  themeColor: '#0B1B3A',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BEXORIA',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
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

