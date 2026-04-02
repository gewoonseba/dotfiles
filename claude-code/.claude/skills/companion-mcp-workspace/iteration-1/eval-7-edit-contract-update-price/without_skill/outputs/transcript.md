# Eval 7: Edit Contract - Update Dynamic Contract Price on Elicio Arendonk

## Task
Update the dynamic contract on Elicio's Arendonk asset: change the scaling factor to 1.05 and the constant to 2.50.

## Tools Loaded
Used `ToolSearch` to load the following MCP tools before calling them:
- `mcp__claude_ai_Companion_energy_DEV__get_customers`
- `mcp__claude_ai_Companion_energy_DEV__get_all_assets`
- `mcp__claude_ai_Companion_energy_DEV__get_contracts`
- `mcp__claude_ai_Companion_energy_DEV__update_contract`

## Step 1: Find Elicio as a customer

**Call:**
```
mcp__claude_ai_Companion_energy_DEV__get_customers(search="Elicio")
```

**Result:** MCP server unreachable -- all calls returned `Error calling tool 'get_customers': Request error: [Errno -2] Name or service not known`. Retried 4 times with same result.

The DNS resolution failure indicates the Companion Energy DEV MCP server is currently down or the network cannot resolve its hostname.

## Planned Steps (what would have been executed if the server were reachable)

### Step 1: Find Elicio customer ID
```
mcp__claude_ai_Companion_energy_DEV__get_customers(search="Elicio")
```
Expected: Returns a paginated list with Elicio's organization, including its `id` (UUID).

### Step 2: List assets for Elicio and find the Arendonk asset
```
mcp__claude_ai_Companion_energy_DEV__get_all_assets(customer_id="<elicio_customer_id>")
```
Expected: Returns flat list of all assets. Filter for one containing "Arendonk" in the name to get its `uuid`.

### Step 3: List dynamic contracts on the Arendonk asset
```
mcp__claude_ai_Companion_energy_DEV__get_contracts(
    customer_id="<elicio_customer_id>",
    asset_uuid="<arendonk_asset_uuid>",
    contract_type=["dynamic"]
)
```
Expected: Returns the dynamic contract(s) on Arendonk, including:
- `contract.uuid` (the contract ID)
- `contract.name`
- `contract.supplier`
- `contract.start_date` / `contract.end_date`
- `contract.category` (cost or revenue)
- `contract.type` ("dynamic")
- `contract.parameters` with current `scaling`, `constant`, `sensor_direction`, `contract_direction`
- `contract.time_window_config`
- `contract.product_id`

### Step 4: Review current contract values
Inspect the returned contract to confirm:
- Current scaling factor value (to be changed to 1.05)
- Current constant value (to be changed to 2.50)
- All other fields that must be preserved in the full-replace update

### Step 5: WOULD execute update (STOPPED HERE - test run)
The `update_contract` tool is a full-replace operation. The call would be:
```
mcp__claude_ai_Companion_energy_DEV__update_contract(
    contract_id="<dynamic_contract_uuid>",
    customer_id="<elicio_customer_id>",
    name="<existing_contract_name>",
    asset_uuid="<arendonk_asset_uuid>",
    supplier="<existing_supplier>",
    start_date="<existing_start_date>",
    end_date="<existing_end_date>",
    category="<existing_category>",   // e.g. "cost"
    type="dynamic",
    parameters={
        "type": "dynamic",
        "scaling": 1.05,              // <-- UPDATED from old value
        "constant": 2.50,             // <-- UPDATED from old value
        "sensor_direction": "<existing_sensor_direction>",
        "contract_direction": "<existing_contract_direction>"
    },
    time_window_config=<existing_time_window_config_or_null>,
    product_id=<existing_product_id_or_null>
)
```

**This mutation was NOT executed** because:
1. This is a test run -- instructions say to stop before executing create/update/delete mutations.
2. The MCP server was unreachable, so we could not retrieve the actual contract data needed to populate the preserved fields.

## Key Observations

- **Dynamic contract parameters** for the `update_contract` call require: `type` ("dynamic"), `scaling`, `constant`, `sensor_direction`, and `contract_direction`. Only `scaling` and `constant` are changing; the rest must be preserved from the existing contract.
- The `update_contract` endpoint is a **full replacement**, not a partial patch. All fields from the existing contract must be echoed back, with only `scaling` and `constant` modified.
- The workflow required 3 read calls (get_customers, get_all_assets, get_contracts) followed by 1 mutation call (update_contract).
- The MCP server was unreachable due to DNS resolution failure (`[Errno -2] Name or service not known`), preventing any actual data retrieval or mutation.

## Summary

| Step | Action | Status |
|------|--------|--------|
| 1 | Find Elicio customer | FAILED (server unreachable) |
| 2 | Find Arendonk asset | NOT ATTEMPTED (blocked by step 1) |
| 3 | Find dynamic contract on Arendonk | NOT ATTEMPTED (blocked by step 2) |
| 4 | Review current contract parameters | NOT ATTEMPTED (blocked by step 3) |
| 5 | Update contract (scaling=1.05, constant=2.50) | WOULD NOT EXECUTE (test run) |
