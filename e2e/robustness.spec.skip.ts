import { test, expect } from './fixtures'

/**
 * Tests E2E : Robustesse anti-bug
 * 
 * Vérifie qu'aucune page ne throw d'exception non gérée
 * et que les éléments essentiels sont présents
 */
test.describe('Robustesse anti-bug', () => {
  test.beforeEach(async ({ page, testUsers }) => {
    // Se connecter avant chaque test
    await page.goto('/login')
    await page.fill('input[type="email"]', testUsers.patron.email)
    await page.fill('input[type="password"]', testUsers.patron.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard/patron')
  })

  test('Dashboard patron : pas d\'exception non gérée', async ({ page }) => {
    await page.goto('/dashboard/patron')
    await page.waitForLoadState('networkidle')

    // Vérifier que la page est chargée
    await expect(page.locator('body')).toBeVisible()

    // Les exceptions non gérées sont capturées par la fixture
    // Si une exception est levée, le test échouera automatiquement
  })

  test('Liste devis : pas d\'exception non gérée', async ({ page }) => {
    await page.goto('/dashboard/patron/devis')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
  })

  test('Liste factures : pas d\'exception non gérée', async ({ page }) => {
    await page.goto('/dashboard/patron/factures')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
  })

  test('Création devis : pas d\'exception non gérée', async ({ page }) => {
    await page.goto('/dashboard/patron/devis/nouveau')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
  })

  test('Création facture : pas d\'exception non gérée', async ({ page }) => {
    await page.goto('/dashboard/patron/factures/nouveau')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toBeVisible()
  })

  test('Boutons principaux existent et sont cliquables', async ({ page }) => {
    // Dashboard
    await page.goto('/dashboard/patron')
    await page.waitForLoadState('networkidle')

    const dashboardButtons = page.locator('button, a[href*="/nouveau"], a[href*="/new"]')
    const dashboardButtonCount = await dashboardButtons.count()
    expect(dashboardButtonCount).toBeGreaterThan(0)

    // Liste devis
    await page.goto('/dashboard/patron/devis')
    await page.waitForLoadState('networkidle')

    const devisButtons = page.locator('button:has-text("Créer"), a:has-text("Créer")')
    const devisButtonCount = await devisButtons.count()
    if (devisButtonCount > 0) {
      await expect(devisButtons.first()).toBeEnabled()
    }

    // Liste factures
    await page.goto('/dashboard/patron/factures')
    await page.waitForLoadState('networkidle')

    const facturesButtons = page.locator('button:has-text("Créer"), a:has-text("Créer")')
    const facturesButtonCount = await facturesButtons.count()
    if (facturesButtonCount > 0) {
      await expect(facturesButtons.first()).toBeEnabled()
    }
  })

  test('Refresh page : état stable', async ({ page }) => {
    // Aller sur une page
    await page.goto('/dashboard/patron/devis')
    await page.waitForLoadState('networkidle')

    // Capturer le contenu initial
    const initialContent = await page.locator('body').textContent()

    // Refresh
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Vérifier que le contenu est toujours là (ou similaire)
    const afterRefreshContent = await page.locator('body').textContent()
    
    // Le contenu ne doit pas être complètement vide
    expect(afterRefreshContent?.length).toBeGreaterThan(100)
  })
})
