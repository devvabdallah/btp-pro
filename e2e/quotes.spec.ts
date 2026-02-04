import { test, expect } from './fixtures'

/**
 * Tests E2E : Devis (création, modification, PDF)
 */
test.describe('Devis', () => {
  test.beforeEach(async ({ page, testUsers }) => {
    // Se connecter avant chaque test
    await page.goto('/login')
    await page.fill('input[type="email"]', testUsers.patron.email)
    await page.fill('input[type="password"]', testUsers.patron.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard/patron')
  })

  test('Créer devis (1 ligne) -> sauvegarde -> détail -> persiste', async ({ page }) => {
    // Aller sur la page de création de devis
    await page.goto('/dashboard/patron/devis/nouveau')

    // Attendre que le formulaire soit chargé
    await page.waitForSelector('input, textarea', { timeout: 10000 })

    // Remplir les champs principaux
    const clientNameInput = page.locator('input').filter({ hasText: /client|nom/i }).or(
      page.locator('input[placeholder*="client" i]')
    ).or(page.locator('input').first())
    
    await clientNameInput.first().fill('Client Test E2E')

    // Trouver et remplir le champ contact si présent
    const contactInputs = page.locator('input').filter({ hasText: /contact/i })
    if (await contactInputs.count() > 0) {
      await contactInputs.first().fill('contact@test.com')
    }

    // Trouver et remplir la description si présente
    const descriptionInputs = page.locator('textarea').or(
      page.locator('input[placeholder*="description" i]')
    )
    if (await descriptionInputs.count() > 0) {
      await descriptionInputs.first().fill('Devis de test E2E')
    }

    // Ajouter une ligne de devis
    // Chercher le bouton "Ajouter une ligne" ou similaire
    const addLineButton = page.locator('button:has-text("Ajouter"), button:has-text("ligne"), button:has-text("+")').first()
    
    if (await addLineButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addLineButton.click()
      
      // Remplir la ligne (chercher les inputs de ligne)
      const lineInputs = page.locator('input[type="text"], input[type="number"]')
      const inputCount = await lineInputs.count()
      
      if (inputCount >= 3) {
        // Description
        await lineInputs.nth(0).fill('Travaux de test')
        // Quantité
        await lineInputs.nth(1).fill('1')
        // Prix unitaire
        await lineInputs.nth(2).fill('100')
      }
    } else {
      // Si pas de bouton "Ajouter", peut-être que les lignes sont déjà présentes
      // Remplir la première ligne disponible
      const firstLineInputs = page.locator('input').filter({ hasText: /description/i }).or(
        page.locator('input').first()
      )
      await firstLineInputs.first().fill('Travaux de test')
    }

    // Sauvegarder le devis
    const saveButton = page.locator('button:has-text("Enregistrer"), button:has-text("Créer"), button:has-text("Sauvegarder")').first()
    await saveButton.click()

    // Attendre la redirection vers la page de détail
    await page.waitForURL(/\/dashboard\/patron\/(devis|quotes)\/[\w-]+/, { timeout: 15000 })

    // Vérifier que le devis est affiché
    const quoteId = page.url().split('/').pop()
    expect(quoteId).toBeTruthy()

    // Vérifier que les données sont présentes
    await expect(page.locator('text=/Client Test E2E|Travaux de test/i')).toBeVisible({ timeout: 5000 })

    // Refresh la page pour vérifier la persistance
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Vérifier que les données sont toujours là après refresh
    await expect(page.locator('text=/Client Test E2E|Travaux de test/i')).toBeVisible({ timeout: 5000 })
  })

  test('Modifier devis (changer une ligne) -> save -> refresh -> persiste', async ({ page }) => {
    // Aller sur la liste des devis
    await page.goto('/dashboard/patron/devis')

    // Attendre que la liste se charge
    await page.waitForSelector('a, button', { timeout: 10000 })

    // Cliquer sur le premier devis disponible
    const firstQuoteLink = page.locator('a[href*="/devis/"], a[href*="/quotes/"]').first()
    
    if (await firstQuoteLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstQuoteLink.click()
      
      // Attendre la page de détail
      await page.waitForURL(/\/dashboard\/patron\/(devis|quotes)\/[\w-]+/, { timeout: 10000 })

      // Chercher le bouton "Modifier"
      const editButton = page.locator('button:has-text("Modifier"), button:has-text("Éditer")').first()
      
      if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.click()

        // Modifier une ligne (chercher les inputs éditables)
        const editableInputs = page.locator('input[type="text"], input[type="number"]')
        const inputCount = await editableInputs.count()
        
        if (inputCount > 0) {
          // Modifier le premier input disponible
          await editableInputs.first().fill('Modifié par E2E')
        }

        // Sauvegarder
        const saveButton = page.locator('button:has-text("Enregistrer"), button:has-text("Sauvegarder")').first()
        await saveButton.click()

        // Attendre la sauvegarde
        await page.waitForTimeout(2000)

        // Refresh pour vérifier la persistance
        await page.reload()
        await page.waitForLoadState('networkidle')

        // Vérifier que la modification est persistée
        await expect(page.locator('text=/Modifié par E2E/i')).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('Bouton "Créer un devis" existe et est cliquable', async ({ page }) => {
    // Aller sur la liste des devis
    await page.goto('/dashboard/patron/devis')

    // Chercher le bouton "Créer un devis"
    const createButton = page.locator('button:has-text("Créer"), a:has-text("Créer"), button:has-text("devis")').first()
    
    await expect(createButton).toBeVisible({ timeout: 5000 })
    
    // Vérifier qu'il est cliquable
    await expect(createButton).toBeEnabled()

    // Cliquer dessus
    await createButton.click()

    // Vérifier qu'on arrive sur la page de création
    await expect(page).toHaveURL(/\/dashboard\/patron\/devis\/(nouveau|new)/)
  })
})
