'use client'

import { Toaster } from '@/components/ui/toaster'
import PwaInstallBanner from '@/components/PwaInstallBanner'

export function ClientProviders() {
  return (
    <>
      <Toaster />
      <PwaInstallBanner />
    </>
  )
}
