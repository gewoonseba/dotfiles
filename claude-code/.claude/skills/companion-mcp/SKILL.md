---
name: companion-mcp
description: Use this skill when you need to create, view, edit, or manage assets, contracts, and their relations in the companion.energy platform via the Companion MCP server. Trigger this skill whenever the user mentions Companion.energy, energy assets, asset management, energy contracts, grid connections, batteries, solar panels, wind turbines, or any operation on the Companion platform — even if they don't explicitly say "MCP" or "companion".
---

Follow these steps when a user wants to manage assets in the Companion.Energy platform. All interactions use Companion MCP tools — no curl commands or API keys are needed.

## Identifying the Companion MCP

The Companion MCP may be connected under different names depending on the environment. Look for an available MCP whose name contains "companion" or "Companion". Common prefixes:

- `mcp__companion-prd__` — local production MCP
- `mcp__claude_ai_Companion_energy_DEV__` — remote DEV MCP
- `mcp__claude_ai_Companion_energy_TST__` — remote TST MCP

Use whichever is connected. All tool suffixes (e.g., `get_customers`, `create_asset`) are the same across environments — only the prefix differs. Throughout this skill, tool names are referenced by their suffix only (e.g., `get_customers`). Prepend the correct prefix when calling them.

If no Companion MCP is connected, ask the user to run `/mcp` in the prompt to authenticate.

## Handling errors from the MCP

Some MCP connections (especially remote ones like the claude.ai DEV/TST integrations) have serialization limitations:

- **Endpoints returning arrays** (`get_all_assets`, `get_assets_tree`, `get_all_locations`, `get_all_asset_configs`, `get_integrations`, `get_asset_integrations`) may fail or return empty output. This is a known issue with remote MCPs — not an indication that the customer has no data.
- **Endpoints returning null** (`get_asset_steering_config` when no steering is configured) may error with "Unexpected return type: NoneType". This means no steering is configured — treat it as null/empty.
- **Paginated endpoints** (`get_customers`, `get_contracts`) and **single-object endpoints** (`get_asset`, `get_asset_config`, `get_contract`) work reliably everywhere.

When an array endpoint fails, fall back to alternative approaches described below.

## Discovering assets by name

Users will often refer to assets by name (e.g., "the Balen asset"). You need to resolve the name to a UUID. Use these strategies in order:

1. **`get_all_assets`** — the direct approach. Returns a flat list of all assets with name and UUID. Works on local MCP, may fail on remote MCPs.
2. **`get_contracts` filter_options** — call `get_contracts` with just the `customer_id`. The response includes a `filter_options.assets` array with `{"uuid": "...", "name": "..."}` for every asset that has contracts. This works on all MCPs because the response is a paginated wrapper, not a raw array.
3. **`get_asset`** — if you already have the UUID from a previous call, use this to get full asset details.

## 1. Customer selection

Call `get_customers` to list all customers. Each customer has `id`, `name`, and `customer_type`. Let the user pick one. Use the selected `id` as `customer_id` in all subsequent calls.

If the user already knows their customer name, use the `search` parameter to filter.

## 2. Main actions

Once a customer is selected, offer the user these actions in a loop:

- **View assets** — display the asset hierarchy (tree structure)
- **View all assets** — display a flat list of all assets
- **View all asset configs** — display configurations for all assets
- **View asset data** — view sensor data, steering signals, and access power for an asset
- **Create asset** — create a new asset
- **Edit asset** — modify an existing asset
- **Delete asset** — delete one or more assets
- **Manage relations** — assign/unassign parent-child relationships
- **View contracts** — list all contracts for the customer
- **Create contract** — create a new contract on an asset
- **Edit contract** — update an existing contract
- **View all customers** — list all customers on the platform
- **View all organizations** — list all organizations on the platform

**Confirmation before mutating calls**: Before executing any create, update, or delete operation, show the user a clear, human-readable summary of the changes (e.g. a simple table or short description with asset name, type, key config values, location, integrations, etc.). Do NOT show raw JSON by default — only show JSON if the user explicitly requests it. Do NOT execute the call until the user approves.

---

## View assets

Call `get_assets_tree` with the selected `customer_id`.

The response is a list of root asset objects, each with structure:
```json
{
  "asset_element": {
    "uuid": "...",
    "name": "...",
    "type": "...",
    "label": "...",
    "location_uuid": "..." | null
  },
  "children": {
    "contains": [/* child asset objects */],
    "sum": [/* child asset objects */],
    "diff": [/* child asset objects */]
  },
  "integrations": [
    {
      "integration_uuid": "...",
      "integration_type": "...",
      "is_operational": true,
      "reasons": []
    }
  ]
}
```

Children have the same structure, recursively nested. Display as a tree showing name, type, relation type for children, and integration count.

---

