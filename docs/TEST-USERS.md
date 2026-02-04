# Guide des utilisateurs de test pour BTP PRO

## ⚠️ IMPORTANT

**Ne jamais commit de mots de passe ou credentials réels dans le repository.**

Les credentials de test doivent être :
- Stockés dans des variables d'environnement (`.env.local.test` - non commité)
- Ou documentés dans un gestionnaire de secrets sécurisé
- Ou créés manuellement pour chaque environnement de test

---

## 👤 Comptes de test recommandés

### Compte Patron (test)

**Email :** `patron-test@btppro.local` (ou votre domaine de test)

**Mot de passe :** À définir lors de la création

**Rôle :** `patron`

**Entreprise :** Créée automatiquement lors de l'inscription

**Utilisation :**
- Tests d'authentification patron
- Tests de création/modification devis/factures
- Tests d'abonnement Stripe
- Tests d'accès aux fonctionnalités patron

---

### Compte Employé (test)

**Email :** `employe-test@btppro.local` (ou votre domaine de test)

**Mot de passe :** À définir lors de la création

**Rôle :** `employe`

**Code entreprise :** Utiliser le code de l'entreprise créée par le patron-test

**Utilisation :**
- Tests d'authentification employé
- Tests d'accès limité (lecture seule)
- Tests de restriction d'accès aux routes patron

---

## 🔧 Création des comptes de test

### Option 1 : Via l'interface d'inscription

1. Aller sur `/register`
2. Créer le compte patron avec les informations ci-dessus
3. Noter le **code entreprise** généré
4. Créer le compte employé avec le code entreprise noté

### Option 2 : Via Supabase Dashboard (SQL)

```sql
-- Créer un utilisateur patron de test
-- (L'utilisateur doit être créé via Supabase Auth d'abord)
-- Puis créer l'entreprise et le profil :

INSERT INTO entreprises (name, code, owner_user_id)
VALUES ('Entreprise Test', '123456', '<user_id_from_auth>');

INSERT INTO profiles (id, role, entreprise_id)
VALUES ('<user_id_from_auth>', 'patron', '<entreprise_id>');

-- Créer un utilisateur employé de test
-- (L'utilisateur doit être créé via Supabase Auth d'abord)
-- Puis créer le profil avec le code entreprise :

INSERT INTO profiles (id, role, entreprise_id)
VALUES ('<user_id_from_auth>', 'employe', '<entreprise_id>');
```

---

## 🔐 Variables d'environnement pour les tests E2E

Créer un fichier `.env.local.test` (non commité) :

```env
# Comptes de test pour E2E
TEST_PATRON_EMAIL=patron-test@btppro.local
TEST_PATRON_PASSWORD=votre_mot_de_passe_securise

TEST_EMPLOYE_EMAIL=employe-test@btppro.local
TEST_EMPLOYE_PASSWORD=votre_mot_de_passe_securise
```

Les tests E2E utiliseront ces variables si elles sont définies, sinon elles utiliseront des valeurs par défaut.

---

## 🧪 Utilisation dans les tests

Les tests E2E utilisent automatiquement les credentials depuis les variables d'environnement ou les fixtures.

Exemple dans un test :

```typescript
test('Login patron', async ({ page, testUsers }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', testUsers.patron.email)
  await page.fill('input[type="password"]', testUsers.patron.password)
  await page.click('button[type="submit"]')
  // ...
})
```

---

## 🔄 Réinitialisation des comptes de test

Si nécessaire, vous pouvez réinitialiser les comptes de test :

1. **Supprimer les utilisateurs** dans Supabase Dashboard → Authentication → Users
2. **Supprimer les entreprises associées** dans Supabase Dashboard → Table Editor → entreprises
3. **Recréer les comptes** via l'interface d'inscription

---

## 📝 Notes

- Les comptes de test doivent être **séparés** des comptes de production
- Utiliser un domaine de test distinct (ex: `@btppro.local` ou `@test.btppro.com`)
- Ne jamais utiliser de mots de passe faibles en production
- Pour les tests E2E, utiliser des mots de passe sécurisés mais mémorisables

---

## ✅ Checklist de création

- [ ] Compte patron-test créé
- [ ] Compte employe-test créé
- [ ] Code entreprise noté et partagé avec employe-test
- [ ] Variables d'environnement configurées (`.env.local.test`)
- [ ] Tests E2E passent avec ces comptes
- [ ] Comptes fonctionnent pour les tests manuels
