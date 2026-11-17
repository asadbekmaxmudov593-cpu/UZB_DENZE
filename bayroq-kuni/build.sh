#!/bin/sh
# One command: "Bayroq kuni" (Silkscreen Travel Poster), 60 s, 1080×1920, 24 fps.
#   sh build.sh            events, score, mix, picture, master, readcheck, poster
#   WORKERS=4 sh build.sh  more render workers (default 3)
# Needs the library (LIB) with the core and music tiers installed:
#   sh <skill>/scripts/setup.sh deps music
# The sample libraries (FreePats, VCSL, VSCO 2 CE) are fetched on first use by sampler.py.
set -e
LIB=${LIB:-/root/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
PY="$LIB/.venv/bin/python"; WORKERS=${WORKERS:-3}; SIZE=1080x1920
cd "$LIB"
mkdir -p "$HERE/out"
"$PY" core/audio/sampler.py --need "$HERE/music/compose.py"
node core/render/events.mjs "$HERE" --size $SIZE
"$PY" "$HERE/music/compose.py"
"$PY" "$HERE/mix.py"
node core/render/video.mjs "$HERE" --size $SIZE --fps 24 --workers "$WORKERS" --out "$HERE/out/video.mp4"
# master: mux.sh needs ffmpeg 7+; with ffmpeg 6, master.py does the same job (−14 LUFS, true peak ≤ −1 dBTP)
if sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/bayroq-kuni.mp4" 24 1; then :; else
  "$PY" "$HERE/master.py" "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/bayroq-kuni.mp4" 24 1
fi
"$PY" core/render/srt.py "$HERE/tools/cues.json" "$HERE/subtitles_uz.srt"
node core/render/readcheck.mjs "$HERE" --size $SIZE > "$HERE/out/readcheck.txt" && echo "readcheck ok" || grep -v '^OK' "$HERE/out/readcheck.txt" | tail -8
node core/render/still.mjs "$HERE" 52 --size $SIZE --out "$HERE/out/poster" > /dev/null
ffmpeg -v error -y -i "$HERE/out/poster/t_52.jpg" -q:v 3 "$HERE/poster.jpg"
echo "done: $HERE/bayroq-kuni.mp4"
