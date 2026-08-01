#!/bin/zsh
# Pubblica il sito su GitHub Pages.  Uso:  ./pubblica.sh "cosa ho cambiato"
set -e
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:$PATH"

MSG="${1:-Aggiornamento}"

echo "→ compilo…"
npm run build >/dev/null

# GitHub Pages serve dal branch main: copio la build in docs/
rm -rf docs && cp -R dist docs && touch docs/.nojekyll

# GitHub Pages non sa nulla delle rotte interne (/cantiere, /spese…): se ricarichi
# una di quelle pagine risponde 404. Servendo la stessa app come pagina di errore,
# il router riprende da dove eri.
cp docs/index.html docs/404.html

git add -A
git commit -m "$MSG" || echo "  (niente da salvare)"
git push origin main

echo ""
echo "  ✓ Pubblicato. Tra un minuto è online:"
echo "    https://c4gv4kf4d7-dev.github.io/casa-nuova/"
echo ""
