---
name: standup
description: >
  Generate a daily standup summary from my PRs.
  Use when the user asks for a standup, daily summary, "what did I do yesterday",
  or wants to prepare notes for a standup meeting.
---

# Standup Summary

Give me an overview of my PR activity on a target date, formatted for daily standup notes. Save the result to my Standup notes file.

**Target date**: If the user provides a date argument (e.g. `/standup 2026-03-20`), use that date. Otherwise, default to yesterday.

## Data Sources

Gather data from **all sources in parallel**:

1. **Merged PRs** — PRs merged on the target date:
   ```bash
   gh pr list --state merged --search "merged:<date>" --author="@me" --json title,number,mergedAt,createdAt,url --limit 20
   ```

2. **Open PRs** — PRs currently open by me:
   ```bash
   gh pr list --state open --author="@me" --json title,number,createdAt,url --limit 20
   ```

3. **Existing entry** — Check if a standup entry already exists for the target date:
   ```bash
   grep -n "## ... <target date>" /Users/sebastianstoelen/Work/notes/Notes/Standup.md
   ```
   If it exists, update it with any new activity rather than starting from scratch.

## Output Format

Use this exact format. Date format MUST be `## Day DD Mon YYYY` (e.g. `## Thu 26 Mar 2026`):

```
## Day DD Mon YYYY

**Merged**
- [PR title](pr_url) — opened <date>, merged <date>

**Open**
- [PR title](pr_url) — opened <date>
```

Omit a section if there are no PRs for it. Keep titles short. Link every PR.

## Save to Standup Notes

After presenting the standup, **always** save it to `/Users/sebastianstoelen/Work/notes/Notes/Standup.md`:
- Insert the new entry **after the YAML frontmatter** (after the closing `---` on line 6) and **before any existing entries**
- If an entry for the target date already exists, replace it rather than duplicating
- Ensure there is a blank line between the frontmatter and the new entry, and between entries

If the user requests edits (add/remove/reword bullets), update the file accordingly.
