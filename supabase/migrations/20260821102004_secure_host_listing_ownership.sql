/*
# Secure host-owned listing inserts

1. Modified Table
- `listings.host_id` now defaults to the currently signed-in account.

2. Security
- Host listing inserts no longer need the browser to provide an owner value.
- The existing insert policy still requires the resulting owner to match auth.uid().

3. Important Notes
- This preserves the existing listing data and only adds a safer default for new rows.
*/

ALTER TABLE listings ALTER COLUMN host_id SET DEFAULT auth.uid();
