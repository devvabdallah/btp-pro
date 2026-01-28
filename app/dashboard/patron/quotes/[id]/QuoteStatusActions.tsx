'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { updateQuoteStatus, type QuoteStatus } from '@/lib/quotes-actions'

interface QuoteStatusActionsProps {
  quoteId: string
  currentStatus: QuoteStatus
}

export default function QuoteStatusActions({ quoteId, currentStatus }: QuoteStatusActionsProps) {
  const router = useRouter()
  const [error, setError] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  const handleStatusChange = (newStatus: QuoteStatus) => {
    setError('')
    startTransition(async () => {
      const result = await updateQuoteStatus(quoteId, newStatus)
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error || 'Une erreur est survenue.')
      }
    })
  }

  return (
    <div className="space-y-4">
      <ErrorMessage message={error} />
      
      <div className="flex flex-wrap gap-3">
        {currentStatus === 'brouillon' && (
          <Button
            variant="primary"
            size="md"
            onClick={() => handleStatusChange('envoye')}
            disabled={isPending}
          >
            Marquer comme envoyé
          </Button>
        )}
        
        {currentStatus === 'envoye' && (
          <>
            <Button
              variant="primary"
              size="md"
              onClick={() => handleStatusChange('accepte')}
              disabled={isPending}
              className="bg-green-500 hover:bg-green-600"
            >
              Marquer comme accepté
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => handleStatusChange('refuse')}
              disabled={isPending}
              className="border-red-500/50 text-red-300 hover:bg-red-500/10"
            >
              Marquer comme refusé
            </Button>
          </>
        )}

        {(currentStatus === 'accepte' || currentStatus === 'refuse') && (
          <Button
            variant="secondary"
            size="md"
            onClick={() => handleStatusChange('brouillon')}
            disabled={isPending}
          >
            Remettre en brouillon
          </Button>
        )}
      </div>
    </div>
  )
}

