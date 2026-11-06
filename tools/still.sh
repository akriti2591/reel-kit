#!/bin/sh
# Render one frame of a composition to a PNG, versioned so earlier stills are never overwritten.
#   sh tools/still.sh <CompositionId> <frame> [extra remotion flags…]
#   sh tools/still.sh DemoReel 75 --props='{"guides":true}'
# → out/stills/<CompositionId>-f<frame>-v<N>.png
set -e
id="$1"; frame="$2"; shift 2 || { echo "usage: still.sh <CompositionId> <frame> [flags]"; exit 1; }
mkdir -p out/stills
v=1; while [ -e "out/stills/${id}-f${frame}-v${v}.png" ]; do v=$((v + 1)); done
npx remotion still src/index.ts "$id" "out/stills/${id}-f${frame}-v${v}.png" --frame="$frame" --log=error "$@"
echo "out/stills/${id}-f${frame}-v${v}.png"
