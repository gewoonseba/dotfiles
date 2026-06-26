---
name: create-html-doc
description: Render the current discussion (a plan, walkthrough, analysis, or proposal) as a live, shareable Claude Artifact — a hosted HTML page on claude.ai (falling back to a self-contained local HTML file when the Artifact tool isn't available). Use when the user wants the output as a readable, shareable HTML document rather than chat or markdown — e.g. "render this as html", "make a html doc for this", "share this as an artifact", or "/html".
argument-hint: "Optional: a title or specific focus for the document"
---

Render the current discussion as a styled HTML document. The preferred output is a
**live, shareable Claude Artifact** (a hosted page on claude.ai the user can open and
share with a link). When the `Artifact` tool isn't available (e.g. Codex, Antigravity),
fall back to writing a self-contained local `.html` file.

## Publish as a Claude Artifact (primary path)

When the `Artifact` tool is available, this is the deliverable: a hosted, shareable page.

1. **Load the `artifact-design` skill first.** This is mandatory before calling `Artifact`
   — it calibrates how much design investment the request warrants.
2. **Write the content** to `.context/<short-kebab-slug>.html` (see *Where to write*). Start
   from `template.html` — it is already an Artifact-ready, content-only fragment.
3. **Call `Artifact`** with that file path and a `favicon` emoji that fits the topic (a plain
   doc → `📄`; pick something more specific when the content suggests it). Keep the favicon and
   `<title>` stable across redeploys.
4. **Give the user the returned share URL** with a one-line summary of what the doc covers.
   The artifact is private by default; the user can choose to share it with their team.

**Revising an existing artifact:** edit the same `.context/<slug>.html` file, then call
`Artifact` again with the **same file path** — it redeploys to the **same URL**. Use a new
path only when you intend a separate, new artifact.

**Artifact constraints** (the template already complies — keep them if you hand-edit):

- The file is wrapped in a `<!doctype>…<head>…</head><body>` skeleton at publish time, so the
  file must **not** contain `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>` tags of its own.
- Keep a concise `<title>` (names the browser tab and the artifact gallery entry).
- Everything must be self-contained: inline all CSS/JS, no remote fonts/scripts/images
  (a strict CSP blocks external hosts). The template's styles are already inline.
- Stay responsive: the page body must never scroll horizontally. Wide content (tables,
  `<pre>`, ASCII diagrams) must scroll inside its own container — the template's `<pre>` and
  `.ascii` already do; wrap any wide `<table>` in a `<div style="overflow-x:auto">`.

## Fallback: local HTML file (agents without the Artifact tool)

If `Artifact` isn't available, write the same content to `.context/<slug>.html` and surface it
with `SendUserFile`. The content-only template still renders correctly when opened directly in
a browser. Mention the `open .context/<slug>.html` command if it helps.

## Where to write

- Always write the source file to `.context/<short-kebab-slug>.html` in the current working directory.
- Create `.context/` if it doesn't exist.
- Pick a slug from the topic (e.g. `energy-cost-page-walkthrough.html`, `auth-rewrite-plan.html`). Do not include a timestamp unless the user asks for one.
- If a file with that slug already exists, overwrite it only when this output is a revision of the same document (this also redeploys the artifact to the same URL); otherwise pick a more specific slug.

## What to produce

A single, self-contained HTML document — no external CSS, no external JS, no remote assets.

Use the boilerplate at `template.html` (next to this `SKILL.md`) as the starting point. It is an
Artifact-ready, content-only fragment (a `<title>`, an inline `<style>`, then the page content —
no `<html>`/`<head>`/`<body>` wrapper). It already provides:

- Light theme pre-themed to the Companion design language (see *Match the design language*)
- Title block (eyebrow / h1 / lede)
- Sticky-feeling table-of-contents box at the top
- Section headings (`h2` with bottom border, `h3`, `h4`)
- `<pre><code>` for code blocks, `<code>` for inline
- `.ascii` block for ASCII diagrams (dashed border)
- `.callout`, `.callout.warn`, `.callout.good` for emphasis boxes
- `.pill` chips (variants: `.fe`, `.be`, `.del`, `.keep`, `.flag`)
- `.filelist` with `.tag` chips (variants: `add`, `mod`, `keep`, `del`, `be`, `flag`) for file-change lists
- Tables (`<table>`) styled with light borders + a soft `th` background
- A `colophon` footer for cross-references

Read it, drop in the content, save. Do not invent new visual primitives unless the content really requires them; if you do add classes, follow the existing naming and colour variables.

## Match the design language

Ground the document's look in a real design system instead of inventing a palette:

1. **Prefer the current repo's design doc.** Look for a `DESIGN.md` / `design.md` at the repo
   root or under `docs/`. If one exists, read it and remap the template's `:root` variables (and
   the intent tints) to its tokens so the doc looks native to that project.
2. **Otherwise use the bundled Companion design language** — `companion-design.md` next to this
   `SKILL.md` (a snapshot of the Companion.energy design system). `template.html` already ships
   themed to it, so the **default output is already on-brand** — no extra work needed.

When a repo `DESIGN.md` is present, translate its foundation onto the template variables:

| Design token (DESIGN.md) | Template variable |
|---|---|
| text primary / secondary | `--fg` / `--muted` |
| surface / inset | `--bg` / `--bg-soft` (+ `--code-bg`) |
| border | `--border` |
| brand / brand-soft | `--accent` / `--accent-soft` |
| success / warning / danger (600) | `--good` / `--warn` / `--bad` |
| radius sm / md / lg | the 4 / 6 / 8px radii the template already uses |

Take only the **foundation** — colour, type scale, surfaces, radii. Don't transcribe app-only
mechanics (Tailwind utilities, the `state-layer` overlay, ECharts chart colours) into a static
HTML doc; they don't apply.

## Structure (default — adapt to the content)

1. `<header class="title">` — eyebrow (branch / context tag), `h1`, one-sentence lede
2. Optional `<div class="changelog">` if this supersedes a previous version of the same doc
3. `<nav class="toc">` with anchor links to every `<section id="…">`
4. Numbered sections, one `<section>` each
5. `<footer class="colophon">` — cross-references to related plans / walkthroughs / branches

## Content rules

- Don't duplicate content captured elsewhere (plans, ADRs, issues). Link by path.
- Use `file:line` references when pointing at specific code.
- Prefer tables for comparison matrices, `<pre>` for code, `.ascii` for data-flow diagrams.
- Keep the document scannable: each section should be useful on its own.
- Only use emojis in the body if the user explicitly asks (the artifact `favicon` is separate and always set).
