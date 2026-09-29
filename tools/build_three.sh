#!/bin/sh
# Build js/vendor/three.r3d.js: Three.js (MIT) plus the post-processing pieces the HD-2D renderer uses, as ONE classic
# script (no modules, works from file:// and inlined in the single-file bundle). The library is not run at load time:
# the file defines window.LS_THREE_FACTORY, which js/world/r3d/*.js calls only when the 3D renderer is switched on,
# so the 2D default pays only the parse.
#
#   sh tools/build_three.sh            (needs node + npm and registry.npmjs.org; no CDN)
#
# Pinned version: change THREE_VERSION and re-run to upgrade.
set -e
THREE_VERSION=0.186.1
ESBUILD_VERSION=0.25.10
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
cd "$WORK"
npm init -y >/dev/null
npm i --no-audit --no-fund --silent "three@$THREE_VERSION" "esbuild@$ESBUILD_VERSION"
cat > entry.js <<'JS'
export * from 'three';
export { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
export { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
JS
npx esbuild entry.js --bundle --format=iife --global-name=__THREE --minify --legal-comments=none --target=es2019 --outfile=three.iife.js --log-level=warning
OUT="$ROOT/js/vendor/three.r3d.js"
mkdir -p "$ROOT/js/vendor"
{
  echo "/* three.js r${THREE_VERSION#0.} (https://threejs.org), with examples/jsm UnrealBloomPass, Pass/FullScreenQuad."
  echo " * Bundled for LINESIDE by tools/build_three.sh (esbuild, IIFE). Defines window.LS_THREE_FACTORY; call it once to get THREE."
  echo " *"
  sed 's/^/ * /' node_modules/three/LICENSE
  echo " */"
  echo "window.LS_THREE_FACTORY=function(){"
  cat three.iife.js
  echo "return __THREE;};"
} > "$OUT"
echo "wrote $OUT ($(wc -c < "$OUT") bytes)"
