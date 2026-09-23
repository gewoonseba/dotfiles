#!/bin/bash
# Record one clip of a demo: open the page, install the overlay, drive N steps.
#
#   record-clip.sh <out.webm> <url> <overlay.js> <step-js> [steps] [pause-seconds]
#
# Records at deviceScaleFactor 2 and installs cursor.js, so the clip shows where
# each click lands and does not wash out small text. See SKILL.md steps 3 and 4.
#
# <step-js> is a JS expression that performs one step, e.g.
#   'document.querySelector("button[aria-label=\"Shift date range forward\"]").click()'
#
# The URL is passed to `record start` on purpose — see SKILL.md step 4.
set -u

OUT="$1"; URL="$2"; OVERLAY="$3"; STEP="$4"; STEPS="${5:-4}"; PAUSE="${6:-4}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
W="${W:-1524}"; H="${H:-900}"

# The 2 is deviceScaleFactor and it carries into the fresh context `record start`
# opens. Without it the screencast thins text and drops low-contrast fills.
agent-browser set viewport "$W" "$H" 2 >/dev/null 2>&1

agent-browser record start "$OUT" "$URL" >/dev/null 2>&1
sleep 10                                              # let the app authenticate and settle
agent-browser eval "(()=>{[...document.querySelectorAll('button')].filter(b=>/^Got it\$/i.test(b.textContent.trim())).forEach(b=>b.click());return 1;})()" >/dev/null 2>&1
sleep 1
# Cursor first: it patches HTMLElement.prototype.click, so it must be in place
# before any step runs or the early clicks draw nothing.
agent-browser eval "$(cat "$HERE/cursor.js")" >/dev/null 2>&1
agent-browser eval "$(cat "$OVERLAY")" >/dev/null 2>&1
sleep "$PAUSE"                                        # hold on the starting state

for _ in $(seq 1 "$STEPS"); do
  agent-browser eval "(()=>{ $STEP ; return 1;})()" >/dev/null 2>&1
  sleep "$PAUSE"
  # Echo the observable state so the transcript records what each step produced.
  agent-browser eval "(()=>{const l=document.querySelector('#date');return (l?l.textContent.trim():'?')+' | '+location.search;})()" 2>&1 | tail -1
done

sleep "$PAUSE"                                        # hold on the final state
agent-browser record stop >/dev/null 2>&1

# A clip that is ~1s long means `record start` opened a page you never drove.
ffprobe -v error -count_frames -select_streams v:0 \
  -show_entries stream=nb_read_frames -of default=noprint_wrappers=1 "$OUT"
