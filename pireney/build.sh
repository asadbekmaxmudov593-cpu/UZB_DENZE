#!/bin/sh
# One command: "Pireney sayohati" (80s Cel Anime), 141 s, 1920×1080, 24 fps.
set -e
LIB=${LIB:-/root/lemo-opuscar}; HERE=$(cd "$(dirname "$0")" && pwd); export LIB
PY="$LIB/.venv/bin/python"; cd "$LIB"; mkdir -p "$HERE/out"
node core/render/events.mjs "$HERE"
"$PY" "$HERE/music/score.py"
"$PY" "$HERE/mix.py"
node core/render/video.mjs "$HERE" --fps 24 --workers "${WORKERS:-4}" --out "$HERE/out/video.mp4"
if sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/pireney-sayohati.mp4" 24 2; then :; else
  "$PY" "$HERE/master.py" "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/pireney-sayohati.mp4" 24 2
fi
"$PY" core/render/srt.py "$HERE/cues.json" "$HERE/subtitles_uz.srt"
echo "done: $HERE/pireney-sayohati.mp4"
