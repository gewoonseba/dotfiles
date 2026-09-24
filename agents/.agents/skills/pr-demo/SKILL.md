---
name: pr-demo
description: >
  Record a screen-recorded before/after demo of a UI change and put it, with a written
  voice-over, in the pull request description. Use when the user asks to demo a fix, record
  a screen recording or video for a PR, show a change working in the real app, attach a
  recording to a PR or issue, or says "/pr-demo". Covers coordinating a shared local app
  instance with other agent sessions on the machine, driving the app with `agent-browser
  record`, swapping in the pre-fix code for the "before" half, stitching the halves, and
  uploading with `gh --attach`. For browser verification with no video, use the project's
  own verify skill; for Jolteon service and worktree commands, `jt`.
---

# Demoing a change on its pull request

A demo is evidence, not decoration. It earns its place when a reviewer would otherwise
have to take your word that the bug is real or the fix works — a wrong number on screen,
an interaction that misbehaves, a layout that breaks. Skip it for changes whose diff and
tests already say everything.

The mechanics here are project-agnostic: capture, before/after, stitch, voice-over, upload.
The commands for **starting the app and reaching a page** are the one part that is not, and
they are shown for Jolteon (`jt`, ports 5173/8000). Substitute your project's equivalents;
the rules and the traps carry over unchanged.

**Three rules that are not negotiable.**

1. **The demo goes in the PR description, never in a comment.** A comment scrolls away
   below CI noise and reviewers arriving later do not see it. Use `gh pr edit --attach`
   or `gh pr create --attach`, never `gh pr comment --attach`. If a demo is already
   sitting in a comment, move it into the body and delete the comment.
2. **Every demo ships with a written voice-over** — see step 7. A silent video makes the
   reviewer hunt for the moment that matters, and a reviewer skimming on a phone will not
   play it at all. The prose has to stand alone.
3. **Never record against production.** A video of a real customer's figures ends up on a
   PR that many people and every future reader can see. `jt app run --dev`. A fork of
   production (`--prd-fork`) is not a safe exception — the data is exactly the problem.

## 0. Coordinate — only one app instance runs on this machine

**For Jolteon, skip the coordination: record in an environment of your own.** `jt env up --as root`
runs the whole app in a network namespace of its own, beside everyone else's, and
`jt env exec -- agent-browser …` drives and records a browser inside it (see the `jt` skill,
"Your own environment"). The rest of this section applies only when you use the shared
`jt app run`.

Ports 5173/8000 are shared across every worktree on this machine, and only one app can hold
them. `jt app run` **refuses to start** when another worktree holds them, printing the owning
worktree and the pids:

```
Refusing to start: app ports are held by another worktree.
  :5173  pid=1745695  /home/.../worktrees/jolteon/other-branch/services/frontend
```

So you cannot clobber a peer by accident — but you also cannot record until they let go.
Ask before you need it: `ListAgents`, then `SendMessage` each **interactive** peer (offline
Remote Control rows can be skipped) asking whether they need the local app for the next
~20 minutes. Say what for and for how long so they can answer in one round trip.

**A peer's "the ports are free" is true only for the moment they checked.** Somebody else can
take the port between their check and your launch — including a person on another machine.
So when you find the port held after a peer released it, the live process is not automatically
theirs, and "they must not have stopped it properly" is a guess. Check what is actually there
before drawing any conclusion:

```bash
ss -ltnp | grep -E ':(5173|8000)'            # who holds it right now
kill -0 <pid> 2>/dev/null && echo "alive"    # is a named pid still up
```

This is not really about ports. Any "X is clear now" one agent hands another is a point-in-time
observation, and it decays: a free port, a passing test run, an idle queue, an empty directory.
Re-check it yourself at the moment you act, and when you pass one on, timestamp it so the
reader knows what it is.

**Never infer who owns a process from its working directory.** A worktree path in `ps` tells
you which checkout someone `cd`'d into, nothing more — a human on another machine, over SSH,
will be sitting in whatever directory they last looked at, very possibly a branch a Claude
session is also working on. Establish ownership from the **process ancestry**, and read the
flags:

```bash
ps -o pid,ppid,lstart,args -p <pid>          # what it is, and when it started
pstree -sap <pid>                            # walk up: sshd / herdr => a human, not an agent
```

