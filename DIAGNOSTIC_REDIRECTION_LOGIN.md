# 🔍 DIAGNOSTIC : Redirection automatique vers /login après connexion

## 📋 RÉSUMÉ EXÉCUTIF

**PROBLÈME IDENTIFIÉ :** Incohérence entre le client Supabase (localStorage) et le serveur Supabase (cookies) qui empêche la session d'être lue côté serveur après la connexion.

**CAUSE RACINE :** 
- Le client utilise `createClient` de `@supabase/supabase-js` qui stocke la session dans `localStorage`
- Le serveur utilise `createServerClient` de `@supabase/ssr` qui lit les cookies
- Après connexion, la session est dans localStorage mais pas dans les cookies → le serveur ne peut pas la lire → redirection vers /login

---

## 1️⃣ UTILISATIONS DE `createSupabaseServerClient`

### Fichiers utilisant `createSupabaseServerClient` :

1. **`app/dashboard/patron/page.tsx`** (ligne 2, 9)
   - Server Component
   - Vérifie l'auth avec `supabase.auth.getUser()` (ligne 15)
   - Redirige vers `/login` si pas d'utilisateur (ligne 18)

2. **`app/dashboard/employe/page.tsx`** (ligne 2, 9)
   - Server Component
   - Vérifie l'auth avec `supabase.auth.getUser()` (ligne 15)
   - Redirige vers `/login` si pas d'utilisateur (ligne 18)

3. **`app/dashboard/patron/quotes/[id]/page.tsx`** (ligne 2, 14)
   - Server Component
   - Vérifie l'auth avec `supabase.auth.getUser()` (ligne 20)
   - Redirige vers `/login` si pas d'utilisateur (ligne 23)

4. **`app/(auth)/layout.tsx`** (ligne 2, 9)
   - Server Component (Layout)
   - Vérifie l'auth avec `supabase.auth.getUser()` (ligne 12)
   - Redirige vers dashboard si utilisateur connecté (ligne 25-27)

5. **`lib/auth-actions.ts`** (ligne 3)
   - Server Actions
   - Utilisé dans `registerUser` (ligne 73) et `loginUser` (ligne 212)

6. **`lib/quotes-actions.ts`** (ligne 3)
   - Server Actions
   - Utilisé dans plusieurs fonctions (lignes 42, 97, 147, 189, 235, 279)

---

## 2️⃣ REDIRECTIONS VERS `/login` (côté serveur)

### Fichiers avec `redirect('/login')` :

1. **`app/dashboard/patron/page.tsx`**
   - Ligne 18 : `if (authError || !user) redirect('/login')`
   - Ligne 29 : `if (profileError || !profile) redirect('/login')`

2. **`app/dashboard/employe/page.tsx`**
   - Ligne 18 : `if (authError || !user) redirect('/login')`
   - Ligne 29 : `if (profileError || !profile) redirect('/login')`

3. **`app/dashboard/patron/quotes/[id]/page.tsx`**
   - Ligne 23 : `if (authError || !user) redirect('/login')`
   - Ligne 34 : `if (profileError || !profile) redirect('/login')`

4. **`lib/auth-actions.ts`**
   - Ligne 260 : `redirect('/login')` (dans loginUser si pas de profil)

---

## 3️⃣ REDIRECTIONS VERS `/login` (côté client)

### Fichiers avec `router.push('/login')` ou `router.replace('/login')` :

1. **`app/dashboard/employe/quotes/[id]/page.tsx`** (Client Component)
   - Ligne 72 : `if (!user) return router.push('/login')`
   - Ligne 81 : `if (!profile) return router.push('/login')`

2. **`components/LogoutButton.tsx`**
   - Ligne 12 : `router.push('/login')` (après déconnexion)

---

## 4️⃣ ANALYSE DES DASHBOARDS

### Structure `/app/dashboard` :

```
app/dashboard/
├── patron/
│   ├── page.tsx                    → Server Component ✅
│   └── quotes/
│       ├── [id]/
│       │   ├── page.tsx            → Server Component ✅
│       │   └── QuoteStatusActions.tsx
│       └── new/
│           └── page.tsx
└── employe/
    ├── page.tsx                    → Server Component ✅
    └── quotes/
        └── [id]/
            └── page.tsx            → Client Component ⚠️
```

