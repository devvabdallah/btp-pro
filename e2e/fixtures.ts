import { test as base } from '@playwright/test'

/**
 * Fixtures partagées pour les tests E2E
 */

export interface TestUsers {
  patron: {
    email: string
    password: string
  }
  employe: {
    email: string
    password: string
  }
}

/**
 * Fixture pour les utilisateurs de test
 * 
 * IMPORTANT : Les credentials doivent être définis dans les variables d'environnement
 * ou dans un fichier .env.local.test (non commité)
 * 
 * Exemple .env.local.test :
 * TEST_PATRON_EMAIL=patron@test.com
 * TEST_PATRON_PASSWORD=password123
 * TEST_EMPLOYE_EMAIL=employe@test.com
 * TEST_EMPLOYE_PASSWORD=password123
 */
export const test = base.extend<{ testUsers: TestUsers }>({
  testUsers: async ({}, use) => {
    // Vérifier que toutes les variables d'environnement sont présentes
    const patronEmail = process.env.TEST_PATRON_EMAIL
    const patronPassword = process.env.TEST_PATRON_PASSWORD
    const employeEmail = process.env.TEST_EMPLOYE_EMAIL
    const employePassword = process.env.TEST_EMPLOYE_PASSWORD

    if (!patronEmail) {
      throw new Error('Missing TEST_PATRON_EMAIL in env. Please set it in .env.local.test or environment variables.')
    }
    if (!patronPassword) {
      throw new Error('Missing TEST_PATRON_PASSWORD in env. Please set it in .env.local.test or environment variables.')
    }
    if (!employeEmail) {
      throw new Error('Missing TEST_EMPLOYE_EMAIL in env. Please set it in .env.local.test or environment variables.')
    }
    if (!employePassword) {
      throw new Error('Missing TEST_EMPLOYE_PASSWORD in env. Please set it in .env.local.test or environment variables.')
    }

    const testUsers: TestUsers = {
      patron: {
        email: patronEmail,
        password: patronPassword,
      },
      employe: {
        email: employeEmail,
        password: employePassword,
      },
    }

    await use(testUsers)
  },

  page: async ({ page }, use) => {
    // Capturer les erreurs non gérées
    const errors: Error[] = []
    
    page.on('pageerror', (error) => {
      errors.push(error)
      console.error('[Page Error]', error.message)
    })

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        if (!text.includes('favicon') && !text.includes('404')) {
          errors.push(new Error(`Console error: ${text}`))
        }
      }
    })

    await use(page)

    // Vérifier qu'il n'y a pas d'erreurs non gérées
    if (errors.length > 0) {
      throw new Error(
        `Erreurs non gérées détectées:\n${errors.map(e => e.message).join('\n')}`
      )
    }
  },
})

export { expect } from '@playwright/test'
