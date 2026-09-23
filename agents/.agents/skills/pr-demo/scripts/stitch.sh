#!/bin/bash
# Label two clips and concatenate them into one mp4.
#
#   stitch.sh <before.webm> <after.webm> <out.mp4> "<before caption>" "<after caption>"
set -eu

BEFORE="$1"; AFTER="$2"; OUT="$3"; CAP_B="$4"; CAP_A="$5"
FONT=$(fc-match -f "%{file}" "DejaVu Sans:bold" 2>/dev/null || echo /usr/share/fonts/liberation/LiberationSans-Bold.ttf)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Delivery width. Captures are made at deviceScaleFactor 2, so the source is twice
# this; the downscale is where the crispness comes from, so do not skip it.
OUT_W="${OUT_W:-1524}"
CRF="${CRF:-22}"

label() { # in out captiontext colour
  printf '%s' "$3" > "$TMP/cap.txt"
  # textfile=, not text= — a caption containing ":" breaks filterchain parsing.
  ffmpeg -y -v error -i "$1" \
    -vf "scale=$OUT_W:-2:flags=lanczos,pad=iw:ih+64:0:64:color=0x0f172a,drawtext=fontfile=$FONT:textfile=$TMP/cap.txt:fontcolor=$4:fontsize=27:x=28:y=19" \
    -c:v libx264 -preset slow -crf "$CRF" -pix_fmt yuv420p -r 10 -an "$2"
}

label "$BEFORE" "$TMP/b.mp4" "$CAP_B" 0xF87171   # red
label "$AFTER"  "$TMP/a.mp4" "$CAP_A" 0x4ADE80   # green
printf "file '%s'\nfile '%s'\n" "$TMP/b.mp4" "$TMP/a.mp4" > "$TMP/list.txt"
ffmpeg -y -v error -f concat -safe 0 -i "$TMP/list.txt" -c copy "$OUT"

ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 "$OUT"
du -h "$OUT"
