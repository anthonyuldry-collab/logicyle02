#!/bin/bash
cd "/Users/anthonyuldry/Desktop/logicycle-seb version" || {
  echo "Dossier introuvable."
  read -r _
  exit 1
}

echo "→ Démarrage LogiCycle (Vite)…"
echo "→ Ensuite ouvre : http://localhost:3000/"
echo ""

if command -v nvm >/dev/null 2>&1; then
  # shellcheck disable=SC1090
  [ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"
fi

if [ -f .nvmrc ]; then
  command -v nvm >/dev/null 2>&1 && nvm use
fi

npm run dev

echo ""
echo "Serveur arrêté. Appuie sur Entrée pour fermer."
read -r _
