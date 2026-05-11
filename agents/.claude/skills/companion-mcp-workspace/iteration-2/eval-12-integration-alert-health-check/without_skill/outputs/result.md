# Eval 12: Integration Alert Health Check for Elicio (Baseline -- No Skill)

**Date:** 2026-04-03
**Environment:** Companion Energy DEV MCP
**Customer:** Elicio (UUID: 90ecb210-dd6b-4cfb-aac7-83e175388115)

---

## Approach

1. Used `ToolSearch` to discover available MCP tools related to integration alerts.
2. Loaded the `mcp__claude_ai_Companion_energy_DEV__get_integration_alert_issues` tool (admin endpoint with free-text search).
3. Queried integration alert issues with `search=Elicio`, paginating through all results.
4. Ran additional filtered queries for `issue_type=stale` and `issue_type=error` specifically.
5. Checked for muted issues.

---

## Tool Calls & Responses

### Tool Call 1: ToolSearch (integration issues)
- **Query:** `"integration issues stale erroring"`
- **Result:** Loaded 3 variants of integration alert tools (admin, customer, org) across DEV/TST/PROD environments.

### Tool Call 2: ToolSearch (MCP prefix)
- **Query:** `"mcp__claude_ai_Companion_energy_DEV"`
- **Result:** Loaded additional DEV tools including asset management, sensor data, etc.

### Tool Call 3: get_integration_alert_issues (all Elicio issues, page 1)
- **Parameters:** `search="Elicio"`, `page_size=100`, `sort_by="last_seen"`, `sort_order="desc"`
- **Result:** 131 total issues across 2 pages. Page 1 returned 100 issues.
- **Metrics (filtered to Elicio search results):**
  - Total active: 182, Total muted: 2
  - By issue type: never_seen=171, error=1, stale=12
  - By category: data=125, steering=59, nomination=0

### Tool Call 4: get_integration_alert_issues (all Elicio issues, page 2)
- **Parameters:** `search="Elicio"`, `page=2`, `page_size=100`
- **Result:** 31 additional issues (all never_seen type for wind turbine data and steering).

### Tool Call 5: get_integration_alert_issues (Elicio errors only)
- **Parameters:** `search="Elicio"`, `issue_type="error"`
- **Result:** 0 issues returned. The 1 error in the global metrics does not belong to Elicio.

### Tool Call 6: get_integration_alert_issues (Elicio stale only)
- **Parameters:** `search="Elicio"`, `issue_type="stale"`
- **Result:** 9 stale issues returned (all data category, API integration type).

### Tool Call 7: get_integration_alert_issues (Elicio muted)
- **Parameters:** `search="Elicio"`, `mute_status="muted"`
- **Result:** 0 muted issues for Elicio. (The 2 globally muted issues are not Elicio's.)

---

## Final Output to User

### Summary

**Elicio has 131 active integration alert issues on DEV.** All are via the **API** integration type. There are **no errors**, but there are **9 stale data integrations** and **122 never-seen integrations**. None are currently muted.

### Breakdown by Issue Type

| Issue Type | Count | Category Breakdown |
|---|---|---|
| **Stale** | 9 | All data (9 data, 0 steering, 0 nomination) |
| **Never Seen** | 122 | 66 data + 56 steering |
| **Error** | 0 | -- |

### Stale Integrations (9 issues -- data not flowing)

These are the most actionable issues -- data was once flowing but has stopped:

| # | Asset | Staleness | Last Success | First Seen |
|---|---|---|---|---|
| 1 | *(no asset linked)* | **166h ago** | 2026-03-27 09:45 | 2026-03-27 |
| 2 | *(no asset linked)* | **166h ago** | 2026-03-27 09:45 | 2026-03-27 |
| 3 | *(no asset linked)* | **168h ago** | 2026-03-27 07:45 | 2026-03-24 |
| 4 | *(no asset linked)* | **166h ago** | 2026-03-27 09:45 | 2026-03-27 |
| 5 | Brugge III_4 (wind turbine) | **66h ago** | 2026-03-31 13:47 | 2026-03-27 |
| 6 | Perwez II_1 (wind turbine) | **66h ago** | 2026-03-31 13:56 | 2026-03-30 |
| 7 | Perwez II_2 (wind turbine) | **66h ago** | 2026-03-31 13:56 | 2026-03-30 |
| 8 | Eeklo - Maldegem_1 (wind turbine) | **84h ago** | 2026-03-30 20:27 | 2026-03-30 |
| 9 | 541448860017683825 (grid connection) | **84h ago** | 2026-03-30 20:27 | 2026-03-30 |

**Key observations about stale issues:**
- 4 integrations have no asset linked and have been stale for ~166-168 hours (since March 27). These are likely parent/shared API integrations.
- 3 wind turbines (Brugge III_4, Perwez II_1, Perwez II_2) went stale ~66h ago (since March 31).
- 2 assets (Eeklo - Maldegem_1 wind turbine + a grid connection) went stale ~84h ago (since March 30).
- None of the stale issues have error messages -- the data simply stopped arriving without explicit errors.

### Never-Seen Integrations (122 issues -- no data ever received)

These integrations have been configured but have never received any data:

**Steering -- never seen (56 assets):**
All wind turbine assets have API steering integrations that have never received any activity. Affected sites include: Arendonk, Balen (1-2), Bassenge (1-9), Beltanco, Berlare (1-4), Brugge III (1-7), Brugge IV, Eeklo-Maldegem (1-4), Evergem, Gistel, Hannut (1-3), Ieper (O3, O6), Kallo, Maldegem (1-7), Middelkerke, Perwez II (1-2), Zedelgem, Zele (1-2).

**Data -- never seen (66 assets):**
Same set of wind turbine assets plus several grid connections (identified by EAN numbers) that have API data integrations configured but have never received data. This includes assets like Arendonk_1, Balen_1-2, Bassenge_1-9, Beltanco_1, Berlare_1-4, Brugge III (1-7), Brugge IV_1, Eeklo-Maldegem (1-4), Evergem_1, Gistel_1, Hannut (1-3), Ieper (O3, O6), Kallo_1, Maldegem (1-7), Middelkerke_1, Perwez II (1-2), Zedelgem_1, Zele (1-2), plus ~18 grid connections identified by EAN pipe-separated pairs.

### Conclusion

Elicio has **no erroring integrations** but has significant issues:

1. **9 stale data integrations** that previously worked but have stopped sending data (66-168 hours stale). The most recent failures started around March 30-31 for specific turbines and grid connections.

2. **122 never-seen integrations** across both data and steering categories, suggesting that the majority of Elicio's API integrations were configured but the external data source has never pushed data to them. This could indicate a setup that is still in onboarding/commissioning, or a misconfigured API integration pipeline on Elicio's side.

3. **No muted issues** -- nothing has been suppressed, so all issues are actively flagged.

The most urgent items to investigate are the 4 unlinked stale integrations (stale 166-168h) and the 5 asset-specific stale integrations (stale 66-84h), as these represent data that was once flowing and has since stopped.
