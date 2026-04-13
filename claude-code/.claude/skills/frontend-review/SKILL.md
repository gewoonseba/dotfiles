---
name: frontend-review
description: >
  Review frontend React/TypeScript code for the Jolteon monorepo. Use this skill whenever the user asks
  to review, audit, check, or critique frontend code — whether it's a PR diff, a specific file, a feature
  branch, or a set of components. Also trigger when the user mentions "review my component", "check this
  code", "code review", "PR review", "is this good React code", "audit the frontend", or wants feedback
  on React/TypeScript code quality — even if they don't explicitly say "review". If the user pastes or
  references frontend .tsx/.ts code and asks for feedback, use this skill.
---

# Frontend Code Review

You are reviewing frontend code for the Jolteon monorepo — a React 19 + TypeScript application using
TailwindCSS v4, Radix UI, shadcn/ui patterns, TanStack Query, and Zustand. The frontend lives at
`services/frontend/src`.

Your review should be constructive, specific, and actionable. Flag real issues, highlight good patterns,
and suggest concrete improvements. Avoid nitpicking formatting (Prettier handles that) or linting issues
(ESLint catches those).

---

## 1. React 19 + React Compiler: No unnecessary memoization

This project runs React 19 with the React Compiler enabled. The compiler automatically memoizes
components and values, which means **`useMemo`, `useCallback`, and `React.memo` are almost never
needed**.

When you see these in code under review, flag them as unnecessary unless the author can justify a
specific reason they're needed. The rare exceptions where manual memoization still matters:

- Extremely expensive computations inside render (e.g., processing thousands of rows for a 10-stack
  table or large chart dataset transformations) where even the compiler's heuristics may not be
  aggressive enough
- Referential equality requirements for third-party libraries that do their own shallow comparison
  outside React's rendering cycle

If the code uses `useMemo` or `useCallback`, ask: *"Is this still necessary with React Compiler? If
this is protecting an expensive computation, consider adding a comment explaining why manual
memoization is warranted here."*

---

## 2. Prefer existing reusable components

The codebase has a rich library of shared UI components in `components/ui/`. Before authors build
custom versions of common UI elements, they should check what already exists.

**Available shared components** (in `components/ui/`):

| Category | Components |
|---|---|
| **Buttons** | `button/` (Button with CVA variants, LoadButton) |
| **Forms** | `form/` (FormWrapper, FormFieldWrapper, FormActions, Stepper), `input.tsx`, `textarea.tsx`, `interval-input.tsx` |
| **Selection** | `select.tsx`, `multiselect.tsx`, `checkbox.tsx`, `radio-group.tsx`, `toggle.tsx`, `switch.tsx` |
| **Data display** | `table/` (Table with sorting/filtering), `badge.tsx`, `metric/`, `insight-card/` |
| **Feedback** | `toast/`, `spinner/`, `skeleton/`, `alert.tsx`, `Blocker.tsx`, `progress.tsx` |
| **Overlays** | `dialog/`, `modal/`, `popover/`, `tooltip/`, `dropdown/` |
| **Navigation** | `breadcrumb.tsx`, `command/`, `link/` |
| **Layout** | `card/` (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter), `accordion.tsx`, `accordion-card.tsx`, `resizable.tsx` |
| **Date/time** | `calendar/` (calendar, datepicker, reporting-interval-picker) |
| **File handling** | `dropzone.tsx`, `search.tsx`, `slider.tsx` |

**Layouts** are in `components/layouts/`:
- `ContentLayout` — standard page wrapper
- `DashboardLayout` / `AdminDashboardLayout` — dashboard shells
- `TabbedLayoutV2` — tabbed interfaces
- `Section` — content section wrapper
- `DrawerLayout` — drawer panels

**Charts** are in `components/echarts/` (including `echarts/v2/`).

When reviewing, if you see a custom button, input, badge, card, modal, select, or similar UI
primitive being created from scratch, flag it. The author should use or extend the existing shared
components instead. If the existing component doesn't quite fit, the better path is usually to add a
variant to the shared component rather than creating a one-off.

---

## 3. shadcn/ui awareness

The project's shared components follow shadcn/ui patterns — built on Radix UI primitives, styled
with TailwindCSS, and using Class Variance Authority (CVA) for variants. The `cn()` utility from
`lib/utils` handles className merging.

When reviewing custom-built components, check whether shadcn already provides a suitable alternative.
Common examples where authors reinvent what shadcn offers:

- Custom dropdown menus → use `DropdownMenu` (Radix-based)
- Custom tooltips → use `Tooltip` (already in `components/ui/tooltip/`)
- Custom dialog/modal → use `Dialog` (already in `components/ui/dialog/`)
- Custom accordion → use `Accordion` (already in `components/ui/accordion.tsx`)
- Custom select → use `Select` or `Multiselect` (already available)
- Custom command palette / autocomplete → use `Command` (already available)