## View all assets

Call `get_all_assets` with the selected `customer_id`.

Returns a flat list of `Asset` objects (no hierarchy). Useful when you need a simple list of all assets with their UUIDs.

Display as a table showing: name, type, label, and UUID. Exclude `customer_uuid`, `legacy_uuid_id`, and `legacy_int_id` from display.

---

## View all asset configs

Call `get_all_asset_configs` with the selected `customer_id`.

Returns a list of `{asset_uuid, asset_config}` objects. The `asset_config` is a discriminated union — its fields depend on the `type` value.

Display as a table showing: asset UUID, type, and key config values. Cross-reference with the asset list to show asset names instead of raw UUIDs when possible.

---

## View asset data

Call `get_asset_data` with:
- `customer_id`: the selected customer
- `asset_id`: UUID of the asset
- `start_datetime`: ISO 8601 datetime (e.g. `2025-01-01T00:00:00`)
- `end_datetime`: ISO 8601 datetime (e.g. `2025-01-31T23:59:59`)

**Display guidance**:
- **Sensors**: Show a summary table with sensor type, unit, direction, integration type, granularity, data point count, and `total_kwh` metric if available. Only show individual data points if the user explicitly asks for them (there can be thousands).
- **Steering**: Show whether steering is active and the datetime of the last steering signal. Only show individual signal values if the user asks.
- **Access power**: Show the access power value(s) in kW.

---

## Get location

Call `get_location` with `customer_id` and `location_id`.

Display the location details: name, address/zip code, country, coordinates (if available), and timezone.

---

## Create asset

### Asset types

The user must select an asset type. Valid types:
- Physical: `grid connection`, `battery`, `solar panels`, `wind turbine`, `flexible load`, `e-boiler`, `ev charger`, `energy meter`, `thermal storage`, `biomass boiler`
- Virtual (no location): `energy group`, `visual group`, `steering group`

### Name and label

Ask for asset name and label (label defaults to name).

### Location

For virtual asset types (`energy group`, `visual group`, `steering group`), location is not applicable — skip this step.

For physical asset types, the user can:
- **Create new**: Call `create_location` with `customer_id` and `address` (geocoded server-side)
- **Use existing**: Call `get_all_locations` with `customer_id` to list existing locations
- **Skip**: no location

**Exception**: `grid connection` assets **require** a location (needed to fetch DSO info). Do not allow skipping location for grid connections.

### Asset-specific configuration

Each type has its own config. The `type` discriminator field must be included and its value must exactly match the asset type string. Required fields per type:

| Type | Required fields |
|------|----------------|
| grid connection | `dso_uuid`, `dso_region_uuid`, `dso_connection_type_uuid` (from DSO info), `physical_power_kw_injection`, `physical_power_kw_consumption`, `is_nominated` |
| battery | `capacity_kwh`, `efficiency` (0-1), `max_charge_rate_kw`, `max_discharge_rate_kw` |
| solar panels | `capacity_kw` |
| wind turbine | `capacity_kw` (optional) |
| flexible load | `capacity_kw` |
| e-boiler | `max_power_kw`, `efficiency` (0-1) |
| ev charger | `capacity_kw`, `current_type` (AC/DC), `number_of_ports` (all optional) |
| energy meter | `is_nominated` |
| thermal storage | `capacity_kwh`, `min_capacity_kwh`, `heat_loss_rate` (0-1), optional: `min_temperature`, `max_temperature`, `thermal_capacity_per_kwh`, `temperature_unit` |
| biomass boiler | `max_power_kw`, `efficiency` (0-1), `cost_product_id` |
| energy group | `is_nominated` |
| visual group | (none) |
| steering group | (none) |

For grid connections, fetch DSO info with `get_dso_info` using `customer_id` and `location_uuid`. Follow this selection order:
1. Present `dso_list` and let the user pick a DSO -> use its UUID as `dso_uuid`
2. Filter `dso_region_dict` by the selected DSO and let the user pick a region -> use its UUID as `dso_region_uuid`
3. Filter `dso_connection_type_dict` by the selected region and let the user pick a connection type -> use its UUID as `dso_connection_type_uuid`

### Steering configuration

Only for steerable types: `battery`, `solar panels`, `wind turbine`, `flexible load`.

Structure: `{"active": bool, "config": {...}}`. The `type` field in the steering config must exactly match the asset type string.

| Type | Config fields |
|------|--------------|
| battery | `min_soc` (0-1), `max_soc` (0-1), `self_consumption` (bool), optional: `battery_delta`, `battery_gamma` |
| solar panels | `self_consumption` (bool) |
| wind turbine | (just `type`) |
| flexible load | (just `type`) |

### Integrations

Fetch allowed types with `get_allowed_integrations_per_asset_type` using `customer_id` and `asset_type`.

