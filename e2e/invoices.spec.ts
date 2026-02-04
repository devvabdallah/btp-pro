import { test, expect } from './fixtures'

/**
 * Tests E2E : Factures (création, persistance)
 */
test.describe('Factures', () => {
  test.beforeEach(async ({ page, testUsers }) => {
    // Se connecter avant chaque test
    await page.goto('/login')
    await page.fill('input[type="email"]', testUsers.patron.email)
    await page.fill('input[type="password"]', testUsers.patron.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard/patron')
  })

  test('Créer facture (route nouveau) -> save -> détail -> refresh -> persiste', async ({ page }) => {
    // Aller sur la page de création de facture
    await page.goto('/dashboard/patron/factures/nouveau')

    // Attendre que le formulaire soit chargé
    await page.waitForSelector('input, textarea', { timeout: 10000 })

    // Remplir les champs principaux
    const titleInput = page.locator('input[placeholder*="titre" i], input[placeholder*="title" i]').or(
      page.locator('input').first()
    )
    await titleInput.first().fill('Facture Test E2E')

    // Remplir le client si présent
    const clientInputs = page.locator('input').filter({ hasText: /client/i }).or(
      page.locator('input[placeholder*="client" i]')
    )
    if (await clientInputs.count() > 0) {
      await clientInputs.first().fill('Client Facture Test')
    }

    // Ajouter une ligne de facture
    const addLineButton = page.locator('button:has-text("Ajouter"), button:has-text("ligne"), button:has-text("+")').first()
    
    if (await addLineButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addLineButton.click()
      
      // Remplir la ligne
      const lineInputs = page.locator('input[type="text"], input[type="number"]')
      const inputCount = await lineInputs.count()
      
      if (inputCount >= 3) {
        await lineInputs.nth(0).fill('Service de test')
        await lineInputs.nth(1).fill('2')
        await lineInputs.nth(2).fill('150')
      }
    }

    // Sauvegarder la facture
    const saveButton = page.locator('button:has-text("Enregistrer"), button:has-text("Créer"), button:has-text("Sauvegarder")').first()
    await saveButton.click()

    // Attendre la redirection vers la page de détail
    await page.waitForURL(/\/dashboard\/patron\/factures\/[\w-]+/, { timeout: 15000 })

    // Vérifier que la facture est affichée
    const invoiceId = page.url().split('/').pop()
    expect(invoiceId).toBeTruthy()

    // Vérifier que les données sont présentes
    await expect(page.locator('text=/Facture Test E2E|Service de test/i')).toBeVisible({ timeout: 5000 })

    // Refresh la page pour vérifier la persistance
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Vérifier que les données sont toujours là après refresh
    await expect(page.locator('text=/Facture Test E2E|Service de test/i')).toBeVisible({ timeout: 5000 })
  })

  test('Bouton "Créer une facture" existe et est cliquable', async ({ page }) => {
    // Aller sur la liste des factures
    await page.goto('/dashboard/patron/factures')

    // Chercher le bouton "Créer une facture"
    const createButton = page.locator('button:has-text("Créer"), a:has-text("Créer"), button:has-text("facture")').first()
    
    await expect(createButton).toBeVisible({ timeout: 5000 })
    
    // Vérifier qu'il est cliquable
    await expect(createButton).toBeEnabled()

    // Cliquer dessus
    await createButton.click()

    // Vérifier qu'on arrive sur la page de création
    await expect(page).toHaveURL(/\/dashboard\/patron\/factures\/(nouveau|new)/)
  })
})
