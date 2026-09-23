---
name: bd-call-insights
description: >
  Scans Companion.energy business-development calls — sales calls with PROSPECTS, not existing
  customers — and records them in Notion in two stages: Stage 1 logs and summarizes each call (pain
  points, objections, questions); Stage 2 rolls those signals into recurring cross-call themes. In
  scope: discovery, intro, demo, pitch, and negotiation calls with companies that aren't customers
  yet. Out of scope: existing-customer calls (QBRs, success, renewals), partnerships, vendor demos,
  and internal or hiring meetings. Reads transcripts from Circleback and Attio, dedupes, and appends
  only new calls. Trigger on: "scan my BD calls", "what pain points came up in discovery", "pull
  objections from prospect calls", "log call insights", "what are prospects asking", "what themes are
  recurring", or a scheduled sweep. Use it whenever the user wants to capture or theme prospect-call
  signal into Notion, even without naming the databases.
---

# BD Call Insights

Turn business-development calls into a searchable, two-layer record of what customers struggle with,
push back on, and want to know.

- **Stage 1 — per call.** Every BD call becomes one row in **BD Calls** with a summary and signal
  counts, plus one row per individual signal in **BD Call Insights** (a *pain point*, *objection*, or
  *question*, with the verbatim quote and a theme tag). This is the raw, faithful record.
- **Stage 2 — themes.** Individual insights are clustered into recurring, all-time **BD Themes** —
  "Onboarding timeline concerns", "Beats our current aggregator?" — each linked to the calls and
  insights that feed it, with mention counts that grow over time. This is where patterns surface.

The three databases are linked, so from any theme you can drill into the exact calls and quotes
behind it, and from any call you can see which themes it contributed to.

## Configuration

- `LOOKBACK_DAYS`: `7`  <!-- how far back to scan for new calls; the daily sweep uses 7 for overlap safety -->
- `BD_CALL_KEYWORDS`: discovery, demo, intro, sales, prospect, pitch, proposal, negotiation  <!-- signals a prospect sales call. NOT QBR/kickoff/renewal (those are existing customers) -->
- `AUTO_WRITE`: `true`  <!-- write new rows automatically; set false to preview in chat first -->
- `THEME_MERGE_THRESHOLD`: reuse an existing theme when a new insight is substantively the same concern, even if worded differently. Only create a new theme when nothing existing fits.

## Scope — what is (and isn't) a BD call

This skill is **only** for sales calls with **prospects**: companies Companion is trying to win, at
the discovery / intro / demo / pitch / negotiation stage. Everything else is out of scope and must be
filtered out before extraction:

- **Existing customers** — QBRs, customer success, renewals, contracting, and product-feedback calls
  with companies Companion already sells to. These are the most important exclusion. Detect a customer
  by checking the call's company against **both** sources and dropping the call if it matches either:
  - the **Companion customer list** — `list_customers` on the Companion analytics MCP;
  - **Attio won/contracted deals** — `search-records` on `deals` where `stage` is a won stage
    (`7. Closed won (Contracted)`, `8. Closed won (Invoiced)`), keyed by the associated company.
- **Partnerships / channel / referral** calls (e.g. a partner exploring mutual referrals). Business
  development in the loose sense, but not prospect selling — out of scope.
- **Vendor / tooling** calls where a supplier is pitching Companion (Companion is the buyer).
- **Internal** meetings — standups, planning, board, all-hands — and **hiring** interviews.

When in doubt, the test is: *is Companion trying to sell its platform to a not-yet-customer on this
call?* If not, skip it. A prospect that later becomes a customer is in scope for the calls that
happened while they were still a prospect.

**Notion targets** (all under the *Business Development Home* page):

| Stage | Database | Data source ID |
|---|---|---|
| 1 — calls | BD Calls | `cc6f1805-9ab3-4821-9562-9cb30365536a` |
| 1 — signals | BD Call Insights | `c11e803e-e5ad-4a83-9253-68fabe0a7fad` |
| 2 — themes | BD Themes | `38558f64-e2bb-4af6-836e-66de76af8b41` |