**Tous les dashboards utilisent Supabase côté serveur sauf :**
- `app/dashboard/employe/quotes/[id]/page.tsx` (Client Component)

---

## 5️⃣ ANALYSE DES CLIENTS SUPABASE

### Fichiers Supabase dans `/lib` :

1. **`lib/supabaseClient.ts`** ⚠️ **PROBLÈME ICI**
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   export const supabase = createClient(supabaseUrl, supabaseAnonKey)
   ```
   - Utilise `createClient` de `@supabase/supabase-js`
   - Stocke la session dans **localStorage**
   - **NE synchronise PAS avec les cookies**

2. **`lib/supabase/client.ts`** ✅ (existe mais non utilisé)
   ```typescript
   import { createBrowserClient } from '@supabase/ssr'
   export function createSupabaseBrowserClient() {
     return createBrowserClient(supabaseUrl, supabaseAnonKey)
   }
   ```
   - Utilise `createBrowserClient` de `@supabase/ssr`
   - Synchronise avec les cookies
   - **N'est PAS utilisé dans le projet**

3. **`lib/supabase/server.ts`** ✅
   ```typescript
   import { createServerClient } from '@supabase/ssr'
   export async function createSupabaseServerClient() {
     return createServerClient(supabaseUrl, supabaseAnonKey, { cookies: {...} })
   }
   ```
   - Utilise `createServerClient` de `@supabase/ssr`
   - Lit les cookies pour récupérer la session

---

## 6️⃣ IDENTIFICATION DU PROBLÈME

### 🔴 CAUSE EXACTE :

**Le fichier `lib/supabaseClient.ts` utilise `createClient` au lieu de `createBrowserClient`.**

**Séquence du problème :**
1. L'utilisateur se connecte via `app/(auth)/login/page.tsx`
2. La page utilise `supabase` depuis `lib/supabaseClient.ts`
3. `supabase.auth.signInWithPassword()` réussit et stocke la session dans **localStorage**
4. L'utilisateur est redirigé vers `/dashboard/patron` ou `/dashboard/employe`
5. Ces pages sont des **Server Components** qui utilisent `createSupabaseServerClient()`
6. Le serveur lit les **cookies** pour récupérer la session
7. **Les cookies ne contiennent pas la session** (car elle est dans localStorage)
8. `supabase.auth.getUser()` retourne `null` côté serveur
9. Redirection vers `/login` (ligne 18 des dashboards)

---

## 7️⃣ SOLUTION PROPOSÉE

### ✅ CORRECTION MINIMALE :

**Remplacer `lib/supabaseClient.ts` pour utiliser `createBrowserClient` de `@supabase/ssr` au lieu de `createClient` de `@supabase/supabase-js`.**

**Avant :**
```typescript
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Après :**
```typescript
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Variables d\'environnement manquantes')
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
```

**Pourquoi ça fonctionne :**
- `createBrowserClient` de `@supabase/ssr` synchronise automatiquement la session avec les cookies
- Le serveur peut alors lire la session depuis les cookies
- Plus de redirection intempestive vers `/login`

---

## 8️⃣ FICHIERS À MODIFIER

### Modification unique nécessaire :

1. **`lib/supabaseClient.ts`** → Remplacer `createClient` par `createBrowserClient`

### Fichiers qui utilisent `lib/supabaseClient.ts` (ne nécessitent PAS de modification) :

- `app/(auth)/login/page.tsx` ✅
- `app/(auth)/register/page.tsx` ✅
- `app/dashboard/employe/quotes/[id]/page.tsx` ✅
- `components/LogoutButton.tsx` ✅

**Aucun autre fichier ne nécessite de modification.**

---

## 9️⃣ VÉRIFICATIONS POST-CORRECTION

Après la correction, vérifier que :
1. ✅ La connexion fonctionne
2. ✅ La redirection vers le dashboard fonctionne
3. ✅ Les Server Components peuvent lire la session
4. ✅ Pas de redirection intempestive vers `/login`
5. ✅ La déconnexion fonctionne toujours

---

## 🔟 CONCLUSION

**Le problème est identifié et la solution est simple :**
- **1 seul fichier à modifier** : `lib/supabaseClient.ts`
- **Changement minimal** : remplacer `createClient` par `createBrowserClient`
- **Aucun autre fichier à toucher**
- **Solution propre et conforme aux bonnes pratiques Next.js 14 + Supabase**

