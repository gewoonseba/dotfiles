---
name: product-inbox-deepen
description: Deepen an existing shallow Product Inbox item (or resurface it when new signal arrives). Turns a one-line item into the canonical Problem / Why now / Customer signals / Sources structure. Never used to create new items (use `product-inbox-capture`) or promote to Roadmap (use `product-promote-to-roadmap`).
---

# Skill: inbox-deepen

Take a shallow inbox item (title-only, one-liner, or a mid-thread capture that missed later turns) and rewrite it into the canonical structure so a triage reviewer can act on it in one sitting.

Has two variants:

- **Deepen (fresh)**: an item that's never been researched. Add TL;DR + canonical body sections.
- **Resurface**: an existing (possibly deepened) item that a new signal lands on. Append a `## Resurfaced YYYY-MM-DD` block, clear Triage decision where appropriate, add a Notion comment.

## When to trigger

- User pastes a Notion URL pointing at a specific inbox item with "add more detail" or "fill in the context".
- User says "deepen the product inbox" or "enrich the inbox".
- The recurring inbox-watcher finds a new signal that matches an existing item.
- User invokes with a specific scope: "deepen just the VFZ item", "deepen items 1, 2, 3".

If the user's request sounds like promotion (RICE scoring, status change, "add to roadmap"), use `product-promote-to-roadmap` instead. This skill stops at deepening.

## Skip criteria (default scope is "process every item")

Skip an item if both are true:

- TL;DR is longer than the title, AND
- Body already contains `## Problem` (or equivalent) and `## Sources` headings.

Report skipped items briefly. Don't ask permission to skip, it's the default.

If the user scopes the request explicitly ("deepen just X", "deepen items 1-3"), honour it and skip the auto-evaluation.

## Deepen (fresh) workflow

### Step 1: read the item and its attachments

`notion-fetch` the page. Read the current `TL;DR`, `Relevant for Customer`, body content, and attachments. Attachments (screenshots, Word docs, Circleback links) are often the actual context, not the title. Don't skip the body fetch.

### Step 2: research in parallel

Fire these concurrently. Use 2 to 3 query variations per source.

1. **Slack** (`slack_search_public_and_private`): the item title, the customer name (if linked), and 1 to 2 related concepts. Channels that matter: `#product`, `#existing-customers`, `#busdev`, `#user-feedback`, `#proj-*`, and DMs. Skip `#busdev-automations`, incident channels, Sentry / alert channels, and pure engineering channels (see `REFERENCE.md`).
2. **Circleback** (`SearchMeetings` + `SearchTranscripts`): follow any Circleback link on the page body via `GetTranscriptsForMeetings`. If a transcript exceeds ~100k chars, delegate slicing to a general-purpose Agent subagent with the file path.
3. **Outlook** (`outlook_email_search`): customer name plus topic keywords.
4. **Notion** (`notion-search`, workspace-wide): related specs, project pages, prior decisions, the Customer Feature Request Log.
5. **Customer pages**: if `Relevant for Customer` is set, `notion-fetch` each to ground in current context (contracting status, deal value, recent activity).

Record what you found with dates, attribution, and links. Cite these in `## Sources`.

### Step 3: identify customer relation gaps

If research points at a customer not already linked, add them. Never remove existing relations (the operator may have context you don't). Search the Customer List by name and use the full Notion URL.

If the customer isn't in the Customer List, name them in the body only.

### Step 4: draft TL;DR + body

- **TL;DR**: 1 to 2 sentences answering "what is this and why does it matter". Refresh it based on what you learned.
- **Body**, canonical structure (same as `product-inbox-capture` Step 4). Preserve any existing attachments and body content already on the page.

### Step 5: write back

Prefer `ntn` for the property update (`TL;DR`, expanded `Relevant for Customer`):

```
ntn page update <page-id> \
  --property "TL;DR=..." \
  --property "Relevant for Customer=<existing-URLs + new-URLs>"
```

When updating `Relevant for Customer`, pass the full list (existing + new). Never pass a list that drops any existing customer.

Then append the body via Notion MCP:

- `notion-update-page` with `command: "insert_content"`, `position: {"type": "end"}`.
- Never `replace_content`. That destroys attachments and inline comments.

If `notion-update-page` returns an echo of a different page but no error, that's a known quirk. Verify with `notion-fetch` that the content landed.

### Step 6: report

`✎ Deepened: [Name](url), one-line what you added.`

For any items that met the skip criteria: `↷ Skipped: [Name](url), already deepened.`

## Resurface workflow (new signal on an existing item)

Use when the recurring inbox-watcher or the user brings new material to a topic that already has an inbox item.

1. **Append** a resurface block to the body via `notion-update-page` `insert_content`, `position: {"type": "end"}`:

```markdown
---

## Resurfaced YYYY-MM-DD, new context from {Slack | Circleback | Outlook}

- **[Person, customer]** (date) — > "quote that nails the ask"

### Sources
- [Slack thread ...](permalink)
- Circleback "..." YYYY-MM-DD
```

2. **Clear Triage decision** if it's currently `Held` or `Declined`. Pass `null` via `notion-update-page` with `command: "update_properties"`.

Do NOT clear `Triage decision` on `Promoted` items unless the new signal materially changes scope. Promoted items live on the Roadmap already; yanking them back should be deliberate. If uncertain, leave it set and just append the new context.

3. **Add a Notion comment** via `notion-create-comment` on the item:

> Brought back up due to new input on YYYY-MM-DD: {one-line summary of the new signal}. Triage decision cleared. See the body for the appended context.

Only add the comment if it materially resurfaces. No duplicate comments for the same signal within a week.

4. **Add customer relations** if the new signal names a customer not already linked. Add-only.

5. **Report**: `↻ Resurfaced: [Name](url), one-line why (and any added customer relations).`

## Rules specific to deepen / resurface

- Append, never replace. Attachments and inline comments are part of the source material.
- Add customers, never remove.
- Don't change Triage decision on `Promoted` items unless scope materially changes.
- Quote what's quotable, a 2-line direct quote with attribution beats a paraphrase.
- If research turns up nothing, say so plainly in `## Why now`: "no recent signal found; raised once on [date] and hasn't resurfaced." Don't pad.
- If two distinct clusters of signal land on the same item, resurface once; don't create two comments for the same wave of context.
