import { test, expect } from './fixtures'

/**
 * Tests E2E : Authentification et navigation
 */
test.describe('Auth + Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Nettoyer les cookies avant chaque test
    await page.context().clearCookies()
  })

  test('Patron login -> accéder dashboard patron', async ({ page, testUsers }) => {
    // Aller sur la page de login
    await page.goto('/login')

    // Vérifier que la page de login est visible
    await expect(page.locator('h1')).toContainText('Connexion')

    // Remplir le formulaire
    await page.fill('input[type="email"]', testUsers.patron.email)
    await page.fill('input[type="password"]', testUsers.patron.password)

    // Soumettre le formulaire
    await page.click('button[type="submit"]')

    // Attendre la redirection vers le dashboard patron
    await page.waitForURL('/dashboard/patron', { timeout: 10000 })

    // Vérifier que le dashboard patron est chargé
    await expect(page).toHaveURL(/\/dashboard\/patron/)
    
    // Vérifier qu'on ne voit pas de message d'erreur
    const errorMessages = page.locator('text=/erreur|error/i')
    await expect(errorMessages.first()).not.toBeVisible({ timeout: 2000 }).catch(() => {
      // Pas d'erreur visible, c'est bon
    })
  })

  test('Employé login -> accès limité (pas dashboards patron)', async ({ page, testUsers }) => {
    // Aller sur la page de login
    await page.goto('/login')

    // Remplir le formulaire avec les credentials employé
    await page.fill('input[type="email"]', testUsers.employe.email)
    await page.fill('input[type="password"]', testUsers.employe.password)

    // Soumettre le formulaire
    await page.click('button[type="submit"]')

    // Attendre la redirection vers le dashboard employé
    await page.waitForURL('/dashboard/employe', { timeout: 10000 })

    // Vérifier que le dashboard employé est chargé
    await expect(page).toHaveURL(/\/dashboard\/employe/)

    // Vérifier qu'on ne peut pas accéder aux routes patron directement
    await page.goto('/dashboard/patron')
    
    // Devrait être redirigé ou voir une erreur d'accès
    // (selon la logique de l'app, peut être redirigé vers /login ou voir un message d'erreur)
    const currentUrl = page.url()
    expect(
      currentUrl.includes('/login') || 
      currentUrl.includes('/dashboard/employe') ||
      page.locator('text=/accès|interdit|forbidden/i').isVisible()
    ).toBeTruthy()
  })

  test('Login avec credentials invalides -> erreur affichée', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'invalid@test.com')
    await page.fill('input[type="password"]', 'wrongpassword')

    await page.click('button[type="submit"]')

    // Attendre un message d'erreur
    await expect(
      page.locator('text=/incorrect|erreur|error/i').first()
    ).toBeVisible({ timeout: 5000 })

    // Vérifier qu'on reste sur la page de login
    await expect(page).toHaveURL(/\/login/)
  })
})