**Scheduled run:** daily, early AM (e.g. cron `0 7 * * *`). Set this up once installed.

## Company context

Companion.energy is a B2B energy-management platform sold to utilities (Engie, Equans) and large
commercial/industrial sites. Two pillars: **PRISM** (energy insights, financial dashboard, contract
management) and **PROPEL** (flexibility optimization — batteries, heat pumps, solar, CHPs). Use this
to judge whether a signal is real and to pick the right theme category (a worry about meter-data gaps
→ *Data quality*; "how does this beat our current aggregator?" → *Competition*).

## What counts as each signal type

Classify by intent, not keyword — the three types drive different follow-up:

- **Pain point** — a problem, cost, or unmet need in the customer's *current* world, independent of
  Companion. "We spend two days a month reconciling imbalance invoices by hand."
- **Objection** — a reason *not to buy or to hesitate*, aimed at Companion's offer: price, timing,
  trust, competition, switching cost, "we'd need board sign-off", "your competitor already does X".
- **Question** — something the customer genuinely wants answered before moving forward. "Does PROPEL
  support asymmetric grid tariffs?" Rhetorical asides don't count.

A single sentence can carry more than one signal — log each separately. When something sits between a
pain point and an objection, ask what it's doing: describing today's problem (pain) or resisting the
proposed solution (objection).

## Procedure

### 1. Pull candidate calls from both sources (run in parallel)

Cover the last `LOOKBACK_DAYS`. The sources rarely fully overlap — Circleback usually holds the
richest transcripts, Attio holds calls logged against CRM records.

- **Circleback** — `SearchMeetings` over the window (and `SearchTranscripts` with `BD_CALL_KEYWORDS`
  and known prospect names). `GetTranscriptsForMeetings` for the full text of the calls that survive
  the scope filter below.
- **Attio** — `search-call-recordings-by-metadata` for recent recordings and
  `semantic-search-call-recordings` for prospect/sales topics; `get-call-recording` for the
  transcript. Use the linked company/people to identify the counterpart.

For every candidate capture a stable **Call ID** (Circleback meeting ID or Attio recording ID), title,
date, counterpart company, rep/owner, and source link.

### 1a. Apply the scope filter (do this before pulling full transcripts)

Fetch the exclusion set **once per run** and reuse it: `list_customers` (Companion analytics) for the
existing-customer names/domains, and `search-records` on Attio `deals` in won stages for their
associated companies. Then, for each candidate call, keep it only if it's a **prospect sales call**
per the Scope section — drop existing customers (match against the exclusion set by company name and
email domain), partnerships, vendor pitches, internal meetings, and hiring interviews. Reading the
Circleback meeting notes / attendee domains is usually enough to classify; when a call is genuinely
ambiguous, note it in the report rather than logging it. Only pull full transcripts for the survivors.

### 2. Dedupe against what's already logged

Query **BD Calls** (`notion-query-data-sources` / `notion-fetch` on
`collection://cc6f1805-9ab3-4821-9562-9cb30365536a`) for rows whose `Call ID` matches. Any call
already present is done — skip it. This is what makes the daily overlapping sweep safe.

### 3. Extract signals from each new transcript

Read the transcript and pull every pain point, objection, and question the *customer* raised (not
Companion's reps). For each, note: a short headline, the **Type**, the **verbatim quote** (the
customer's actual words — trim to the load-bearing sentence, don't paraphrase), one or more themes
from the category list (Pricing, Integration, Data quality, Contract & legal, Timeline, Competition,
Security & trust, ROI & value, Onboarding, Support, Product capability, Other), plus customer, deal,
rep, source. Only log what was genuinely said — a purely logistical call may yield zero signals, and
that's correct. Never invent a signal to fill a quota.

