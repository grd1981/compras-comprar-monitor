#!/bin/bash
# Lo dispara launchd todos los días para correr el scraper sin intervención
# manual. launchd no carga tu .zshrc/.bash_profile, así que acá agregamos
# a mano las rutas más comunes donde puede estar instalado Node (Homebrew
# en Apple Silicon o Intel, o nvm) antes de llamar a npm.

set -uo pipefail

PROYECTO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROYECTO_DIR"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  \. "$NVM_DIR/nvm.sh"
  nvm use default >/dev/null 2>&1 || nvm use node >/dev/null 2>&1 || true
fi

mkdir -p "$PROYECTO_DIR/scripts/logs"
LOG="$PROYECTO_DIR/scripts/logs/scrape-$(date +%Y-%m-%d_%H-%M-%S).log"

{
  echo "=== $(date) ==="
  echo "npm: $(command -v npm || echo 'NO ENCONTRADO')"
  echo "node: $(command -v node || echo 'NO ENCONTRADO')"

  if ! command -v npm >/dev/null 2>&1; then
    echo "No se encontró npm en el PATH. Revisá dónde está instalado Node en"
    echo "esta Mac (which npm en una terminal normal) y agregá esa carpeta"
    echo "a la línea 'export PATH=...' de este script."
    exit 1
  fi

  npm run scrape
} >>"$LOG" 2>&1

CODIGO=$?
echo "=== fin ($CODIGO) ===" >>"$LOG"

# Limpieza: no acumular logs de más de 60 días.
find "$PROYECTO_DIR/scripts/logs" -name '*.log' -mtime +60 -delete 2>/dev/null || true

exit $CODIGO
