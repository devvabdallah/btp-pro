'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { getTradeLabel } from '@/lib/trades'

interface Client {
  id: string
  first_name: string
  last_name: string
  phone: string | null
}

interface Chantier {
  id: string
  title: string
  address: string | null
  status: string | null
  trade: string | null
  created_at: string
  client: Client | null
}

interface ChantierNote {
  id: string
  entreprise_id: string
  chantier_id: string
  author_id: string
  content: string
  created_at: string
}

interface ChantierPhoto {
  id: string
  entreprise_id: string
  chantier_id: string
  uploader_user_id: string
  storage_path: string
  created_at: string
  signedUrl?: string // URL signée pour l'affichage
}

interface ChecklistItem {
  id: string
  chantier_id: string
  entreprise_id: string
  label: string
  is_done: boolean
  created_at: string
}

export default function ChantierDetailPage() {
  const router = useRouter()
  const params = useParams()
  const chantierId = params.id as string

  const [chantier, setChantier] = useState<Chantier | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null)
  const [notes, setNotes] = useState<ChantierNote[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [userRole, setUserRole] = useState<'patron' | 'employe' | null>(null)
  const [isCompanyActive, setIsCompanyActive] = useState<boolean | null>(null)
  const [photos, setPhotos] = useState<ChantierPhoto[]>([])
  const [photosLoading, setPhotosLoading] = useState(false)
  const [photosError, setPhotosError] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<ChantierPhoto | null>(null)
  const [photoToDelete, setPhotoToDelete] = useState<ChantierPhoto | null>(null)
  const [deletingPhoto, setDeletingPhoto] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [checklistError, setChecklistError] = useState<string | null>(null)
  const [newChecklistLabel, setNewChecklistLabel] = useState('')
  const [addingChecklistItem, setAddingChecklistItem] = useState(false)
  const [togglingChecklistItem, setTogglingChecklistItem] = useState<string | null>(null)
  const [deletingChecklistItem, setDeletingChecklistItem] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
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
          .select('entreprise_id, role')
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

        setEntrepriseId(profile.entreprise_id)
        setUserRole(profile.role as 'patron' | 'employe')

        // 2.5 Vérifier si l'entreprise est active (abonnement/essai)
        try {
          const supabaseClient = createSupabaseBrowserClient()
          const { data: isActive, error: activeError } = await supabaseClient
            .rpc('is_company_active', { entreprise_id: profile.entreprise_id })

          if (!activeError && isActive !== null && isActive !== undefined) {
            setIsCompanyActive(Boolean(isActive))
          } else {
            // Si erreur => laisser null (ne pas bloquer)
            setIsCompanyActive(null)
          }
        } catch (err) {
          // En cas d'erreur, laisser null (comportement par défaut)
          setIsCompanyActive(null)
        }

        // 3) Charger le chantier par son id avec filtre entreprise_id et relation client
        const { data: chantierData, error: chantierError } = await supabase
          .from('chantiers')
          .select('id, title, address, status, trade, created_at, client:clients(id,first_name,last_name,phone)')
          .eq('id', chantierId)
          .eq('entreprise_id', profile.entreprise_id)
          .single()

        if (chantierError || !chantierData) {
          setError('Chantier introuvable.')
          setLoading(false)
          return
        }

        // Normaliser les données : convertir client (tableau) en objet unique ou null
        const normalizedChantier: Chantier = {
          ...chantierData,
          client: Array.isArray(chantierData.client) 
            ? (chantierData.client.length > 0 ? chantierData.client[0] : null)
            : chantierData.client || null
        }

        setChantier(normalizedChantier)

        // 4) Charger les notes du chantier
        await loadNotes(profile.entreprise_id, chantierId)

        // 5) Charger les items de checklist
        await loadChecklistItems(profile.entreprise_id, chantierId)

        // 6) Charger les photos du chantier
        await loadPhotos(profile.entreprise_id, chantierId)
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Une erreur inattendue est survenue.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [chantierId])


  // Fonction pour formater le nom du client
  const getClientName = (client: Client | null) => {
    if (!client) return 'Client supprimé'
    return `${client.last_name.toUpperCase()} ${client.first_name}`
  }

  // Fonction pour nettoyer le numéro de téléphone (enlever espaces, points, tirets, parenthèses)
  const cleanPhoneNumber = (phone: string | null | undefined): string => {
    if (!phone) return ''
    return phone.replace(/[\s\.\-\(\)]/g, '')
  }

  // Fonction pour obtenir l'URL Google Maps
  const getGoogleMapsUrl = (address: string | null | undefined): string => {
    if (!address) return ''
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  }

  // Fonction pour charger les notes du chantier
  const loadNotes = async (entrepriseId: string, chantierId: string) => {
    setNotesLoading(true)
    setNotesError(null)

    try {
      const { data: notesData, error: notesError } = await supabase
        .from('chantier_notes')
        .select('id, entreprise_id, chantier_id, author_id, content, created_at')
        .eq('entreprise_id', entrepriseId)
        .eq('chantier_id', chantierId)
        .order('created_at', { ascending: false })

      if (notesError) {
        setNotesError('Impossible de charger les notes.')
        console.error('Error loading notes:', notesError)
        return
      }

      setNotes(notesData || [])
    } catch (err) {
      console.error('Unexpected error loading notes:', err)
      setNotesError('Erreur lors du chargement des notes.')
    } finally {
      setNotesLoading(false)
    }
  }

  // Fonction pour ajouter une note
  const handleAddNote = async () => {
    const trimmedContent = newNoteContent.trim()

    // Validation
    if (trimmedContent.length < 2) {
      setNotesError('La note doit contenir au moins 2 caractères.')
      return
    }

    if (!entrepriseId || !chantierId) {
      setNotesError('Données manquantes pour ajouter la note.')
      return
    }

    setAddingNote(true)
    setNotesError(null)

    try {
      // Vérifier la session
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setNotesError('Utilisateur non connecté')
        setAddingNote(false)
        return
      }

      // Récupérer le rôle de l'utilisateur
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        setNotesError('Profil utilisateur introuvable.')
        setAddingNote(false)
        return
      }

      // Insérer la note
      const { data: newNote, error: insertError } = await supabase
        .from('chantier_notes')
        .insert({
          entreprise_id: entrepriseId,
          chantier_id: chantierId,
          author_id: user.id,
          content: trimmedContent,
        })
        .select()
        .single()

      if (insertError || !newNote) {
        // Logger les détails complets de l'erreur Supabase
        console.error('Error adding note:', JSON.stringify({
          context: "add_note",
          message: insertError?.message || 'Erreur inconnue',
          details: insertError?.details || null,
          hint: insertError?.hint || null,
          code: insertError?.code || null,
          status: insertError?.status || null
        }, null, 2))
        
        // Afficher le message d'erreur Supabase dans l'UI
        const errorMessage = insertError?.message || 'Impossible d\'ajouter la note'
        const errorDetails = insertError?.details ? `\n${insertError.details}` : ''
        setNotesError(errorMessage + errorDetails)
        setAddingNote(false)
        return
      }

      // Ajouter la note en haut de la liste (prepend)
      setNotes((prevNotes) => [newNote, ...prevNotes])
      setNewNoteContent('')
    } catch (err) {
      console.error('Unexpected error adding note:', err)
      setNotesError('Erreur lors de l\'ajout de la note.')
    } finally {
      setAddingNote(false)
    }
  }



  // Composant pour afficher une note individuelle
  const NoteItem = ({ 
    note
  }: { 
    note: ChantierNote
  }) => {
    return (
      <div className="bg-[#0f1329] border border-[#2a2f4a] rounded-xl p-4 space-y-2">
        <div className="flex-1">
          <p className="text-white text-base leading-relaxed whitespace-pre-wrap">
            {note.content}
          </p>
          <p className="text-gray-400 text-xs mt-2">
            {formatRelativeDate(note.created_at)}
          </p>
        </div>
      </div>
    )
  }

  // Fonction pour formater la date relative
  const formatRelativeDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    const timeStr = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    if (diffDays === 0) {
      return `Aujourd'hui ${timeStr}`
    } else if (diffDays === 1) {
      return `Hier ${timeStr}`
    } else if (diffDays < 7) {
      return date.toLocaleDateString('fr-FR', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }

  // Fonction pour charger les items de checklist
  const loadChecklistItems = async (entrepriseId: string, chantierId: string) => {
    setChecklistLoading(true)
    setChecklistError(null)

    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('chantier_checklist_items')
        .select('id, chantier_id, entreprise_id, label, is_done, created_at')
        .eq('entreprise_id', entrepriseId)
        .eq('chantier_id', chantierId)
        .order('created_at', { ascending: true })

      if (itemsError) {
        setChecklistError('Impossible de charger la checklist.')
        console.error('Error loading checklist:', itemsError)
        return
      }

      setChecklistItems(itemsData || [])
    } catch (err) {
      console.error('Unexpected error loading checklist:', err)
      setChecklistError('Erreur lors du chargement de la checklist.')
    } finally {
      setChecklistLoading(false)
    }
  }

  // Fonction pour ajouter un item à la checklist
  const handleAddChecklistItem = async () => {
    const trimmedLabel = newChecklistLabel.trim()

    // Validation
    if (trimmedLabel.length < 2) {
      setChecklistError('Le libellé doit contenir au moins 2 caractères.')
      return
    }

    if (!entrepriseId || !chantierId) {
      setChecklistError('Données manquantes pour ajouter l\'item.')
      return
    }

    setAddingChecklistItem(true)
    setChecklistError(null)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setChecklistError('Utilisateur non connecté')
        setAddingChecklistItem(false)
        return
      }

      const { data: newItem, error: insertError } = await supabase
        .from('chantier_checklist_items')
        .insert({
          entreprise_id: entrepriseId,
          chantier_id: chantierId,
          label: trimmedLabel,
          is_done: false,
        })
        .select()
        .single()

      if (insertError || !newItem) {
        console.error('Error adding checklist item:', insertError)
        setChecklistError(insertError?.message || 'Impossible d\'ajouter l\'item.')
        setAddingChecklistItem(false)
        return
      }

      // Ajouter l'item à la fin de la liste
      setChecklistItems((prevItems) => [...prevItems, newItem])
      setNewChecklistLabel('')
    } catch (err) {
      console.error('Unexpected error adding checklist item:', err)
      setChecklistError('Erreur lors de l\'ajout de l\'item.')
    } finally {
      setAddingChecklistItem(false)
    }
  }

  // Fonction pour toggle l'état d'un item
  const handleToggleChecklistItem = async (itemId: string, currentIsDone: boolean) => {
    if (!entrepriseId) {
      setChecklistError('Données manquantes.')
      return
    }

    setTogglingChecklistItem(itemId)
    setChecklistError(null)

    try {
      const { error: updateError } = await supabase
        .from('chantier_checklist_items')
        .update({ is_done: !currentIsDone })
        .eq('id', itemId)
        .eq('entreprise_id', entrepriseId)

      if (updateError) {
        console.error('Error toggling checklist item:', updateError)
        setChecklistError('Impossible de modifier l\'item.')
        setTogglingChecklistItem(null)
        return
      }

      // Mettre à jour l'item localement
      setChecklistItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId ? { ...item, is_done: !currentIsDone } : item
        )
      )
    } catch (err) {
      console.error('Unexpected error toggling checklist item:', err)
      setChecklistError('Erreur lors de la modification.')
    } finally {
      setTogglingChecklistItem(null)
    }
  }

  // Fonction pour supprimer un item
  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!entrepriseId) {
      setChecklistError('Données manquantes.')
      return
    }

    setDeletingChecklistItem(itemId)
    setChecklistError(null)

    try {
      const { error: deleteError } = await supabase
        .from('chantier_checklist_items')
        .delete()
        .eq('id', itemId)
        .eq('entreprise_id', entrepriseId)

      if (deleteError) {
        console.error('Error deleting checklist item:', deleteError)
        setChecklistError('Impossible de supprimer l\'item.')
        setDeletingChecklistItem(null)
        return
      }

      // Retirer l'item de la liste
      setChecklistItems((prevItems) => prevItems.filter((item) => item.id !== itemId))
    } catch (err) {
      console.error('Unexpected error deleting checklist item:', err)
      setChecklistError('Erreur lors de la suppression.')
    } finally {
      setDeletingChecklistItem(null)
    }
  }

  // Fonction pour supprimer le chantier
  const handleDeleteChantier = async () => {
    if (!entrepriseId || !chantierId) {
      setError('Données manquantes pour supprimer le chantier.')
      return
    }

    setDeleting(true)
    setError(null)

    try {
      // 1) Vérifier l'authentification
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('Utilisateur non connecté')
        setDeleting(false)
        setShowDeleteModal(false)
        return
      }

      // 2) Récupérer le profil pour vérifier l'entreprise_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('entreprise_id')
        .eq('id', user.id)
        .single()

      if (profileError || !profile || !profile.entreprise_id) {
        setError('Profil utilisateur introuvable')
        setDeleting(false)
        setShowDeleteModal(false)
        return
      }

      // 3) Supprimer le chantier avec filtre strict
      const { error: deleteError } = await supabase
        .from('chantiers')
        .delete()
        .eq('id', chantierId)
        .eq('entreprise_id', profile.entreprise_id)

      if (deleteError) {
        console.error('Delete error:', deleteError)
        setError(deleteError.message || 'Erreur lors de la suppression du chantier.')
        setDeleting(false)
        setShowDeleteModal(false)
        return
      }

      // Succès : rediriger vers la liste avec message de succès
      router.push('/dashboard/patron/chantiers?success=' + encodeURIComponent('Chantier supprimé'))
    } catch (err) {
      console.error('Unexpected error deleting chantier:', err)
      setError('Une erreur inattendue est survenue.')
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  // Fonction pour charger les photos du chantier avec signed URLs
  const loadPhotos = async (entrepriseId: string, chantierId: string) => {
    setPhotosLoading(true)
    setPhotosError(null)

    try {
      // 1) Charger les métadonnées des photos depuis la DB
      const { data: photosData, error: photosError } = await supabase
        .from('chantier_photos')
        .select('*')
        .eq('entreprise_id', entrepriseId)
        .eq('chantier_id', chantierId)
        .order('created_at', { ascending: false })

      if (photosError) {
        setPhotosError('Impossible de charger les photos.')
        console.error('Error loading photos:', photosError)
        return
      }

      if (!photosData || photosData.length === 0) {
        setPhotos([])
        return
      }

      // 2) Générer les signed URLs pour chaque photo en parallèle
      const photosWithUrls = await Promise.all(
        photosData.map(async (photo) => {
          const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('chantier-photos')
            .createSignedUrl(photo.storage_path, 3600) // 60 minutes

          if (urlError) {
            console.error('Error creating signed URL for photo:', photo.id, urlError)
            return { ...photo, signedUrl: null }
          }

          return {
            ...photo,
            signedUrl: signedUrlData?.signedUrl || null,
          }
        })
      )

      setPhotos(photosWithUrls)
    } catch (err) {
      console.error('Unexpected error loading photos:', err)
      setPhotosError('Erreur lors du chargement des photos.')
    } finally {
      setPhotosLoading(false)
    }
  }

  // Fonction pour uploader une photo
  const handleUploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validation du type de fichier
    if (!file.type.startsWith('image/')) {
      setPhotosError('Le fichier doit être une image.')
      return
    }

    if (!entrepriseId || !chantierId) {
      setPhotosError('Données manquantes pour ajouter la photo.')
      return
    }

    setUploadingPhoto(true)
    setPhotosError(null)

    try {
      // 1) Vérifier la session
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setPhotosError('Utilisateur non connecté')
        setUploadingPhoto(false)
        return
      }

      // 2) Générer l'ID de la photo et déterminer l'extension
      const photoId = crypto.randomUUID()
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const storagePath = `${entrepriseId}/${chantierId}/${photoId}.${ext}`

      // 3) Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('chantier-photos')
        .upload(storagePath, file, {
          upsert: false,
          cacheControl: '3600',
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        setPhotosError('Impossible d\'uploader la photo.')
        setUploadingPhoto(false)
        return
      }

      // 4) Insérer dans la DB
      const { data: newPhoto, error: insertError } = await supabase
        .from('chantier_photos')
        .insert({
          entreprise_id: entrepriseId,
          chantier_id: chantierId,
          uploader_user_id: user.id,
          storage_path: storagePath,
        })
        .select()
        .single()

      if (insertError || !newPhoto) {
        // Si l'insert échoue, supprimer le fichier uploadé
        await supabase.storage.from('chantier-photos').remove([storagePath])
        setPhotosError('Impossible d\'enregistrer la photo.')
        console.error('Insert error:', insertError)
        setUploadingPhoto(false)
        return
      }

      // 5) Générer la signed URL pour la nouvelle photo
      const { data: signedUrlData } = await supabase.storage
        .from('chantier-photos')
        .createSignedUrl(storagePath, 3600)

      const photoWithUrl: ChantierPhoto = {
        ...newPhoto,
        signedUrl: signedUrlData?.signedUrl || null,
      }

      // 6) Ajouter la photo en haut de la liste
      setPhotos((prevPhotos) => [photoWithUrl, ...prevPhotos])

      // 7) Réinitialiser l'input file
      event.target.value = ''

      // 8) Afficher un toast de succès (via URL param)
      router.replace(
        `/dashboard/patron/chantiers/${chantierId}?success=${encodeURIComponent('Photo ajoutée')}`
      )
    } catch (err) {
      console.error('Unexpected error uploading photo:', err)
      setPhotosError('Erreur lors de l\'ajout de la photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Fonction pour ouvrir la modale de confirmation de suppression
  const handleDeletePhoto = (photo: ChantierPhoto) => {
    setPhotoToDelete(photo)
  }

  // Fonction pour confirmer et exécuter la suppression
  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return

    const photo = photoToDelete

    if (!entrepriseId) {
      setPhotosError('Données manquantes pour supprimer la photo.')
      setPhotoToDelete(null)
      return
    }

    setDeletingPhoto(true)
    setPhotosError(null)

    try {
      // 1) Vérifier la session
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setPhotosError('Utilisateur non connecté')
        setDeletingPhoto(false)
        setPhotoToDelete(null)
        return
      }

      // 2) Supprimer le fichier du storage
      const { error: storageError } = await supabase.storage
        .from('chantier-photos')
        .remove([photo.storage_path])

      if (storageError) {
        console.error('Storage delete error:', storageError)
        // Continuer quand même pour supprimer de la DB
      }

      // 3) Supprimer de la DB avec filtre strict
      const { error: deleteError } = await supabase
        .from('chantier_photos')
        .delete()
        .eq('id', photo.id)
        .eq('entreprise_id', entrepriseId)

      if (deleteError) {
        console.error('DB delete error:', deleteError)
        setPhotosError('Impossible de supprimer la photo.')
        setDeletingPhoto(false)
        setPhotoToDelete(null)
        return
      }

      // 4) Retirer de la liste locale
      setPhotos((prevPhotos) => prevPhotos.filter((p) => p.id !== photo.id))

      // 5) Fermer le modal si ouvert
      if (selectedPhoto?.id === photo.id) {
        setSelectedPhoto(null)
      }

      // 6) Fermer la modale de confirmation
      setPhotoToDelete(null)
    } catch (err) {
      console.error('Unexpected error deleting photo:', err)
      setPhotosError('Erreur lors de la suppression de la photo.')
      setDeletingPhoto(false)
      setPhotoToDelete(null)
    } finally {
      setDeletingPhoto(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6">
      <div className="mb-6">
        <Link href="/dashboard/patron/chantiers">
          <Button variant="secondary" size="sm">
            ← Retour
          </Button>
        </Link>
      </div>

      <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-4xl md:text-5xl font-bold text-white">Chantier</h1>
        {chantier && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={`/dashboard/patron/chantiers/${chantierId}/edit`}>
              <Button variant="primary" size="md">
                Modifier
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowDeleteModal(true)}
              className="border-red-500/50 text-red-400 hover:border-red-500 hover:bg-red-500/10"
            >
              Supprimer
            </Button>
          </div>
        )}
      </div>

      {/* Modal de confirmation de suppression */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        title="Supprimer ce chantier ?"
      >
        <div className="space-y-4">
          <p className="text-gray-300">Cette action est définitive.</p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
              className="w-full sm:flex-1"
            >
              Annuler
            </Button>
            <button
              onClick={handleDeleteChantier}
              disabled={deleting}
              className="w-full sm:flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-[#1a1f3a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Erreur */}
      {error && (
        <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-2xl p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Chargement */}
      {loading ? (
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <p className="text-gray-400 text-center py-8">Chargement...</p>
        </div>
      ) : chantier ? (
        <div className="space-y-6">
          {/* Détails du chantier */}
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
            <h2 className="text-xl font-bold text-white mb-4">Détails du chantier</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Adresse */}
              <div>
                <label className="text-gray-400 text-sm font-medium mb-1 block">Adresse</label>
                <p className="text-white text-lg">{chantier.address || '—'}</p>
              </div>

              {/* Métier */}
              <div>
                <label className="text-gray-400 text-sm font-medium mb-1 block">Métier</label>
                <p className="text-white text-lg">{getTradeLabel(chantier.trade)}</p>
              </div>

              {/* Statut */}
              <div>
                <label className="text-gray-400 text-sm font-medium mb-2 block">Statut</label>
                <StatusBadge status={chantier.status} />
              </div>

              {/* Client */}
              <div>
                <label className="text-gray-400 text-sm font-medium mb-1 block">Client</label>
                <p className="text-white text-lg font-semibold">{getClientName(chantier.client)}</p>
              </div>

              {/* Téléphone client */}
              <div>
                <label className="text-gray-400 text-sm font-medium mb-1 block">Téléphone</label>
                {chantier.client?.phone ? (
                  <p className="text-white text-lg font-semibold">{chantier.client.phone}</p>
                ) : (
                  <p className="text-gray-400 text-base">—</p>
                )}
              </div>
            </div>
          </div>

          {/* Suivi du chantier */}
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a] space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Suivi du chantier</h2>
              <p className="text-gray-400 text-sm">Carnet de bord du chantier</p>
            </div>

            {/* Formulaire d'ajout de note */}
            <div className="space-y-3">
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Ex : Avancement du jour, problème rencontré, client informé…"
                rows={3}
                disabled={isCompanyActive === false}
                className="w-full px-4 py-3 bg-[#0f1329] border border-[#2a2f4a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex flex-col gap-2">
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleAddNote}
                    disabled={addingNote || !newNoteContent.trim() || isCompanyActive === false}
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingNote ? 'Ajout...' : 'Ajouter la note'}
                  </Button>
                </div>
                {isCompanyActive === false && (
                  <p className="text-sm text-red-300">
                    Votre abonnement est expiré. Le suivi du chantier est désactivé.
                  </p>
                )}
              </div>
            </div>

            {/* Message d'erreur notes */}
            {notesError && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3">
                <p className="text-red-400 text-sm whitespace-pre-line">{notesError}</p>
              </div>
            )}

            {/* Liste des notes */}
            {notesLoading ? (
              <div className="py-4">
                <p className="text-gray-400 text-center">Chargement des notes...</p>
              </div>
            ) : notes.length === 0 ? (
              <div className="py-6">
                <p className="text-gray-400 text-center">Aucune note pour le moment</p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {notes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Checklist du chantier */}
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a] space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Checklist du chantier</h2>
              <p className="text-gray-400 text-sm">Tâches à accomplir</p>
            </div>

            {/* Formulaire d'ajout */}
            {isCompanyActive !== false && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newChecklistLabel}
                    onChange={(e) => setNewChecklistLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !addingChecklistItem && newChecklistLabel.trim().length >= 2) {
                        e.preventDefault()
                        handleAddChecklistItem()
                      }
                    }}
                    placeholder="Ex : Matériel livré, Client prévenu, Nettoyage fin de journée…"
                    disabled={addingChecklistItem || isCompanyActive === false}
                    className="flex-1 px-4 py-3 bg-[#0f1329] border border-[#2a2f4a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleAddChecklistItem}
                    disabled={addingChecklistItem || !newChecklistLabel.trim() || isCompanyActive === false}
                    className="w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingChecklistItem ? 'Ajout...' : 'Ajouter'}
                  </Button>
                </div>
              </div>
            )}
            {isCompanyActive === false && (
              <p className="text-sm text-red-300">
                Votre abonnement est expiré. La checklist est en lecture seule.
              </p>
            )}

            {/* Message d'erreur checklist */}
            {checklistError && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3">
                <p className="text-red-400 text-sm">{checklistError}</p>
              </div>
            )}

            {/* Liste des items */}
            {checklistLoading ? (
              <div className="py-4">
                <p className="text-gray-400 text-center">Chargement de la checklist...</p>
              </div>
            ) : checklistItems.length === 0 ? (
              <div className="py-6">
                <p className="text-gray-400 text-center">Aucun item dans la checklist</p>
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-[#0f1329] border border-[#2a2f4a] rounded-xl hover:border-[#3a3f5a] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={item.is_done}
                      onChange={() => {
                        if (isCompanyActive !== false && togglingChecklistItem !== item.id) {
                          handleToggleChecklistItem(item.id, item.is_done)
                        }
                      }}
                      disabled={isCompanyActive === false || togglingChecklistItem === item.id}
                      className="w-5 h-5 rounded border-2 border-[#3a3f5a] bg-[#0f1329] text-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-[#0f1329] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <label
                      className={`flex-1 text-base cursor-pointer ${
                        item.is_done
                          ? 'text-gray-500 line-through'
                          : 'text-white'
                      }`}
                      onClick={() => {
                        if (isCompanyActive !== false && togglingChecklistItem !== item.id) {
                          handleToggleChecklistItem(item.id, item.is_done)
                        }
                      }}
                    >
                      {item.label}
                    </label>
                    {isCompanyActive !== false && (
                      <button
                        onClick={() => {
                          if (deletingChecklistItem !== item.id) {
                            handleDeleteChecklistItem(item.id)
                          }
                        }}
                        disabled={deletingChecklistItem === item.id}
                        className="text-gray-400 hover:text-red-400 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Supprimer"
                      >
                        {deletingChecklistItem === item.id ? (
                          <svg
                            className="animate-spin h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-xl font-bold text-white">Photos</h2>
              <label className="cursor-pointer w-full sm:w-auto">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleUploadPhoto}
                  disabled={uploadingPhoto}
                  className="hidden"
                />
                <div className="w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="md"
                    disabled={uploadingPhoto}
                    className="w-full sm:w-auto pointer-events-none"
                  >
                    {uploadingPhoto ? 'Upload...' : '📷 Ajouter une photo'}
                  </Button>
                </div>
              </label>
            </div>

            {/* Message d'erreur photos */}
            {photosError && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3">
                <p className="text-red-400 text-sm">{photosError}</p>
              </div>
            )}

            {/* Grille de photos */}
            {photosLoading ? (
              <div className="py-8">
                <p className="text-gray-400 text-center">Chargement des photos...</p>
              </div>
            ) : photos.length === 0 ? (
              <div className="py-8">
                <p className="text-gray-400 text-center">Aucune photo pour le moment</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square bg-[#0f1329] rounded-xl overflow-hidden group"
                  >
                    {photo.signedUrl ? (
                      <>
                        <img
                          src={photo.signedUrl}
                          alt="Photo chantier"
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setSelectedPhoto(photo)}
                        />
                        <button
                          onClick={() => handleDeletePhoto(photo)}
                          className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Supprimer"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <p className="text-xs">Erreur de chargement</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal d'agrandissement photo */}
          {selectedPhoto && selectedPhoto.signedUrl && (
            <Modal
              isOpen={!!selectedPhoto}
              onClose={() => setSelectedPhoto(null)}
              title=""
            >
              <div className="relative">
                <img
                  src={selectedPhoto.signedUrl}
                  alt="Photo chantier"
                  className="max-h-[80vh] w-auto mx-auto rounded-xl"
                />
                <button
                  onClick={() => handleDeletePhoto(selectedPhoto)}
                  className="absolute top-4 right-4 bg-red-500/90 hover:bg-red-600 text-white rounded-full p-3"
                  title="Supprimer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </Modal>
          )}

          {/* Modal de confirmation de suppression de photo */}
          <Modal
            isOpen={!!photoToDelete}
            onClose={() => !deletingPhoto && setPhotoToDelete(null)}
            title="Supprimer la photo"
          >
            <div className="space-y-4">
              <p className="text-gray-300">
                Es-tu sûr de vouloir supprimer cette photo ? Cette action est définitive.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setPhotoToDelete(null)}
                  disabled={deletingPhoto}
                  className="w-full sm:flex-1"
                >
                  Annuler
                </Button>
                <button
                  onClick={confirmDeletePhoto}
                  disabled={deletingPhoto}
                  className="w-full sm:flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-[#1a1f3a] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingPhoto ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </Modal>

          {/* Actions rapides */}
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a] space-y-3">
            <h2 className="text-xl font-bold text-white mb-2">Actions rapides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Bouton Appeler */}
              {chantier.client?.phone ? (
                <a
                  href={`tel:${cleanPhoneNumber(chantier.client.phone)}`}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-full hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/20 min-h-[44px] text-base"
                >
                  <span>📞</span>
                  <span>Appeler</span>
                </a>
              ) : (
                <button
                  disabled
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-700/50 text-gray-400 font-semibold rounded-full cursor-not-allowed min-h-[44px] text-base"
                >
                  <span>📞</span>
                  <span>Appeler</span>
                  <span className="text-xs ml-1">(Téléphone non renseigné)</span>
                </button>
              )}

              {/* Bouton Itinéraire */}
              {chantier.address ? (
                <a
                  href={getGoogleMapsUrl(chantier.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-full hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg shadow-green-500/20 min-h-[44px] text-base"
                >
                  <span>🗺️</span>
                  <span>Itinéraire</span>
                </a>
              ) : (
                <button
                  disabled
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-700/50 text-gray-400 font-semibold rounded-full cursor-not-allowed min-h-[44px] text-base"
                >
                  <span>🗺️</span>
                  <span>Itinéraire</span>
                  <span className="text-xs ml-1">(Adresse non renseignée)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

