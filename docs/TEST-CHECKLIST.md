# Checklist de tests manuels pour BTP PRO

## 📋 Prérequis

- Serveur de développement lancé : `npm run dev`
- Comptes de test créés (Patron + Employé)
- Stripe CLI installé et configuré (pour webhooks)
- Variables d'environnement configurées (voir `.env.local`)

---

## 🔐 Authentification

### ✅ Login Patron
- [ ] Se connecter avec un compte patron
- [ ] Vérifier redirection vers `/dashboard/patron`
- [ ] Vérifier que le dashboard patron s'affiche correctement

### ✅ Login Employé
- [ ] Se connecter avec un compte employé
- [ ] Vérifier redirection vers `/dashboard/employe`
- [ ] Vérifier que l'employé ne peut pas accéder aux routes patron

### ✅ Login invalide
- [ ] Tenter de se connecter avec des credentials invalides
- [ ] Vérifier qu'un message d'erreur s'affiche
- [ ] Vérifier qu'on reste sur la page de login

---

## 💳 Stripe - Cartes de test

### Cartes de test Stripe

**Succès :**
- Numéro : `4242 4242 4242 4242`
- Date : n'importe quelle date future (ex: 12/25)
- CVC : n'importe quel 3 chiffres (ex: 123)
- ZIP : n'importe quel code postal (ex: 12345)

**Échec :**
- Numéro : `4000 0000 0000 0002` (carte refusée)
- Date : n'importe quelle date future
- CVC : n'importe quel 3 chiffres
- ZIP : n'importe quel code postal

### ✅ Stripe CLI Webhook Forward

```bash
# Lancer le forward des webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Le CLI affichera un Webhook Signing Secret
# → Utiliser ce secret dans .env.local pour les tests locaux
```

- [ ] Stripe CLI installé
- [ ] `stripe login` exécuté avec succès
- [ ] `stripe listen` lancé et connecté
- [ ] Webhook Signing Secret copié dans `.env.local`

---

## 🛣️ Chemins à vérifier

### ✅ Navigation principale
- [ ] `/dashboard/patron` → Dashboard patron accessible
- [ ] `/dashboard/patron/devis` → Liste devis accessible
- [ ] `/dashboard/patron/devis/nouveau` → Création devis accessible
- [ ] `/dashboard/patron/factures` → Liste factures accessible
- [ ] `/dashboard/patron/factures/nouveau` → Création facture accessible
- [ ] `/dashboard/patron/abonnement` → Page abonnement accessible

### ✅ Navigation employé
- [ ] `/dashboard/employe` → Dashboard employé accessible
- [ ] `/dashboard/employe/quotes` → Liste devis (lecture seule) accessible
- [ ] Tentative d'accès `/dashboard/patron` → Redirection ou erreur d'accès

---

## 💰 Abonnement Stripe

### ✅ Création d'abonnement (test)

1. **Se connecter en tant que patron**
2. **Aller sur `/dashboard/patron/abonnement`**
3. **Cliquer sur "S'abonner"**
4. **Utiliser la carte de test succès** (`4242 4242 4242 4242`)
5. **Vérifier :**
   - [ ] Redirection vers Stripe Checkout
   - [ ] Formulaire de paiement Stripe s'affiche
   - [ ] Paiement réussi → Redirection vers `/dashboard/patron/abonnement?session_id=...`
   - [ ] Webhook reçu dans Stripe CLI
   - [ ] Dans Supabase : `entreprises.is_active = true`
   - [ ] Accès aux devis/factures immédiatement disponible

### ✅ Paiement échoué → Entreprise inactive

1. **Créer un abonnement avec la carte d'échec** (`4000 0000 0000 0002`)
2. **Vérifier :**
   - [ ] Stripe affiche une erreur de paiement
   - [ ] Pas de redirection vers success
   - [ ] Dans Supabase : `entreprises.is_active` reste `false` (ou devient `false`)
   - [ ] Tentative d'accès aux devis/factures → Redirection vers `/abonnement-expire`

### ✅ Annulation → Inactive

1. **Avoir un abonnement actif**
2. **Dans Stripe Dashboard → Subscriptions → Annuler l'abonnement**
3. **Vérifier :**
   - [ ] Webhook `customer.subscription.deleted` reçu dans Stripe CLI
   - [ ] Dans Supabase : `entreprises.is_active = false`
   - [ ] Tentative d'accès aux devis/factures → Redirection vers `/abonnement-expire`

### ✅ Refresh page → État stable

