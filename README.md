# BTP PRO

Application Next.js 14 pour la gestion de devis et factures pour artisans.

## 🚀 Installation

1. Installer les dépendances :
```bash
npm install
```

2. Configurer les variables d'environnement :
```bash
cp .env.local.example .env.local
```

Puis éditez `.env.local` et ajoutez vos clés Supabase.

3. Lancer le serveur de développement :
```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 📁 Structure du projet

- `app/` - Pages et layouts Next.js App Router
- `components/ui/` - Composants UI réutilisables
- `lib/` - Utilitaires et clients Supabase
- `supabase/` - Schéma de base de données

## 🔐 Configuration Supabase

1. Créez un projet sur [Supabase](https://supabase.com)
2. Exécutez le script SQL dans `supabase/schema.sql` dans l'éditeur SQL de Supabase
3. Récupérez vos clés dans Settings > API
4. Ajoutez-les dans `.env.local`

## 📝 Prochaines étapes

- Prompt 2 : Logique d'authentification Supabase
- Création d'entreprise et ajout d'employés
- Redirection vers les dashboards

