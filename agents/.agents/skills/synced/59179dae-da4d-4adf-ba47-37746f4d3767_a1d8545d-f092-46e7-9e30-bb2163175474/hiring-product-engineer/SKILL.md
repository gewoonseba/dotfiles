---
name: hiring-product-engineer
description: "Common actions in the Product Engineer hiring process"
---

---
name: companion-candidate-interviews
description: Manage Companion.energy candidate interview bookings, research applicants, create Obsidian prep notes, capture Circleback interview feedback, and synchronize the Notion Applicant Tracker. Use when handling Microsoft Bookings screenshots, candidate interviews, take-home rounds, hiring feedback, or Applicant Tracker updates.
---

# Companion.energy Candidate Interviews

Use this skill to run the practical hiring workflow for Companion.energy Product Engineer candidates.

## Scope

This skill covers four connected workflows:

1. Add, move, or verify candidate interview bookings in the Companion work calendar.
2. Research candidates and create focused interview prep notes in the Obsidian work vault.
3. Capture interview feedback from the hiring manager and Circleback into Notion and Obsidian.
4. Keep Applicant Tracker stages consistent with explicit hiring decisions and outbound emails.

## Ground Rules

* Treat the **Applicant Tracker** in Notion as the hiring process source of truth.
* Treat the **Companion work calendar** as the scheduling source of truth.
* Treat **Circleback** as a supporting source. Its summary or transcript can be incomplete or wrong. Never invent details to fill gaps.
* Treat interview feedback from the hiring manager as authoritative, even when it differs from a Circleback summary.
* Use the candidate's actual booking name, but reconcile it with the Applicant Tracker name. Booking emails can omit surnames, reverse first and last names, or remove accents.
* Do not use em dashes in notes, drafts, or chat responses.
* Do not claim that a public profile is verified unless its identity is supported by multiple matching details such as name, employer, location, email handle, portfolio, or career history.
* Never change a tracker stage unless the hiring manager explicitly made that decision, or explicitly asked to reconcile the tracker with emails already sent.

## Local Configuration

These identifiers are specific to this workspace.

| Resource | Value |
|---|---|
| Companion work calendar | `8314C063-A232-41C9-A1D0-5A9DD9E0C0D2` |
| Notion Applicant Tracker data source | `220f3b17-3c43-8122-9863-000b9a58c589` |
| Obsidian work vault | `~/Work/notes` |
| Candidate prep note directory | `~/Work/notes/raw/Notes/` |

### Key tracker fields

| Field | Use |
|---|---|
| `Name` | Candidate identity and search target |
| `Email` | Candidate contact and identity disambiguation |
| `Stage` | Hiring workflow state |
| `Application` | Primary applicant context, often more useful than an empty CV summary |
| `CV Summary` | Optional prepared summary |
| `Score reasoning` | Hiring assessment, rationale, and decision notes |
| `Link to documents` | Use for a Circleback link if no more important document URL already exists |
| `Resume` | Attached CV, if available |

### Relevant tracker stages

* `Screen`
* `To invite to First Round after screening`
* `Rejected - Screening`
* `Fit Interview`
* `Rejected - Fit interview`
* `Case Interview`
* `Case Interview- Pending Decision`
* `Rejected - Technical Interview`
* `Founders Interview`
* `Rejected - Founders interview`
* `Give Offer`
* `Offer Signed`
* `Declined`

## Workflow 1: Process a Microsoft Bookings Screenshot

### Extract the booking precisely

Record:

* Candidate name.
* Date.
* Start and end time.
* Duration.
* Meeting platform, normally Microsoft Teams.
* Whether the screenshot says `New booking` or `Updated booking`.

Bookings often display `UTC+01:00` in their footer even during Belgian summer time. Use the **visible Brussels wall-clock time** as the intended calendar time. Calendar tools will handle Europe/Brussels daylight saving time correctly.

### Check before creating

Query the relevant day, or a tight time window, across calendars. Search for:

* An event with the candidate's name.
* An existing candidate interview at the same time.
* A prior event for the same candidate when the booking says `Updated booking`.

Decision rules:

| Situation | Action |
|---|---|
| Exact candidate event already exists at the booked time | Do nothing, report it is already present |
| Same candidate event exists at an old time and booking is updated | Edit the existing event, do not create a duplicate |
| No matching event exists | Create it in the Companion work calendar |
| An unrelated event overlaps | Still add the booking if the user asked, but flag the clash clearly |

### Calendar event convention

Use:

* **Calendar:** Companion work calendar ID above.
* **Title:** `Interview: <Candidate Name> (<duration> min)`.
* **Location:** `Microsoft Teams`.
* **Notes:** `Candidate interview via Microsoft Bookings. <duration> minute meeting via Microsoft Teams.`
* For a rescheduled event, add a short note such as `Rescheduled from Mon 6 Jul.`
* For a second-round booked review, use `Second-round candidate interview via Microsoft Bookings.`

