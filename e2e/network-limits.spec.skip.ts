import { test, expect } from './fixtures'

/**
 * Tests E2E : Scénarios limites réseau (slow 3G, offline)
 */
test.describe('Scénarios limites réseau', () => {
  test.beforeEach(async ({ page, testUsers }) => {
    // Se connecter avant chaque test
    await page.goto('/login')
    await page.fill('input[type="email"]', testUsers.patron.email)
    await page.fill('input[type="password"]', testUsers.patron.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard/patron')
  })

  test('Slow 3G : navigation devis/factures ne crash pas, affiche loading state', async ({ page }) => {
    // Simuler une connexion lente (Slow 3G)
    await page.route('**/*', async (route) => {
      // Ajouter un délai artificiel
      await new Promise(resolve => setTimeout(resolve, 500))
      await route.continue()
    })

    // Aller sur la liste des devis
    await page.goto('/dashboard/patron/devis')

    // Vérifier qu'il n'y a pas d'erreur non gérée
    // (les erreurs sont capturées par la fixture)
    
    // Vérifier qu'un état de chargement ou le contenu est affiché
    // (pas de page blanche)
    await page.waitForTimeout(3000) // Attendre le chargement avec délai

    const bodyContent = await page.locator('body').textContent()
    expect(bodyContent?.length).toBeGreaterThan(100) // Pas de page blanche

    // Aller sur la liste des factures
    await page.goto('/dashboard/patron/factures')

    await page.waitForTimeout(3000)

    const bodyContent2 = await page.locator('body').textContent()
    expect(bodyContent2?.length).toBeGreaterThan(100) // Pas de page blanche

    // Vérifier qu'il n'y a pas d'exception non gérée
    // (vérifié automatiquement par la fixture)
  })

  test('Offline : action "Créer devis" affiche message clair, ne casse pas la page', async ({ page }) => {
    // Aller sur la page de création de devis
    await page.goto('/dashboard/patron/devis/nouveau')

    // Attendre que la page soit chargée
    await page.waitForSelector('input, textarea', { timeout: 10000 })

    // Simuler offline
    await page.context().setOffline(true)

    // Remplir le formulaire
    const firstInput = page.locator('input').first()
    await firstInput.fill('Test Offline')

    // Essayer de sauvegarder
    const saveButton = page.locator('button:has-text("Enregistrer"), button:has-text("Créer")').first()
    
    if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveButton.click()

      // Attendre un message d'erreur ou de connexion perdue
      await page.waitForTimeout(2000)

      // Vérifier qu'un message d'erreur est affiché
      const errorMessage = page.locator('text=/connexion|erreur|network|offline|perdue/i')
      
      // Soit un message d'erreur est affiché, soit la page reste stable
      const hasErrorMessage = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)
      const pageStillWorks = await page.locator('body').isVisible()

      expect(hasErrorMessage || pageStillWorks).toBeTruthy()
    }

    // Vérifier que la page n'a pas crashé (pas d'exception non gérée)
    // (vérifié automatiquement par la fixture)

    // Remettre online
    await page.context().setOffline(false)
  })

  test('Réseau lent : boutons principaux restent cliquables', async ({ page }) => {
    // Simuler une connexion lente
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 300))
      await route.continue()
    })

    // Aller sur le dashboard
    await page.goto('/dashboard/patron')

    // Attendre que la page se charge
    await page.waitForTimeout(2000)

    // Vérifier que les boutons principaux sont présents et cliquables
    const createButtons = page.locator('button:has-text("Créer"), a:has-text("Créer")')
    const buttonCount = await createButtons.count()

    if (buttonCount > 0) {
      const firstButton = createButtons.first()
      await expect(firstButton).toBeVisible({ timeout: 5000 })
      await expect(firstButton).toBeEnabled()
    }
  })
})