If the code builds something that overlaps with a shadcn primitive, note it as an opportunity:
*"This custom component overlaps with the existing [X] in `components/ui/`. Consider using or
extending that instead — it already handles accessibility, keyboard navigation, and consistent
styling."*

---

## 4. TailwindCSS v4 styling

The project uses TailwindCSS v4. When reviewing styles:

- Prefer Tailwind utility classes over inline styles or CSS modules
- Check for hardcoded color values — they should use the design tokens defined in the Tailwind theme
- Watch for overly long className strings that could be simplified with CVA variants or extracted
  into a shared component
- Confirm that responsive breakpoints follow existing patterns in the codebase

---

## 5. Local components go at the end of the file

The codebase convention is that **local helper components** (small components used only within a
single file) are defined **at the bottom of the file**, after the main exported component.

When reviewing, if you see local components defined before the main component or scattered throughout
the file, flag it: *"Convention: move local helper components to the end of the file, after the main
exported component."*

The pattern looks like:

```tsx
// ✅ Good: main component first, local helpers at the end

export function FeaturePage() {
  return (
    <ContentLayout>
      <FeatureHeader />
      <FeatureContent />
    </ContentLayout>
  );
}

// --- Local components ---

function FeatureHeader() { ... }
function FeatureContent() { ... }
```

---

## 6. Directory structure: pages vs. features

**⚠️ FIRST CHECK — Before reviewing the code itself, always look at the file path and verify the
file is in the correct directory.** This is one of the most commonly missed issues. Apply this
decision tree:

1. **Read the file path** at the top of the file (e.g., the `// File:` comment or the path the
   user provides).
2. **Scan the imports** — Does the file import from a specific `features/{domain}/` folder (hooks,
   api, types)? If yes, this component is domain-specific.
3. **Check the component name** — Does it reference a specific business domain (e.g.,
   `AssetDetailCard`, `NominationTable`, `ForecastChart`)? Domain-specific names mean domain-specific
   code.
4. **Apply the rule**: A domain-specific component **must not** live in `components/`. It belongs
   in `features/{domain}/components/`.

**Example of a misplaced component:**

```
// File: services/frontend/src/components/AssetDetailCard.tsx  ← ❌ WRONG
import { useAssetById } from '@/features/assets/hooks/asset-hooks';
// This component imports from features/assets/ — it's asset-specific.
// It should be at: features/assets/components/AssetDetailCard.tsx  ← ✅ CORRECT
```

If you detect this, flag it as an Issue: *"This component is in `components/` but it imports from
`features/assets/` and is asset-specific. Move it to `features/assets/components/AssetDetailCard.tsx`
to follow the directory structure convention."*

The frontend follows a clear separation:

### `app/pages/{domain}/`
Page-level components that serve as **orchestrators**. They:
- Handle routing and URL parameters
- Fetch top-level data via hooks
- Compose feature components and layouts
- Are named with a `Page` suffix (e.g., `ForecastPage.tsx`)
- Wrap content in layout components like `ContentLayout`

### `features/{domain}/`
Feature-specific code organized by business domain. Each feature folder typically contains:
- `components/` — React components specific to this feature
- `hooks/` — Custom hooks (data fetching, state management)
- `api/` — API client calls, query/mutation definitions
- `charts/` — Chart components
- `utils/` — Feature-specific utilities
- `empty-state/` — Empty state placeholders
- `help/` — Help/documentation content

### `components/`
Shared, reusable components (described in sections 2-3 above). **Only truly generic, cross-feature
components belong here.** If a component imports from a specific `features/{domain}/` folder, that's
a strong signal it's domain-specific and should live in that feature's `components/` directory.

### `lib/`
Shared utilities, hooks, and helpers used across features:
- `hooks/` — Generic hooks (useBreakpoint, useLocalStorage, etc.)
- `utils.ts`, `date.ts`, `money.ts`, `strings.ts`, etc.

**What to flag during review:**

- **A domain-specific component in `components/` instead of `features/{domain}/components/`** — look
  at the imports: if it imports from `features/{domain}/hooks/` or `features/{domain}/api/`, it
  belongs in `features/{domain}/components/`, not in the shared `components/` directory
- A page component in `app/pages/` that contains heavy business logic or feature-specific components
  — those belong in `features/`
- Utility functions in a feature folder that are generic enough to live in `lib/`
- API calls defined inside components instead of in the feature's `api/` or `hooks/` folders
- Hooks defined in page files instead of the feature's `hooks/` folder

---

