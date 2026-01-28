'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <Button onClick={handleLogout} variant="secondary" size="sm">
      Se déconnecter
    </Button>
  )
}

