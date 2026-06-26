---
version: beta
name: Companion
description: >
  Design language for the Companion.energy product. The source of truth for the
  foundation: colour, surfaces, interaction, and typography. Built in OKLCH on
  Tailwind v4's gray palette.

  The frontend lives at `services/frontend/src`. Tokens are wired up in
  `services/frontend/src/index.css` via Tailwind v4 `@theme` (+ a few
  `@utility` classes for the type roles and the interaction state-layer).
  Single-purpose tokens are scoped to a Tailwind namespace (`--text-color-*`,
  `--background-color-*`, `--border-color-*`) so they generate only the utility
  that makes sense; multi-use intent families stay universal on `--color-*`.
model:
  elevation: lightness          # closer to you is lighter
  interaction: composited overlay # one translucent layer on any fill
  colour: meaning only          # gray surfaces; hue signals intent
  type: locked roles            # 12 roles, two weights, raw text-* removed
colors:
  # neutrals come from Tailwind `gray` (OKLCH)
  text-primary: "gray-950"
  text-secondary: "gray-600"
  text-tertiary: "gray-400"   # low-contrast: input placeholders + decorative only
  page: "gray-100"
  surface: "#ffffff"
  inset: "gray-50"
  overlay: "gray-100 / 10%"
  border: "gray-300"
  border-soft: "gray-100"
  state-hover: "gray-200 / 20%"
  state-active: "gray-200 / 30%"   # pressed AND selected — one engaged state
  ring: "brand"
  interactive: "gray-900"
  interactive-soft: "gray-200"
  brand: "#5d5fef"
  brand-soft: "indigo-50"
  success: "green-600"
  success-soft: "green-50"
  warning: "amber-600"
  warning-soft: "amber-50"
  danger: "red-600"
  danger-soft: "red-50"
  info: "blue-600"
  info-soft: "blue-50"
  neutral: "gray-500"
  neutral-soft: "gray-200"
typography:
  # role: px / line-height / weight / tracking
  heading-xl: "30 / 36 / 500 / -0.02em"
  heading-lg: "24 / 32 / 500 / -0.02em"
  heading-md: "20 / 28 / 500 / -0.015em"
  heading-sm: "16 / 24 / 500 / -0.01em"
  body-lg: "16 / 24 / 400"
  body: "14 / 20 / 400"
  body-sm: "12 / 16 / 400"
  label: "14 / 20 / 500"
  label-sm: "12 / 16 / 500"
  eyebrow: "12 / 16 / 500 / +0.07em / uppercase"
  mono: "13 / 20 / 400 / tabular"
  mono-sm: "12 / 16 / 400 / tabular"
radius:
  sm: 4px      # inputs & controls
  md: 6px      # cards & menus
  lg: 8px      # dialogs & hero surfaces
  full: 9999px # pills & avatars
---

# Companion

## Overview

The foundation rests on four ideas. Each is enforced at build time, so the
wrong choice is a no-op rather than a wrong-but-plausible result.

1. **Elevation is lightness.** Surfaces form a ladder from darker (back) to
   lighter (front): a dialog sits lighter than a card sits lighter than the
   page. Depth comes from the ramp, not a pile of shadows.
2. **Interaction is a layer, not a colour.** Hover, press and select are one
   translucent overlay (`state-layer`) composited *on top of* whatever fill is
   beneath — so the same tokens read correctly on a white card, an inset,
   or a solid brand button.
3. **Colour carries meaning.** Neutrals come from Tailwind's `gray` scale
   (OKLCH); hue appears only as the brand or a status intent, so the greys stay
   out of the way.
4. **Typography is a locked set of roles.** 12 roles, two weights (400 / 500).
   Each role is one class bundling size + line-height + weight + tracking. Raw
   `text-sm` / `font-bold` no longer compile.

