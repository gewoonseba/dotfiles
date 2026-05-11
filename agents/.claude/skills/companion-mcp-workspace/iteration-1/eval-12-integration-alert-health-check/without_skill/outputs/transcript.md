# Eval 12 - Integration Alert Health Check for Elicio (Without Skill)

## Task
Check for integration issues for Elicio -- find any stale or erroring integrations.

## Approach (Baseline -- No Skill Instructions)

### Step 1: Discover available MCP tools
Used `ToolSearch` with queries "companion energy integration" and "mcp__claude_ai_Companion_energy_DEV" to load relevant tools. Successfully loaded the following key tools:
- `get_integration_alert_issues` -- admin endpoint for paginated, filterable integration alert issues with search
- `get_integration_alert_filter_options` -- returns customers/partners with alert issues (for dropdown population)
- `get_customer_integration_alert_issues` -- customer-scoped integration alert issues
- `get_org_integration_alert_issues` -- organization-scoped integration alert issues
- `get_integration_alert_issue_detail` -- detail view for a single alert issue
- `mute_integration_alert_issues` -- mute/unmute alerts
- `get_customers` -- search/list customers to find Elicio's UUID

### Step 2: Planned execution path
1. Search for "Elicio" customer via `get_customers` to obtain its UUID
2. Use `get_integration_alert_issues` with `search=Elicio` or `customer_uuid=<elicio_uuid>` to find all alert issues
3. Optionally filter by `issue_type=stale` and `issue_type=error` separately to categorize issues
4. For any critical issues, use `get_integration_alert_issue_detail` to get occurrence history and related issues

### Step 3: Execution attempts
Attempted the following API calls, all of which failed with the same DNS resolution error:

| Tool Called | Parameters | Result |
|---|---|---|
| `get_customers` | `search="Elicio"` | `[Errno -2] Name or service not known` |
| `get_integration_alert_issues` | `search="Elicio"` | `[Errno -2] Name or service not known` |
| `get_integration_alert_filter_options` | (none) | `[Errno -2] Name or service not known` |

Over 25 retry attempts were made across all three endpoints. Every single call returned the identical DNS resolution error. A 5-second wait between retry batches did not resolve the issue.

## Result
**FAILED** -- The Companion Energy DEV MCP server was completely unreachable throughout the entire session due to persistent DNS resolution failure (`[Errno -2] Name or service not known`). No data could be retrieved.

## What would have been done if the server was reachable
1. **Find Elicio's customer UUID** via `get_customers(search="Elicio")`
2. **Query all integration alerts for Elicio** via `get_integration_alert_issues(search="Elicio")` or `get_integration_alert_issues(customer_uuid=<uuid>)` to get the full list of active issues with metrics
3. **Filter for stale integrations** via `get_integration_alert_issues(customer_uuid=<uuid>, issue_type="stale")`
4. **Filter for erroring integrations** via `get_integration_alert_issues(customer_uuid=<uuid>, issue_type="error")`
5. **Inspect details** of any critical issues via `get_integration_alert_issue_detail(issue_uuid=<uuid>)` to see occurrence history, error messages, and related issues
6. **Summarize findings** including: integration type, issue category (data/steering/nomination), channel type, last seen timestamps, occurrence counts, and error messages

## Tools identified but not used (due to server unavailability)
- `get_customer_integration_alert_issues` -- alternative customer-scoped endpoint
- `get_org_integration_alert_issues` -- could be used if Elicio is an organization/partner
- `get_integration_alert_issue_detail` -- for drilling into specific issue occurrence history

## Observations
- The baseline approach correctly identified the right tools and planned a reasonable execution path
- The main blocker was infrastructure (DNS resolution), not tool discovery or usage logic
- No skill instructions were available to guide tool selection or provide shortcuts (e.g., known customer UUIDs)
- Total number of MCP calls attempted: ~28 (all failed)
