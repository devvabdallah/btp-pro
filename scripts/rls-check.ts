/**
 * Script de test RLS (Row Level Security) pour vérifier l'isolation des données entre entreprises
 * 
 * Usage: npm run rls:check
 * 
 * Prérequis:
 * - Fichier .env.local avec les variables suivantes:
 *   - NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_xxx... (ou SUPABASE_ANON_KEY en fallback)
 *   - TEST_TOKEN_A=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx.yyy (JWT complet)
 *   - TEST_TOKEN_B=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx.yyy (JWT complet)
 * 
 * Pour obtenir les tokens:
 * 1. Connectez-vous avec l'utilisateur A dans le navigateur
 * 2. Ouvrez la console développeur > Application > Local Storage > supabase.auth.token
 * 3. Copiez le access_token complet (3 segments séparés par des points)
 * 4. Répétez pour l'utilisateur B
 * 5. Ajoutez-les dans .env.local
 * 
 * Le script effectue uniquement des requêtes SELECT (read-only).
 * Aucune écriture en base de données.
 */

// Charger .env.local en premier (avant tout autre import)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

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
 * Valide le format d'une URL Supabase
 */
function validateSupabaseUrl(url: string | undefined): string {
  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL manquant dans .env.local')
  }

  if (!url.startsWith('https://')) {
    throw new Error(`URL invalide: doit commencer par https:// (reçu: ${url.substring(0, 20)}...)`)
  }

  if (!url.includes('.supabase.co')) {
    throw new Error(`URL invalide: doit contenir .supabase.co (reçu: ${url})`)
  }

  return url
}

/**
 * Valide le format d'une clé anonyme Supabase
 */
function validateSupabaseAnonKey(key: string | undefined): string {
  if (!key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY ou SUPABASE_ANON_KEY manquant dans .env.local')
  }

  // Format moderne: sb_xxx...
  if (key.startsWith('sb_')) {
    return key
  }

  // Format legacy JWT: 3 segments séparés par des points
  const segments = key.split('.')
  if (segments.length === 3) {
    return key
  }

  throw new Error(
    `Clé anonyme invalide: doit commencer par "sb_" ou être un JWT (3 segments). Reçu: ${key.substring(0, 20)}...`
  )
}

/**
 * Valide le format d'un token JWT
 */
function validateJwtToken(token: string | undefined, tokenName: string): string {
  if (!token) {
    throw new Error(`${tokenName} manquant dans .env.local`)
  }

  const segments = token.split('.')
  if (segments.length !== 3) {
    throw new Error(
      `Token incomplet ou mauvais token: ${tokenName} doit être un JWT avec exactement 3 segments séparés par des points.\n` +
      `Reçu: ${token.substring(0, 50)}...\n` +
      `Assurez-vous de copier le access_token complet depuis Local Storage > supabase.auth.token`
    )
  }

  return token
}

/**
 * Teste la connectivité avec Supabase
 */
async function testConnectivity(supabaseUrl: string, supabaseAnonKey: string): Promise<void> {
  try {
    const testClient = createClient(supabaseUrl, supabaseAnonKey)
    
    // Test simple: essayer de récupérer l'utilisateur (sans token, devrait retourner null mais sans erreur réseau)
    const { error } = await testClient.auth.getUser()
    
    // Si erreur de réseau/DNS, elle sera capturée ici
    if (error && (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('DNS'))) {
      throw new Error(
        `Erreur de connectivité: ${error.message}\n` +
        `Vérifiez:\n` +
        `- Que l'URL ${supabaseUrl} est correcte\n` +
        `- Que votre connexion internet fonctionne\n` +
        `- Que le DNS résout correctement`
      )
    }
  } catch (err) {
    if (err instanceof Error && (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('DNS'))) {
      throw new Error(
        `Erreur de connectivité réseau: ${err.message}\n` +
        `Vérifiez:\n` +
        `- Que l'URL ${supabaseUrl} est correcte (typo?)\n` +
        `- Que votre connexion internet fonctionne\n` +
        `- Que le DNS résout correctement`
      )
    }
    throw err
  }
}

/**
 * Crée un client Supabase avec un token JWT spécifique
 */
function createSupabaseClientWithToken(token: string, supabaseUrl: string, supabaseAnonKey: string) {
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

  try {
    // 1. Valider et charger les variables d'environnement
    console.log('\n📋 Validation des variables d\'environnement...')
    
    const supabaseUrl = validateSupabaseUrl(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    )
    console.log(`  ✅ URL: ${supabaseUrl}`)

    const supabaseAnonKey = validateSupabaseAnonKey(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    )
    console.log(`  ✅ Clé anonyme: ${supabaseAnonKey.substring(0, 20)}...`)

    const tokenA = validateJwtToken(process.env.TEST_TOKEN_A, 'TEST_TOKEN_A')
    console.log(`  ✅ Token A: ${tokenA.substring(0, 30)}...`)

    const tokenB = validateJwtToken(process.env.TEST_TOKEN_B, 'TEST_TOKEN_B')
    console.log(`  ✅ Token B: ${tokenB.substring(0, 30)}...`)

    // 2. Tester la connectivité
    console.log('\n🌐 Test de connectivité avec Supabase...')
    await testConnectivity(supabaseUrl, supabaseAnonKey)
    console.log('  ✅ Connectivité OK')

    // 3. Créer les clients Supabase avec les tokens
    console.log('\n🔧 Création des clients Supabase avec tokens...')
    const supabaseA = createSupabaseClientWithToken(tokenA, supabaseUrl, supabaseAnonKey)
    const supabaseB = createSupabaseClientWithToken(tokenB, supabaseUrl, supabaseAnonKey)
    console.log('  ✅ Clients créés')

    // 4. Tester les données de l'entreprise A
    const testResultA = await testCompanyData(supabaseA, 'Entreprise A')
    console.log(`  Clients: ${testResultA.clientsCount}`)
    console.log(`  Chantiers: ${testResultA.chantiersCount}`)
    console.log(`  Événements agenda: ${testResultA.agendaEventsCount}`)

    // 5. Tester les données de l'entreprise B
    const testResultB = await testCompanyData(supabaseB, 'Entreprise B')
    console.log(`  Clients: ${testResultB.clientsCount}`)
    console.log(`  Chantiers: ${testResultB.chantiersCount}`)
    console.log(`  Événements agenda: ${testResultB.agendaEventsCount}`)

    // 6. Tests de cross-read
    console.log('\n🔍 Tests de cross-read (isolation RLS)...')
    const crossReadResults = await testCrossRead(supabaseA, supabaseB, testResultA, testResultB)

    // 7. Afficher le rapport final
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
  } catch (error) {
    console.error('\n❌ ERREUR FATALE:')
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
    } else {
      console.error(`   ${String(error)}`)
    }
    console.error('\n💡 Vérifiez votre fichier .env.local et réessayez.')
    process.exit(1)
  }
}

// Exécuter le script
main().catch((error) => {
  console.error('\n❌ Erreur fatale:', error)
  process.exit(1)
})
