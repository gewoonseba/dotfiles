# Eval 12: Integration Alert Health Check for Elicio

## Task
Check for integration issues for the customer "Elicio" -- show any stale or erroring integrations.

## Approach

Following the companion-mcp skill instructions:

1. **Identify the MCP**: The Companion Energy DEV MCP is connected with prefix `mcp__claude_ai_Companion_energy_DEV__`.

2. **Step 1 -- Customer selection**: Search for the Elicio customer using `get_customers` with `search: "Elicio"` to resolve the customer ID.

3. **Step 2 -- Retrieve integration alert issues**: Once the customer ID is known, call `get_customer_integration_alert_issues` with the customer ID. This endpoint returns a paginated list of integration health issues (stale data, errors, never-seen channels) scoped to the customer. It supports filtering by:
   - `issue_type`: `"stale"`, `"error"`, or `"never_seen"`
   - `issue_category`: `"data"`, `"steering"`, or `"nomination"`
   - `mute_status`: `"active"` or `"muted"`
   - `integration_type`: e.g. `"fluvius"`, `"engie"`, `"teleport"`, etc.

4. **Planned calls**:
   - `get_customer_integration_alert_issues(customer_id=<elicio_id>, issue_type="stale")` -- to find stale integrations
   - `get_customer_integration_alert_issues(customer_id=<elicio_id>, issue_type="error")` -- to find erroring integrations
   - Optionally also `get_assets_tree(customer_id=<elicio_id>)` to correlate integration issues to specific assets in the hierarchy

5. **Presentation**: Results would be displayed as a table showing: asset name, integration type, issue type (stale/error/never_seen), issue category (data/steering/nomination), first seen, last seen, occurrence count, and muted status.

## Execution

### Attempt 1: Search for Elicio customer
- **Tool called**: `get_customers(search="Elicio")`
- **Result**: `Error calling tool 'get_customers': Request error: [Errno -2] Name or service not known`

### Attempts 2-25: Repeated retries
- The same `get_customers` call was retried over 20 times across several minutes.
- **All attempts returned the same DNS resolution error**: `[Errno -2] Name or service not known`
- This indicates the remote DEV MCP server (`claude_ai_Companion_energy_DEV`) was completely unreachable during this session due to a DNS/network issue.

## Result

**BLOCKED**: The Companion Energy DEV MCP server was unreachable throughout the entire session. No data could be retrieved for the Elicio customer.

The intended workflow was:
1. `get_customers(search="Elicio")` --> resolve customer UUID
2. `get_customer_integration_alert_issues(customer_id=<uuid>)` --> retrieve all active integration issues
3. Filter and display stale and erroring integrations with asset context

## Tools Identified (from skill)

The correct tools for this task are:
- `get_customers` -- to find the Elicio customer ID
- `get_customer_integration_alert_issues` -- the primary tool for retrieving integration health issues per customer (supports filtering by issue_type, issue_category, integration_type, channel_type, mute_status)
- `get_assets_tree` -- to correlate issues with the asset hierarchy
- `get_asset_integrations` -- to get detailed integration config per asset if needed