Two ways to add integrations:
1. **Create new**: configure type-specific fields (see integration types below)
2. **Reuse existing**: Call `get_integrations` with `customer_id` to list existing integrations

### Integration types and their config fields

The `type` field in integration config must exactly match the integration type string.

| Type | Fields |
|------|--------|
| fluvius, lynx, sibelga | `offtake: {ean: "..."}`, `injection: {ean: "..."}` |
| engie | `consumption_ean`, `injection_ean` |
| api | `granularity` (1T/5T/15T/30T/1H/1D), `integration_frequency` (realtime/batch) |
| eniris | `serial_number`, `site_id` (optional) |
| teleport | `asset_identifier`, `teleport_hash_id` |
| huawei_fusion_solar | `station_code`, `username`, `password_reference` |
| huawei_net_eco | `station_code`, `username`, `password_reference`, `host`, `port` |
| octave | `site_id` |
| smappee | `service_location_id`, `username`, `channel_in` (optional), `channel_out` (optional) |
| cioc | `site_key` |

### Create request

Call `create_asset` with:
- `customer_id`
- `name`
- `asset_type`
- `location_uuid` (or null)
- `asset_config`: `{ "type": "...", ... }`
- `steering_config`: `{ "active": true, "config": { "type": "...", ... } }` or null
- `integrations`: array of integration config objects or existing integration UUID strings

---

## Edit asset

### Fetch current state

Select an asset (use the "Discovering assets by name" strategies above if needed), then fetch its details with these calls (run in parallel):

1. `get_asset` — returns asset details + timezone
2. `get_asset_config` — returns asset config with `type` discriminator
3. `get_asset_integrations` — returns linked integrations (empty/no output = no integrations)
4. `get_asset_steering_config` — returns steering config (null/error = no steering configured)

If `get_asset_integrations` returns empty output or errors, treat it as "no integrations linked". If `get_asset_steering_config` errors with "NoneType" or similar, treat it as "no steering configured".

Pre-fill all form fields with current values (name, label, location, config, steering, integrations).

**Note**: The `asset_type` is immutable after creation and cannot be changed during editing.

### Integration editing

The update call requires ALL desired integrations in the list. Missing integrations are **unlinked**. Three modes:

| Scenario | Request format | Effect |
|----------|---------------|--------|
| Keep unchanged | `{"integration_id": "uuid"}` | No config change, stays linked |
| Update config | `{"integration_id": "uuid", "config": {"type": "...", ...}}` | Updates the integration config |
| Create new | `{"config": {"type": "...", ...}}` | Creates and links a new integration |
| Remove | Omit from list | Integration is unlinked from asset |

### Update request

Call `update_asset` with:
- `asset_id`
- `customer_id`
- `name` (optional)
- `location_uuid` (optional)
- `asset_config` (optional)
- `steering_config` (optional)
- `integrations` (optional — but if provided, treated as complete desired state)

---

## Manage relations

Relations define parent-child asset hierarchy. Fetch the tree with `get_assets_tree` to see current structure. If the tree endpoint fails (remote MCP), use the "Discovering assets by name" strategies to identify the relevant assets.

### Assign or unassign

Call `batch_update_asset_assignments` with `customer_id` and `assignments` array. Each assignment:
```json
{
  "asset_uuid": "<child-uuid>",
  "parent_asset_uuid": "<parent-uuid>",
  "relation_type": "contains",
  "deleted": false
}
```

- Relation types: `contains`, `sum`, `diff`
- Set `"deleted": true` to unassign a child from its parent
- When assigning, exclude assets that are already children of the selected parent

---

## Delete asset

There is no dedicated MCP delete tool. If the user needs to delete an asset, inform them that asset deletion should be done through the Companion.energy dashboard UI.

---

## View contracts

Call `get_contracts` with `customer_id`. Supports filtering via optional parameters:
- `asset_uuid`: only contracts for a specific asset
- `contract_type`: filter by type (e.g., `["hedge", "dynamic"]`)
- `supplier`: filter by supplier name
- `active_on`: ISO date — only contracts active on that date
- `search`: free-text search on contract name and supplier
- `page`, `page_size`, `sort_by`, `sort_order`: pagination and sorting

The response includes a `filter_options` object with:
- `assets`: array of `{"uuid": "...", "name": "..."}` — all assets that have contracts. This is useful for resolving asset names to UUIDs when `get_all_assets` is unavailable.
- `contract_types`: list of contract types present
- `suppliers`: list of supplier names present

Display contracts in a readable table showing: name, type, category (cost/revenue), supplier, asset name, start/end dates. Group by asset if there are many.

To view a single contract: call `get_contract` with `customer_id` and `contract_id`.

---

## Create contract

### Required fields

