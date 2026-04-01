---
name: create-issue
description: >
  Create a GitHub issue with proper type, project assignment, and sprint/backlog placement.
  Use when the user wants to create a GitHub issue, file a bug, add a task, or plan work
  in the project board. Also trigger on "new issue", "file a bug", "add to backlog",
  "add to sprint", or similar requests.
---

# Create GitHub Issue

## Usage
- `/create-issue` — interactively create an issue
- `/create-issue backlog` — create and add to backlog with High priority
- `/create-issue sprint` — create and add to active sprint

The user's prompt: $ARGUMENTS

## Workflow

1. **Gather info** — If not provided in `$ARGUMENTS`, ask the user for:
   - Title (short, prefixed with `feat:`, `fix:`, `epic:`, etc.)
   - Body/description (can be brief, you'll expand it into proper markdown)
   - Issue type: Feature, Bug, Task, EPIC, or Tech Debt
   - Placement: **Active sprint** or **Backlog** (with High priority)

2. **Create the issue**
   ```bash
   gh issue create --title "<title>" --body "$(cat <<'EOF'
   <body>
   EOF
   )"
   ```
   Extract the issue number from the returned URL.

3. **Get issue node ID**
   ```bash
   gh api graphql -f query='{ repository(owner: "Companion-energy", name: "jolteon") {
     issue(number: <NUMBER>) { id }
   } }'
   ```

4. **Set issue type**

   | Type | ID |
   |---|---|
   | Task | `IT_kwDOCFetLc4BMPmj` |
   | Bug | `IT_kwDOCFetLc4BMPmm` |
   | Feature | `IT_kwDOCFetLc4BMPmo` |
   | EPIC | `IT_kwDOCFetLc4BoCuq` |
   | Tech Debt | `IT_kwDOCFetLc4BoC9F` |

   ```bash
   gh api graphql -f query='mutation { updateIssueIssueType(input: {
     issueId: "<NODE_ID>", issueTypeId: "<TYPE_ID>"
   }) { issue { title issueType { name } } } }'
   ```

5. **Add to project** (companion.energy roadmap)
   ```bash
   gh api graphql -f query='mutation { addProjectV2ItemById(input: {
     projectId: "PVT_kwDOCFetLc4AaWoa", contentId: "<NODE_ID>"
   }) { item { id } } }'
   ```
   Save the returned `item.id` for the next step.

6. **Set sprint or backlog priority**

   **Option A — Active sprint:**
   ```bash
   gh api graphql -f query='mutation { updateProjectV2ItemFieldValue(input: {
     projectId: "PVT_kwDOCFetLc4AaWoa",
     itemId: "<ITEM_ID>",
     fieldId: "PVTIF_lADOCFetLc4AaWoazgQ5bik",
     value: { iterationId: "06ecdb9d" }
   }) { projectV2Item { id } } }'
   ```

   **Option B — Backlog** (set Priority = High for weekly sprint planning):
   ```bash
   gh api graphql -f query='mutation { updateProjectV2ItemFieldValue(input: {
     projectId: "PVT_kwDOCFetLc4AaWoa",
     itemId: "<ITEM_ID>",
     fieldId: "PVTSSF_lADOCFetLc4AaWoazgiAN9s",
     value: { singleSelectOptionId: "bc42b520" }
   }) { projectV2Item { id } } }'
   ```

7. **Add sub-issues** (optional, for EPICs)
   If the issue is an EPIC and sub-issues are specified:
   ```bash
   gh api graphql -f query='mutation { addSubIssue(input: {
     issueId: "<EPIC_NODE_ID>", subIssueId: "<CHILD_NODE_ID>"
   }) { issue { title } subIssue { title } } }'
   ```

8. **Report** — Show the issue URL and a summary of what was configured (type, sprint/backlog, sub-issues).

## Other project field IDs (for reference)

| Field | ID | Options |
|---|---|---|
| Status | `PVTSSF_lADOCFetLc4AaWoazgQ5bc4` | Discovery, Todo, In Progress, Ready for review, Blocked, Reviewed, Done |
| Topic | `PVTSSF_lADOCFetLc4AaWoazgQ5big` | App, Data integrations, Data science, DevOps, Security, Tech debt, Bug |
| Priority | `PVTSSF_lADOCFetLc4AaWoazgiAN9s` | High (`bc42b520`), Medium (`3fdcef9a`), Low (`8d3d6c03`), BLOCKED (`218c4291`) |
| Work load | `PVTSSF_lADOCFetLc4AaWoazgiAORQ` | Small (`9f8cb4fd`), Moderate (`42d75e94`), Large (`eb211a83`), XL (`168fb02a`) |
| Sprints | `PVTIF_lADOCFetLc4AaWoazgQ5bik` | Active 2026 (`06ecdb9d`) |
