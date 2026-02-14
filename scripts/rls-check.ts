/**
 * Script de test RLS (Row Level Security) pour vérifier l'isolation des données entre entreprises
 * 
 * Usage: npm run rls:check
 * 
 * Prérequis:
 * - Variables d'environnement requises (définies dans .env.local ou exportées):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   - TEST_TOKEN_A (JWT token de l'utilisateur A - récupérer depuis le navigateur après connexion)
 *   - TEST_TOKEN_B (JWT token de l'utilisateur B - récupérer depuis le navigateur après connexion)
 * 
 * Pour obtenir les tokens:
 * 1. Connectez-vous avec l'utilisateur A dans le navigateur
 * 2. Ouvrez la console développeur > Application > Local Storage > supabase.auth.token
 * 3. Copiez le token JWT (access_token)
 * 4. Répétez pour l'utilisateur B
 * 5. Ajoutez-les dans .env.local: TEST_TOKEN_A=... et TEST_TOKEN_B=...
 * 
 * Le script effectue uniquement des requêtes SELECT (read-only).
 * Aucune écriture en base de données.
 */

import { createClient } from '@supabase/supabase-js'

interface TestResult {
  entrepriseId: string | null
  clientsCount: number
  chantiersCount: number
  agendaEventsCount: number
  error?: string
}

interface CrossReadResult {
  test: string
  passed: boolean
  error?: string
}

/**
 * Crée un client Supabase avec un token JWT spécifique
 */
function createSupabaseClientWithToken(token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      `Variables d'environnement manquantes: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY`
    )
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}

/**
 * Récupère l'entreprise_id depuis le profil de l'utilisateur
 */
async function getEntrepriseId(supabase: any): Promise<string | null> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error(`Impossible de récupérer l'utilisateur: ${userError?.message || 'User not found'}`)
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('entreprise_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error(`Impossible de récupérer le profil: ${profileError?.message || 'Profile not found'}`)
  }

  return profile.entreprise_id
}

/**
 * Teste les counts pour une entreprise donnée
 */
async function testCompanyData(supabase: any, label: string): Promise<TestResult> {
  console.log(`\n📊 Test ${label}...`)

  try {
    // Récupérer l'entreprise_id
    const entrepriseId = await getEntrepriseId(supabase)
    console.log(`  Entreprise ID: ${entrepriseId || 'N/A'}`)

    if (!entrepriseId) {
      return {
        entrepriseId: null,
        clientsCount: 0,
        chantiersCount: 0,
        agendaEventsCount: 0,
        error: 'Entreprise ID non trouvé',
      }
    }

    // Compter les clients
    const { count: clientsCount, error: clientsError } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })

    if (clientsError) {
      console.warn(`  ⚠️  Erreur lors du comptage des clients: ${clientsError.message}`)
    }

    // Compter les chantiers
    const { count: chantiersCount, error: chantiersError } = await supabase
      .from('chantiers')
      .select('*', { count: 'exact', head: true })

    if (chantiersError) {
      console.warn(`  ⚠️  Erreur lors du comptage des chantiers: ${chantiersError.message}`)
    }

    // Compter les événements agenda
    const { count: agendaEventsCount, error: agendaError } = await supabase
      .from('agenda_events')
      .select('*', { count: 'exact', head: true })

    if (agendaError) {
      console.warn(`  ⚠️  Erreur lors du comptage des événements agenda: ${agendaError.message}`)
    }

    return {
      entrepriseId,
      clientsCount: clientsCount || 0,
      chantiersCount: chantiersCount || 0,
      agendaEventsCount: agendaEventsCount || 0,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error(`  ❌ Erreur: ${errorMessage}`)
    return {
      entrepriseId: null,
      clientsCount: 0,
      chantiersCount: 0,
      agendaEventsCount: 0,
      error: errorMessage,
    }
  }
}

/**
 * Teste qu'un utilisateur B ne peut pas lire les données d'un utilisateur A
 */
