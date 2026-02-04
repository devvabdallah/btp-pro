# Icônes PWA BTP PRO

Ce dossier contient les icônes nécessaires pour l'installation PWA de BTP PRO.

## Fichiers requis

- `icon-192x192.png` - Icône 192x192 pixels
- `icon-512x512.png` - Icône 512x512 pixels

## Génération des icônes

### Option 1: Script Node.js (recommandé)

1. Installer sharp: `npm install sharp --save-dev`
2. Exécuter: `npm run generate-icons`

Les PNG seront générés automatiquement à partir du template SVG.

### Option 2: Conversion manuelle

Utiliser un outil en ligne (ex: https://convertio.co/svg-png/ ou https://cloudconvert.com/svg-to-png) pour convertir `icon-template.svg` en PNG aux tailles:
- 192x192 pixels → `icon-192x192.png`
- 512x512 pixels → `icon-512x512.png`

**Important**: Les fichiers PNG doivent être placés dans ce dossier (`public/icons/`) pour que le manifest PWA fonctionne.

## Design

Les icônes utilisent:
- Fond dégradé: jaune (#fbbf24) vers orange (#f97316)
- Lettre "B" en gras, couleur #0a0e27
- Coins arrondis (border-radius: 80px sur le SVG 512x512)

## Vérification

Après génération, vérifier que les fichiers existent:
- `public/icons/icon-192x192.png`
- `public/icons/icon-512x512.png`

L'application proposera alors "Ajouter à l'écran d'accueil" sur mobile (Chrome Android).
