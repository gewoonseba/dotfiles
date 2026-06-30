---
name: jt-browser
description: >
  Browse the web, interact with web pages, fill forms, click buttons, take screenshots, and extract
  information from websites. Use this skill whenever the user asks to
  open a URL, navigate a website, scrape content, fill out a form, test a web page, take a screenshot,
  or perform any browser-based task. Also trigger when the user says "go to", "open this page",
  "check this site", "screenshot", "fill this form", "click on", or references interacting with a
  live web page.
---

# Browser Automation via agent-browser

You have access to the `agent-browser` CLI tool for all browser automation. Use it via the Bash tool.
**Do NOT use claude-in-chrome MCP tools** — use `agent-browser` commands exclusively.

---

## Personas & the local auth bypass

For Jolteon UI work, the **active user/persona is chosen when the stack is started**, not in the
browser. `jt app run --<env> --as <persona>` (e.g. `jt app run --dev --as partner`) starts the
backend + frontend with WorkOS login bypassed and the chosen persona's identity, so the frontend
skips the login screen entirely and the browser only has to open the app.

Consequences for browser work:

- **No pre-authenticated browser profiles are needed.** Open `http://localhost:5173` with a clean
  (default or ephemeral) profile — you are already "logged in" as whatever persona the running stack
  was started with. There are no longer per-user `--profile` directories to maintain.
- **The browser cannot choose the persona.** The persona is fixed at process start; to validate a
  different one, the stack must be restarted with a different `--as`. Never assume which persona is
  live — confirm it with the pre-flight below.
- A persistent `--profile` is only for the exception case of exercising the *real* WorkOS login flow
  (no bypass). For normal local validation, skip it.

### Persona pre-flight (do this first)

Before validating anything, confirm the stack is running as the persona you intend — a wrong-persona
run silently validates the wrong thing. Query the backend and check the **DB-derived** identity
fields. The bypass gives every persona the same placeholder email/name, so those do NOT distinguish
personas — only these do:

```bash
curl -s http://localhost:8000/user/me | jq '{customer_id, organization_type, is_admin}'
```

Assert the result matches the intended persona (e.g. `partner` -> `organization_type` RESELLER,
`is_admin` false; `root` -> `is_admin` true). If it does not match, **stop** and restart the stack
with the correct `jt app run --as <persona>` — do not proceed with validation.

---

## Core Workflow

For any browser task, follow this pattern:

### 1. Open and wait for the page

Open the app with a clean profile — no `--profile` needed, since the running stack already
authenticates you via the bypass (see Personas above):

```bash
agent-browser open <url> && agent-browser wait --load networkidle
```

### 2. Understand the page

Use `snapshot` to get the accessibility tree with element refs (`@e1`, `@e2`, etc.):

```bash
agent-browser snapshot -i    # Interactive elements only (buttons, inputs, links)
agent-browser snapshot -ic   # Interactive + compact (remove empty structural elements)
agent-browser snapshot       # Full accessibility tree
```

Use `snapshot` with a scoped selector for large pages:

```bash
agent-browser snapshot -i -s "main"        # Only elements inside <main>
agent-browser snapshot -i -s "#login-form"  # Only elements inside a specific form
```

### 3. Interact with elements

Use the `@ref` identifiers from the snapshot output:

```bash
agent-browser click @e5                          # Click a button/link
agent-browser fill @e3 "user@example.com"        # Clear field and type
agent-browser type @e3 "additional text"          # Append text
agent-browser select @e7 "option-value"           # Select dropdown option
agent-browser check @e9                           # Check checkbox
agent-browser press Enter                         # Press a key
agent-browser hover @e4                           # Hover over element
```

### 4. Verify results

After interactions, take a snapshot or screenshot to verify the result:

```bash
agent-browser snapshot -ic                 # Check new page state
agent-browser screenshot                   # Visual verification (returns image path)
agent-browser screenshot --annotate        # Labeled screenshot with numbered elements
agent-browser get text @e1                 # Get text content of specific element
agent-browser get url                      # Check current URL
agent-browser get title                    # Check page title
```

---

## Important Patterns

### Reading page content

