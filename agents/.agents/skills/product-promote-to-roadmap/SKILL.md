---
name: product-promote-to-roadmap
description: Move an Inbox item to a decision at the bi-weekly Product Sync (Promote, Decline, Hold, Fridge) and, for Promote, create the corresponding Project in the Projects (Roadmap) database. Also handles the sync-meeting entry itself. Never used to create fresh inbox items (`product-inbox-capture`) or record customer promises (`product-record-commitment`).
---

# Skill: promote-to-roadmap

Turn a sync decision into the right Notion writes. Handles the four outcomes: Promote, Decline, Hold, Fridge. When promoting, also create the Project in the Roadmap.

## When to trigger

- User pastes the Product Sync meeting notes and asks "process the sync decisions".
- User points at a specific Inbox item and says "promote this" / "decline this" / "hold this" / "fridge this".
- Seba's pre-sync digest is being applied ("Seba's call stands" default, minus items flagged for discussion).
- After a Product Sync, the operator applies the actual decisions.

If the input is a fresh signal (not yet in the inbox), route to `product-inbox-capture` first, then this skill on the follow-up sync. Don't skip the inbox stage.

## Sync context

Promotion is typically a sync outcome, not an ad-hoc action. Before writing anything, know:

- Which Product Sync Meetings entry (if any) is the decision being made at? If it's a real sync, link the Inbox item to that meeting via the `Triaged at` relation.
- The three sync passes (from `AGENT.md`): (1) Inbox run-through ~5 min, (2) Shaping read-outs ~5 min, (3) Shaping decisions ~20 min.
- Sync caps: Active Shaping ≤ 3, Now ≤ 3, Next ≤ 3. Warn the operator if a promote-to-Building push would breach a cap.

## The four outcomes

### 1. Promote

Move an Inbox item into Projects with Status = Shaping. Create the Project, link back, set Triage decision.

#### Step 1: read the inbox item

`notion-fetch` to get the current TL;DR, body, and `Relevant for Customer`. These become the Project's starting context.

#### Step 2: create the Project

Prefer `ntn`:

```
ntn page create \
  --database 06bb977e-dfdc-43bf-b50e-235aa01f4516 \
  --title "<Project name>" \
  --property "Status=Shaping" \
  --property "Product Area=<PROPEL|PRISM|PULSE|...>" \
  --property "Appetite=<2|4|6>" \
  --property "Owner=<user-id>" \
  --property "Commercial SPOC=<user-id>" \
  --property "Team=<user-ids>" \
  --property "Target Delivery=<YYYY-MM-DD>" \
  --property "Relevant for=<customer-URLs>" \
  --property "Github epic=<url>"
```

Only set what's known at promotion time. Missing fields are fine, they'll get filled during Shaping.

Do NOT set `Horizon` at promotion. Horizon is decided at the sync when a project moves from Shaping to Building. Newly-promoted projects sit as Shaping (no Horizon) until then.

#### Step 3: body content

Copy the Inbox item's canonical body (Problem / Why now / Customer signals / Sources) into the Project body via `notion-update-page` `insert_content`. The Project inherits the intake context; that's the point.

Add a leading `## Origin` block:

```markdown
## Origin

Promoted from Inbox item [X](inbox-url) on YYYY-MM-DD at [Product Sync YYYY-MM-DD](sync-url).
```

#### Step 4: update the Inbox item

Two updates on the Inbox side, via `ntn` or MCP:

- `Triage decision = "Promoted"`.
- `Promoted to = <Project URL>` (relation).
- `Triaged at = <Sync meeting URL>` if applicable.

Also add a Notion comment on the Inbox item:

> Promoted to [Project X](url) at [Product Sync YYYY-MM-DD](sync-url). Owner: @Owner. Status: Shaping. Appetite: N weeks.

#### Step 5: update the Product Sync Meetings entry

