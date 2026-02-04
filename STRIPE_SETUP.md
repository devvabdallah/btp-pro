# Configuration Stripe pour BTP PRO

## 📋 Prérequis

1. Compte Stripe (test ou production)
2. Accès au Dashboard Stripe
3. Variables d'environnement Supabase (SERVICE_ROLE_KEY)

## 🔧 Configuration Stripe

### 1. Créer le produit et le prix dans Stripe Dashboard

1. Aller dans **Products** → **Add product**
2. Nom du produit : `BTP PRO`
3. Description : `Abonnement mensuel BTP PRO - Gestion devis et factures`
4. Prix :
   - Montant : `50.00 EUR`
   - Facturation : `Recurring` (mensuel)
   - **IMPORTANT** : Cocher "Add a trial period" → `5 days`
5. Copier le **Price ID** (commence par `price_...`)

### 2. Configurer le webhook Stripe

1. Aller dans **Developers** → **Webhooks** → **Add endpoint**
2. URL : `https://votre-domaine.com/api/stripe/webhook`
   - En local : utiliser Stripe CLI (voir section "Test local")
3. Événements à écouter :
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
   - `invoice.payment_failed`
4. Copier le **Webhook Signing Secret** (commence par `whsec_...`)

## 🔐 Variables d'environnement

Ajouter dans `.env.local` :

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_... (ou sk_live_... en production)
STRIPE_PRICE_ID=price_... (le Price ID créé ci-dessus)
STRIPE_WEBHOOK_SECRET=whsec_... (le Webhook Signing Secret)

# Supabase Admin (pour webhooks)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (depuis Supabase Dashboard → Settings → API → service_role key)

# URL de l'application (pour redirections Stripe)
NEXT_PUBLIC_APP_URL=http://localhost:3000 (ou votre domaine en production)
```

## 🗄️ Base de données

Exécuter le script SQL dans Supabase :

```sql
-- Fichier : supabase/stripe-schema.sql
-- Ce script ajoute les colonnes nécessaires à la table entreprises
```

Colonnes ajoutées :
- `is_active` (BOOLEAN) : statut d'abonnement (géré par webhooks)
- `stripe_customer_id` (TEXT) : ID du customer Stripe
- `stripe_subscription_id` (TEXT) : ID de l'abonnement actif
- `trial_ends_at` (TIMESTAMPTZ) : date de fin d'essai (si existe déjà, ignoré)

## 🧪 Test local avec Stripe CLI

### Installation Stripe CLI

```bash
# Windows (via Scoop)
scoop install stripe

# macOS
brew install stripe/stripe-cli/stripe

# Linux
# Voir https://stripe.com/docs/stripe-cli
```

### Lancer le webhook local

```bash
# Se connecter à Stripe
stripe login

# Forwarder les webhooks vers votre serveur local
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Le CLI affichera un **Webhook Signing Secret** temporaire (commence par `whsec_...`).

**Utiliser ce secret dans `.env.local` pour les tests locaux.**

### Tester le checkout

1. Démarrer le serveur Next.js : `npm run dev`
2. Aller sur `/dashboard/patron/abonnement`
3. Cliquer sur "S'abonner"
4. Utiliser une carte de test Stripe :
   - **Succès** : `4242 4242 4242 4242`
   - **Échec** : `4000 0000 0000 0002`
   - Date : n'importe quelle date future
   - CVC : n'importe quel 3 chiffres

### Vérifier les webhooks

Les événements Stripe apparaîtront dans le terminal où `stripe listen` est actif.

## ✅ Validation

### Après paiement réussi

1. Vérifier dans Supabase que `entreprises.is_active = true`
2. Vérifier que `stripe_subscription_id` est rempli
3. L'utilisateur doit avoir accès aux devis/factures

### Après expiration/annulation

1. Dans Stripe Dashboard → Subscriptions → Annuler l'abonnement
2. Vérifier que `entreprises.is_active = false` (via webhook)
3. L'utilisateur doit être redirigé vers `/abonnement-expire`

## 🚀 Production

1. Utiliser les clés **live** de Stripe (`sk_live_...`)
2. Configurer le webhook avec l'URL de production
3. Mettre à jour `NEXT_PUBLIC_APP_URL` avec votre domaine
4. Tester avec une vraie carte (montant minimum)

## 📝 Notes importantes

- ⚠️ **SERVICE_ROLE_KEY** : Ne jamais exposer cette clé côté client
- ⚠️ **Webhook Secret** : Doit être différent entre test et production
- ⚠️ **is_active** : Ne peut être modifié QUE par les webhooks Stripe (sécurité)
