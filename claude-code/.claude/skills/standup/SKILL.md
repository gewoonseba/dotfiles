---
name: standup
description: >
  Generate a daily standup summary from my PRs.
  Use when the user asks for a standup, daily summary, "what did I do yesterday",
  or wants to prepare notes for a standup meeting.
---

# Standup Summary

Give me an overview of my PR activity on a target date, formatted for daily standup notes. Save the result to my Standup notes file.

There are two key dates:
- **Standup date** (the heading): If the user provides a date argument (e.g. `/standup 2026-03-20`), use that date. Otherwise, default to **today**.
- **PR activity date** (the data): Always **one day before** the standup date. This is the date you search for merged PRs, because today's standup reports on yesterday's work.

## Data Sources

Gather data from **all sources in parallel**:

1. **My merged PRs** — PRs I authored that were merged on the **PR activity date**:
   ```bash
   gh pr list --state merged --search "merged:<pr-activity-date>" --author="@me" --json title,number,mergedAt,createdAt,url --limit 20
   ```

2. **My open PRs** — PRs currently open by me, with review status:
   ```bash
   gh pr list --state open --author="@me" --json title,number,createdAt,url,isDraft,reviewDecision --limit 20
   ```

3. **Existing entry** — Check if a standup entry already exists for the **standup date**:
   ```bash
   grep -n "## ... <standup date>" /Users/sebastianstoelen/Work/notes/Notes/Standup.md
   ```
   If it exists, update it with any new activity rather than starting from scratch.

## Categorization

Split the merged PRs into two groups based on `createdAt` vs the **PR activity date**:
- **Opened & Merged** — PRs where `createdAt` falls on the PR activity date (opened and merged the same day)
- **Merged** — PRs where `createdAt` is before the PR activity date (opened earlier, merged yesterday)

Split open PRs into groups based on `isDraft` and `reviewDecision`:
- **Draft** — PRs where `isDraft` is true
- **In Review** — PRs where `isDraft` is false and `reviewDecision` is empty, "REVIEW_REQUIRED", or "CHANGES_REQUESTED"
- **Approved** — PRs where `reviewDecision` is "APPROVED"

## Output Format

Use this exact format. The heading uses the **standup date**. Date format MUST be `## Day DD Mon YYYY` (e.g. `## Thu 26 Mar 2026`):

```
## Day DD Mon YYYY

**Merged**
- [PR title](pr_url)

**Opened & Merged**
- [PR title](pr_url)

**Open — Approved**
- [PR title](pr_url)

**Open — In Review**
- [PR title](pr_url)

**Open — Draft**
- [PR title](pr_url)
```

Omit a section if there are no PRs for it. Keep titles short. Link every PR. Do NOT add dates after the PR link — just the linked title.

## Save to Standup Notes

After presenting the standup, **always** save it to `/Users/sebastianstoelen/Work/notes/Notes/Standup.md`:
- Insert the new entry **after the YAML frontmatter** (after the closing `---` on line 6) and **before any existing entries**
- If an entry for the target date already exists, replace it rather than duplicating
- Ensure there is a blank line between the frontmatter and the new entry, and between entries

If the user requests edits (add/remove/reword bullets), update the file accordingly.
