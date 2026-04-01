---
name: standup
description: >
  Generate a daily standup summary from merged PRs/commits, GitHub issues, and Outlook calendar meetings.
  Use when the user asks for a standup, daily summary, "what did I do yesterday",
  or wants to prepare notes for a standup meeting.
---

# Standup Summary

Generate a concise summary of what I did on a target date, formatted for my daily standup notes. Save the result to my Standup notes file.

**Target date**: If the user provides a date argument (e.g. `/standup 2026-03-20`), use that date. Otherwise, default to yesterday.

## Data Sources

Gather data from **all sources in parallel**:

1. **Git worktrees** — List all worktrees, then check each for commits on the target date:
   ```bash
   git worktree list
   ```
   For each worktree path, get the target day's commits:
   ```bash
   git -C <worktree_path> log --all --oneline --since="<date>T00:00:00" --until="<date+1>T00:00:00" --author="Sebastian Stoelen" --format="%h %s (%ar)"
   ```

2. **Merged PRs** — PRs merged on the target date (include URL and linked issue URL):
   ```bash
   gh pr list --state merged --search "merged:<date>" --author="@me" --json title,number,mergedAt,url --limit 20
   ```
   For each PR, also fetch its linked/closing issues:
   ```bash
   gh pr view <number> --json closingIssuesReferences --jq '.closingIssuesReferences[] | {number, url}'
   ```

3. **GitHub issues** — Issues closed on the target date (include URL):
   ```bash
   gh issue list --state closed --search "closed:<date>" --assignee="@me" --json title,number,url --limit 20
   ```

4. **Outlook Calendar (target date)** — Meetings from the target date using the Microsoft 365 MCP:
   Use `mcp__claude_ai_Microsoft_365__outlook_calendar_search` to find calendar events for the target date.

5. **Outlook Calendar (today)** — Upcoming meetings for today:
   Use `mcp__claude_ai_Microsoft_365__outlook_calendar_search` to find calendar events for today. Include these in a separate "Today" section so I know what's ahead.

6. **Existing entry** — Check if a standup entry already exists for the target date:
   ```bash
   grep -n "## ... <target date>" /Users/sebastianstoelen/Work/notes/Notes/Standup.md
   ```
   If it exists, update it with any new activity rather than starting from scratch.

## Output Format

Use this exact format — casual, brief bullets with optional sub-bullets for context. Date format MUST be `## Day DD Mon YYYY` (e.g. `## Thu 26 Mar 2026`):

```
## Day DD Mon YYYY
**Yesterday**
- <topic>
- <topic>
  - <detail>
  - <detail>

**Today**
- <meeting time> -- <meeting title>
- <other plans>
```

Keep bullets short (5-10 words). Group by topic, not chronology. Think "what would I say in standup" not "what's the full technical summary".

**Always link to GitHub**: Every bullet that corresponds to a PR or issue must be a markdown link. Prefer linking to the issue when available (the "what"), and add the PR link separately only if it adds clarity. Format: `- [Short description](issue_url)` or `- [Short description](issue_url) ([PR](pr_url))`.

Reference examples from my previous notes:
```
## Tue 31 Mar 2026
**Yesterday**
- Energy Insights fixes
	- [Align percentage directions across overview and comparison pages](https://github.com/Companion-energy/jolteon/issues/4649)
	- [Enhance energy reporting month navigation tracking](https://github.com/Companion-energy/jolteon/issues/4732)
	- [Order comparison periods chronologically](https://github.com/Companion-energy/jolteon/issues/4647)
- [Imbalance cost help article + chart alignment with savings page](https://github.com/Companion-energy/jolteon/pull/4720)
- [Contract page filter preservation fix](https://github.com/Companion-energy/jolteon/issues/4726)
- Content layout padding cleanup
- CHP unified power/energy charts (in progress)

**Today**
- KPI Dashboard sync
- Meeting with Greenpulse
- Pick up Peak Costs
```

## Save to Standup Notes

After presenting the standup, **always** save it to `/Users/sebastianstoelen/Work/notes/Notes/Standup.md`:
- Insert the new entry **after the YAML frontmatter** (after the closing `---` on line 6) and **before any existing entries**
- If an entry for the target date already exists, replace it rather than duplicating
- Ensure there is a blank line between the frontmatter and the new entry, and between entries

If the user requests edits (add/remove/reword bullets), update the file accordingly.
