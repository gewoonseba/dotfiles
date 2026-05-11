# Eval 12: Integration Alert Health Check for Elicio

## Task
> Are there any integration issues for Elicio? Show me any stale or erroring integrations.

---

## Transcript

### Step 1: Read the companion-mcp skill
- **Tool**: `Read /Users/sebastianstoelen/.claude/skills/companion-mcp/SKILL.md`
- **Result**: Skill loaded. Identified DEV MCP prefix `mcp__claude_ai_Companion_energy_DEV__`. Skill instructs to call `get_customers` first, then use customer-scoped tools.

### Step 2: Load MCP tools via ToolSearch
- **Tools loaded**:
  - `mcp__claude_ai_Companion_energy_DEV__get_customers`
  - `mcp__claude_ai_Companion_energy_DEV__get_customer_integration_alert_issues`
  - `mcp__claude_ai_Companion_energy_DEV__get_integration_alert_issues`
  - `mcp__claude_ai_Companion_energy_DEV__get_integration_alert_filter_options`
  - `mcp__claude_ai_Companion_energy_DEV__get_integration_alert_issue_detail`
- **Result**: All 5 tools loaded successfully.

### Step 3: Find the Elicio customer
- **Tool**: `get_customers(search="Elicio")`
- **Response**:
```json
{
  "data": [
    {
      "id": "90ecb210-dd6b-4cfb-aac7-83e175388115",
      "name": "Elicio",
      "subscription": "propel",
      "customer_type": "live",
      "currency": "EUR"
    },
    {
      "id": "c19c28c1-e1ba-4d76-90ac-6e4d59bcf740",
      "name": "elicio test",
      "subscription": "propel",
      "customer_type": "live",
      "currency": "EUR"
    }
  ],
  "total": 2
}
```
- **Decision**: Using the main **Elicio** customer (`90ecb210-dd6b-4cfb-aac7-83e175388115`), not the test one.

### Step 4: Fetch all integration alert issues for Elicio (page 1, page_size=100)
- **Tool**: `get_customer_integration_alert_issues(customer_id="90ecb210-...", page_size=100, sort_by="last_seen", sort_order="desc")`
- **Response**: Very large (83,800 chars). Saved to temp file, parsed with Python.
- **Metrics returned**:
```json
{
  "total_active": 131,
  "total_muted": 0,
  "by_issue_type": {
    "never_seen": 122,
    "error": 0,
    "stale": 9
  },
  "by_category": {
    "data": 81,
    "steering": 50,
    "nomination": 0
  }
}
```
- **Result**: 131 total active issues across 2 pages. 100 issues retrieved on page 1.

### Step 5: Fetch page 2 of integration alert issues
- **Tool**: `get_customer_integration_alert_issues(customer_id="90ecb210-...", page=2, page_size=100)`
- **Response**: 31 additional issues, all `never_seen` type on page 2. Confirmed 131 total.

### Step 6: Fetch stale issues only (filtered)
- **Tool**: `get_customer_integration_alert_issues(customer_id="90ecb210-...", issue_type="stale", page_size=50)`
- **Response**: 9 stale issues returned with full detail including `last_success_at` timestamps and linked assets.

---

## Final Output to User

### Elicio Integration Health Summary

**Customer**: Elicio (live, propel subscription)
**Customer ID**: `90ecb210-dd6b-4cfb-aac7-83e175388115`

Elicio has **131 active integration alert issues** and **0 muted** issues. All integrations are of type **API**. Here is the breakdown:

| Issue Type   | Count | Description |
|-------------|-------|-------------|
| **never_seen** | 122 | Integrations that have never received any data or steering activity |
| **stale**      | 9   | Integrations where data has gone stale (no recent updates) |
| **error**      | 0   | No error-type issues |

By category:

| Category     | Count |
|-------------|-------|
| **data**       | 81  |
| **steering**   | 50  |
| **nomination** | 0   |

---

### Stale Integrations (9 total) -- Highest Priority

These integrations were previously receiving data but have stopped. All are **data** category, **API** integration type:

| # | Asset | Asset Type | Last Successful Data | Hours Stale | Stale Since |
|---|-------|------------|---------------------|-------------|-------------|
| 1 | *(unlinked asset)* | -- | 2026-03-27 09:45 | ~166h | 2026-03-27 |
| 2 | *(unlinked asset)* | -- | 2026-03-27 09:45 | ~166h | 2026-03-27 |
| 3 | *(unlinked asset)* | -- | 2026-03-27 07:45 | ~168h | 2026-03-24 |
| 4 | *(unlinked asset)* | -- | 2026-03-27 09:45 | ~166h | 2026-03-27 |
| 5 | **Brugge III_4** | wind turbine | 2026-03-31 13:47 | ~66h | 2026-03-27 |
| 6 | **Perwez II_1** | wind turbine | 2026-03-31 13:56 | ~66h | 2026-03-30 |
| 7 | **Perwez II_2** | wind turbine | 2026-03-31 13:56 | ~66h | 2026-03-30 |
| 8 | **Eeklo - Maldegem_1** | wind turbine | 2026-03-30 20:27 | ~84h | 2026-03-30 |
| 9 | **541448860017683825\|541448860017683818** | grid connection | 2026-03-30 20:27 | ~84h | 2026-03-30 |

**Key observations about stale integrations:**
- **4 integrations** (rows 1-4) have no linked asset and have been stale for **~166-168 hours** (roughly 7 days). These are the most concerning -- they may be orphaned integrations with no associated asset.
- **3 wind turbines** (Brugge III_4, Perwez II_1, Perwez II_2) stopped receiving data ~66 hours ago (since around March 31).
- **Eeklo - Maldegem_1** (wind turbine) and a **grid connection** stopped receiving data ~84 hours ago (since around March 30).
- None of the stale issues have any associated error messages (`last_error_at` and `last_error_message` are null), suggesting the data simply stopped arriving rather than failing with an error.

---

### Never-Seen Integrations (122 total) -- Bulk Issue

The vast majority of issues (122 out of 131) are `never_seen`, meaning these integrations have **never received any data**. They break down as:

- **72 data integrations** that have never delivered data
- **50 steering integrations** that have never received steering signals

These affect nearly every wind turbine asset in the Elicio portfolio, including sites at: Arendonk, Balen, Bassenge (1-9), Beltanco, Berlare (1-4), Brugge III (1-7), Brugge IV, Eeklo-Maldegem (1-4), Evergem, Gistel, Hannut (1-3), Ieper, Kallo, Maldegem (1-7), Middelkerke, Perwez II (1-2), Zedelgem, Zele (1-2), plus several EAN-identified grid connections.

All `never_seen` issues were first detected on **2026-04-01** (data) or **2026-03-27** (steering), suggesting these integrations may have been recently configured but the data pipeline was never activated or connected.

---

### Error Integrations

There are **0 error-type** issues. No integrations are actively returning errors.

---

### Recommendations

1. **Investigate the 4 unlinked stale integrations** -- these have no associated asset and have been stale for 7 days. They may need to be cleaned up or reassigned.
2. **Check the data pipeline for Brugge III_4, Perwez II_1, Perwez II_2** -- data stopped ~66h ago (March 31). Verify the API source is still sending data.
3. **Check Eeklo - Maldegem_1 and its grid connection** -- stale for ~84h since March 30.
4. **Address the 122 never_seen integrations** -- this is a systemic issue. The API integrations appear to be configured but never activated. This likely requires coordination with Elicio's data provider to start pushing data and steering signals.