## 7. Additional review points

Beyond the rules above, also check for:

### Backend-first computation
This platform deals with time series data. Heavy data transformations (aggregations, filtering,
sorting) should happen on the backend (Python/Polars/SQL), not in React components. If you see the
frontend doing significant data processing that could be an API endpoint, flag it: *"This
transformation could be moved to the backend. The frontend should receive pre-computed, display-ready
data."*

### Form patterns: react-hook-form + zod + FormWrapper

All form inputs in the codebase must use the established form stack. **Never use raw `useState` +
manual validation for form fields.** The required pattern is:

1. **`react-hook-form`** with `useForm()` + `zodResolver` for state and validation
2. **Zod schemas** for validation rules (regex, length limits, refinements)
3. **`FormWrapper`** (`components/ui/form/FormWrapper`) for form structure and react-hook-form context
4. **`FormFieldWrapper`** (`components/ui/form/FormFieldWrapper`) for consistent label, description,
   error display, and required indicator on each field
5. **`FormActions`** (`components/ui/form/FormActions`) for submit/cancel buttons
6. **`Button`** (`components/ui/button/`) for all action buttons — never raw `<button>` elements

This applies everywhere: asset creation/edit steppers, config cards with inline add forms,
modal forms, and settings panels. The closest reference components are:

- `features/assets/components/forms/steps/BasicAssetInformationStep.tsx` — stepper form with
  `useForm` + `zodResolver` + `FormWrapper` + `FormFieldWrapper`
- `features/assets/components/SteeringOverrideCard.tsx` — ConfigCard with add/edit/delete using
  `FormWrapper` + `FormFieldWrapper` + zod schema inside a Modal

**What to flag:**
- Raw `useState` for form field values with manual validation in handlers — replace with
  `useForm({ resolver: zodResolver(schema) })`
- `<Input>` used directly without `FormFieldWrapper` — loses consistent label, error display,
  required indicator, and border-left error styling
- Raw `<button>` for form actions — use `Button` component
- Validation logic scattered in event handlers instead of centralized in a zod schema
- Side effects in `mutationFn` — use TanStack Query's `onMutate` lifecycle hook instead

*"This form uses raw useState + manual validation. The codebase convention is react-hook-form +
zodResolver + FormWrapper/FormFieldWrapper. See SteeringOverrideCard.tsx for the pattern with
ConfigCard forms."*

### TanStack Query patterns
- Queries should use well-structured query keys (the codebase uses query key factories)
- Mutations should invalidate relevant queries on success
- Loading and error states should be handled

### Internationalization (i18n)
All user-facing UI labels, headings, descriptions, tooltips, placeholders, button text, error messages,
and other display strings **must** use the translation system (`t()` from `i18next` or `useTranslation`
from `react-i18next`), with keys defined in `src/i18n/locales/en.json`.

Flag any hardcoded English strings in JSX or component props that should be translated. Common violations:
- Hardcoded text in JSX: `<h2>Energy Overview</h2>` → `<h2>{t("energy_overview")}</h2>`
- Hardcoded props: `placeholder="Search..."` → `placeholder={t("search")}`
- Hardcoded button labels: `<Button>Save</Button>` → `<Button>{t("save")}</Button>`
- Hardcoded tooltip/aria text: `title="Delete"` → `title={t("delete")}`

**Exceptions** — do NOT flag these as i18n issues:
- Technical identifiers, enum values, query keys, or CSS class names
- Content that comes from the API (already translated or not user-facing copy)
- Dev-only strings (console.log, error codes for debugging)

When flagging, suggest a translation key name following the existing naming conventions in `en.json`.

### Reuse existing formatters — no custom formatting logic

The codebase has a comprehensive set of shared formatting utilities. **Do not introduce custom
formatting logic when a reusable formatter already exists.** Common violations include inline
`Intl.NumberFormat` calls, manual string interpolation for units, or ad-hoc `toFixed()` formatting
that duplicates what the shared formatters provide.

**Available formatters by category:**

