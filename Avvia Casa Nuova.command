#!/bin/zsh
# Doppio click per aprire Casa Nuova.
# Per spegnere: chiudi questa finestra del Terminale.
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:$PATH"

[ -d dist ] || npm run build

IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
echo ""
echo "  Casa Nuova è accesa 🏺"
echo ""
echo "  Sul Mac:     http://localhost:4173"
[ -n "$IP" ] && echo "  Su iPhone:   http://$IP:4173   (stesso Wi-Fi di casa)"
echo ""
echo "  Chiudi questa finestra per spegnere."
echo ""
(sleep 1.5 && open "http://localhost:4173") &
npx vite preview --port 4173 --host