async function testCrossRead(
  supabaseA: any,
  supabaseB: any,
  testResultA: TestResult,
  testResultB: TestResult
): Promise<CrossReadResult[]> {
  const results: CrossReadResult[] = []

  // Test 1: Cross-read client A depuis B
  if (testResultA.clientsCount > 0 && testResultA.entrepriseId) {
    try {
      // Récupérer un ID de client visible par A
      const { data: clientsA, error: clientsAError } = await supabaseA
        .from('clients')
        .select('id')
        .limit(1)

      if (!clientsAError && clientsA && clientsA.length > 0) {
        const clientIdA = clientsA[0].id

        // Tenter de lire ce client avec B
        const { data: clientB, error: clientBError } = await supabaseB
          .from('clients')
          .select('*')
          .eq('id', clientIdA)
          .single()

        // RLS devrait bloquer: clientB doit être null/undefined
        // Si clientB existe, c'est un FAIL (fuite de données)
        // Une erreur est attendue (RLS bloque) ou clientB doit être null
        const passed = !clientB

        results.push({
          test: 'Cross-read client A depuis B',
          passed,
          error: clientBError 
            ? `Erreur RLS attendue: ${clientBError.message}` 
            : clientB 
              ? 'FAIL: Client accessible depuis entreprise B (RLS non respecté)' 
              : undefined,
        })
      } else {
        results.push({
          test: 'Cross-read client A depuis B',
          passed: false,
          error: 'Impossible de récupérer un client A pour le test',
        })
      }
    } catch (error) {
      results.push({
        test: 'Cross-read client A depuis B',
        passed: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  } else {
    results.push({
      test: 'Cross-read client A depuis B',
      passed: true,
      error: 'Skip: Aucun client dans l\'entreprise A',
    })
  }

  // Test 2: Cross-read chantier A depuis B
  if (testResultA.chantiersCount > 0 && testResultA.entrepriseId) {
    try {
      // Récupérer un ID de chantier visible par A
      const { data: chantiersA, error: chantiersAError } = await supabaseA
        .from('chantiers')
        .select('id')
        .limit(1)

      if (!chantiersAError && chantiersA && chantiersA.length > 0) {
        const chantierIdA = chantiersA[0].id

        // Tenter de lire ce chantier avec B
        const { data: chantierB, error: chantierBError } = await supabaseB
          .from('chantiers')
          .select('*')
          .eq('id', chantierIdA)
          .single()

        // RLS devrait bloquer: chantierB doit être null/undefined
        // Si chantierB existe, c'est un FAIL (fuite de données)
        // Une erreur est attendue (RLS bloque) ou chantierB doit être null
        const passed = !chantierB

        results.push({
          test: 'Cross-read chantier A depuis B',
          passed,
          error: chantierBError 
            ? `Erreur RLS attendue: ${chantierBError.message}` 
            : chantierB 
              ? 'FAIL: Chantier accessible depuis entreprise B (RLS non respecté)' 
              : undefined,
        })
      } else {
        results.push({
          test: 'Cross-read chantier A depuis B',
          passed: false,
          error: 'Impossible de récupérer un chantier A pour le test',
        })
      }
    } catch (error) {
      results.push({
        test: 'Cross-read chantier A depuis B',
        passed: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  } else {
    results.push({
      test: 'Cross-read chantier A depuis B',
      passed: true,
      error: 'Skip: Aucun chantier dans l\'entreprise A',
    })
  }

  return results
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🔒 Test RLS - Vérification de l\'isolation des données entre entreprises\n')
  console.log('=' .repeat(70))

  // Vérifier les variables d'environnement
  const tokenA = process.env.TEST_TOKEN_A
  const tokenB = process.env.TEST_TOKEN_B

  if (!tokenA) {
    console.error('❌ TEST_TOKEN_A manquant dans les variables d\'environnement')
    process.exit(1)
  }

  if (!tokenB) {
    console.error('❌ TEST_TOKEN_B manquant dans les variables d\'environnement')
    process.exit(1)
  }

  // Créer les clients Supabase avec les tokens
  console.log('\n🔧 Création des clients Supabase...')
  const supabaseA = createSupabaseClientWithToken(tokenA)
  const supabaseB = createSupabaseClientWithToken(tokenB)
  console.log('✅ Clients créés')

  // Tester les données de l'entreprise A
  const testResultA = await testCompanyData(supabaseA, 'Entreprise A')
  console.log(`  Clients: ${testResultA.clientsCount}`)
  console.log(`  Chantiers: ${testResultA.chantiersCount}`)
  console.log(`  Événements agenda: ${testResultA.agendaEventsCount}`)

  // Tester les données de l'entreprise B
  const testResultB = await testCompanyData(supabaseB, 'Entreprise B')
  console.log(`  Clients: ${testResultB.clientsCount}`)
  console.log(`  Chantiers: ${testResultB.chantiersCount}`)
  console.log(`  Événements agenda: ${testResultB.agendaEventsCount}`)

  // Tests de cross-read
  console.log('\n🔍 Tests de cross-read (isolation RLS)...')
  const crossReadResults = await testCrossRead(supabaseA, supabaseB, testResultA, testResultB)

  // Afficher le rapport final
  console.log('\n' + '='.repeat(70))
  console.log('📋 RAPPORT FINAL')
  console.log('='.repeat(70))

  console.log('\n📊 Données Entreprise A:')
  console.log(`  Entreprise ID: ${testResultA.entrepriseId || 'N/A'}`)
  console.log(`  Clients: ${testResultA.clientsCount}`)
  console.log(`  Chantiers: ${testResultA.chantiersCount}`)
  console.log(`  Événements agenda: ${testResultA.agendaEventsCount}`)
  if (testResultA.error) {
    console.log(`  ⚠️  Erreur: ${testResultA.error}`)
  }

  console.log('\n📊 Données Entreprise B:')
  console.log(`  Entreprise ID: ${testResultB.entrepriseId || 'N/A'}`)
  console.log(`  Clients: ${testResultB.clientsCount}`)
  console.log(`  Chantiers: ${testResultB.chantiersCount}`)
  console.log(`  Événements agenda: ${testResultB.agendaEventsCount}`)
  if (testResultB.error) {
    console.log(`  ⚠️  Erreur: ${testResultB.error}`)
  }

  console.log('\n🔒 Tests de cross-read:')
  crossReadResults.forEach((result) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL'
    console.log(`  ${status} - ${result.test}`)
    if (result.error) {
      console.log(`      ${result.error}`)
    }
  })

  // Conclusion
  const allPassed = crossReadResults.every((r) => r.passed)
  const hasErrors = testResultA.error || testResultB.error

  console.log('\n' + '='.repeat(70))
  if (allPassed && !hasErrors) {
    console.log('✅ CONCLUSION: RLS OK - Aucune fuite de données détectée')
    process.exit(0)
  } else {
    console.log('❌ CONCLUSION: RLS EN ÉCHEC - Des problèmes ont été détectés')
    if (hasErrors) {
      console.log('   Des erreurs sont survenues lors des tests')
    }
    if (!allPassed) {
      console.log('   Des cross-reads ont réussi (fuite de données possible)')
    }
    process.exit(1)
  }
}

// Exécuter le script
main().catch((error) => {
  console.error('\n❌ Erreur fatale:', error)
  process.exit(1)
})