These tokens are for **UI chrome**. Data visualisations (ECharts) use a
separate system — see [Chart colors](#chart-colors).

### Token namespaces (build-time enforcement)

- **Text colour** (`primary` / `secondary` / `tertiary`) → `text-*` only.
- **Surfaces** (`page` / `surface` / `inset` / `overlay`) and the **state
  layer** (`hover` / `active` / `selected`) → `bg-*` only.
- **Lines** (`border` / `border-soft`) → `border-*` / `divide-*` / `outline-*` /
  `ring-*` only — never `bg-` or `text-`.
- **Type roles** → font-size utilities only; the raw `text-xs…9xl` scale is
  cleared (`--text-*: initial`).
- **Intent families** (`interactive`, `brand`, `success`, `warning`, `danger`,
  `info`) and `neutral` stay universal — they map sensibly onto text, bg,
  border and ring.

A cross-namespace combination like `bg-primary`, `text-surface`, or
`border-page` produces no CSS — broken styling shows up immediately.

## Surfaces — the elevation ladder

Surfaces are an opaque ladder ordered by lightness. `bg-*` only.

| Token | Value | Use |
|---|---|---|
| `bg-page` | `gray-100` | The page / app background — the floor, behind every card. |
| `bg-surface` | white | Cards, popovers, dialogs, sheets, inputs — the working surface; floats brighter than the page. Floating things (popover/dialog) are `bg-surface` + a shadow. |
| `bg-inset` | `gray-50` | A recess *within* a surface: well, inset, code well, table header — a faint step down from white (lighter than the page, darker than a card). |

**Overlay** — `bg-overlay` (`gray-100` at 10%) is the modal scrim, applied
through one shared `ModalOverlay` (`components/ui/overlay.tsx`) with a standard
`backdrop-blur-md`. Don't hand-write a `DialogPrimitive.Overlay`.

`inset` is the recess token — wells, table headers, code wells. At `gray-50` it
reads as a faint recess against the white `surface` it sits in (one step down
from white), while `page` is the darker `gray-100` behind every card. So the
three tones, lightest to darkest, are surface (white) → inset (gray-50) → page
(gray-100). (The old `surface-soft` alias is gone — use `bg-inset`.)

## Interaction — the state layer

Hover / press / select is a single translucent overlay, composited on top of
the element's own fill and beneath its content. Add the **`state-layer`**
utility to any interactive element (filled *or* transparent) and it picks up:

- **hover** — `:hover`, `[data-highlighted]`, `[data-selected="true"]` → `--background-color-hover` (`gray-200 / 20%`)
- **engaged** — `:active` (pressed) AND `aria-selected` / `data-[state=on|open|active|checked|selected]` → `--background-color-active` (`gray-200 / 30%`)

The overlay is a **light tint** (`gray-200`): it lifts saturated fills
(brand / danger buttons) toward lighter on interaction and reads as a soft gray
on neutral surfaces — one token across filled and transparent elements. Press
and selected are deliberately the same "engaged" overlay (no separate `selected`
token).

```tsx
// A row, a ghost button, a menu item, a solid brand button — all the same:
<div className="state-layer …">…</div>
<button className="state-layer bg-brand text-white">Save</button>
```

Variants carry **only a fill** — never a hover. For JS-driven highlight state
(e.g. a custom listbox tracking `hoveredIndex`) apply the tokens directly:
`bg-hover` / `bg-active` / `bg-selected`. **Focus is separate** — a brand ring
(`focus-visible:ring-2 ring-ring`), not part of the fill overlay. **Disabled**
is `opacity-50` + `cursor-not-allowed`.

## Lines — `border` / `border-soft`

Opaque Tailwind gray — a line reads identically on white, page, inset and
tinted fills (a translucent border composites darker over grey, which is what
made one card show three different "separator" colours). Two weights only.
`border-*` / `divide-*` / `outline-*` / `ring-*` only.

| Token | Value | Use |
|---|---|---|
| `border` / `border-default` | `gray-300` | Default hairline — card / input / popover edges, separators. The bare `border` utility uses this. |
| `border-soft` | `gray-100` | Internal dividers between rows inside a card (`divide-soft` for a `divide-y` list). |

A separator drawn as a **fill** (e.g. a `gap-px` grid showing the parent through
the gaps) uses `bg-neutral-soft` (`gray-200`), since the line tokens are scoped
to `border-*`/`divide-*` and aren't available as `bg-`.

**Single-edge ownership for table rows.** A divider between two rows belongs to
exactly one of them — every row owns only its **bottom** edge, every cell owns
only its **right** edge, and **no row draws a top or left border**. Two adjacent
rows therefore never both paint the shared edge (which stacks to a doubled,
muddy 1–2px line). The seam above the **first** row is owned by the table
header's bottom divider, not by the row — so the header carries the strong line
there (FastTable's `headerDividerStrong`) and the first row stays top-borderless.
In the hierarchical table only **top-level (L1) category** boundaries are strong
(`border-default`) — an L1 header, or the row that closes one category before
the next begins; every inner boundary (L2/L3 sub-group headers, leaf-to-leaf)
is soft (`border-soft`), so the major categories read as separated blocks while
their contents stay quiet. See
`components/ui/table/hierarchical-tree/row-class-name.ts`.

Intent lines come in two solid weights, never opacity: **solid**
`border-{intent}` (the 600 fill — invalid inputs, focus borders, checkboxes,
active-tab underlines) and **soft** `border-{intent}-soft` (the family-200 shade
— the quiet edge of a soft callout / badge / alert). Same names in the `ring-*`
namespace (`ring-{intent}-soft` for selected-card / status-dot halos). **No
opacity modifiers on any line** (`border-danger/30` is gone) and no
`border-strong`.

## Text — `primary` / `secondary` / `tertiary`

| Token | Value | Use |
|---|---|---|
| `text-primary` | `gray-950` | Body, headings, prominent labels — the default. |
| `text-secondary` | `gray-600` | Labels, captions, helper copy, table cells, metadata, timestamps — **all readable de-emphasised text**. |
| `text-tertiary` | `gray-400` | **Low contrast — input placeholders and decorative marks ONLY** (faint separators/glyphs, icon tints). Never for content. |

The ramp runs 950 / 600 / 400. `text-tertiary` is deliberately low-contrast: use
it **only** for input placeholders (`placeholder:text-tertiary`) and decorative
marks — anything a user needs to read steps up to `text-secondary`. (Disabled
state is `opacity-50`, not tertiary.) **Never fake a text shade with opacity**
(`text-primary/70`); step on the ramp instead. Inline interactive text:
`text-secondary hover:text-interactive`.

## Colour families

`brand` (primary CTAs) plus four status intents, each with a solid and a soft.
Pattern: `bg-{family} text-white` for solid, `bg-{family}-soft text-{family}
border-{family}-soft` for soft. Because the ramp is OKLCH, white-on-solid clears
WCAG AA on every intent at once.

| Token | Value | Use |
|---|---|---|
| `bg-brand` | `#5d5fef` | Primary CTA — the single most important action. |
| `bg-brand-soft` | `indigo-50` | Soft CTA, brand-tinted callouts, premium pills. |
| `bg-success` / `-soft` | `green-600` / `green-50` | Delivered / healthy / online. |
| `bg-warning` / `-soft` | `amber-600` / `amber-50` | Estimated / pending / caution. |
| `bg-danger` / `-soft` | `red-600` / `red-50` | Destructive, failed, invalid. |
| `bg-info` / `-soft` | `blue-600` / `blue-50` | Delayed, neutral notice. |

- **`interactive`** (`gray-900` / `gray-200`) — the solid fill for neutral
  stateful controls (Switch on, Checkbox checked, Progress fill); `-soft` is the
  off/track state.
- **`neutral`** (`gray-500` / `gray-200`) — decorative grey fill and
  form-control accents (`accent-neutral`, `bg-neutral/10`). `bg-`/`accent-` only,
  never borders.

Use `<Callout intent="…">` and `<Badge variant="…">` instead of hand-rolling the
soft pattern. `<Card>`, `<Alert>`, `<Dialog>` etc. are already on-system.

## Buttons

`<Button>` composes three independent axes — emphasis, colour, size — so there's
no exploding variant list.

- **`variant` (required, no default)** — the emphasis level, so every button is a
  deliberate choice (no accidental primaries):
  - `primary` — solid brand. The one main action on a view.
  - `secondary` — neutral outline. Supporting actions, dialog Cancel.
  - `tertiary` — neutral ghost. Low-emphasis / icon actions.
  - `link` — inline text link.
- **`intent`** — colour. Default is brand-for-`primary`, neutral-for-the-rest;
  `intent="destructive"` recolours **any** variant to red, including the
  hover/active overlay (solid lightens the red fill; outline/ghost tint red). It's
  the only intent — there's no warning/success button.
- **`size`** — `default` (36px) or `sm` (28px), from the shared `--spacing-control`
  tokens (see Control sizing). No `lg`.

```tsx
<Button variant="primary">Save changes</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="tertiary" intent="destructive"><Trash2 /></Button>   // destructive icon
<Button variant="primary" intent="destructive">Delete</Button>        // destructive CTA
```

**Icons** are auto-spaced — pass an icon (and optional text) as children and the
button tightens the icon's side; an icon-only button squares itself (36/28). The
button sizes the icon itself (16px), so pass a **bare `<Icon />`** — no `h-4 w-4`,
no margins. Interaction is the shared `state-layer`. Don't hand-roll a destructive button with `text-danger
hover:bg-danger/10` — use `intent="destructive"`.

## Control sizing — one shared height

Buttons and input-like controls (`Input`, `Select`, `MultiSelect`, the date
picker, filter chips, table filter inputs) all draw their height from a single
pair of tokens, so they line up exactly when sat next to each other in a form
row or toolbar:

| Token | Value | Generates |
|---|---|---|
| `--spacing-control` | `2.25rem` (36px) | `h-control`, `size-control`, `min-h-control`, … |
| `--spacing-control-sm` | `1.75rem` (28px) | `h-control-sm`, `size-control-sm`, … |

They live in the `--spacing-*` namespace, so each value auto-generates the full
set of sizing utilities. **To resize every control at once, edit those two lines
in `index.css` — nothing else.** Buttons use `h-control` / `h-control-sm` (and
`size-control*` for icon-only squares); inputs/selects/datepicker use `h-control`.
Only the **height** is tokenised — horizontal padding stays literal and is tuned
per control (buttons `px-4`, inputs/selects `px-3`); a leading/trailing icon
tightens its own side. The Toggle keeps its own default/sm/lg scale and is
intentionally not on these tokens.

Because the names are custom, they're registered in the `h` / `w` / `size` /
`min-h` groups of the `tailwind-merge` config (`lib/utils.ts`) — without that,
`cn()` couldn't dedupe `h-control` against another height, and an icon-only
button's `size-control` wouldn't override the base `w-fit`. Add new control-size
tokens there too.

## Typography — 12 locked roles

Each role is one class (an `@utility`) bundling size + line-height + weight +
tracking (+ mono family / uppercase where the role needs it). Hierarchy rides
size and tracking, with two weights only: **500** (heading + label) and **400**
(body + mono). Raw `text-{size}` / `font-{weight}` are removed from the theme.

| Family | Roles |
|---|---|
| **Heading** (500, tight) | `text-heading-xl` 30/36 · `-lg` 24/32 · `-md` 20/28 · `-sm` 16/24 |
| **Body** (400) | `text-body-lg` 16/24 · `text-body` 14/20 *(workhorse)* · `text-body-sm` 12/16 |
| **Label** (500) | `text-label` 14/20 · `text-label-sm` 12/16 · `text-eyebrow` 12/16 (+tracked, uppercase) |
| **Mono** (400, tabular) | `text-mono` 13/20 · `text-mono-sm` 12/16 |

`text-body` (14 / 20) is the **app-wide default** — applied on `body`, so any
untagged text inherits it; the other roles override per element. `text-body` and
`text-label` cover most text. Use `text-mono` for numbers and code so figures
align. Don't set font-size / weight / tracking by hand — pick a role.

A role and a text colour compose freely — `cn('text-heading-lg text-primary')`
keeps both. (The roles are registered as a font-size class group in the
`tailwind-merge` config in `lib/utils.ts`; without that, `cn()` would treat a
role and a `text-*` colour as the same group and silently drop the role. So when
you **add a new type role**, also add it to that list.)

## Layout — spacing & radius

Spacing follows a 4px scale. Keep a three-step rhythm: ~8px inside a group, 16px
between groups, 32–40px between sections; cards pad 24px (16 compact, 32 hero).

Radii are tight: **sm 4** (inputs, controls) · **md 6** (cards, menus) ·
**lg 8** (dialogs, hero) · **full** (pills, avatars). Keep one radius family per
view. (Rounder radii read as less professional without broader layout changes.)

## Do's and don'ts

- **Do** let lightness + shadow carry elevation. `bg-surface + shadow-sm` = card;
  `bg-surface + shadow-md` = popover; both float over the darker `bg-page`.
- **Do** add `state-layer` to every interactive element rather than a bespoke
  `hover:bg-…`. One overlay, every element.
- **Do** pair `bg-{family}-soft` with `text-{family}`, and `text-white` with a
  solid `bg-{family}`.
- **Do** pick a type role; never set raw size / weight / tracking.
- **Don't** reach for raw Tailwind shades (`bg-gray-50`, `text-blue-600`,
  `border-red-200`) — there is a semantic token. Raw shades survive only inside
  `components/ui` where a primitive genuinely needs one, plus the documented
  exceptions (asset-type brand palette, categorical org-type icons, chart code).
- **Don't** use a fill token as a border (`border-neutral`) — gray borders use
  `border` / `border-soft`.
- **Don't** reach for `bg-primary`, `text-surface`, `border-page`, or a raw
  `text-2xl` — they compile to nothing.
- **Don't** invent a sixth surface or a third weight.

## Adding a token

Rare — the system is intentionally small. Before adding one: is the use case
truly new; does it fit a vocabulary (text hierarchy / surface ladder / family
default+soft / type role); is it semantically distinct? If yes to all, define it
in `index.css` under `@theme`, document it here, and commit as
`feat(design): add …` with a one-paragraph rationale. **A new typography role
also needs registering** in the `tailwind-merge` font-size group in
`lib/utils.ts`, or `cn()` will drop it when it's paired with a text colour.

## Known follow-ups (not in this baseline)

- **Dark mode** — the model supports it (elevation = lightness works in both
  directions); the token table just needs dark values. Deliberately deferred.
- **Legacy shadcn HSL vars** (`--background`/`--muted`/`--input`) — still present,
  used only by `ring-offset-background` and the scrollbar styles; removable once
  those migrate.
- **Categorical / debug colours** — org-type icons (purple / teal) and the
  `text-orange-400` feature-override debug markers are intentional exceptions,
  not status intents.

## Chart colors

The tokens above are for **UI chrome**. **Data visualisations are a separate
system.** ECharts needs concrete hex it can manipulate (hover emphasis,
gradients); CSS custom properties and OKLCH blank out ECharts' hover bars. Chart
colour lives in `services/frontend/src/lib/chart-colors/` and is the source of
truth for every chart.

**Never** hardcode hex / rgb / named colours in chart code, and **never** use the
UI tokens for ECharts series — reach for a chart-colour accessor.

### Layers

| Module | Use |
|---|---|
| `primitive.ts` — `chartColor(family, shade=500)` | Raw layer: a pinned snapshot of the Tailwind **v3** hex palette. Families `red…gray`, shades `200–600`. |
| `flow-direction.ts` | Energy flow: consumption = blue, injection = purple, self-consumption = pink. `getCostDirectionColor('cost'\|'revenue')`. |
| `status.ts` — `getStatusColor('positive'\|'negative')` | Sentiment: positive = green, negative = red. |
| `categorical.ts` — `getCategoricalColor(i)` / `getCategoricalColorByName(name)` | One colour per distinct thing; default ECharts cycle. |
| `access-power.ts` — `getAccessPowerColor()` | Grid access-power limit line. |

### Rules

- **Red, green and emerald are reserved for `status`** — the categorical palette
  excludes them so an arbitrary series never reads as good/bad.
- **Multi-series charts must set colours** — per-series via an accessor, or
  `color: BaseCommonEChartOptions.color` for the categorical cycle. Neither set →
  ECharts' off-system `#5470c6…` fallback.
- **Chrome stays neutral.** Axis lines, tooltip/legend borders and dataZoom
  fillers aren't data colours; leaving them as `AXIS_COLOR` / neutral rgb is fine.
