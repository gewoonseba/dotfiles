---
name: code-frontend-qa
description: >
  Run QA checks on frontend changes by analyzing the current branch diff, building a testing plan,
  and then validating it in the browser. Use this skill whenever the user mentions "QA", "test the frontend",
  "check my changes in the browser", "run QA", "visual QA", "manual testing", "test this branch",
  "validate my UI changes", "browser test", or anything about verifying frontend behavior before merging.
  Also trigger when the user wants to check if a feature works correctly after implementation, or asks
  to "smoke test" or "sanity check" their changes — even if they don't explicitly say "QA".
---

# Frontend QA

Run a two-phase QA process on the current branch's frontend changes: first build a testing plan from the diff, then validate it in the browser and produce an HTML report with screenshots.

## How it works

This skill orchestrates two subagents in sequence:

1. **Planning Agent (you spawn first)** — Analyzes the git diff against `main`, understands what changed, and produces a structured testing plan.
2. **Testing Agent (you spawn after the plan is ready)** — Takes the plan and executes each test case in a local browser using the `/browser` skill. Writes an HTML test report with pass/fail results, embedded screenshots, and the exact URL for each test case so the user can re-verify themselves.

You (the orchestrator) manage the handoff. By default, **do not gate on user approval between phases** — proceed straight from the plan to execution. The user can interrupt if they want to redirect.

## Phase 1: Build the testing plan

### Spawn the Planning Agent

Spawn a subagent with the following task. Pass along any context the user gave you (e.g., "focus on the new table component", "I changed the settings page", specific test scenarios they want covered).

The planning agent should:

**1. Gather context from the diff**

```bash
git diff main...HEAD --name-only
git diff main...HEAD --stat
git diff main...HEAD -- services/frontend/
git log main..HEAD --oneline
```

Focus on changes inside `services/frontend/`. If there are also backend changes (in `services/dashboard-api/`, `packages/dashboard-api-ts-sdk/`, or other packages), note them — they may affect what the frontend displays or how API calls behave.

**2. Analyze what changed**

Read the changed files and understand:

- **What pages or routes are affected?** Cross-reference with `services/frontend/src/app/create-router.tsx` to map changed code to routes.
- **What components changed?** Trace the component tree — a change to a shared component in `src/components/` could affect many pages.
- **What data flows changed?** Look for changes in TanStack Query hooks (`useQuery`, `useMutation`), API calls, or the dashboard-api-ts-sdk.
- **What visual changes were made?** CSS/Tailwind changes, layout shifts, new or removed UI elements.
- **What feature flags or permissions gate the changes?** Conditional rendering based on flags, user roles, or `customerPermissions`.

**3. Build the testing plan**

Structure the plan in two tiers. Include the user's specific requests and context as a priority.

**Broad strokes (happy path):**
Test the core functionality that changed. Each test case verifies the main thing a user would do with this feature. Think from the end-user's perspective — what's the most common flow?

**Edge cases:**
Probe for things that could break:

- Empty states (no data, first-time user, no assets configured)
- Boundary values (very long text, large numbers, zero/negative values)
- Loading and error states (what shows while data is loading? what if the API fails?)
- Interaction sequences (rapid clicking, navigating away mid-action, browser back button)
- Responsive behavior (only if layout changes were made)
- Permission boundaries (admin vs non-admin, different customer types like `LIVE` vs others)
- Data dependencies (what if a related entity is missing or the customer has no contracts?)

**4. Format the testing plan**

Use this exact format so the testing agent can parse it unambiguously:

```
## QA Testing Plan

### Summary
Brief description of what changed and the overall testing strategy.

### Prerequisites
- Dev server URL (ask if not known — typically http://localhost:5173)
- Any test data, customer accounts, or login credentials needed
- Backend services that must be running

### Test Cases

#### Broad Strokes

**TC-01: [Descriptive name]**
- Page/URL: [full URL — must be a complete clickable URL including the dev server origin, e.g., http://localhost:5173/app/orgs/{customerId}/control-room]
- Steps:
  1. [Concrete step — mention specific button labels, menu items, form fields]
  2. ...
- Expected: [Observable outcome — what should appear on screen]
- Why: [What this validates]

#### Edge Cases

**TC-05: [Descriptive name]**
- Page/URL: [full clickable URL including origin]
- Steps:
  1. [Concrete step]
  2. ...
- Expected: [Observable outcome]
- Why: [What edge case this covers]
```

Test cases need to be specific enough that someone (or an agent) unfamiliar with the app can follow them step by step. Use actual button labels, menu names, and URL paths rather than vague descriptions. Every test case **must** include a complete URL (with origin) so the user can open it directly to reproduce the test themselves.

### Present the plan and proceed

When the planning agent returns the plan, give the user a concise summary (1–2 sentences naming the feature under test plus the test-case count) and **proceed straight to Phase 2 in the same turn**. Do not ask for approval by default — running QA is the explicit ask. Make reasonable assumptions for prerequisites (default dev server URL `http://localhost:5173`, currently logged-in user/customer) and document those assumptions in the plan and the report.

Only pause for confirmation if:

- The user invoked the skill with explicit review intent ("draft a QA plan", "let me review the plan first", "show me the plan before running").
- The plan is missing critical info that the agent couldn't infer (dev server URL, login credentials, specific customer ID required to reach the feature).
- The plan looks materially off — e.g., the agent inferred the wrong feature, or the diff is genuinely ambiguous.

In all other cases, announce the plan briefly and start the testing agent. The user can interrupt mid-run if they want to redirect; otherwise they'll see the report when it's done.

## Phase 2: Execute the tests

### Spawn the Testing Agent

Immediately after Phase 1 produces the plan, spawn a subagent to run the tests. Pass the complete testing plan to this agent. There is no approval step in between.

The testing agent's instructions:

**Use the `/browser` skill to interact with the application.** This gives you access to `agent-browser`, which lets you control a local browser. Use `/browser` at the start of your work to load the skill and follow its instructions for navigating, clicking, typing, and taking screenshots.

For each test case in the plan:

1. **Navigate** to the specified URL using the browser.
2. **Execute each step** as described — click buttons, fill forms, interact with the UI.
3. **Take a screenshot** at key moments: after page load, after each significant interaction, and at the final state. Save screenshots to `.context/qa-reports/screenshots/` with descriptive names like `TC-01-step-2-table-loaded.png`. Every screenshot you save **must** end up in the report with a caption underneath it — see "Screenshot captions" below for what that caption needs to say.
4. **Evaluate the result**: Compare what you see on screen against the "Expected" outcome.
   - **PASS** — The actual behavior matches the expected outcome.
   - **PASS-WITH-CAVEAT** — Behavior is acceptable but with a notable observation (minor visual quirk, slow load, intermediate flicker that resolves correctly).
   - **FAIL** — Something doesn't match. Describe exactly what you see vs what was expected.
   - **BLOCKED** — You can't execute this test (auth issues, missing data, server down). Explain why.
5. **Note observations**: Even on a PASS, note anything unusual — slow loading, console errors, visual glitches, things that work but look off.

### Generate the HTML report

After executing all test cases, write a self-contained HTML report.

**Report location:** `.context/qa-reports/qa-report-{branch-name}-{date}.html`

- Create `.context/qa-reports/` if it doesn't exist.
- Ensure `.context/` is listed in `.gitignore` (add it if missing).
- Use the branch name sanitized for filenames (replace `/` with `-`).
- Date format: `YYYY-MM-DD-HHmm`.