1. **Après un paiement réussi, refresh la page `/dashboard/patron/abonnement`**
2. **Vérifier :**
   - [ ] Le statut "Actif" est toujours affiché
   - [ ] Pas de redirection vers `/abonnement-expire`
   - [ ] Les données persistent après refresh

---

## 📄 Devis

### ✅ Création devis
- [ ] Aller sur `/dashboard/patron/devis/nouveau`
- [ ] Remplir le formulaire (titre, client, au moins 1 ligne)
- [ ] Cliquer sur "Enregistrer" ou "Créer"
- [ ] Vérifier redirection vers la page de détail du devis
- [ ] Vérifier que les données sont affichées correctement

### ✅ Modification devis
- [ ] Aller sur un devis existant
- [ ] Cliquer sur "Modifier"
- [ ] Modifier une ligne ou un champ
- [ ] Cliquer sur "Enregistrer"
- [ ] Refresh la page
- [ ] Vérifier que les modifications sont persistées

### ✅ Téléchargement PDF (si implémenté)
- [ ] Aller sur un devis existant
- [ ] Cliquer sur "Télécharger PDF" ou "Imprimer"
- [ ] Vérifier qu'un PDF est généré et téléchargé
- [ ] Vérifier que le PDF contient les bonnes informations

---

## 🧾 Factures

### ✅ Création facture
- [ ] Aller sur `/dashboard/patron/factures/nouveau`
- [ ] Remplir le formulaire (titre, client, au moins 1 ligne)
- [ ] Cliquer sur "Enregistrer" ou "Créer"
- [ ] Vérifier redirection vers la page de détail de la facture
- [ ] Vérifier que les données sont affichées correctement

### ✅ Modification facture (si implémenté)
- [ ] Aller sur une facture existante
- [ ] Modifier un champ
- [ ] Sauvegarder
- [ ] Refresh la page
- [ ] Vérifier que les modifications sont persistées

---

## 🌐 Scénarios limites

### ✅ Réseau lent
- [ ] Ouvrir DevTools → Network → Throttle → "Slow 3G"
- [ ] Naviguer entre les pages devis/factures
- [ ] Vérifier qu'il n'y a pas de page blanche
- [ ] Vérifier qu'un état de chargement s'affiche (ou le contenu se charge progressivement)

### ✅ Offline
- [ ] Ouvrir DevTools → Network → Cocher "Offline"
- [ ] Essayer de créer un devis
- [ ] Vérifier qu'un message d'erreur clair s'affiche ("Connexion perdue", etc.)
- [ ] Vérifier que la page ne crash pas (pas d'exception dans la console)

### ✅ Erreurs réseau
- [ ] Simuler une erreur 500 sur une route API
- [ ] Vérifier qu'un message d'erreur utilisateur s'affiche
- [ ] Vérifier qu'il n'y a pas d'exception non gérée dans la console

---

## 🐛 Robustesse

### ✅ Pas d'exceptions non gérées
- [ ] Ouvrir la console du navigateur (F12)
- [ ] Naviguer sur toutes les pages principales
- [ ] Vérifier qu'il n'y a **aucune** erreur rouge dans la console
- [ ] Vérifier qu'il n'y a pas de `Uncaught Exception` ou `Unhandled Promise Rejection`

### ✅ Boutons principaux cliquables
- [ ] Vérifier que "Créer un devis" est présent et cliquable
- [ ] Vérifier que "Créer une facture" est présent et cliquable
- [ ] Vérifier que tous les boutons de navigation fonctionnent

### ✅ Refresh page
- [ ] Sur chaque page principale, faire un refresh (F5)
- [ ] Vérifier que la page se recharge correctement
- [ ] Vérifier que les données persistent après refresh

---

## 📝 Notes

- **Comptes de test** : Créer des comptes séparés pour les tests (ne pas utiliser les comptes de production)
- **Stripe Test Mode** : Toujours utiliser le mode test (`sk_test_...`) pour les tests
- **Webhooks** : Les webhooks peuvent prendre quelques secondes à arriver, être patient
- **Base de données** : Vérifier directement dans Supabase Dashboard si nécessaire

---

## ✅ Validation finale

- [ ] Tous les tests E2E passent : `npm run test:e2e`
- [ ] Aucune erreur dans la console du navigateur
- [ ] Tous les chemins de navigation fonctionnent
- [ ] Stripe Checkout fonctionne en mode test
- [ ] Webhooks Stripe sont reçus et traités correctement
- [ ] Les données persistent après refresh

---

**Date de dernière vérification :** _______________

**Vérifié par :** _______________