```bash
agent-browser get text "main"              # Get all text from <main>
agent-browser get text "article"           # Get article text
agent-browser get html @e1                 # Get HTML of element
agent-browser get value @e3                # Get input value
agent-browser get attr href @e5            # Get attribute value
agent-browser get count "li"               # Count elements
```

### Screenshots

```bash
agent-browser screenshot                        # Viewport screenshot
agent-browser screenshot --full                  # Full page
agent-browser screenshot --annotate              # With numbered labels
agent-browser screenshot page.png                # Save to specific path
agent-browser screenshot --full --annotate overview.png  # Full + annotated + named
```

Always use `Read` tool on the screenshot path to show it to the user.

### Finding elements without refs

When you need to find elements by role, text, or other attributes:

```bash
agent-browser find role button click --name "Submit"
agent-browser find text "Sign in" click
agent-browser find placeholder "Email address" fill "user@example.com"
agent-browser find testid "login-btn" click
```

### Scrolling

```bash
agent-browser scroll down                  # Scroll down default amount
agent-browser scroll down 500              # Scroll down 500px
agent-browser scroll up 200                # Scroll up 200px
agent-browser scrollintoview @e15          # Scroll element into view
```

### Waiting

```bash
agent-browser wait @e5                     # Wait for element to appear
agent-browser wait 2000                    # Wait 2 seconds
agent-browser wait --load networkidle      # Wait for network to settle
```

### Navigation

```bash
agent-browser open <url>                              # Navigate to URL
agent-browser back                                    # Go back
agent-browser forward                                 # Go forward
agent-browser reload                                  # Reload page
```

### Tabs

```bash
agent-browser tab list                     # List open tabs
agent-browser tab new                      # Open new tab
agent-browser tab 2                        # Switch to tab 2
agent-browser tab close                    # Close current tab
```

### JavaScript evaluation

```bash
agent-browser eval "document.title"
agent-browser eval "window.location.href"
agent-browser eval "document.querySelectorAll('img').length"
```

### Console & errors

```bash
agent-browser console                      # View console logs
agent-browser errors                       # View page errors
```

### Cookies and storage

```bash
agent-browser cookies get                  # View cookies
agent-browser storage local                # View localStorage
agent-browser storage session              # View sessionStorage
```

### Network monitoring

```bash
agent-browser network requests             # View network requests
agent-browser network requests --filter "api"  # Filter by pattern
```

### Authentication persistence

For normal Jolteon work you do not log in at all — the `jt app run --as <persona>` bypass loads the
app already authenticated, so a clean profile needs no persisted session.

The only time a persistent profile helps is the exception case of exercising the **real** WorkOS
login flow (no bypass). For that, pass a `--profile` directory of your choosing — it persists cookies
and localStorage across runs — and log in once headed:

```bash
agent-browser --profile "$WORK/browser-profiles/real-login" --headed open <login-url>
```

---

## Guidelines

1. **Always run headless** — Never pass `--headed` unless the user explicitly asks for a visible
   browser window (e.g., "open headed", "show the browser", "I want to watch"). The only exception
   is re-login flows where the user needs to interact with the browser manually.

2. **Always snapshot before interacting** — don't guess selectors. Use `snapshot -i` to get the
   current interactive elements and their `@ref` identifiers.

3. **Wait for page loads** — After navigation or clicks that trigger page loads, use
   `agent-browser wait --load networkidle` before taking the next snapshot.

4. **Chain commands** — Use `&&` to chain related commands in a single Bash call:
   ```bash
   agent-browser fill @e1 "test@example.com" && agent-browser fill @e2 "password" && agent-browser click @e3
   ```

4. **Use compact snapshots for large pages** — Add `-c` flag and scope with `-s` selector to
   avoid overwhelming output.

6. **Show screenshots to the user** — When taking screenshots for verification, use the Read tool
   on the resulting image path so the user can see it.

7. **Don't trigger alerts/dialogs** — Avoid clicking elements that trigger `alert()`, `confirm()`,
   or `prompt()` dialogs as these block the browser. If needed, dismiss them with:
   ```bash
   agent-browser eval "window.alert = () => {}; window.confirm = () => true; window.prompt = () => ''"
   ```

8. **Close the browser when done** — Run `agent-browser close` when the browsing session is
   complete, unless the user wants to continue interacting.