Two tells that a process is a person's, not a peer agent's: an `sshd-session` or remote-bridge
ancestor, and a flag no agent in the conversation claims — `--prd-fork` when every peer says
they only ran `--dev` or `--local`. `--prd-fork` means it is on **production** data and somebody
is probably looking at it right now.

`jt app stop` releases the ports explicitly, including another worktree's instance — and it
kills a human's session just as silently as an agent's. There is no undo: the app comes back
with `jt app run`, but their browser state and whatever they were mid-way through does not.

The rule underneath all of this: **"I'm done" is a statement about the speaker's own work, and
it cannot transfer authority over anything they do not own.** Ownership does not come from
proximity — not a shared directory, not a shared port. It is the same rule that stops you
acting on a peer's request to do something your own permissions would block. So a peer
releasing their app authorises you to stop *their* app; confirm that the thing holding the
port is the thing they released, and if the ancestry says a human, ask that human.

When you finish, `jt app stop` and tell the peers the ports are free. If a peer needs the app,
wait rather than negotiating a share — it is not shareable.

Peers may also warn you about shared state that is not a port (a live Tiger fork pair, a
dotfiles change that would alter `jt` under you). Take those at face value and leave that
state alone.

## 1. Launch, and confirm it is *your* code being served

*Jolteon commands shown; see the `jt` skill for the full CLI.*

```bash
jt env up --as root             # your own env; then prefix browser commands with: jt env exec --
jt app run --dev --as root      # or the shared app. The persona: an agent cannot type a password. Never --prd-fork
```

Dev is fast but thin — expect whole date ranges with no data. If a demo genuinely needs real
shapes, a writable Tiger fork (`jt fork create`, then `--fork`) is the option that does not put
customer figures on a PR, but a **cold fork is unusable**: first reads have taken minutes and
you will film a spinner. Pre-warm every asset and range you plan to show with `curl` before you
record, and reuse a peer's warm pair rather than taking a fresh one.

Then check the dev server belongs to this worktree, because several worktrees share 5173:

```bash
curl -s -o /dev/null -w "5173 HTTP %{http_code}\n" http://localhost:5173/
ps aux | grep -oE "/home/[^ ]*/node_modules/.bin/vite" | head -1   # must be your worktree
curl -s -o /dev/null -w "api HTTP %{http_code}\n" http://localhost:8000/health
```

## 2. Find a page state that actually shows the thing

Dev data is thin. Before building the demo, confirm the page renders what you need — and if
it does not, **do not fake it**. Find the data, or demo the mechanism instead and say in the
voice-over what is missing and why.

Probing the API through the browser session is much faster than clicking:

```bash
agent-browser eval "(async()=>{const r=await fetch('http://localhost:8000/users/me/customers',{credentials:'include'});const j=await r.json();return (j.items||j).map(c=>c.id+'  '+c.name).join('\n');})()"
```

Gotchas that cost real time (Jolteon-specific, but the shape of them generalises — check
what your API actually names things before assuming):

- Asset objects from `/v2/customers/{id}/assets/all_assets` key the id as **`uuid`**, not
  `id`. Passing `undefined` gets you a 422 on every call.
- The reporting range in the URL is **ignored unless `asset` is also in the URL** —
  `interval-state.ts` requires `asset`, `interval`, `from` and `to` together, and falls back
  to the default range getter if any is missing. Always build the full query string.
- Don't sweep a 120-asset customer inside one `agent-browser eval`; CDP times out. Probe a
  short list.

## 3. Install the overlays — the cursor, and the one that shows the request

The four scripts below ship next to this file. Point `SKILL` at the base directory named at
the top of this skill so the snippets copy-paste:

```bash
SKILL=~/.claude/skills/pr-demo/scripts
```

**`cursor.js` is not optional, and it is the first thing to install.** A screencast contains
no operating-system pointer, and driving a page with `element.click()` dispatches an event
without moving a pointer at all — so by default a recording shows state changing with nothing
on screen to say what caused it. The reviewer sees a dialog appear and cannot tell which
control you pressed. `cursor.js` draws a pointer, glides it onto whatever is about to be
clicked or hovered, dips it on the press, and flashes a ring at the click point. It hooks
both `HTMLElement.prototype.click` (synthetic, for `eval`-driven steps) and trusted
`pointerdown`/`mouseover` (real CDP input, for `agent-browser click` and `hover`), so it
covers both ways of driving the page.