Ask the user for:
- **Asset**: which asset the contract belongs to (select from tree)
- **Name**: contract name
- **Supplier**: supplier name
- **Start date** and **End date**: in `YYYY-MM-DD` format
- **Category**: `cost` or `revenue`
- **Type**: one of the contract types below

### Contract types and their parameters

The `type` field in parameters must exactly match the contract type string.

| Type | Parameters `type` value | Required fields |
|------|------------------------|-----------------|
| hedge | `"hedge"` | `price` (float), `amount` (float), `unit` (`"kW"` or `"kWh"`), `sensor_direction` |
| dynamic | `"dynamic"` | `scaling` (float), `constant` (float), `sensor_direction`, `contract_direction` |
| PPA | `"PPA"` | `price` (float), `quantity_scaling` (float), `producing_asset_uuid` (UUID), `meter_location` (`"onsite"` or `"offsite"`), `ppa_type` (`"pay-as-consumed"` or `"pay-as-produced"`) |
| virtual PPA | `"virtual PPA"` | `producing_asset_uuid` (UUID), `price` (float), `quantity_scaling` (float), `meter_location` (`"onsite"` or `"offsite"`), `ppa_type` (`"pay-as-consumed"` or `"pay-as-produced"`) |
| variable | `"variable"` | `scaling` (float), `constant` (float), `sensor_direction`, `contract_direction`, `period` (`"daily"`, `"weekly"`, `"monthly"`, `"quarterly"`, `"yearly"`) |
| fixed revenue | `"fixed revenue"` | `price` (float, EUR/MWh) |
| fixed guarantees of origin | `"fixed guarantees of origin"` | `price` (float, EUR/MWh), `volume` (float, MWh) |
| flexible guarantees of origin | `"flexible guarantees of origin"` | `price` (float, EUR/MWh) |
| energy revenue | `"energy revenue"` | `ref_price_start_date` (date), `ref_price_end_date` (date), `scaling` (float), `constant` (float), `period`, `load_type` |
| market data revenue | `"market data revenue"` | (none beyond `type`) |
| grid losses compensation | `"grid losses compensation"` | `grid_loss_rate` (float, %) |
| energy tax | `"energy tax"` | `price_per_mwh` (float) |
| fixed costs | `"fixed costs"` | `cost` (float, EUR/year) |
| peak demand charges | `"peak demand charges"` | `unit_rate` (float, EUR/kW), optional: `peak_period` (`"monthly"`, `"quarterly"`, `"yearly"`), `multiplier_formula` (str) |
| imbalance | `"imbalance"` | `scaling` (float), `constant` (float), `sensor_direction` |
| futures hedge | `"futures hedge"` | `period`, `load_type`, `amount` (float), `unit` (`"kW"` or `"kWh"`), `supplier_markup_scaling_factor` (float), `supplier_markup_constant_per_mwh` (float), `buy_start_date` (date), `buy_end_date` (date), `sensor_direction` |
| percentual hedge | `"percentual hedge"` | `sensor_direction`, `power_percentage` (float), `price_per_mwh` (float), `supplier_markup_scaling_factor` (float), `supplier_markup_constant_per_mwh` (float) |
| supplier markup | `"supplier markup"` | `price` (float, EUR/MWh) |
| imbalance cost market baseline | `"imbalance cost market baseline"` | `sensor_direction`, `price_per_mwh` (float, EUR/MWh) |
| access power | `"access power"` | `regular_cost` (float, EUR/kW/month), optional: `access_capacity` (float, kW) |

**Enum values used in parameters:**
- `sensor_direction`: `"in"`, `"out"`, `"bidirectional"`, `"undefined"`
- `contract_direction`: `"buy"`, `"sell"`, `"not applicable"`
- `period` (FuturePeriod): `"YEAR"`, `"QUARTER"`, `"MONTH"`, `"WEEK"`
- `load_type` (FutureLoadType): `"BASE"`, `"PEAK"`, `"OFF_PEAK"`

### Optional: time window configuration

If the contract applies only during specific times, include `time_window_config`:

- **Time interval**:
  ```json
  {
    "type": "time_interval",
    "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "time_start_inclusive": "08:00:00",
    "time_end_exclusive": "20:00:00",
    "within_or_outside": "within"
  }
  ```

- **Always**: `{"type": "always"}`

### Create request

Call `create_contract` with all required fields as direct parameters.

---

## Edit contract

Call `update_contract` with `contract_id`, `customer_id`, and all contract fields (this is a full replacement, not a partial patch). Fetch the current contract first with `get_contract` to pre-fill values.

---

## View all customers

Call `get_customers`. Supports `search`, `page`, `page_size`, `sort_by`, and `sort_order` parameters.

Display as a table showing: name, id, customer_type, subscription.

---

## View all organizations

Call `get_organizations`.

Display as a table showing: name, id, type, subscription.