**Report format — match this layout exactly.** It is the canonical QA report style: card-based, CSS-variable-driven, with a 5-card summary header (Total / Passed / Pass w/ caveat / Failed / Blocked) and per-test sections using `Customer / Asset` → `Method` → `Findings` → `Screenshots` labels. The HTML must be self-contained: inline all CSS and embed screenshots as base64 data URIs so the file opens standalone.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>QA Report — {branch-name}</title>
    <style>
      :root {
        --bg: #f9fafb;
        --card-bg: #ffffff;
        --border: #e5e7eb;
        --text: #111827;
        --muted: #6b7280;
        --code-bg: #f3f4f6;
      }
      * {
        box-sizing: border-box;
      }
      body {
        font:
          14px/1.5 -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          system-ui,
          sans-serif;
        color: var(--text);
        background: var(--bg);
        margin: 0;
        padding: 24px;
      }
      .container {
        max-width: 1100px;
        margin: 0 auto;
      }
      header {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 24px;
        margin-bottom: 24px;
      }
      header h1 {
        margin: 0 0 8px;
        font-size: 22px;
      }
      header .meta {
        color: var(--muted);
        margin-bottom: 16px;
      }
      .summary {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }
      .summary-card {
        flex: 1;
        min-width: 140px;
        padding: 16px;
        border: 1px solid var(--border);
        border-radius: 6px;
        text-align: center;
        background: #fafafa;
      }
      .summary-card .num {
        font-size: 28px;
        font-weight: 600;
      }
      .summary-card .label {
        font-size: 12px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .test {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 16px;
      }
      .test-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }
      .test-id {
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-weight: 600;
        font-size: 14px;
        color: var(--muted);
      }
      .test-title {
        font-size: 16px;
        font-weight: 600;
        flex: 1;
      }
      .badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 4px;
        color: white;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }
      .test-section {
        margin-top: 12px;
      }
      .test-section-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--muted);
        font-weight: 600;
        margin-bottom: 4px;
      }
      .test-section-content {
        font-size: 14px;
      }
      code,
      .test-section-content code {
        background: var(--code-bg);
        padding: 1px 5px;
        border-radius: 3px;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-size: 12.5px;
      }
      .screenshots {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
        gap: 12px;
        margin-top: 12px;
      }
      .screenshot {
        border: 1px solid var(--border);
        border-radius: 6px;
        overflow: hidden;
        background: #fafafa;
      }
      .screenshot img {
        display: block;
        width: 100%;
        height: auto;
      }
      .screenshot .caption {
        padding: 8px 10px;
        font-size: 12px;
        color: var(--muted);
        border-top: 1px solid var(--border);
        background: white;
      }
      footer {
        margin-top: 32px;
        padding: 16px;
        text-align: center;
        color: var(--muted);
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <h1>QA Report — {branch-name}</h1>
        <div class="meta">
          Branch: <code>{branch-name}</code> &middot; Date: {YYYY-MM-DD HH:MM}
          &middot; Tester: {tester-email-or-name}
        </div>
        <div class="summary">
          <div class="summary-card">
            <div class="num">{total}</div>
            <div class="label">Total tests</div>
          </div>
          <div class="summary-card" style="border-color:#10b981">
            <div class="num" style="color:#10b981">{passed}</div>
            <div class="label">Passed</div>
          </div>
          <div class="summary-card" style="border-color:#f59e0b">
            <div class="num" style="color:#f59e0b">{caveat}</div>
            <div class="label">Pass w/ caveat</div>
          </div>
          <div class="summary-card" style="border-color:#ef4444">
            <div class="num" style="color:#ef4444">{failed}</div>
            <div class="label">Failed</div>
          </div>
          <div class="summary-card" style="border-color:#6b7280">
            <div class="num" style="color:#6b7280">{blocked}</div>
            <div class="label">Blocked</div>
          </div>
        </div>
      </header>

      <!-- Repeat one <section class="test"> per test case -->
      <section class="test">
        <div class="test-header">
          <span class="test-id">TC-01</span>
          <span class="test-title">{test title}</span>
          <span class="badge" style="background:#10b981">PASS</span>
        </div>
        <div class="test-section">
          <div class="test-section-label">URL</div>
          <div class="test-section-content">
            <a href="{full-url}" target="_blank" rel="noopener"
              ><code>{full-url}</code></a
            >
          </div>
        </div>
        <div class="test-section">
          <div class="test-section-label">Customer / Asset</div>
          <div class="test-section-content">
            {customer name and asset/group context — what was the test
            environment}
          </div>
        </div>
        <div class="test-section">
          <div class="test-section-label">Method</div>
          <div class="test-section-content">
            {what the testing agent actually did — concrete steps, any
            throttling or interception used, navigation path, inline
            <code>code</code> for selectors/URLs/values}
          </div>
        </div>
        <div class="test-section">
          <div class="test-section-label">Findings</div>
          <div class="test-section-content">
            {what was observed and why it passes/fails — reference the expected
            outcome from the plan, note any caveats}
          </div>
        </div>
        <div class="test-section">
          <div class="test-section-label">Screenshots</div>
          <div class="screenshots">
            <div class="screenshot">
              <img src="data:image/png;base64,{...}" alt="{caption}" />
              <div class="caption">
                {short caption — what the screenshot shows}
              </div>
            </div>
            <!-- additional screenshots as siblings inside .screenshots -->
          </div>
        </div>
      </section>

      <footer>
        Generated by frontend-qa skill — agent-browser{, plus any extras like
        CDP Fetch interception}.<br />
        Test artefacts: <code>.context/qa-reports/screenshots/</code>{, helper
        scripts: <code>.context/qa-scripts/</code> if used}
      </footer>
    </div>
  </body>
</html>
```

**Status badge colors (use inline `style="background:#..."`):**

- `PASS` → `#10b981` (green)
- `PASS-WITH-CAVEAT` → `#f59e0b` (amber)
- `FAIL` → `#ef4444` (red)
- `BLOCKED` → `#6b7280` (gray)

**Per-test layout rules:**

- Always include `URL`, `Customer / Asset`, `Method`, `Findings`, `Screenshots` sections in that order. The `URL` must be a complete clickable link (with origin) so the user can open it and reproduce the test. Omit a section only if genuinely empty (e.g., a test with no screenshots).
- Use inline `<code>` for URLs, selectors, UUIDs, query params, function names, and short literal values. It keeps findings scannable.
- Section labels are uppercase, letter-spaced, muted — never restyle them.
- Screenshots go in the `.screenshots` grid; do not stack them in a single column.

**Screenshot captions — required, one per screenshot.** A caption is a short _explainer_, not a label. The reader should be able to glance at the image + caption and instantly understand what they're seeing without reading the surrounding test prose. Aim for 8–20 words.

A good caption answers at least two of:

- What state is shown? (e.g. "debugger toggle ON", "empty state", "after submit")
- What page or component? (e.g. "/settings/profile, Super Admin Settings card")
- What's notable in this frame? (e.g. "Bug icon and orange Switch present", "Subscription Debugger row absent")

Do NOT write captions that just restate the test ID, the test title, or the file name — those add nothing. Bad: "TC-01 screenshot 1". Good: "Admin dropdown open — orange `Subscription debugger` row with Bug icon visible above Log out."

Use inline `<code>` inside captions for literal labels, URLs, or key names — same as in `Findings`.

- Keep each `Findings` block to 1–4 sentences. If there's deeper detail, put it in a follow-up paragraph inside the same `test-section-content` rather than a new section.

**Do not deviate from the layout.** No collapsibles (`<details>`/`<summary>`), no tabs, no extra columns, no theming swaps. The format is intentionally narrow and stable so reports compare cleanly across branches.

### Report delivery

After the testing agent finishes and you have the report:

- Open the report in a `/browser` session that is headed so the user can see the result, and tell them where the file is saved (the path within the project).
- A quick tally: X passed, Y caveat, Z failed, W blocked.
- For each test case, the **full URL** the test ran against, so the user can open it and re-validate the same scenario themselves.
- For any failures, a one-line summary of what went wrong.

If there are failures, give your best assessment of whether they look like genuine bugs, environment/data issues, or possible flakiness.
