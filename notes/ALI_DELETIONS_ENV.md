# ALI Deletions – Environment Variables

Used by the Super Admin Deletions API (`/api/ali/admin/deletions/*`) and wipe behaviour.

| Variable | Purpose |
| -------- | ------- |
| `ALLOW_ALI_DELETIONS` | Must be `true` to enable dry-run and initiate. If unset, endpoints return 503 "Deletions disabled." |
| `ALLOW_ALI_FULL_WIPE` | Must be `true` to allow "wipe all". Also requires `confirm_wipe_all: true` in the request body. |
| `ALI_WIPE_IDS` | Comma-separated company UUIDs for "wipe list". Companies matching these IDs are deleted. |
| `ALI_WIPE_NAMES` | Comma-separated company names for "wipe list". Companies with these exact names are deleted. |

- **Wipe list:** Dry-run / execute with `resource_type: 'wipe_list'`. Uses `ALI_WIPE_IDS` and/or `ALI_WIPE_NAMES`.
- **Wipe all:** Dry-run / execute with `resource_type: 'wipe_all'`. Deletes all ALI tenant data (except question bank). Requires `ALLOW_ALI_FULL_WIPE=true` and UI checkbox confirmation.

See the Wipe ALI Test Data plan for full behaviour and implementation order.
