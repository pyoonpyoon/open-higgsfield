#!/usr/bin/env bash
# Start a local ComfyUI + comfy-api-proxy so the Comfy SDK can target it instead of Comfy Cloud.
#   COMFY_BASE_URL=http://127.0.0.1:8189   (proxy, Comfy API v2 shape)
#   ComfyUI native API / UI:  http://127.0.0.1:8188
#
# Usage: scripts/local-stack.sh [start|stop|status]   (default: start)
# Env:   COMFYUI_DIR (default ~/ComfyUI-openhiggs), COMFY_PORT (8188), PROXY_PORT (8189)
#        COMFY_EXTRA_ARGS extra ComfyUI flags (macOS default: --fast-disk --cache-none --reserve-vram 12)
set -euo pipefail

COMFYUI_DIR="${COMFYUI_DIR:-$HOME/ComfyUI-openhiggs}"
COMFY_PORT="${COMFY_PORT:-8188}"
PROXY_PORT="${PROXY_PORT:-8189}"
PY="$COMFYUI_DIR/.venv/bin/python"
PROXY="$COMFYUI_DIR/.venv/bin/comfy-api-proxy"
LOG="$COMFYUI_DIR/comfyui.log"
PIDFILE="$COMFYUI_DIR/comfyui.pid"

# Apple Silicon shares one memory pool between CPU and GPU, so a 41 GB bf16 model plus the
# text encoder gets the process killed. Stream weights from SSD, drop cached models between
# stages, and leave headroom for macOS and the browser.
if [ "$(uname)" = "Darwin" ] && [ -z "${COMFY_EXTRA_ARGS+x}" ]; then
  COMFY_EXTRA_ARGS="--fast-disk --cache-none --reserve-vram 12"
fi

comfy_up() { curl -sf "http://127.0.0.1:$COMFY_PORT/system_stats" >/dev/null; }
proxy_up() { curl -sf "http://127.0.0.1:$PROXY_PORT/api/v2/health" >/dev/null; }

start() {
  [ -x "$PY" ] || { echo "ComfyUI venv not found at $COMFYUI_DIR/.venv" >&2; exit 1; }
  if comfy_up; then
    echo "ComfyUI already up on :$COMFY_PORT"
  else
    echo "Starting ComfyUI on :$COMFY_PORT (log: $LOG)"
    (cd "$COMFYUI_DIR" && nohup "$PY" main.py --listen 127.0.0.1 --port "$COMFY_PORT" ${COMFY_EXTRA_ARGS:-} >"$LOG" 2>&1 & echo $! >"$PIDFILE")
    for _ in $(seq 1 90); do comfy_up && break; sleep 2; done
    comfy_up || { echo "ComfyUI failed to start; see $LOG" >&2; exit 1; }
  fi
  if proxy_up; then
    echo "comfy-api-proxy already up on :$PROXY_PORT"
  else
    echo "Starting comfy-api-proxy on :$PROXY_PORT"
    "$PROXY" start --comfyui "http://127.0.0.1:$COMFY_PORT" --port "$PROXY_PORT" --comfyui-base-dir "$COMFYUI_DIR"
    for _ in $(seq 1 30); do proxy_up && break; sleep 1; done
    proxy_up || { echo "proxy failed to start" >&2; exit 1; }
  fi
  echo "Ready. COMFY_BASE_URL=http://127.0.0.1:$PROXY_PORT"
}

stop() {
  "$PROXY" stop 2>/dev/null || true
  if [ -f "$PIDFILE" ]; then kill "$(cat "$PIDFILE")" 2>/dev/null || true; rm -f "$PIDFILE"; fi
  echo "Stopped."
}

status() {
  comfy_up && echo "ComfyUI: up (:$COMFY_PORT)" || echo "ComfyUI: down"
  proxy_up && echo "proxy:   up (:$PROXY_PORT)" || echo "proxy:   down"
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  *) echo "usage: $0 [start|stop|status]" >&2; exit 2 ;;
esac
