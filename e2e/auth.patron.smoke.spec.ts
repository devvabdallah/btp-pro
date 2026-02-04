import { test, expect } from './fixtures'

/**
 * Test smoke E2E : Connexion Patron
 * 
 * Valide que le flux de connexion Patron fonctionne correctement.
 * Utilise les variables d'environnement E2E_PATRON_EMAIL et E2E_PATRON_PASSWORD,
 * avec fallback sur TEST_PATRON_EMAIL et TEST_PATRON_PASSWORD.
 */
test('Connexion Patron - Smoke test', async ({ page, testUsers }) => {
  // Utiliser les variables d'env E2E_* si disponibles, sinon fallback sur testUsers
  const patronEmail = process.env.E2E_PATRON_EMAIL || testUsers.patron.email
  const patronPassword = process.env.E2E_PATRON_PASSWORD || testUsers.patron.password

  // Aller sur la page de login
  await page.goto('/login')

  // Vérifier que la page de login est chargée
  await expect(page.getByRole('heading', { name: /connexion/i })).toBeVisible()

  // Remplir le formulaire avec stratégie robuste
  // Essayer getByLabel d'abord, puis fallback sur getByPlaceholder
  const emailInput = page.getByLabel(/email/i).or(page.getByPlaceholder(/email|votre@email/i)).first()
  await emailInput.fill(patronEmail)

  const passwordInput = page.getByLabel(/mot de passe|password/i).or(page.getByPlaceholder(/mot de passe|password/i)).first()
  await passwordInput.fill(patronPassword)

  // Cliquer sur le bouton de connexion
  const submitButton = page.getByRole('button', { name: /se connecter|connexion|login/i }).or(
    page.getByRole('button', { type: 'submit' })
  ).first()
  await submitButton.click()

  // Attendre la navigation vers le dashboard patron
  await page.waitForURL(/\/dashboard\/patron/, { timeout: 10000 })

  // Vérifier qu'on est bien sur le dashboard patron
  await expect(page).toHaveURL(/\/dashboard\/patron/)
})
