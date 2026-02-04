/**
 * Script pour générer les icônes PWA (192x192 et 512x512) à partir du SVG template
 * 
 * Usage: node scripts/generate-icons.js
 * 
 * Prérequis: npm install sharp
 */

const fs = require('fs');
const path = require('path');

// Vérifier si sharp est installé
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('❌ sharp n\'est pas installé. Installez-le avec: npm install sharp');
  console.log('\n📝 Alternative: Utilisez un outil en ligne pour convertir public/icons/icon-template.svg en PNG aux tailles 192x192 et 512x512');
  process.exit(1);
}

const svgPath = path.join(__dirname, '../public/icons/icon-template.svg');
const outputDir = path.join(__dirname, '../public/icons');

// Lire le SVG
const svgBuffer = fs.readFileSync(svgPath);

// Générer les deux tailles
const sizes = [192, 512];

sizes.forEach(size => {
  const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
  
  sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outputPath)
    .then(() => {
      console.log(`✅ Généré: ${outputPath}`);
    })
    .catch(err => {
      console.error(`❌ Erreur lors de la génération de ${outputPath}:`, err);
    });
});

console.log('\n✨ Icônes PWA générées avec succès!');