| Category | File | Functions |
|---|---|---|
| **Power/Energy** | `lib/utils.ts` | `formatPower(value, 'power'\|'usage')`, `formatPowerOrDash(...)`, `formatEnergyUnit(value, unit)`, `getPowerAxisFormatter(data, type)`, `createPowerAxisFormatterFromMax(max, type)` |
| **Money/Cost** | `lib/money.ts` | `formatFullCost(value, currency, unit)` (precise, for tables), `formatSimplifiedCost(value, currency, unit)` (compact, for dashboards), `formatSimplifiedCostOrDash(...)`, `getCostAxisFormatter(currency, unit)`, `getCostUnitLabel(currency, unit)`, `getCurrencySymbol(currency)` |
| **Percentages** | `lib/utils.ts` | `formatPercentage(value)`, `formatPercentageOrDash(value)`, `formatPercentageWithSign(value)` |
| **Dates** | `lib/date.ts` | `formatDate(date)`, `formatDateTimeDisplay(dateString)`, `formatDateTimeDisplayWithSeconds(dateString)`, `utcToLocalDate(dateString)`, `utcToLocalTime(dateString)`, `localToUtcIso(date, time)` |
| **UTC dates** | `lib/time.ts` | `formatUTCDate(dateString)`, `formatUTCTime(dateString)`, `formatUTCDateTime(dateString)` |
| **API dates** | `lib/utils.ts` | `formatDateWithoutTimeForAPI(date)` |
| **Chart axes** | `components/echarts/common-options.ts` | `formatInterval(interval)` — returns a date formatter for chart x-axes based on reporting interval |
| **Strings** | `lib/strings.ts` | `capitalize(str, allWords?)` |
| **Duration** | `app/admin-pages/components/integration-alert-utils.ts` | `formatDuration(firstSeen)` |

**What to flag:**

- **Hardcoded currency symbols or codes** — strings like `"€"`, `"£"`, `"CHF"`, `"EUR"`, `"GBP"`,
  or template literals embedding them (e.g., `` `€${value}` ``, `` `${value} EUR` ``). Use
  `getCurrencySymbol(currency)` for symbols, or `formatFullCost` / `formatSimplifiedCost` /
  `formatSimplifiedCostOrDash` from `lib/money.ts` for formatted values with units.
- **Hardcoded power/energy unit strings** — strings like `"kW"`, `"kWh"`, `"MW"`, `"MWh"`, `"GW"`,
  `"GWh"`, or template literals embedding them (e.g., `` `${value} kWh` ``, `` `${value} MW` ``).
  Use `formatPower(value, 'power')` for power, `formatPower(value, 'usage')` for energy, or
  `formatPowerOrDash(...)` when the value may be null/undefined.
- Inline `new Intl.NumberFormat(...)` for power, currency, or percentage values — use the shared
  formatter from `lib/utils.ts` or `lib/money.ts`
- Manual `toFixed()` + string concatenation for units like `${value.toFixed(2)} kW` — use
  `formatPower(value, 'power')`
- Custom currency formatting — use `formatFullCost` or `formatSimplifiedCost` from `lib/money.ts`
- Custom date formatting that duplicates `formatDate`, `formatDateTimeDisplay`, or the UTC formatters
- Custom chart axis formatters that duplicate `getPowerAxisFormatter`, `getCostAxisFormatter`, or
  `formatInterval`

*"This introduces custom formatting for [power/currency/date/percentage] values. The codebase has
`[formatter name]` in `[file]` that handles this — use it instead for consistency."*

*"This hardcodes a [currency symbol / power unit]. Use `[formatter name]` from `[file]` instead —
it handles unit scaling and locale formatting automatically."*

### No `'use client'` directives

This is a Vite + React Router application — **not** Next.js. The `'use client'` directive has no
effect here and is misleading. It commonly appears when copying components from shadcn/ui or other
Next.js-oriented sources.

Flag any `'use client'` or `'use server'` directives: *"This is a Vite app, not Next.js —
`'use client'` has no effect here. Remove it."*

### Pin dependency versions in package.json

Dependencies in `package.json` must use **exact pinned versions** (e.g., `"1.4.3"`), not caret
ranges (`"^1.4.3"`) or tilde ranges (`"~1.4.3"`). The team prefers to manually control when
dependencies get updated.

Flag any newly introduced caret or tilde ranges: *"Use a pinned version (`X.Y.Z`) instead of
`^X.Y.Z` — the team manually controls dependency updates."*

**Note:** Some pre-existing dependencies already use caret ranges — only flag ranges that are
**newly introduced** in the diff, not pre-existing ones.

### Import hygiene
- Imports should be at the top of the file
- Prefer named exports for components
- Use path aliases (`@/` prefix) consistently

### TypeScript quality
- Avoid `any` — use proper types
- Props should be well-typed with interfaces
- Prefer discriminated unions over optional fields when modeling state

---

## Review output format

Structure your review as follows:

1. **Summary** — One paragraph: what the code does, overall quality assessment
2. **Issues** — Concrete problems that should be fixed, ordered by severity
3. **Suggestions** — Improvements that aren't blockers but would make the code better
4. **Good patterns** — Call out things the author did well (reinforcing good habits matters)

For each issue or suggestion, include:
- The file and approximate location
- What the problem is
- A concrete suggestion for how to fix it

Keep the tone constructive. The goal is to help the author write better code, not to find fault.
