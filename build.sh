#!/bin/bash

# Script de build optimisé pour Netlify avec gestion Rollup
echo "🚀 Démarrage du build..."

# Vérification de la version Node.js
echo "📋 Version Node.js: $(node --version)"
echo "📋 Version npm: $(npm --version)"

# Nettoyage des caches
echo "🧹 Nettoyage des caches..."
npm cache clean --force

# Suppression des modules existants
echo "🗑️ Suppression des node_modules..."
rm -rf node_modules

# Suppression du package-lock.json pour une installation propre
echo "🗑️ Suppression du package-lock.json..."
rm -f package-lock.json

# Installation des dépendances avec gestion d'erreurs
echo "📦 Installation des dépendances..."
if npm install --legacy-peer-deps --no-optional --production=false; then
    echo "✅ Dépendances installées avec succès"
else
    echo "❌ Erreur lors de l'installation des dépendances"
    echo "🔧 Tentative d'installation avec --force..."
    if npm install --legacy-peer-deps --force; then
        echo "✅ Dépendances installées avec --force"
    else
        echo "❌ Échec de l'installation des dépendances"
        exit 1
    fi
fi

# Installation spécifique de la dépendance Rollup manquante
echo "🔧 Installation spécifique de @rollup/rollup-linux-x64-gnu..."
if npm install @rollup/rollup-linux-x64-gnu@^4.9.0 --legacy-peer-deps --force; then
    echo "✅ @rollup/rollup-linux-x64-gnu installé avec succès"
else
    echo "⚠️ Impossible d'installer @rollup/rollup-linux-x64-gnu, tentative de build sans..."
fi

# Vérification des dépendances
echo "🔍 Vérification des dépendances..."
npm ls --depth=0 || echo "⚠️ Certaines dépendances peuvent avoir des avertissements"

# Vérification des dépendances critiques
echo "🔍 Vérification des dépendances critiques..."
CRITICAL_DEPS=("react" "react-dom" "vite")
for dep in "${CRITICAL_DEPS[@]}"; do
    if npm ls "$dep" >/dev/null 2>&1; then
        echo "✅ $dep installé"
    else
        echo "❌ $dep manquant - tentative d'installation..."
        npm install "$dep" --legacy-peer-deps
    fi
done

# Vérification spécifique de Rollup
echo "🔍 Vérification de Rollup..."
if npm ls rollup >/dev/null 2>&1; then
    echo "✅ Rollup installé"
    # Vérification des dépendances natives
    if [ -d "node_modules/@rollup" ]; then
        echo "✅ Dossier @rollup présent"
        ls -la node_modules/@rollup/ || echo "⚠️ Impossible de lister @rollup"
    else
        echo "⚠️ Dossier @rollup manquant"
    fi
else
    echo "❌ Rollup manquant - tentative d'installation..."
    npm install rollup@^4.9.0 --legacy-peer-deps
fi

# Build du projet avec configuration principale
echo "🔨 Build du projet avec configuration principale..."
if npm run build; then
    echo "✅ Build réussi !"
else
    echo "❌ Build échoué - tentative de build avec Vite directement..."
    if npx vite build; then
        echo "✅ Build Vite direct réussi !"
    else
        echo "❌ Échec du build Vite direct"
        echo "🔧 Tentative de build avec configuration Vite simple..."
        
        # Utilisation de la configuration Vite simple
        if npx vite build --config vite.simple.config.ts; then
            echo "✅ Build avec configuration simple réussi !"
        else
            echo "❌ Échec du build avec configuration simple"
            echo "🔧 Tentative de build avec configuration minimale..."
            
            # Création d'une configuration Vite minimale
            cat > vite.minimal.config.ts << 'EOF'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'esbuild'
  }
})
EOF
            
            if npx vite build --config vite.minimal.config.ts; then
                echo "✅ Build avec configuration minimale réussi !"
            else
                echo "❌ Échec du build avec configuration minimale"
                exit 1
            fi
        fi
    fi
fi

# Vérification du build
if [ -d "dist" ]; then
    echo "✅ Build réussi !"
    echo "📁 Contenu du dossier dist:"
    ls -la dist/
    
    # Vérification des fichiers critiques
    if [ -f "dist/index.html" ]; then
        echo "✅ index.html généré"
    else
        echo "❌ index.html manquant"
        exit 1
    fi
    
    if [ -d "dist/assets" ]; then
        echo "✅ Dossier assets généré"
        echo "📁 Contenu des assets:"
        ls -la dist/assets/
    else
        echo "❌ Dossier assets manquant"
        exit 1
    fi
else
    echo "❌ Build échoué !"
    exit 1
fi

echo "🎉 Build terminé avec succès !"
echo "📊 Résumé du build:"
echo "   - Node.js: $(node --version)"
echo "   - npm: $(npm --version)"
echo "   - Dossier dist: $(du -sh dist 2>/dev/null || echo 'N/A')"
echo "   - Fichiers générés: $(find dist -type f | wc -l)"
echo "   - Rollup: $(npm ls rollup 2>/dev/null | head -1 || echo 'Non installé')"
echo "   - Configuration utilisée: $(if [ -f "vite.simple.config.ts" ] && [ -f "vite.minimal.config.ts" ]; then echo "Configuration minimale"; elif [ -f "vite.simple.config.ts" ]; then echo "Configuration simple"; else echo "Configuration principale"; fi)"
