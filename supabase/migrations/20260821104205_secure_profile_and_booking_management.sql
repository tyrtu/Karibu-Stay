/*
# Secure profile columns and add booking management functions

1. Security Changes
- Profiles: users can no longer UPDATE their role or verification_status columns. Only full_name, phone, and avatar_url remain client-writable. INSERT still allows setting the initial role at signup.
- Bookings: all direct browser writes remain revoked (done in prior migration). New SECURITY DEFINER functions handle host confirm/cancel and guest cancel and system complete.
- Reviews: direct browser writes remain available to authenticated guests only, scoped by the existing policies.

2. New Functions
- confirm_booking(booking_id): host moves a pending booking to confirmed.
- cancel_booking(booking_id): guest or host moves a booking to cancelled.
- complete_booking(booking_id): host moves a confirmed booking with a past check-out to completed.

3. Important Notes
- Payment is intentionally not part of this release. Bookings move from pending to confirmed by host action, then to completed after check-out.
*/

REVOKE UPDATE ON profiles FROM anon, authenticated;
GRANT UPDATE (full_name, phone, avatar_url) ON profiles TO authenticated;

CREATE OR REPLACE FUNCTION confirm_booking(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_listing_host uuid;
BEGIN
  SELECT listings.host_id INTO v_listing_host
  FROM bookings
  JOIN listings ON listings.id = bookings.listing_id
  WHERE bookings.id = p_booking_id;

  IF v_listing_host IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> v_listing_host THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE bookings SET status = 'confirmed' WHERE id = p_booking_id AND status = 'pending';
END;
$$;

REVOKE EXECUTE ON FUNCTION confirm_booking FROM anon;
GRANT EXECUTE ON FUNCTION confirm_booking TO authenticated;

CREATE OR REPLACE FUNCTION cancel_booking(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_guest uuid;
  v_host uuid;
BEGIN
  SELECT bookings.guest_id, listings.host_id INTO v_guest, v_host
  FROM bookings
  LEFT JOIN listings ON listings.id = bookings.listing_id
  WHERE bookings.id = p_booking_id;

  IF v_guest IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF auth.uid() IS NULL OR (auth.uid() <> v_guest AND auth.uid() <> v_host) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE bookings SET status = 'cancelled' WHERE id = p_booking_id AND status IN ('pending', 'confirmed');
END;
$$;

REVOKE EXECUTE ON FUNCTION cancel_booking FROM anon;
GRANT EXECUTE ON FUNCTION cancel_booking TO authenticated;

CREATE OR REPLACE FUNCTION complete_booking(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_host uuid;
  v_check_out date;
  v_status text;
BEGIN
  SELECT listings.host_id, bookings.check_out, bookings.status INTO v_host, v_check_out, v_status
  FROM bookings
  JOIN listings ON listings.id = bookings.listing_id
  WHERE bookings.id = p_booking_id;

  IF v_host IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> v_host THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_status <> 'confirmed' THEN
    RAISE EXCEPTION 'Only confirmed bookings can be completed';
  END IF;

  IF v_check_out >= CURRENT_DATE THEN
    RAISE EXCEPTION 'Booking can only be completed after check-out';
  END IF;

  UPDATE bookings SET status = 'completed' WHERE id = p_booking_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION complete_booking FROM anon;
GRANT EXECUTE ON FUNCTION complete_booking TO authenticated;
