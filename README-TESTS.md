# Guide des tests E2E pour BTP PRO

## 🚀 Installation

### 1. Installer les dépendances

```bash
npm install
```

### 2. Installer les navigateurs Playwright

```bash
npx playwright install
```

### 3. Configurer les comptes de test

Créer un fichier `.env.local.test` (non commité) :

```env
TEST_PATRON_EMAIL=patron-test@btppro.local
TEST_PATRON_PASSWORD=votre_mot_de_passe
TEST_EMPLOYE_EMAIL=employe-test@btppro.local
TEST_EMPLOYE_PASSWORD=votre_mot_de_passe
```

Voir `docs/TEST-USERS.md` pour plus de détails.

---

## 🧪 Lancer les tests

### Tests en mode headless (recommandé)

```bash
npm run test:e2e
```

### Tests avec interface graphique (débogage)

```bash
npm run test:e2e:ui
```

### Tests sur un navigateur spécifique

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
npx playwright test --project="Mobile Chrome"
```

### Tests sur un fichier spécifique

```bash
npx playwright test e2e/auth.spec.ts
```

---

## 📋 Structure des tests

```
e2e/
├── fixtures.ts              # Fixtures partagées (utilisateurs, gestion erreurs)
├── auth.spec.ts            # Tests d'authentification et navigation
├── subscription.spec.ts    # Tests d'abonnement et accès
├── quotes.spec.ts          # Tests de création/modification devis
├── invoices.spec.ts         # Tests de création/modification factures
├── network-limits.spec.ts  # Tests scénarios limites réseau
└── robustness.spec.ts      # Tests de robustesse anti-bug
```

---

## ✅ Scénarios couverts

### 🔐 Authentification
- ✅ Login patron → Dashboard patron
- ✅ Login employé → Dashboard employé (accès limité)
- ✅ Login invalide → Message d'erreur

### 💳 Abonnement
- ✅ Bypass admin activé → Accès création devis/facture OK
- ✅ Entreprise inactive → Redirection `/abonnement-expire`
- ✅ Page abonnement affiche les bonnes informations

### 📄 Devis
- ✅ Créer devis (1 ligne) → Sauvegarde → Détail → Persiste
- ✅ Modifier devis → Save → Refresh → Persiste
- ✅ Bouton "Créer un devis" existe et cliquable

### 🧾 Factures
- ✅ Créer facture → Save → Détail → Refresh → Persiste
- ✅ Bouton "Créer une facture" existe et cliquable

### 🌐 Scénarios limites réseau
- ✅ Slow 3G → Navigation ne crash pas, affiche loading state
- ✅ Offline → Message clair, page ne crash pas
- ✅ Réseau lent → Boutons restent cliquables

### 🐛 Robustesse
- ✅ Aucune page ne throw d'exception non gérée
- ✅ Boutons principaux existent et sont cliquables
- ✅ Refresh page → État stable

---

## 🔍 Débogage

### Voir les traces d'exécution

```bash
npx playwright show-trace trace.zip
```

### Mode debug interactif

```bash
npx playwright test --debug
```

### Captures d'écran et vidéos

Les captures d'écran et vidéos sont automatiquement générées en cas d'échec dans :
- `/test-results/` (captures d'écran)
- `/test-results/` (vidéos)

### Logs détaillés

```bash
DEBUG=pw:api npm run test:e2e
```

---

## 📝 Checklist manuelle

Voir `docs/TEST-CHECKLIST.md` pour une checklist complète de tests manuels, incluant :
- Tests Stripe (cartes de test, webhooks)
- Chemins de navigation
- Scénarios d'abonnement
- Tests de robustesse

---

## 🚨 Résolution de problèmes

### Les tests échouent avec "Page not found"

- Vérifier que le serveur de développement est lancé : `npm run dev`
- Vérifier que l'URL de base est correcte dans `playwright.config.ts`

### Les tests échouent avec "Login failed"

- Vérifier que les comptes de test existent dans Supabase
- Vérifier les credentials dans `.env.local.test`
- Vérifier que les comptes ont les bons rôles (`patron` / `employe`)

### Les tests échouent avec "Timeout"

- Augmenter les timeouts dans `playwright.config.ts` si nécessaire
- Vérifier que le serveur répond rapidement
- Vérifier la connexion réseau

### Erreurs "Uncaught Exception"

- Les erreurs non gérées sont automatiquement détectées par la fixture
- Vérifier les logs dans la console du navigateur
- Vérifier les erreurs dans `/test-results/`

---

## 📊 Rapports

### Rapport HTML

Après l'exécution des tests, un rapport HTML est généré :

```bash
npx playwright show-report
```

### Rapport dans CI/CD

Les tests peuvent être intégrés dans un pipeline CI/CD. Voir la documentation Playwright pour plus de détails.

---

## 🔄 Maintenance

### Mettre à jour Playwright

```bash
npm install -D @playwright/test@latest
npx playwright install
```

### Ajouter de nouveaux tests

1. Créer un nouveau fichier dans `e2e/` (ex: `e2e/new-feature.spec.ts`)
2. Importer les fixtures : `import { test, expect } from './fixtures'`
3. Écrire les tests selon la structure existante

---

## 📚 Ressources

- [Documentation Playwright](https://playwright.dev/)
- [Best Practices Playwright](https://playwright.dev/docs/best-practices)
- [Guide des utilisateurs de test](./docs/TEST-USERS.md)
- [Checklist manuelle](./docs/TEST-CHECKLIST.md)
