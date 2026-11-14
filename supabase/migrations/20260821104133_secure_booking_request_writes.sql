/*
# Secure booking request writes

1. Security Changes
- Browser roles can read only bookings they are allowed to see.
- Browser roles can no longer insert, edit, or delete booking rows directly.
- Booking requests must go through the server-side create-booking function, which verifies the signed-in guest, listing status, dates, capacity, and overlapping bookings.
- Payment rows remain server-only.

2. Important Notes
- This intentionally preserves the existing booking table and data.
- Payment is not enabled in this release; requests remain pending until a later payment flow updates them.
*/

REVOKE INSERT, UPDATE, DELETE ON bookings FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON payments FROM anon, authenticated;
