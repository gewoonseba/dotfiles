---
name: create-html-doc
description: Render the current discussion (a plan, walkthrough, analysis, or proposal) as a self-contained HTML document with consistent styling. Use when the user wants the output as a readable HTML file rather than chat or markdown — e.g. "render this as html", "make a html doc for this", or "/html".
argument-hint: "Optional: a title or specific focus for the document"
---

Render the current discussion as a self-contained HTML file.

## Where to write

- Always write to `.context/<short-kebab-slug>.html` in the current working directory.
- Create `.context/` if it doesn't exist.
- Pick a slug from the topic (e.g. `energy-cost-page-walkthrough.html`, `auth-rewrite-plan.html`). Do not include a timestamp unless the user asks for one.
- If a file with that slug already exists, overwrite it only when this output is a revision of the same document; otherwise pick a more specific slug.

## What to produce

A single `.html` file. No external CSS, no external JS, no remote assets. Open-with-`open` works offline.

Use the boilerplate at `template.html` (next to this `SKILL.md`) as the starting point. It already provides:

- Light theme with the project's typography conventions
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
- Only use emojis if the user explicitly asks.

## After writing

- Use `SendUserFile` to surface the file to the user with a one-line caption summarising what changed (especially when this is a revision).
- Mention the `open .context/<slug>.html` command if it helps.
