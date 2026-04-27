---
name: qa
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

This skill orchestrates two subagents in sequence and **always runs end-to-end without pausing for approval**:

1. **Planning Agent (you spawn first)** — Analyzes the git diff against `main`, understands what changed, and produces a structured testing plan.
2. **Testing Agent (you spawn immediately after planning)** — Takes the plan and executes each test case in a local browser using the `/browser` skill. Writes an HTML test report with pass/fail results, embedded screenshots, and the exact URL for each test case so the user can re-verify themselves.

You (the orchestrator) manage the handoff between these phases. Do not stop to ask for plan approval — go straight from planning to testing in one pass. The user can review the report and ask for changes after the run finishes.

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

### Hand off straight to testing

As soon as the planning agent returns the plan, move on to Phase 2 — do not pause to ask the user for approval. The user will review the report and request changes after the run completes. Make reasonable assumptions for prerequisites (default dev server URL `http://localhost:5173`, currently logged-in user/customer) and document those assumptions in the plan and the report.

## Phase 2: Execute the tests

### Spawn the Testing Agent

Immediately after Phase 1 produces the plan, spawn a subagent to run the tests. Pass the complete plan to this agent. There is no approval step in between.

The testing agent's instructions:

**Use the `/browser` skill to interact with the application.** This gives you access to `agent-browser`, which lets you control a local browser. Use `/browser` at the start of your work to load the skill and follow its instructions for navigating, clicking, typing, and taking screenshots.

For each test case in the plan:

1. **Navigate** to the specified URL using the browser.
2. **Execute each step** as described — click buttons, fill forms, interact with the UI.
3. **Take a screenshot** at key moments: after page load, after each significant interaction, and at the final state. Save screenshots to `.context/qa-reports/screenshots/` with descriptive names like `TC-01-step-2-table-loaded.png`.
4. **Evaluate the result**: Compare what you see on screen against the "Expected" outcome.
   - **PASS** — The actual behavior matches the expected outcome.
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

**Report structure:**

The HTML file should be completely self-contained — inline all CSS and embed screenshots as base64 data URIs so the file can be opened standalone without any dependencies.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>QA Report — {branch-name}</title>
    <style>
      body {
        font-family:
          system-ui,
          -apple-system,
          sans-serif;
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
        color: #1a1a1a;
      }
      h1 {
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 0.5rem;
      }
      .summary {
        background: #f8f9fa;
        padding: 1.5rem;
        border-radius: 8px;
        margin-bottom: 2rem;
      }
      .summary-stats {
        display: flex;
        gap: 2rem;
        margin-top: 1rem;
      }
      .stat {
        font-size: 1.5rem;
        font-weight: 700;
      }
      .stat.pass {
        color: #16a34a;
      }
      .stat.fail {
        color: #dc2626;
      }
      .stat.blocked {
        color: #d97706;
      }
      .test-case {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        padding: 1.5rem;
      }
      .test-case.fail {
        border-color: #fca5a5;
        background: #fef2f2;
      }
      .test-case.pass {
        border-color: #bbf7d0;
      }
      .test-case.blocked {
        border-color: #fde68a;
        background: #fffbeb;
      }
      .screenshot {
        max-width: 100%;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        margin: 0.5rem 0;
      }
      .badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.875rem;
      }
      .badge.pass {
        background: #dcfce7;
        color: #16a34a;
      }
      .badge.fail {
        background: #fee2e2;
        color: #dc2626;
      }
      .badge.blocked {
        background: #fef3c7;
        color: #d97706;
      }
      details {
        margin-top: 1rem;
      }
      summary {
        cursor: pointer;
        font-weight: 600;
      }
      .notes {
        background: #f1f5f9;
        padding: 0.75rem 1rem;
        border-radius: 6px;
        margin-top: 0.75rem;
        font-size: 0.9rem;
      }
    </style>
  </head>
  <body>
    <h1>QA Report</h1>

    <div class="summary">
      <p><strong>Branch:</strong> {branch-name}</p>
      <p><strong>Date:</strong> {timestamp}</p>
      <p><strong>Commit:</strong> {short-sha} — {commit-message}</p>
      <div class="summary-stats">
        <div><span class="stat pass">{n}</span> passed</div>
        <div><span class="stat fail">{n}</span> failed</div>
        <div><span class="stat blocked">{n}</span> blocked</div>
      </div>
    </div>

    <!-- Repeat for each test case -->
    <div class="test-case {status}">
      <h3><span class="badge {status}">{STATUS}</span> TC-01: {name}</h3>
      <p>
        <strong>URL:</strong>
        <a href="{full-url}" target="_blank" rel="noopener">{full-url}</a>
      </p>
      <p><strong>Steps taken:</strong></p>
      <ol>
        <li>{what was actually done}</li>
      </ol>
      <p><strong>Expected:</strong> {from the plan}</p>
      <p><strong>Actual:</strong> {what actually happened}</p>
      <div class="notes">{observations, console errors, etc.}</div>
      <details>
        <summary>Screenshots ({n})</summary>
        <img
          class="screenshot"
          src="data:image/png;base64,{...}"
          alt="TC-01 step 1 — page loaded"
        />
      </details>
    </div>
  </body>
</html>
```

### Report delivery

After the testing agent finishes and you have the report, tell the user:

- Where the report file is saved (the path within the project)
- A quick tally: X passed, Y failed, Z blocked
- For each test case, the **full URL** the test ran against, so the user can open it and re-validate the same scenario themselves
- For any failures, a one-line summary of what went wrong

If there are failures, give your best assessment of whether they look like genuine bugs, environment/data issues, or possible flakiness.