Add this inbox item to `Inbox items triaged` on the sync meeting page (add-only, never remove).

#### Step 6: check for commitments

If the promoted Project fulfils an existing Commitment (search the Commitments DB for `Roadmap Items` relations pointing at similar work, and for any Commitment mentioning the same customer + topic), update that Commitment's `Roadmap Items` relation to include the new Project.

If the source material itself contained a promise ("we'll do X by Y"), hand off to `product-record-commitment` in the same pass.

### 2. Decline

The item won't be done. Doesn't necessarily kill the topic, it just means "not this shape, not this framing, not now."

- `Triage decision = "Declined"` on the Inbox item.
- Fill `Decision note` with one line explaining why. Example: "Data isn't on our side; TE would have to send it in the CDR file. Reopen if that changes."
- `Triaged at = <Sync meeting URL>`.
- Add a Notion comment: `Declined at [Product Sync YYYY-MM-DD](url): {one-line why}.`

### 3. Hold

Not decided yet. Come back next sync. Use sparingly, most items should Promote or Decline.

- `Triage decision = "Held"` on the Inbox item.
- Fill `Decision note` with what needs to change before deciding. Example: "Wait for the 24 June Interparking meeting to see if this scales to CPOs beyond Interparking."
- `Triaged at = <Sync meeting URL>`.
- Add a Notion comment: `Held at [Product Sync YYYY-MM-DD](url) pending: {what needs to happen}.`

### 4. Fridge (Project side only, not inbox)

Fridge is an outcome on Projects (after Shaping), not on Inbox items. Used when we explicitly de-commit from a Shaping project.

Distinct from any Horizon. Fridge means "we're not doing this now"; Later means "we still want to do this eventually."

If invoked on an inbox item, treat it as Decline with a `Decision note` explaining the Fridge framing. If invoked on a Project:

- `Status = "Fridge"` on the Project.
- Set `Horizon = null` (Fridge is orthogonal to Horizon).
- Add a Notion comment: `Fridged at [Product Sync YYYY-MM-DD](url): {one-line why}.`

## Shaping-to-Building move (sync pass 3, question 2)

When a Shaping Project moves to Building:

- `Status = "Building"`.
- Set `Horizon = "Now" | "Next" | "Later"`. Warn if a Now or Next push would breach the cap of 3.
- Set / confirm `Appetite` (2 / 4 / 6 weeks).
- Add a Notion comment: `Building at [Product Sync YYYY-MM-DD](url). Appetite: N weeks. Horizon: {Now|Next|Later}.`

## Sync meeting entry

If no `Product Sync Meetings` entry exists for the sync date, create one:

- `Name = "YYYY-MM-DD — Product Discovery Sync"`.
- `Date = <date>`.
- `Attendees = <attendee-user-ids>`.

Then link the triaged inbox items via `Inbox items triaged`.

## Rules specific to promote-to-roadmap

- Don't promote outside a sync context unless Seba explicitly overrides.
- Copy the Inbox item's body into the Project body. The intake context matters for Shaping.
- Set `Triage decision`, `Promoted to`, `Triaged at`, and a comment. Any of these missing makes the trail hard to follow later.
- Check the caps before pushing to Now / Next / Building. Warn if breaching.
- Add customers to `Relevant for` on the Project, don't just leave it to Shaping.
- If the promoted work fulfils a Commitment, link it. If it creates a new commitment shape (e.g. Seba said "we'll ship X by end of Q3" at the sync), route through `product-record-commitment`.

## Report

- `↑ Promoted: [Inbox item](url) into [Project](url) (Status: Shaping, Owner: @X, Appetite: N weeks).`
- `⊘ Declined: [Inbox item](url), one-line why.`
- `⏸ Held: [Inbox item](url) pending {trigger}.`
- `❄ Fridged: [Project](url), one-line why.`
- `→ Building: [Project](url) (Horizon: {Now|Next|Later}, Appetite: N weeks).`
