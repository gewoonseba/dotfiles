---
name: jt-frontend-dev
description: >
  Develop frontend (React/TypeScript/Tailwind) code in the Jolteon monorepo using the locked color
  token system. Use this skill ANY time the user is writing, editing, scaffolding, or thinking about
  frontend code under `services/frontend/src` — building components, pages, forms, modals, charts,
  layouts, or any UI element. Also trigger when the user mentions Tailwind classes, styling,
  className, theming, colors, surfaces, badges, callouts, buttons, or any visual concern in the
  frontend. Also trigger on "add a component", "build a page", "style this", "create a modal",
  "make a button", "add a callout", "frontend feature", or similar requests. This skill enforces
  the design tokens documented in DESIGN.md — agents writing frontend code without it will
  consistently reach for raw Tailwind shades and shadcn legacy tokens that were removed in the
  May-2026 color migration.
---

# Jolteon Frontend Development

You are writing or editing frontend code in the Jolteon monorepo. The frontend lives at
`services/frontend/src` (React 19 + TypeScript + Tailwind v4 + shadcn/ui patterns + TanStack Query
+ Zustand + Radix primitives).

## Source of truth: DESIGN.md

The design language — specifically the color token system — is defined in
[`DESIGN.md`](../../DESIGN.md) at the repo root. **Read it before writing any color-bearing
classNames.** It is the normative spec: 20 semantic tokens, three vocabularies, one rule.

When in doubt about which token to use, the "Quick reference" section near the bottom of DESIGN.md
maps every common UI intent to its canonical token.

## The non-negotiables

These come from the May-2026 color-system migration. The codebase was swept of ~1,300 raw-Tailwind
call sites and most shadcn legacy tokens. New code that reintroduces them is a regression.

### Never use these (they were intentionally removed)

| ❌ Don't use | ✅ Use instead |
|---|---|
| `text-foreground` | `text-primary` |
| `text-muted-foreground` | `text-secondary` |
| `bg-card`, `bg-popover`, `bg-background`, `bg-white` | `bg-surface` |
| `bg-muted`, `bg-accent`, `bg-secondary` | `bg-surface-soft` |
| `bg-gray-50`, `bg-gray-100` (as fills) | `bg-surface-soft` or `bg-page` |
| `border-gray-200`, `border-gray-300`, `border-input` | bare `border` (gray is the default) |
| `border-gray-100`, `border-border/40` | `border-soft` |
| `text-gray-400/500/600/700/900` | `text-tertiary` / `-secondary` / `-primary` |
| `bg-companion`, `text-companion`, `border-companion` | `bg-brand`, `text-brand`, `border-brand` |
| `bg-destructive`, `text-destructive` | `bg-danger`, `text-danger` |
| `bg-primary`, `border-primary`, `text-primary` (in the OLD shadcn meaning of "interactive emphasis") | `bg-interactive`, `border-interactive`, `text-interactive` |
| Hand-rolled `bg-red-50 text-red-700 border-red-200 …` callouts | `<Callout intent="…">` |

If you find yourself reaching for a raw `text-gray-N`, `bg-gray-N`, `border-gray-N`, or any of the
shadcn legacy tokens above — stop. The right token exists in DESIGN.md.

### The cheat sheet

```
Page bg (app shell)                        bg-page
Card / popover / dialog / input / sheet    bg-surface
Hover row / well / table stripe            bg-surface-soft

Body text                                  text-primary
Label / caption / helper                   text-secondary
Placeholder / disabled                     text-tertiary

Outer border                               border           (no colour utility needed)
Internal divider inside a card             border-soft

Primary CTA                                bg-brand text-white  hover:bg-brand/90
Soft / secondary CTA                       bg-brand-soft text-brand
Destructive action                         bg-danger text-white
Status pill (soft)                         bg-{intent}-soft text-{intent}
Status pill (filled)                       bg-{intent} text-white

Switch on / Slider range / Progress fill   bg-interactive
Switch off / Slider track / Progress track bg-interactive-soft
Focus ring / Checkbox / Slider thumb       ring-interactive / border-interactive
Active tab underline                       border-b-interactive
```

## Shared components — use them, don't rebuild them