### 4. Write Stage 1 — the call and its signals

For each new call, with `AUTO_WRITE = true`:

1. Create the **BD Calls** row (`notion-create-pages`, parent
   `data_source_id: cc6f1805-9ab3-4821-9562-9cb30365536a`): set `Call`, `Customer`, `Deal`,
   `Call date`, `Rep`, `Source system`, `Source link`, `Call ID`, a one-paragraph `Summary`, and the
   `Pain points` / `Objections` / `Questions` counts. In the **page body**, write the structured
   breakdown (see template below) so the whole call reads well on its own.
2. Create one **BD Call Insights** row per signal (parent
   `data_source_id: c11e803e-e5ad-4a83-9253-68fabe0a7fad`): `Insight`, `Type`, `Verbatim quote`,
   `Theme`, `Customer`, `Deal`, `Call`, `Call date`, `Rep`, `Source system`, `Source link`,
   `Call ID`, `Status` = `New`. Link each insight to its call via the `Call` relation (set it to the
   BD Calls page URL).

With `AUTO_WRITE = false`, present the extracted rows as a chat table and wait for a go-ahead.

**BD Calls page body template:**

```markdown
## Summary
[2–4 sentences: who was on the call, what stage/context, the headline takeaway.]

## Pain points
- **[headline]** — "[verbatim quote]" *(theme)*

## Objections
- **[headline]** — "[verbatim quote]" *(theme)*

## Questions
- **[headline]** — "[verbatim quote]" *(theme)*

## Next steps
- [any commitments or follow-ups mentioned on the call]
```

### 5. Update Stage 2 — roll signals into themes

After the new insights are written, fold them into **BD Themes** (all-time, rolling). For each new
insight:

1. **Fetch current themes** (`notion-fetch` / `notion-query-data-sources` on
   `collection://38558f64-e2bb-4af6-836e-66de76af8b41`).
2. **Match or create.** If the insight expresses a concern an existing theme already covers — even
   worded differently (`THEME_MERGE_THRESHOLD`) — attach it there. Otherwise create a new theme row:
   `Theme` (a crisp, reusable name), `Signal type`, `Category`, a `Summary`, `Status` = `Emerging`,
   `First seen` = the call date, `Mentions` = 1, `Customers` = 1.
3. **Update matched themes** (`notion-update-page`): add the insight (and its call) to the `Insights`
   and `Calls` relations, bump `Mentions`, recompute `Customers` (distinct customer count), set
   `Last seen` to the newer call date, and refresh `Summary` if the new evidence sharpens it. Promote
   `Status` from `Emerging` to `Active` once a theme has mentions from 3+ distinct customers — that
   crossover is the signal the team most cares about.

Don't overwrite a human-set `Status` of `Addressed` or `Watching`; only auto-manage the
`Emerging → Active` promotion.

### 6. Report back

Give the operator a concise summary:

1. Calls scanned by source, and how many were new vs. already logged.
2. New signals by Type (pain points / objections / questions).
3. **Theme movement** — new themes created this run, and existing themes that crossed into `Active`
   or gained notable mentions. This is the headline: e.g. "*Integration effort* objection now raised
   by 4 prospects."
4. Links to the three databases.

## Rules of engagement

- **Customer voice only.** Extract what the *prospect/customer* said, not the rep's pitch. A rep
  restating an objection to handle it is still the customer's objection.
- **Never fabricate.** Every insight traces to something actually said, preserved in the verbatim quote.
- **Additive on the raw record.** Stage 1 rows are only appended, never edited or deleted. Humans own
  `Status` curation on insights.
- **Themes are living.** Stage 2 rows *are* updated every run (counts, dates, links, summary) — that's
  their whole point — but reuse before you create, or the theme layer fragments into near-duplicates.
- **Dedup is non-negotiable.** Always check `Call ID` in BD Calls before writing.
- **Both sources, every run.** Don't scan only one. If a source is unavailable, say so in the report.
