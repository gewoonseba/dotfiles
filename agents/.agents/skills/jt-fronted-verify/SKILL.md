---
name: jt-frontend-verify
description: >
  Drive the running Jolteon app in a real browser (via the `agent-browser` CLI) to visually
  verify a frontend change end-to-end — reproduce a UI bug, confirm a fix works, or exercise an
  interaction (hover/tooltip/disabled states, overflow, layout). Use ONLY when the user explicitly
  asks to verify/QA in the browser, check a fix in the real app, reproduce a page issue, drive the
  app, or "use agent-browser". This is NOT automatic post-change QA — default to tests only unless
  asked (see the "No unsolicited QA" rule). Encodes the Jolteon-specific gotchas: which worktree
  the dev server is actually serving, WorkOS auth, and the agent-browser navigation patterns that
  actually work against a Radix + React app.
---

# Browser-verifying frontend changes in Jolteon

Use the `agent-browser` CLI (prefer it over any other browser tool). Load its full reference once
per session: `agent-browser skills get core --full`.

## 0. When to use

Only on an **explicit** request to verify/reproduce in the browser. For a routine UI change,
tests are the default gate — do not auto-launch the app or agent-browser.

## 1. PREFLIGHT — confirm the dev server is serving _your_ code (do this first, every time)

Multiple worktrees/sessions share port **5173**. The server there may be serving a _different
branch_ than the one you edited. Verifying against the wrong worktree wastes a lot of time.

```bash
curl -s -o /dev/null -w "5173 HTTP %{http_code}\n" http://localhost:5173/
# Which worktree owns the vite server?
ps aux | grep -oE "/home/[^ ]*/node_modules/.bin/vite" | head   # path = the worktree being served
```

Then **double-confirm** by grepping a string unique to your change and checking it renders. E.g.
if your dialog has a button "Add another schedule", assert it exists in the open dialog:

```bash
agent-browser eval "(()=>{const d=document.querySelector('[role=dialog]'); return d? !!([...d.querySelectorAll('button')].find(b=>/Add another schedule/i.test(b.textContent))) : 'no dialog';})()"
```

If the DOM shows a _different_ implementation than your source, the wrong worktree is being served.

**Do NOT** just spin up your own `vite --port 5174` to fix this: the app auth is WorkOS and the
server that "works" has a local persona/session bypass configured. A fresh server bounces to
`*.authkit.app` with `redirect_uri` pinned to `http://localhost:5173`, so it never authenticates.
Instead, **ask the user to (re)start the dev server for your branch** (they own the auth setup),
then re-run the preflight. Cookies are shared across localhost ports but the session/redirect are not.

## 2. agent-browser essentials

```bash
agent-browser set viewport 1524 900          # match the viewport from the user's bug report
agent-browser open "<url>"                     # navigate; then `get url` to check for an auth redirect
agent-browser screenshot <path.png>            # then Read the file to actually see the UI
agent-browser eval "<js>"                      # inspect/measure the DOM
agent-browser close                            # closes YOUR automation browser (see cleanup)
```

### eval gotchas

- The eval JS context **persists across calls** — `const x = ...` twice throws "Identifier already
  declared". **Wrap every snippet in an IIFE**: `(()=>{ ... return ...; })()`.
- To pass a value between eval calls (e.g. computed click coords), stash it: `window.__c = [x,y]`.

### clicking gotchas (Radix + scrollable panels make selectors flaky)

- `click <sel>` expects a **CSS selector** or `@ref` — `click "text=..."` fails.
- `find text "<visible text>" click` matches **visible text only** — icon-only buttons (aria-label,
  no text, e.g. Edit/Remove pencils) won't match.
- **Robust pattern for any element** (icon buttons, portalled content, off-screen): compute its
  center in JS and click by coordinates:
  ```bash
  agent-browser eval "(()=>{const el=[...document.querySelectorAll('[role=dialog] button')].find(x=>/Edit schedule 1/i.test(x.getAttribute('aria-label')||'')); el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); window.__c=[Math.round(r.x+r.width/2),Math.round(r.y+r.height/2)]; return window.__c;})()"
  CX=$(agent-browser eval "window.__c[0]" | tail -1); CY=$(agent-browser eval "window.__c[1]" | tail -1)
  agent-browser mouse move $CX $CY; agent-browser mouse down; agent-browser mouse up
  ```
- Elements inside a **scrollable side panel** report a zero/offscreen rect until you
  `el.scrollIntoView({block:'center'})` first. Wait ~1–2s after a click for Radix portals to mount,
  then assert `document.querySelectorAll('[role=dialog]').length`.

## 3. Diagnosis snippets (proven)

### Horizontal overflow ("scroll that shouldn't be there")

```bash
# amount of overflow on the scroll container (e.g. the dialog)
agent-browser eval "(()=>{const d=document.querySelector('[role=dialog]'); return {overflowX:d.scrollWidth-d.clientWidth, docOverflowX:document.documentElement.scrollWidth-document.documentElement.clientWidth};})()"
```

Find the culprit: compare each descendant's `getBoundingClientRect().right` to the container's
content-box right, and/or `el.scrollWidth > el.clientWidth`. **Key Jolteon gotcha:** a flex/grid
_item_ defaults to `min-width:auto` and won't shrink below its content's max-content — the whole
column then stretches and overflows. `DialogContent` is `display:grid`, so its direct child (a form
root) is a grid item that needs **`min-w-0`**. Bisect by live-patching ancestors and re-measuring:

```bash
agent-browser eval "(()=>{const d=document.querySelector('[role=dialog]'); const before=d.scrollWidth-d.clientWidth; [...d.children].forEach(k=>k.style.minWidth='0px'); void d.offsetWidth; return {before, after:d.scrollWidth-d.clientWidth};})()"
```

If `after` is 0, add `min-w-0` to the offending item in code (then re-verify — the shrink chain must
be unbroken from the scroll container down to the wide leaf, e.g. native `type=month`/`type=time`
inputs).

### Tooltip on a disabled control

Disabled elements don't fire hover (`disabled:pointer-events-none`); the app wraps them in a
focusable `<span>` (see `components/ui/button`). Verify by hovering the chip's coords, then:

```bash
agent-browser eval "(()=>{const t=document.querySelector('[role=tooltip]'); return t?t.textContent.trim():'NO TOOLTIP';})()"
```

### Element state

Query by `aria-label`, read `aria-pressed` / `disabled`:

```bash
agent-browser eval "(()=>{const d=document.querySelector('[role=dialog]'); const b=[...d.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='Saturday'); return {pressed:b.getAttribute('aria-pressed'), disabled:!!b.disabled};})()"
```

## 4. Cleanup etiquette

- **Never kill the user's dev server** (it may belong to another active session). If you started
  your own, kill only that one.
- Close only your automation browser: `agent-browser close`.
- Save screenshots to the scratchpad and `Read` them — measurements alone miss visual/layout bugs.

## 5. Worked example — the access-power dialog

Asset URL → **Manage Access Power** button (in the right detail panel; `scrollIntoView` first) →
group **Edit** (pencil icon) → **Edit schedule N** (expands a bucket into the editing state with the
day picker + time-block grid). This is the path used to verify day-of-week schedules (disabled-day
tooltips, coverage, and the edit-mode horizontal-scroll fix).
