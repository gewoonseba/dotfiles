---
name: product-inbox-capture
description: Capture a fresh product signal (Slack thread, meeting, DM, email, screenshot) as a new Product Inbox item. Use when a novel signal arrives that isn't already covered by an existing inbox item. If the topic already exists, use `inbox-deepen` (resurface variant) instead. Never used to promote to Roadmap or record commitments.
---

# Skill: product-inbox-capture

Turn a fresh product-relevant signal into a Product Inbox item with the canonical structure. Written so the next triage reviewer can act on it in one sitting without re-digging.

## When to trigger

- User pastes a Slack URL / thread pointer and asks to add it to the inbox.
- User pastes a Circleback meeting or transcript.
- User forwards an email or drops a screenshot with product implications.
- The recurring inbox-watcher finds a signal that doesn't match any existing item.

If in doubt whether a signal is product-relevant: is a customer (named) asking for or complaining about a feature, bug, missing capability, or workflow? Is an internal teammate flagging a customer ask, market shift, or regulatory change that implies new work? If yes: capture. If no (pure engineering chatter, OOO posts, social): skip.

## Workflow

### Step 1: read the full source

Never work off the parent message alone. Pushback, nuance, and the "some things we rather not do" tension almost always land in later replies.

- **Slack**: use `slack_read_thread` with the parent `message_ts`. Read every reply.
- **Circleback**: use `SearchMeetings` and then read the full notes. If the notes don't capture the ask concretely, follow up with `GetTranscriptsForMeetings`. If the transcript exceeds 100k chars, delegate slicing to a general-purpose Agent subagent with the file path.
- **Email**: use `outlook_email_search` and read the actual message body.
- **Screenshot / attachment**: read it via the file tools before drafting.

### Step 2: check for duplicates before creating

Search the inbox with 2 to 3 query variations:

- The topic in plain terms.
- The customer name if the ask is customer-specific.
- The feature area or platform surface.

Fetch the top candidates and read the TL;DR plus body. Match on judgement, not keywords: same feature area + same customer cluster + same problem framing counts as a match. Different angles on the same surface (e.g. "EV charger steering" vs "EV charger asset import") are related but distinct items, not matches.

If <70% confident it's the same topic: create a new item and add a `## Adjacent inbox items` note in the body flagging the near-miss.

If it is a match: switch to the `inbox-deepen` resurface flow. Don't create a duplicate.

### Step 3: resolve users and customers

- **Brought up by**: identify the human who flagged it. If not in the user table in `REFERENCE.md`, look up via `notion-search` with `query_type: "user"`.
- **Relevant for Customer**: search the Customer List (`collection://2f1f3b17-3c43-80a6-9222-000be7e68ed1`). If the customer isn't there, name them in the body but leave the relation empty. Don't create customer pages yourself.

### Step 4: draft the item

Canonical shape:

- **Name**: concise, descriptive. Include the customer name if the item is customer-specific. Example patterns: `Show portfolio savings for partners in the partner dashboard (BEE, QBR ask)`, `TotalEnergies — EV Reporting custom asks + polarity reversal`, `Rework imbalance attribution to sit under consumption + injection in the unified contract hierarchy`.
- **TL;DR**: 1 to 2 sentences answering "what is this and why does it matter" in one breath. Longer only if the nuance materially changes what a reviewer would decide. No headers, no bullets, no markdown.
- **Body**, four sections in this order:

```markdown
## Problem

[1 paragraph. What's actually broken or needed. Concrete. If there's a quoted technical detail from a Slack thread or meeting that nails it, include the quote with attribution and date.]

## Why now

[1 short paragraph or 2 to 3 bullets. The trigger, e.g. a contract clause, a deal in flight, a customer escalation, an internal delivery deadline. If "why now" isn't clear from the research, say so plainly rather than padding.]

## Customer signals

- **[Person, customer]** (YYYY-MM-DD) — what they said or did. Include a short quote if you have one.
- **[Person, customer]** (YYYY-MM-DD) — ...
- Cross-cutting signal if any (e.g. "Recurring in Feedback Recap 1 Apr 2026: '...'").

## Sources

- [Slack thread title (channel, person, date)](permalink)
- Circleback "Meeting name" YYYY-MM-DD — one-line what's in it — https://circleback.ai/meetings/{linkId}
- [Notion — Page title](url)
- Attachment on this inbox page: `filename.docx`
- GitHub: [org/repo#issue-or-pr](url)
```

Add `## Adjacent inbox items` when there's a clear cluster (e.g. multiple Budget or Contract-hierarchy items). Link them by URL and name.

Don't set `Triage decision`. New items should land in the default "not decided on" view.

### Step 5: write the item

Prefer `ntn` for the property write:

```
ntn page create \
  --database 579029a4-54c2-49bb-b40e-2ab132746466 \
  --title "..." \
  --property "TL;DR=..." \
  --property "Brought up by=<user-id>" \
  --property "Relevant for Customer=<comma-separated URLs>"
```

(Verify exact flag names against `ntn page create --help` on first use in the session.)

Use `notion-create-pages` (MCP) if the property write above doesn't cover the case, or if you want to create the page and its body markdown in a single call.

If you created the page with `ntn` (properties only), append the body via `notion-update-page` with `command: "insert_content"` and `position: {"type": "end"}`.

### Step 6: report back

One line, following the format in `AGENT.md`:

`✓ Created: [Name](url), one-line why.`

If you created with adjacent-item flags, mention them in the same line: `+ flagged adjacency with [Related item](url)`.

## Rules specific to capture

- If the source is a Slack thread with a customer's name in it but the customer isn't in the Customer List, name them in the body and leave `Relevant for Customer` empty. Don't create a customer page yourself.
- Don't set `Triage decision` at capture. Ever.
- If two distinct product asks live inside the same source (e.g. a Proximus catch-up covering BESS + EV + budgeting + FusionSolar), split into separate inbox items. One item per distinct piece of work.
- If a source is explicitly deferred ("we rather not do X"), still capture it, but frame that deferral in the body's `## Problem` and `## Why now` so the triage reviewer sees the current stance and doesn't re-litigate.
