---
name: browser
description: >
  Browse the web, interact with web pages, fill forms, click buttons, take screenshots, and extract
  information from websites. Supports browser profiles (root, partner, customer) for different user
  contexts — specify as argument e.g. "/browser customer". Use this skill whenever the user asks to
  open a URL, navigate a website, scrape content, fill out a form, test a web page, take a screenshot,
  or perform any browser-based task. Also trigger when the user says "go to", "open this page",
  "check this site", "screenshot", "fill this form", "click on", or references interacting with a
  live web page.
---

# Browser Automation via agent-browser

You have access to the `agent-browser` CLI tool for all browser automation. Use it via the Bash tool.
**Do NOT use claude-in-chrome MCP tools** — use `agent-browser` commands exclusively.

---

## Browser Profiles

Three browser profiles are available, each pre-authenticated as a different user type:

| Profile      | `--profile` path                                              | Description                           |
|-------------|---------------------------------------------------------------|---------------------------------------|
| **root**     | `/Users/sebastianstoelen/Work/browser-profiles/root`         | Global admin (ROOT organization)      |
| **partner**  | `/Users/sebastianstoelen/Work/browser-profiles/partner`      | Reseller / partner organization       |
| **customer** | `/Users/sebastianstoelen/Work/browser-profiles/customer`     | End-customer organization             |

### Choosing a profile

- If the user specifies a profile (e.g., `/browser root`, "open as customer", "use the partner profile"), use that profile.
- If the user does not specify a profile, **default to `root`**.
- If the task requires testing multiple user perspectives, use separate sessions with different profiles.

---

## Core Workflow

For any browser task, follow this pattern:

### 1. Open and wait for the page

Always use `--profile` to reuse the authenticated browser session (replace `<profile>` with the chosen profile path):

```bash
agent-browser --profile /Users/sebastianstoelen/Work/browser-profiles/root open <url> && agent-browser wait --load networkidle
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
agent-browser --profile /Users/sebastianstoelen/Work/browser-profiles/root open <url>  # Navigate to URL (with persistent session)
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

Each profile directory persists cookies, localStorage, and all browser state across sessions. Login once per profile and all future runs with that profile are authenticated.

To re-login if a session expires:
```bash
agent-browser --profile /Users/sebastianstoelen/Work/browser-profiles/root --headed open <login-url>
agent-browser --profile /Users/sebastianstoelen/Work/browser-profiles/partner --headed open <login-url>
agent-browser --profile /Users/sebastianstoelen/Work/browser-profiles/customer --headed open <login-url>
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
