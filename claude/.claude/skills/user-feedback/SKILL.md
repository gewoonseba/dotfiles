---
name: user-feedback
description: >
  Gather and summarize user feedback from Slack (#product, #user-feedback), Outlook email,
  and Circleback meetings. Cross-references with GitHub roadmap issues to flag what's already
  fixed. Sends the recap as a Slack DM. Use when the user asks for feedback,
  "what are users saying", "gather feedback", "feedback summary", "user complaints",
  "feature requests", or wants an overview of recent user/customer feedback across channels.
---

# Gather User Feedback

Collect, categorize, and summarize user feedback from four sources: Slack #product, Slack #user-feedback, Outlook email, and Circleback meetings. Cross-reference with GitHub to flag what's already fixed. Always send the recap as a Slack DM.

## Usage

- `/user-feedback` — Gather feedback from the last 7 days (default)
- `/user-feedback 30d` — Gather feedback from the last 30 days
- `/user-feedback since March 1` — Gather feedback since a specific date

## Sources

| Source | ID / Method | What to look for |
|--------|-------------|------------------|
| Slack #product | `C07LE50V0H4` | Feature requests, UX questions, product discussions, internal feedback relaying customer input |
| Slack #user-feedback | `C08PAERR21Z` | Sentry user feedback alerts (in-app widget), bug reports, usability issues |
| Outlook email | `outlook_email_search` | Emails containing "feedback", "feature request", "issue", "bug" |
| Circleback meetings | `SearchMeetings` / `SearchTranscripts` | Customer calls, product demos, feedback sessions |

## Workflow

### 1. Parse time range

- Default: last 7 days
- If the user provides an argument like `30d`, `2w`, `since March 1`, compute absolute dates
- For Slack: compute a Unix timestamp using `python3 -c "from datetime import datetime; print(int(datetime(YYYY, M, D).timestamp()))"` and pass as `oldest`
- For Outlook: pass as `afterDateTime` (ISO date string like `2026-03-19`)
- For Circleback: pass as `startDate` (ISO date string like `2026-03-19`)

### 2. Fetch data from all sources in parallel

**Slack #product** (`C07LE50V0H4`):
- Use `slack_read_channel` with `oldest` set to the computed Unix timestamp
- Read up to 100 messages per page; paginate if needed
- Filter for messages containing feedback signals: feature requests, complaints, questions about UX/behavior, bug reports, customer mentions

**Slack #user-feedback** (`C08PAERR21Z`):
- Use `slack_read_channel` with `oldest` set to the computed Unix timestamp
- Read up to 100 messages per page; paginate if needed
- Pay special attention to Sentry user feedback alerts — extract the feedback text from the code block in Sentry messages

**Outlook email**:
- Use `outlook_email_search` with `afterDateTime` set to start of time range
- Search with query: `feedback`
- Also search with query: `feature request` or `bug report` if the first search returns few results
- Use `read_resource` on relevant email URIs to get full content when summaries are insufficient

**Circleback meetings**:
- Use `SearchMeetings` with `startDate`/`endDate` and `intent` describing we're looking for product/user feedback
- Search for terms like "feedback", "product" using `SearchMeetings`
- For relevant meetings, extract feedback from the meeting notes directly (no need to read full transcripts unless notes are sparse)
- Focus on customer-facing meetings — skip internal interviews, hiring calls, etc.

### 3. Cross-reference with GitHub roadmap

Check recently closed issues in the `Companion-energy/jolteon` repo to identify feedback that has already been addressed:

- Run `gh issue list --repo Companion-energy/jolteon --state closed --limit 30 --json number,title,closedAt,labels`
- Also check items in the **companion.energy roadmap** GitHub project (project number 3, owner `Companion-energy`)
- For each feedback item, look for matching closed issues by keyword
- Mark matched feedback items as **Fixed** with a link to the issue

### 4. Categorize feedback

Classify each feedback item into one of these categories:

| Category | Description |
|----------|-------------|
| Bug | Something is broken or behaving unexpectedly |
| Feature Request | A request for new functionality |
| UX Issue | Confusing UI, unclear behavior, or usability problem |
| Data Issue | Missing, incorrect, or unexpected data |
| Question | A question about how something works (may indicate unclear UX) |
| Positive | Positive feedback or confirmation something works well |

### 5. Send recap as Slack DM

Compose the recap and send it immediately as a Slack DM to Seba. Do not ask for confirmation — always send.

Use `slack_send_message` with `channel_id: "U09R73X823A"`. Also show the recap in the conversation output.

#### Message template

```
*Feedback Recap ({date range})*

*Key Themes*
- [Top 3-5 recurring themes across all channels]

*Already Fixed / In Progress*
- [Feedback item] — Fixed in #XXXX (link)
- [Feedback item] — In progress: #XXXX

*Open — Bugs ({count})*
- *[Short title]* — [1-line summary] (<source link|source>)
  > [Original quote if helpful]

*Open — Feature Requests ({count})*
- ...

*Open — UX Issues ({count})*
- ...

*Open — Data Issues ({count})*
- ...

*Open — Questions ({count})*
- ...

*Positive ({count})*
- ...

*By Source*
- #product: {count} items
- #user-feedback: {count} items
- Email: {count} items
- Meetings: {count} items

*Suggested Action Items*
- [Follow-ups based on severity/frequency]
```

#### Source links — IMPORTANT

Every feedback item must include a clickable link to the original source so the reader can dive deeper. This is critical for making the recap actionable.

| Source type | How to link |
|-------------|-------------|
| Slack message | Use the message permalink from `slack_read_channel` response. Format: `<https://companionspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP|#channel-name>`. Construct the permalink from the channel ID and the message timestamp (remove the dot from the ts). |
| Circleback meeting | Use the Circleback meeting URL: `<https://app.circleback.ai/view/MEETING_ID|Meeting name>`. The meeting ID is returned by `SearchMeetings`. |
| Outlook email | Use the `webLink` field from `outlook_email_search` results. Format: `<WEBLINK|Email subject>`. |
| GitHub issue | Use: `<https://github.com/Companion-energy/jolteon/issues/XXXX|#XXXX>` |

If a feedback item was found in multiple sources, include the most specific link (e.g., the Slack message where a user reported it, not just the channel).

#### Slack formatting rules

- Use `*bold*` for headers (not markdown `##`)
- Use `>` for blockquotes
- Use `-` for bullet lists
- Keep the message under 4000 characters. If it exceeds this, split "Already Fixed" into a thread reply using `thread_ts`.

## Guidelines

- **Be selective**: Not every Slack message is feedback. Skip casual conversation, deployment notifications, and off-topic chatter.
- **Deduplicate**: The same issue may appear in multiple channels. Group them together.
- **Preserve voice**: Include direct quotes when the original wording adds context.
- **Flag urgency**: If something is blocking a customer or is a production incident, call it out prominently.
- **Multilingual**: Some feedback may be in Dutch or French. Translate to English in the summary but keep the original quote.
- **Sentry messages**: Extract the user feedback text from code blocks in Sentry bot messages. The key info is the feedback title and the quoted text.
- **Email threads**: The summary line from `outlook_email_search` is often sufficient. Only read the full email body if the summary is unclear or substantial.
- **Meeting notes**: Focus on action items and explicit feedback mentions. Skip hiring calls, internal-only discussions, and general chat.
- **Fixed items matter**: Highlighting what's already been addressed shows responsiveness and helps avoid duplicate work. Always check GitHub before categorizing something as open.
