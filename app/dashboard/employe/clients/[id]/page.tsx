'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

interface Client {
  id: string
  entreprise_id: string
  first_name: string
  last_name: string
  phone: string
  address: string
  email: string | null
  notes: string | null
  created_at: string
}

export default function ClientDetailEmployePage() {
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!clientId) {
        setError('ID client manquant.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // 1) Vérifier l'authentification
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          setError('Utilisateur non connecté')
          setLoading(false)
          return
        }

        // 2) Récupérer le profil avec profiles.id = user.id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('entreprise_id')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          setError('Profil utilisateur introuvable.')
          setLoading(false)
          return
        }

        if (!profile.entreprise_id) {
          setError('Entreprise non liée au profil.')
          setLoading(false)
          return
        }

        // 3) Charger le client avec filtre id ET entreprise_id
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .eq('entreprise_id', profile.entreprise_id)
          .single()

        if (clientError || !clientData) {
          console.error('Error fetching client:', clientError)
          setError('Client introuvable.')
          setLoading(false)
          return
        }

        setClient(clientData)
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Une erreur inattendue est survenue.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clientId])

  if (loading) {
    return (
      <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
        <p className="text-gray-400 text-center py-8">Chargement...</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div>
        <Link href="/dashboard/employe/clients" className="text-gray-400 hover:text-white mb-4 inline-block">
          ← Retour à la liste
        </Link>
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <p className="text-red-400 text-center py-8">{error || 'Client introuvable.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <Link href="/dashboard/employe/clients" className="text-gray-400 hover:text-white mb-4 inline-block">
          ← Retour à la liste
        </Link>
        <h1 className="text-4xl md:text-5xl font-bold text-white">
          {client.last_name.toUpperCase()} {client.first_name}
        </h1>
      </div>

      <div className="bg-[#1a1f3a] rounded-3xl p-6 md:p-8 border border-[#2a2f4a] max-w-2xl">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Informations</h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Prénom</p>
                <p className="text-white text-lg">{client.first_name}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Nom</p>
                <p className="text-white text-lg">{client.last_name}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Téléphone</p>
                <p className="text-white text-lg">{client.phone}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Adresse</p>
                <p className="text-white text-lg">{client.address}</p>
              </div>
              {client.email && (
                <div>
                  <p className="text-gray-400 text-sm mb-1">Email</p>
                  <p className="text-white text-lg">{client.email}</p>
                </div>
              )}
              {client.notes && (
                <div>
                  <p className="text-gray-400 text-sm mb-1">Notes</p>
                  <p className="text-white text-lg whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