The codebase has a rich `components/ui/` library following shadcn patterns. Before building a
custom version of a common primitive, check what already exists:

| Need | Reach for |
|---|---|
| Status pill / label badge | `<Badge intent="success\|warning\|danger\|info\|brand\|neutral">` |
| Inline status banner | `<Callout intent="info\|success\|warning\|danger\|brand">` |
| Primary action | `<Button variant="default">` (default = `bg-brand`) |
| Destructive action | `<Button variant="danger">` |
| Secondary / ghost / outline / link | `<Button variant="secondary\|ghost\|outline\|link">` |
| Card | `<Card>`, `<CardHeader>`, `<CardContent>`, `<CardFooter>` |
| Modal / dialog | `<Dialog>` (Radix-based) |
| Popover | `<Popover>` |
| Tooltip | `<Tooltip>` |
| Tabs | the `tabbed-layout-v2` layout |
| Form | `<FormWrapper>` + `<FormFieldWrapper>` + react-hook-form + zod |
| Dropdown menu | `<DropdownMenu>` |
| Command palette | `<Command>` |
| Input / Select / Multiselect / Checkbox / Switch | the matching primitive in `components/ui/` |

If the existing component doesn't quite fit, **add a variant to the shared component** rather than
creating a one-off.

## Patterns that are house style

- **Forms**: `useForm({ resolver: zodResolver(schema) })` + `<FormWrapper>` + `<FormFieldWrapper>`
  for every field. Never raw `useState` + manual validation. Reference: `SteeringOverrideCard.tsx`.
- **Data fetching**: TanStack Query, query-key factories, invalidate on mutate success.
- **i18n**: every user-facing string goes through `t()` (`react-i18next`), keys in `src/i18n/locales/en.json`.
- **Formatters**: never write inline `Intl.NumberFormat` or `toFixed()`. Use the shared formatters
  in `lib/utils.ts` (`formatPower`, `formatPercentage`), `lib/money.ts` (`formatFullCost`,
  `formatSimplifiedCost`), `lib/date.ts` (`formatDate`, `formatDateTimeDisplay`).
- **No memoization**: this project runs React 19 + React Compiler. Don't reach for `useMemo` /
  `useCallback` / `React.memo` unless protecting an *extremely* expensive computation.
- **Directory structure**: domain-specific code goes in `features/{domain}/`. The `components/`
  folder is for cross-feature primitives only.
- **Local components last**: helper components defined in the same file go after the main exported
  component.
- **Pin dependencies**: `package.json` entries use exact versions (`"1.4.3"`), never caret/tilde ranges.
- **No `'use client'`**: this is Vite + React Router, not Next.js.

## When you write color-bearing className strings

1. **Open DESIGN.md "Quick reference" first.** The mapping is short.
2. **Compose from tokens.** A typical card: `bg-surface border rounded-lg shadow-sm`.
3. **For tinted intents, always pair soft fill + saturated text.**
   E.g., `bg-warning-soft text-warning border-warning/30`.
4. **For solid intents, pair with `text-white`.**
   E.g., `bg-brand text-white hover:bg-brand/90`.
5. **For hover / selected / well — reach for `bg-surface-soft`, not raw gray.**

If you're tempted to write `border-gray-200` because the default `border` doesn't feel right, double
check — the default `border` already resolves to gray-200/300 territory and is themed for dark mode.
The migration explicitly proved that 80+ `border-gray-200` sites were redundant with the default.

## Verifying your work

Before declaring a frontend change done:

```bash
cd services/frontend
npm run tsc       # types pass
npm run lint      # lint passes (pre-commit hook runs this too)
```

If you're touching tokens, also run `npm run build` to confirm the Tailwind theme compiles.

For visual-regression-sensitive changes (anything touching primitives in `components/ui/`), spot-check
the dev server at the affected page. The high-density review files are listed in DESIGN.md.

## When to consult DESIGN.md again

- Every time you write a color-bearing className.
- Every time you introduce a Badge, Callout, Button, Card, or Alert.
- When you find yourself reaching for `bg-`, `text-`, or `border-` with a hex value, opacity hack,
  or raw Tailwind shade.
- When unsure whether an existing component already covers your use case.
