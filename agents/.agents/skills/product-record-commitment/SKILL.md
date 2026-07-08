---
name: product-record-commitment
description: Record an external "we'll do X by Y" promise to a customer in the Commitments database, linked (where possible) to the Project(s) that fulfil it. Trigger on any dated customer-facing promise, whether from a SoW, a QBR write-up, a customer email, or a meeting transcript. Not used for internal deadlines or ideation.
---

# Skill: record-commitment

Write down every external, dated promise Companion has made to a customer. Each commitment is a first-class row in the Commitments database, with a link to the Project(s) that fulfil it (when the work exists).

## What counts as a commitment

A commitment is an **external, customer-facing, dated promise**. Concrete tests:

- Is there a named customer (or partner) on the receiving end? If no: it's an internal deadline, not a commitment. Skip.
- Is there a by-when date? "By 30 September", "before summer", "by end of Q3", "at the go-live". If no date is set anywhere in the source, flag the promise but don't write it. Ask Seba for the date. Better to miss a fuzzy one than to invent a date.
- Did we (Companion) say we would do it, out loud, to the customer or to someone at the customer? "We're going to have EV Steering ready by October 1st." "The VodafoneZiggo MVP will be live by end of year." If someone else (a partner, a supplier) is promising it, don't write it in our Commitments.

Sources that typically contain commitments:

- Signed SoWs and contract addenda (VFZ SoW, pilot addenda).
- QBR write-ups and meeting recaps posted after customer meetings.
- Customer emails where Companion promises delivery timing.
- Slack threads where Jonas / Thomas / Natasha / Marie sets a date to a customer.
- Pilot scope docs (e.g. "6 months of pilot operations, clock starts when we're live end-to-end").

Doesn't count:

- "We'll try to have this ready by Friday" (internal, no customer).
- "Roadmap target: end of Q3" (internal target, unless publicly promised).
- SLA response times (recurring obligation, model separately if we ever build an SLA tracker).
- Pre-claimed post-MVP items called out as "excluded from MVP" (those are pre-claimed scope, not commitments; capture in the inbox instead).

## Workflow

### Step 1: extract the promise

From the source, extract these fields:

- **Promise** (title): phrased as "X by Y" or "X for [customer]". Concrete verb + object + date. Example: `Ship EV Steering by 1 Oct 2026 (Equans/Velian pilot)`.
- **Customer**: the customer receiving the promise. Look up in the Customer List. If not present, name in body, leave relation empty, flag it.
- **Owner**: who at Companion is accountable for delivery. Usually the person who made the promise on the call, or the current CSM / commercial lead for that customer.
- **Due**: the promised date. Convert relative dates ("end of Q3", "before summer") to absolute (`2026-09-30`, `2026-06-21`). If the source has a range, use a range; if it says only "by X", set that as `Due` with no end date.

### Step 2: verify no duplicate

Search the Commitments DB with `notion-search` on `collection://3fb541f7-736d-4150-8330-ee06a2206517` for:

- The customer name.
- The promise verb + object (e.g. "EV Steering", "MVP live", "SAML integration").

If a commitment with the same customer + same substantive promise exists:

- If the Due date matches: skip. Report as a duplicate.
- If the Due date has shifted (e.g. the source now says a later date): don't overwrite. Add a Notion comment on the existing Commitment: `Due date update flagged YYYY-MM-DD: source now says {new date}, see [source](link). Not applied. Confirm before shifting.`

### Step 3: link the fulfilling Project(s)

Search the Projects DB (`collection://06bb977e-dfdc-43bf-b50e-235aa01f4516`) for existing Projects that would deliver this commitment. Match on customer + feature area.

- One Project can satisfy multiple Commitments (e.g. one SAML build covers VFZ + EnergyZero + anyone else asking).
- One customer can have multiple Commitments tied to different Projects.
- `Roadmap Items` can be empty at capture. If no matching Project exists yet, create the Commitment with an empty relation and mention it in the body (`No matching Project yet, create at next sync.`). Don't create the Project from this skill; that's `product-promote-to-roadmap`'s job.

### Step 4: write the Commitment

Prefer `ntn`:

```
ntn page create \
  --database 3fb541f7-736d-4150-8330-ee06a2206517 \
  --title "<Promise>" \
  --property "Customer=<customer-URL>" \
  --property "Owner=<user-id>" \
  --property "Due=<YYYY-MM-DD>" \
  --property "Roadmap Items=<project-URLs>"
```

Verify the data source ID the `Roadmap Items` relation targets before writing (migration caveat in `REFERENCE.md`). If the relation points at the older Roadmap DB, use those page IDs; otherwise the new Projects DB.

If the promise came out of a substantive source (QBR, SoW, meeting), append a body block:

```markdown
## Source

Promised on YYYY-MM-DD by @Owner to [Customer contact] at [event / meeting / thread](url).

> "Direct quote from the source."

## Fulfilment

- [Project X](url) — how this Project fulfils the promise (which part of the deliverable).
- [Project Y](url) — ...

If no Project yet: `No matching Project at capture time. Sync on YYYY-MM-DD to create.`
```

### Step 5: cross-link

Two-way linking makes the trail traceable:

- **Commitment side**: `Roadmap Items` relation on the Commitment (done above).
- **Project side**: if the Project has a Commitments relation (verify schema at runtime), also link back. If not, add a `## Commitments` section to the Project body listing the Commitment URLs.

### Step 6: report

`🤝 Committed: "Promise" (customer, due YYYY-MM-DD), linked to [Project](url).`

If unlinked: `🤝 Committed (no Project yet): "Promise" (customer, due YYYY-MM-DD).`

If a duplicate: `↷ Duplicate skipped: "Promise" already exists at [Commitment](url) (due YYYY-MM-DD).`

## Rules specific to record-commitment

- No date, no write. If the source doesn't have a by-when, flag it and ask, don't invent.
- Customer is required. If the customer isn't in the Customer List, name them in the body only; don't create customer pages yourself.
- Don't overwrite existing Due dates. A date shift needs an explicit confirmation from Seba. Add a comment flagging the source, don't update the property.
- One commitment per promise. If a QBR write-up contains three separate promises with three separate dates, that's three Commitments.
- Post-MVP "pre-claimed" items are inbox candidates, not commitments. If a SoW says "excluded from MVP but reserved for later," capture in the inbox with the framing, not here.
- Never bundle commitments together into a single row for brevity. Each promise stands alone.
- Verify at runtime which data source `Roadmap Items` currently targets. Use whichever the schema says.

## Common commitment shapes to expect

- **SoW deliverables** (e.g. VFZ SoW): each MVP deliverable is a commitment tied to the SoW payment tranche. Owner is usually the delivery lead. Due is the tranche date.
- **QBR promises** (e.g. BEE QBR 29 Jun 2026): commercial promises made in the QBR write-up ("we'll deliver EV Steering by Q4 pilot"). Owner is the Companion attendee who made the promise.
- **Pilot commitments** (e.g. Equans/Velian PowerHive Q4 2026): pilot go-live dates. Due is the pilot start date.
- **Contract addenda** (e.g. pilot fee terms): payment triggers + delivery dates. Owner is the commercial lead.
