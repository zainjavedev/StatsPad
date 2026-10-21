#!/bin/sh
# Opens this project's split screen in Orca: the dev server on the left, a free shell on the right
# (for lint, git, curl). Run it from the repo: npm run dev:split
set -e
ORCA=${ORCA:-$(command -v orca || echo /Applications/Orca.app/Contents/Resources/bin/orca)}
root=$(cd "$(dirname "$0")/.." && pwd)

if "$ORCA" terminal list --json | grep -q '"title": "StatsPad dev"'; then
  echo "StatsPad dev is already open in Orca."
  exit 0
fi

handle=$("$ORCA" terminal create --worktree "path:$root" --title "StatsPad dev" --command "npm run dev" --json | sed -n 's/.*"handle": "\(term_[^"]*\)".*/\1/p' | head -1)
"$ORCA" terminal split --terminal "$handle" --direction horizontal --json >/dev/null
echo "Dev server on the left, shell on the right."
