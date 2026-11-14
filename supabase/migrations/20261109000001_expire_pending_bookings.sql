/*
# Enforce booking expiry for pending requests

1. Adds `expire_pending_bookings()` — a SECURITY DEFINER function that cancels
   every pending booking whose `expires_at` has passed.

2. Schedules the function to run every 5 minutes via pg_cron.
   pg_cron must be enabled in the Supabase dashboard
   (Database → Extensions → pg_cron) before applying this migration.

3. Adds a partial index to make the sweep fast (only scans pending rows
   that already have an expires_at set).
*/

-- ── 1. Expiry function ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION expire_pending_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE bookings
  SET    status = 'cancelled'
  WHERE  status     = 'pending'
    AND  expires_at IS NOT NULL
    AND  expires_at < now();
END;
$$;

-- Allow the postgres role (used by the cron job) to call this function
REVOKE ALL ON FUNCTION expire_pending_bookings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION expire_pending_bookings() TO postgres;

-- ── 2. Partial index for fast expiry sweeps ──────────────────────────────────
CREATE INDEX IF NOT EXISTS bookings_pending_expires_idx
  ON bookings (expires_at)
  WHERE status = 'pending' AND expires_at IS NOT NULL;

-- ── 3. Schedule via pg_cron (runs every 5 minutes) ──────────────────────────
-- pg_cron must be enabled as a Supabase extension first.
-- If not enabled this block is skipped safely by wrapping in DO $$.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Remove any existing schedule with this name to keep migration idempotent
    PERFORM cron.unschedule('expire-pending-bookings')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'expire-pending-bookings'
    );

    PERFORM cron.schedule(
      'expire-pending-bookings',
      '*/5 * * * *',
      $$SELECT expire_pending_bookings();$$
    );
  END IF;
END;
$$;