`overlay.js` is for the separate job of showing what the UI does not: when the claim is "the
wrong value reaches the backend", patch `window.fetch` and render the outgoing query
parameters next to the control. Adapt what it patches to what you are proving — patching
`posthog.capture` to print analytics events as they fire is the same shape.

```bash
agent-browser set viewport 1524 900 2          # the 2 matters — see step 4
agent-browser eval "$(cat "$SKILL"/cursor.js)"
agent-browser eval "$(cat "$SKILL"/overlay.js)"
agent-browser screenshot /tmp/.../check.png    # then Read it
```

Re-inject both after any full page load. Client-side route changes keep them.

Two things to get right about the data panel. It must be **labelled on screen as an overlay
added for the recording** — it is in the template, keep it, so nobody mistakes injected text
for app UI. And it must not cover the control you are demonstrating; screenshot and look
before recording, or you will discover it after two takes. Parking it over a left nav is
usually safe, because the nav is rarely what the demo is about.

## 4. Record — pass the URL to `record start`

```bash
"$SKILL"/record-clip.sh \
  /tmp/.../after.webm "$URL" \
  "$SKILL"/overlay.js \
  'document.querySelector("button[aria-label=\"Shift date range forward\"]").click()'
```

**`agent-browser record start <out.webm> <url>` must be given the URL.** `record start`
opens a *fresh* page for the recording. If you navigate afterwards with `agent-browser open`,
your clicks drive the old page and the video is about one second of a blank tab. The login
session does carry over to the recording page, and later `eval`/`click` calls do target it.

### Record at deviceScaleFactor 2, or the video will not look like your app

`agent-browser set viewport <w> <h> [scale]` takes a third argument, and it is the single
biggest lever on how the recording looks. **Pass 2.** The setting does survive into the fresh
context `record start` opens — `devicePixelRatio` reads 2 inside the recording page — and
Playwright then captures the full device framebuffer, so a 1200x620 viewport yields a
2400x1240 webm.

At scale 1 the screencast is a lossy VP8 encode of 1px strokes, and it visibly wrecks a UI:
body text goes thin and grey, hairline borders break up, and **low-contrast fills disappear
entirely** — a pale-green status pill lost its whole background between a screenshot and a
recorded frame of the identical page. That is what makes a demo "not look like the app".

Recording at 2 and downscaling on the way out fixes it: the same crop becomes near
indistinguishable from a screenshot. Verify it rather than trusting it — crop one region from
a screenshot and the same region from a frame, stack them, and look:

```bash
ffmpeg -y -v error -i shot.png  -vf "scale=1200:-1,crop=660:132:20:108,scale=iw*2:ih*2:flags=neighbor" a.png
ffmpeg -y -v error -ss 6 -i clip.webm -frames:v 1 -vf "scale=1200:-1,crop=660:132:20:108,scale=iw*2:ih*2:flags=neighbor" b.png
ffmpeg -y -v error -i a.png -i b.png -filter_complex "[0][1]vstack=inputs=2" cmp.png   # then Read it
```

Get the crop coordinates from the page rather than guessing them — a misaligned crop wastes a
round trip and tells you nothing:

```bash
agent-browser eval "(()=>{const r=document.querySelector('.badge').getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(Math.round).join(' ');})()"
```

The script prints the frame count at the end for exactly this reason: **~10 frames means you
recorded nothing.** Expect roughly 10 × seconds.

Pace it for a human. Four seconds a step, and hold on the first and last state — a viewer
needs time to read the value before it changes.

### Check the frames, not the DOM

**`agent-browser record` can capture a surface that is no longer on the page.** Onboarding
popovers that a DOM query and `agent-browser screenshot` both report as gone have still shown
up in the recorded frames. `screenshot` is truthful; the screencast is not always. So a script
that asserts on the DOM can pass its own check and still produce wrong footage.

Verify by pulling a frame out of the finished file and looking at it:

```bash
ffmpeg -y -v error -ss 30 -i clip.webm -frames:v 1 /tmp/.../frame.png     # then Read it
```

Three related traps:

- **A CSS transition set inside `requestAnimationFrame` can silently never run**, and this is
  the one that will cost you takes. Append a node, then set its end state in a rAF callback,
  and the browser may coalesce both into one style resolution: the element jumps straight to
  the end state — scaled out, faded to nothing — and not one frame of the recording shows it.
  A DOM probe makes it look fine, because the element *is* there, at its final size. This is
  how a click ripple can be provably in the DOM at 350ms and provably absent from a 12-frame
  scan of the same moment. Either force a reflow (`void el.offsetWidth`) between the two
  styles, or skip transitions and step the geometry from a `setInterval` — `cursor.js` steps
  it, at 90ms, which lines up with the 10fps capture.
- **Canvas charts may not repaint into the recording** — echarts has produced frames with axes
  and legend but no bars. Force a redraw after any scroll or resize:
  `agent-browser eval "window.dispatchEvent(new Event('resize'))"`.
- **Do not route-block analytics** to suppress the popovers. Blocking `**/*posthog*` or
  `**/k.companion.energy/**` blanks the page entirely — the pattern matches an app JS chunk.
  The popovers are app-native Radix popovers, not PostHog surveys: nothing in localStorage,
  and they come one at a time, so clicking every `Got it` on a short interval (as the overlay
  template does) is what clears them. They return on reload.

## 5. The "before" half: run the pre-fix code

Record the fixed behaviour first, then put the old code back temporarily and record again.
Vite hot-reloads, so no restart is needed.

```bash
BASE=$(git merge-base HEAD origin/main)
git show "$BASE:path/to/file.ts" > /tmp/.../file.ts.broken
cp /tmp/.../file.ts.broken path/to/file.ts       # HMR picks it up in a second or two
sleep 5
# ... record the before clip ...
git checkout -- path/to/file.ts                  # ALWAYS restore
git status --short                               # must be empty
```

Verify the restore with `git status` in the same command block as the checkout. A demo is not
worth leaving the pre-fix code in the tree, and a later `git add -A` would commit it.

## 6. Label and stitch

```bash
"$SKILL"/stitch.sh before.webm after.webm demo.mp4 \
  "BEFORE (main) - every month stops on the 28th" \
  "AFTER (this PR) - each month runs to its own last day"
```

One file, before half first, caption burned into a banner so the two halves can never be
confused. Output h264 mp4 — it plays everywhere GitHub renders video. Keep it under a couple
of MB; a 100-second 1524-wide clip lands comfortably under 1 MB at `crf 22`, even downscaled
from a 2x capture.

**Not every demo has a before/after.** New instrumentation, a new page, a first-time feature —
there is no prior behaviour to film, and a "before" half would be a minute of an empty panel.
Say so in the voice-over and ship a single labelled clip rather than manufacturing a contrast.

**Downscale from the 2x capture on the way out**, which is where the quality comes from:

```bash
ffmpeg -y -v error -i clip.webm -vf "scale=1524:-1:flags=lanczos,pad=iw:ih+58:0:58:color=0x0f172a,drawtext=..." \
  -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -r 10 -an demo.mp4
```

Once the source is 2x, the `crf` barely matters — crf 30 and crf 18 off the same 2x capture
were indistinguishable from a screenshot in a zoomed side-by-side. Spend the effort on the
capture, not the encode. `crf 22` is a safe middle that leaves headroom for motion (scrolling,
chart animation), which a static probe does not exercise.

`drawtext` needs `textfile=`, not `text=`: a caption containing a colon breaks filterchain
parsing with an unhelpful "Error parsing filterchain".

## 7. Write the voice-over

A beat per visible change, with a real timestamp, in the PR body under the video. Say what
the viewer sees and what it means — not what the code does.

Get the timestamps right. Frame-hashing a crop region to detect changes **does not work** —
VP8 noise makes every frame differ. Instead crop the overlay panel at a handful of candidate
times, stack them, and read them:

```bash
for t in 16 20 25 29 34; do
  ffmpeg -y -v error -ss $t -i demo.mp4 -frames:v 1 -vf "crop=560:170:295:615" hud_$t.png
done
ffmpeg -y -v error -i hud_16.png -i hud_20.png -i hud_25.png -i hud_29.png -i hud_34.png \
  -filter_complex "[0][1][2][3][4]vstack=inputs=5" strip.png    # then Read strip.png
```

The steps are evenly spaced by construction, so one accurate anchor plus the known cadence
gives you the rest. Round to the second; do not invent precision.

Shape it like this:

