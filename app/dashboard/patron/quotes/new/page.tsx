'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { createQuote } from '@/lib/quotes-actions'

export default function NewQuotePage() {
  const router = useRouter()
  const [error, setError] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  const [formData, setFormData] = useState({
    title: '',
    client: '',
    contact: '',
    description: '',
    amount_ht: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const amount = parseFloat(formData.amount_ht.replace(',', '.'))

    if (isNaN(amount) || amount <= 0) {
      setError('Le montant doit être un nombre supérieur à 0.')
      return
    }

    startTransition(async () => {
      const result = await createQuote({
        title: formData.title,
        client: formData.client,
        contact: formData.contact || undefined,
        description: formData.description || undefined,
        amount_ht: amount,
        status: 'brouillon',
      })

      if (result.success && result.quoteId) {
        router.push(`/dashboard/patron/quotes/${result.quoteId}`)
      } else {
        setError(result.error || 'Une erreur est survenue.')
      }
    })
  }

  return (
    <main className="min-h-screen bg-[#0a0e27]">
      {/* Header */}
      <header className="w-full px-4 py-6 md:px-8 border-b border-[#2a2f4a]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center">
              <span className="text-2xl font-bold text-[#0a0e27]">B</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">BTP PRO</h1>
          </div>
          <Link href="/dashboard/patron">
            <Button variant="secondary" size="sm">
              Retour
            </Button>
          </Link>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="max-w-3xl mx-auto px-4 py-12 md:px-8">
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Nouveau devis
          </h2>
          <p className="text-gray-400">
            Remplissez les informations pour créer un nouveau devis.
          </p>
        </div>

        <div className="bg-[#1a1f3a] rounded-3xl p-6 md:p-8 border border-[#2a2f4a]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Titre du devis"
              type="text"
              name="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Ex: Rénovation salle de bain - Client X"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Nom du client"
                type="text"
                name="client"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                required
                placeholder="Nom complet"
              />

              <Input
                label="Contact client (optionnel)"
                type="text"
                name="contact"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="Téléphone ou email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description des travaux (optionnel)
              </label>
              <textarea
                className="w-full px-4 py-3 bg-[#0f1429] border border-gray-600 rounded-2xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all resize-none"
                rows={5}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Détails des travaux à réaliser..."
              />
            </div>

            <Input
              label="Montant hors taxes (€)"
              type="text"
              name="amount_ht"
              value={formData.amount_ht}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.,]/g, '')
                setFormData({ ...formData, amount_ht: value })
              }}
              required
              placeholder="0.00"
            />

            <ErrorMessage message={error} />

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
                disabled={isPending}
              >
                {isPending ? 'Création...' : 'Créer le devis'}
              </Button>
              <Link href="/dashboard/patron" className="w-full sm:w-auto">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Annuler
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}