### Verify

After creating or editing, verify that the response contains the intended local time, title, and event ID. If calendar reads are available, query the relevant time window again.

## Workflow 2: Research and Create Candidate Prep Notes

### 1. Find the tracker record

Search the Applicant Tracker by exact name or distinctive surname. If diacritics fail, search the ASCII spelling too.

Example query pattern:

```bash
DS="220f3b17-3c43-8122-9863-000b9a58c589"
ntn api --method POST "/v1/data_sources/$DS/query" \
  --data '{
    "filter": {
      "property": "Name",
      "title": {"contains": "Surname"}
    },
    "page_size": 5
  }'
```

Read the candidate page to inspect `Application`, `CV Summary`, `Email`, `Resume`, and `Stage`.

> [!warning]
> The `ntn` CLI can return a complete JSON response while the outer terminal wrapper reports a timeout. Inspect any printed JSON before assuming the operation failed.

### 2. Research public profiles

Search from several angles:

* Candidate name + current or stated employer.
* Candidate name + role or technology mentioned in the application.
* Candidate email, portfolio, GitHub, or LinkedIn handle when available.
* Candidate name + location.

Only include claims that are supported by the tracker application, a portfolio, a verified LinkedIn match, or other credible public sources.

If identity cannot be pinned down, say so in the note. Add a first-call question asking the candidate to share their LinkedIn or portfolio rather than guessing.

### 3. Assess against the Product Engineer bar

The role is generally:

* About 80% hands-on engineering, usually frontend-heavy.
* About 20% product and design work.
* Expected to own an end-to-end slice: understand the customer problem, shape a solution, prototype, build, release behind flags, learn from feedback, and iterate.
* Not a pure frontend ticket-delivery role, a pure UX role, or a pure backend/AI infrastructure role.

Look for positive signals:

* Owns outcomes rather than only output.
* Can articulate the user problem, trade-offs, and success measure.
* Has independently scoped or cut work.
* Understands information architecture and coherent customer narratives.
* Has shipped, learned from usage, and iterated.
* Shows curiosity about the energy domain, customer realities, and business constraints.
* Can build maintainable frontend systems, not just one-off screens.

Watch for risks:

* Strong technology focus with little interest in user value or real-world impact.
* A profile that is too junior in both engineering and product design for independent ownership.
* Pure backend/AI depth without enough frontend, interaction, or product-design ability.
* Pure visual design without evidence of shipping production code.
* Generic applications that give no evidence of motivation, product judgment, or actual outcomes.
* Agency or consultancy work where it is unclear whether the candidate owned decisions or only executed client briefs.

### 4. Create a separate note per candidate

Do not use one large prep note for multiple candidates. Create an individual raw note in:

```text
~/Work/notes/raw/Notes/
```

Naming format:

```text
YYYY-MM-DD Interview - Full Candidate Name.md
```

Use this template:

```markdown
---
created: YYYY-MM-DD
tags:
  - note
  - hiring
  - interview
---

# Interview — Full Candidate Name (HH:MM, Day DD Mon YYYY)

- **Slot:** HH:MM–HH:MM CEST · duration · Microsoft Teams
- **Email:** candidate@example.com
- **Notion:** [Applicant Tracker](https://app.notion.com/...)
- **LinkedIn:** https://linkedin.com/in/... *(verified)*
- **Portfolio:** https://example.com *(if applicable)*

## Snapshot (source)
- Relevant career, domain, and technical details.
- Keep this factual and sourced.

## Read
Short assessment of likely fit, unknowns, and what needs pressure-testing.

## Questions
- Tailored question about a concrete project.
- Question that tests product ownership and trade-offs.
- Question that tests engineering depth relevant to the role.
- Question about motivation for Companion and the energy domain.
- *(Closing)* Tell me about a time you pushed back on a feature or scope. What did you cut, and why?

## Notes


## Verdict

```

### 5. Create or update a daily briefing only when useful

For several interviews on the same day, create a separate briefing note:

```text
YYYY-MM-DD Product Engineer Interviews - Briefing.md
```

The briefing should link to the individual candidate notes and include:

* Schedule.
* Reusable Companion pitch.
* Shared assessment rubric.
* Follow-up checklist.

Do not duplicate full candidate research in the briefing.

## Workflow 3: Process Interview Feedback into Circleback, Notion, and Obsidian

### 1. Find the Circleback meeting

Search by full name, then surname, then first name if needed. A meeting title can differ from the tracker name.

```text
SearchMeetings("Candidate Name")
SearchMeetings("Surname")
```

Then retrieve:

* Full meeting details, including the stable meeting identifier.
* Transcript, when it exists.

### 2. Validate the Circleback source

Circleback can be incomplete, contain bad summaries, or save an empty transcript.