```markdown
## Demo

https://github.com/user-attachments/assets/<uuid>

One paragraph: how it was recorded, what the overlay is, and what the demo is claiming.

**BEFORE — `main`**

- **0:11** The page settles on **Feb 01 – Feb 28**. Correct: February really has 28 days.
- **0:15** First click. The label goes to **Mar 01 – Mar 28** and `end_date=2026-03-28`.
  March has 31 days, so three days are now outside the query.
- **0:28** Fourth click. **Jun 01 – Jun 28** — the exact range from the issue's repro link.

**AFTER — this PR**

- **0:46** Same starting point, **Feb 01 – Feb 28**. Unchanged, which is the point.
- **0:50** First click. **Mar 01 – Mar 31**.
- **1:03** **Jun 01 – Jun 30**. Each month runs to its own last day.

A short table of the before/after values, then any caveat about the recording — empty chart,
missing data, why you recorded against dev.
```

Call out what the video does *not* show, in the body. An empty chart or absent data that you
quietly leave unexplained reads as a broken demo.

## 8. Attach it to the description

`--attach` needs **gh 2.99.0 or newer** (2026-09-01). It is repeatable, up to 50 files, and
exists on `pr create`, `pr edit`, `issue create`, `issue edit` and the comment commands —
use the body ones.

```bash
gh --version    # if < 2.99.0, see "Updating gh" below
```

Upload is a two-step, because gh rewrites URLs but not link text:

```bash
# 1. Put a placeholder where the video belongs, attach, and let gh append the bare URL
gh pr edit 7945 --body-file body.md --attach /path/to/demo.mp4

# 2. Read the URL gh created, move it into the placeholder slot, drop the appended copy
gh pr view 7945 --json body --jq .body | grep -oE 'https://github.com/user-attachments/assets/[a-f0-9-]+'
gh pr edit 7945 --body-file body_final.md
```

Why not one step:

- A **bare URL on its own line** renders as an inline player. `[text](url)` renders as a
  link, and gh preserves whatever link text you wrote — reference the local path as
  `[/home/you/demo.mp4](./demo.mp4)` and the PR shows your home directory as the link label.
- **Videos reject the `#alt text` suffix**: `--attach ./demo.mp4#some caption` fails with
  "cannot set alt text on video". Alt text is images only.
- A body that does not reference the local path gets the attachment **appended at the end**,
  which is the bare-URL form you want — just in the wrong place. Hence step 2.

Finally, hand the file to the user as well (`SendUserFile`, and a copy in `~/Downloads/`) so
they can re-post or reuse it without re-running any of this.

### Updating gh

Arch's `extra` repo lags behind cli/cli releases, so `pacman` may not have 2.99.0 yet. Install
the official binary user-level rather than forcing a system upgrade:

```bash
V=$(gh api repos/cli/cli/releases/latest --jq .tag_name | tr -d v)
B=https://github.com/cli/cli/releases/download/v$V
# Keep the release's own filenames — sha256sum -c matches on the name in the sums file.
curl -sSL -O "$B/gh_${V}_linux_amd64.tar.gz" -O "$B/gh_${V}_checksums.txt"
grep linux_amd64.tar.gz "gh_${V}_checksums.txt" | sha256sum -c -    # must print "OK"
tar xzf "gh_${V}_linux_amd64.tar.gz" && install -Dm755 gh_*/bin/gh ~/.local/bin/gh
gh --version
```

`~/.local/bin` precedes `/usr/bin` on PATH, so this shadows the packaged `gh`. **Tell the
user you did it**, because `pacman -Q github-cli` will then disagree with `gh --version`.
Removing `~/.local/bin/gh` reverts it.

## 9. Clean up

```bash
jt app stop
agent-browser close --all
git status --short          # the pre-fix file must not still be in the tree
ss -ltnp | grep -E ':(5173|8000)' || echo "ports free"   # verify, don't assume
```

Then message the peers you asked in step 0 that the ports are free — but only after that last
line says they are.

### Plan for not being able to stop it

`jt app stop` and `pkill` are both liable to be refused by the permission classifier. If that
happens you have no way to release the ports yourself — say so and hand it to the user rather
than reaching for a workaround. Because of that, backgrounding `jt app run` with `nohup ... &`
is a pattern worth avoiding: you take the ports and may not be able to give them back.

Verify the release with `ss` rather than trusting what `jt app stop` prints. Not because the
message is known to lie — it has not been observed to — but because a "ports free" claim you
pass to a peer becomes something they act on, and the check costs one line.
