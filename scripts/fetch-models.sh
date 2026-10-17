#!/usr/bin/env bash
# Download the weights listed in workflows/manifest.json into a local ComfyUI's models/ folders.
# Resumable (curl -C -), skips files that are already complete. Nothing here runs automatically.
#
# Usage: scripts/fetch-models.sh [stage[:variant] ...]   stages: angle move moveLtx25 reshoot  (default: angle)
#        e.g. scripts/fetch-models.sh angle:gguf          (Apple Silicon: ~40 GB instead of ~59 GB; needs ComfyUI-GGUF)
#        scripts/fetch-models.sh --list [stage ...]   print files + sizes only
# Env:   COMFYUI_DIR  (default ~/ComfyUI-openhiggs)
#        HF_TOKEN     needed only for gated repos (Lightricks/LTX-2.5); accept the license on HF first.
#        CAMERA_LORAS=all|none|dolly-in,jib-up,...   which LTX camera LoRAs to fetch for "move" (default all)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/workflows/manifest.json"
COMFYUI_DIR="${COMFYUI_DIR:-$HOME/ComfyUI-openhiggs}"
LIST_ONLY=0
if [ "${1:-}" = "--list" ]; then LIST_ONLY=1; shift; fi
STAGES=("$@"); [ ${#STAGES[@]} -eq 0 ] && STAGES=(angle)

# Emit "folder<TAB>file<TAB>url<TAB>sizeGB" for the requested stages (deduplicated).
rows=$(node -e '
  const m = require(process.argv[1]);
  const cams = (process.env.CAMERA_LORAS || "all");
  const camFiles = new Set(m.cameraMoves.filter(c => c.lora).map(c => c.lora));
  const wanted = cams === "all" ? null : new Set(cams === "none" ? [] : cams.split(",").map(id => (m.cameraMoves.find(c => c.id === id) || {}).lora));
  const seen = new Set();
  for (const arg of process.argv.slice(2)) {
    const [s, variant] = arg.split(":");
    if (!m[s] || !m[s].models) { console.error("unknown stage: " + s); process.exit(2); }
    let models = m[s].models;
    if (variant) {
      const v = (m[s].variants || {})[variant];
      if (!v) { console.error("unknown variant: " + arg); process.exit(2); }
      models = models.filter(x => x.folder !== v.replaces).concat(v.models);
    }
    for (const x of models) {
      if (camFiles.has(x.file) && wanted && !wanted.has(x.file)) continue;
      if (seen.has(x.file)) continue; seen.add(x.file);
      console.log([x.folder, x.file, x.url, x.sizeGB].join("\t"));
    }
  }' "$MANIFEST" "${STAGES[@]}")

total=$(printf '%s\n' "$rows" | awk -F'\t' '{s+=$4} END {printf "%.2f", s}')
echo "Stages: ${STAGES[*]} -> $(printf '%s\n' "$rows" | wc -l | tr -d ' ') files, ~${total} GB into $COMFYUI_DIR/models"

auth=()
[ -n "${HF_TOKEN:-}" ] && auth=(-H "Authorization: Bearer $HF_TOKEN")

while IFS=$'\t' read -r folder file url size; do
  dest="$COMFYUI_DIR/models/$folder/$file"
  if [ "$LIST_ONLY" = 1 ]; then printf '  %6s GB  %s/%s\n' "$size" "$folder" "$file"; continue; fi
  mkdir -p "$(dirname "$dest")"
  remote=$(curl -sIL ${auth[@]+"${auth[@]}"} "$url" | awk 'tolower($1)=="x-linked-size:" {print $2}' | tr -d '\r' | tail -1)
  if [ -f "$dest" ] && [ -n "$remote" ] && [ "$(stat -f%z "$dest" 2>/dev/null || stat -c%s "$dest")" = "$remote" ]; then
    echo "ok    $folder/$file"; continue
  fi
  echo "get   $folder/$file (${size} GB)"
  curl -fL -C - --retry 5 --retry-delay 5 ${auth[@]+"${auth[@]}"} -o "$dest.part" "$url"
  mv "$dest.part" "$dest"
done <<< "$rows"
[ "$LIST_ONLY" = 1 ] || echo "Done."