* If the meeting record is present but the transcript is effectively empty, say so explicitly in Notion and Obsidian.
* Do not turn Circleback's generic summary into stronger evidence than it is.
* Hiring-manager feedback remains authoritative.

Use a stable internal reference link where available:

```text
https://app.circleback.ai/meetings/<meeting-id>
```

### 3. Write feedback that is specific and comparative

Use concrete observations, not vague labels. Structure the reasoning as:

1. Relevant strengths.
2. Gaps or risks.
3. Role-level assessment.
4. Decision or current decision state.
5. Circleback reference and transcript caveat, if needed.

Examples of useful language:

* `Strong cultural fit, but too junior for the current Product Engineer opening.`
* `Technically impressive with a genuine builder mindset, but motivation appeared technology-first rather than product or impact-first.`
* `Relevant full-stack experience, but lower conviction relative to the other candidates because product ownership and cultural fit were less clear.`
* `Very keen to invite to the next round.`

Avoid unsupported claims about performance, paying customers, seniority, or ownership.

### 4. Update Notion

Always inspect the current page first if possible, especially `Stage`, `Score reasoning`, and `Link to documents`.

Update:

* `Score reasoning` with the structured assessment.
* `Link to documents` with the Circleback link if the field is empty or if the Circleback link is the most useful document.
* If that URL field already contains an important CV or document, preserve it. Put the Circleback link in `Score reasoning` and, where possible, append a paragraph to the Notion page body rather than overwriting the existing document link.
* `Stage` only if the hiring manager explicitly made a decision.

Example PATCH payload:

```json
{
  "properties": {
    "Link to documents": {
      "url": "https://app.circleback.ai/meetings/<meeting-id>"
    },
    "Score reasoning": {
      "rich_text": [
        {
          "text": {
            "content": "Fit interview (DD Mon YYYY). ..."
          }
        }
      ]
    }
  }
}
```

### 5. Sync the Obsidian note

Update only the existing candidate note's `## Verdict` section. Include:

* The hiring assessment.
* The Circleback link.
* A caveat if the saved transcript was empty or incomplete.

Do not modify the prep snapshot after the call unless correcting factual research.

## Workflow 4: Reconcile the Tracker After Emails Are Sent

Use this only when the user confirms that candidate emails have actually been sent or explicitly asks for reconciliation.

| Outbound decision | Tracker stage |
|---|---|
| Invited to take-home assignment / next technical round | `Case Interview` |
| Take-home completed, awaiting decision | `Case Interview- Pending Decision` |
| Rejected after fit interview | `Rejected - Fit interview` |
| Rejected after case review | `Rejected - Technical Interview` |
| Invited to founder round | `Founders Interview` |
| Rejected after founder round | `Rejected - Founders interview` |
| Offer approved | `Give Offer` |
| Offer signed | `Offer Signed` |

When moving someone forward, preserve existing detailed feedback. Do not replace a rich interview assessment with only a generic status note. If adding an administrative note, append a concise sentence such as:

```text
Take-home assignment sent by email. Awaiting submitted work and a 60-minute review discussion.
```

When rejecting after repeated missed appointments, use factual wording:

```text
Application closed after three scheduled interviews where the candidate did not attend. Rejection email sent.
```

## Useful Email Guidance

### Next-round invite

Use this essential content:

* Thank them for the conversation **last week**, not `this week`, unless the timing is genuinely same-week.
* State that they are moving forward.
* State that the attached case is the second round.
* Ask them not to spend more than **2 to 4 hours** on it.
* Explain that the aim is their approach, trade-offs, and communication, not a polished or complete solution.
* Ask for a copy of the results before the discussion.
* Include the 60-minute booking link.

Core wording:

```text
As discussed, the second round involves a take-home assignment, which you can find attached.

Please do not spend more than 2 to 4 hours on the assignment. We are not looking for a polished or complete solution. The goal is to understand how you approach the problem, make trade-offs, and communicate your thinking.

We would love to receive a copy of your results before we meet, so we can look through them in advance.
```

### Rejection after a positive conversation

Be kind, specific, and direct. Explain the role-level mismatch without overexplaining or offering false hope.

### Rejection after repeated missed meetings

State the factual outcome clearly:

```text
Unfortunately, we have now scheduled three meetings and have not been able to connect. I understand that things can come up, but at this point we will be closing your application and will not be scheduling another call.
```

## Final Verification Checklist

Before reporting completion, verify:

- [ ] Calendar event was created or edited in the Companion work calendar.
- [ ] Event date, local time, duration, and candidate name match the booking.
- [ ] The correct Applicant Tracker page was used.
- [ ] Public-profile claims are verified or clearly labeled as unconfirmed.
- [ ] An individual Obsidian prep note exists at the expected path.
- [ ] Circleback link was captured where a meeting happened.
- [ ] Tracker reasoning contains the actual hiring-manager feedback.
- [ ] Stage changed only when explicitly decided.
- [ ] No em dashes were used in drafted text or notes.
