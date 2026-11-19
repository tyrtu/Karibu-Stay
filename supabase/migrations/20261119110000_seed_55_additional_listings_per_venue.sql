/*
# Seed 55 additional published listings per venue

Adds 55 generated listings for every venue present when the migration runs.
The deterministic ids make the migration safe to re-run without duplicating
listings or their galleries.
*/

DO $$
DECLARE
  v_host uuid := '36dc7905-2dc3-440a-9453-95ff62133662';
BEGIN
  INSERT INTO listings (
    id, host_id, venue_id, nearest_venue_id, title, description, property_type,
    address, distance_to_venue_km, price_per_night, max_guests, bedrooms,
    bathrooms, amenities, house_rules, cancellation_policy, status, latitude,
    longitude
  )
  SELECT
    md5('karibu-extra-listing:' || v.id::text || ':' || s.number)::uuid,
    v_host,
    v.id,
    v.id,
    'Tournament Stay ' || s.number || ' - ' || v.name,
    'A comfortable ' ||
      CASE s.number % 4
        WHEN 0 THEN 'apartment'
        WHEN 1 THEN 'guesthouse'
        WHEN 2 THEN 'homestay'
        ELSE 'hotel room'
      END ||
      ' near ' || v.name || ', with reliable Wi-Fi and easy access to local transport and match-day activities.',
    (ARRAY['apartment', 'guesthouse', 'homestay', 'hotel_room'])[(s.number % 4) + 1],
    v.name || ' area ' || s.number,
    round((0.6 + ((s.number * 7) % 90) / 10.0)::numeric, 1),
    4500 + ((s.number * 375) % 6000),
    1 + (s.number % 7),
    1 + (s.number % 4),
    1 + (s.number % 3),
    CASE s.number % 4
      WHEN 0 THEN ARRAY['Fast Wi-Fi', 'Air conditioning', 'Fully equipped kitchen', 'Self check-in']
      WHEN 1 THEN ARRAY['Fast Wi-Fi', 'Breakfast included', 'Daily housekeeping', '24-hour security']
      WHEN 2 THEN ARRAY['Fast Wi-Fi', 'Garden', 'Free parking', 'Outdoor dining']
      ELSE ARRAY['Fast Wi-Fi', 'Air conditioning', 'Smart TV', 'Daily housekeeping']
    END,
    CASE s.number % 3
      WHEN 0 THEN 'No smoking indoors. Quiet hours after 10 PM.'
      WHEN 1 THEN 'No parties. Visitors must be registered with the host.'
      ELSE 'Please keep shared areas tidy. Check-out by 11 AM.'
    END,
    (ARRAY['flexible', 'moderate', 'strict'])[(s.number % 3) + 1],
    'published',
    v.latitude + ((s.number % 11) - 5) * 0.0015,
    v.longitude + (((s.number * 3) % 11) - 5) * 0.0015
  FROM venues v
  CROSS JOIN generate_series(1, 55) AS s(number)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO listing_images (listing_id, url, alt_text, sort_order, is_cover)
  SELECT
    md5('karibu-extra-listing:' || v.id::text || ':' || s.number)::uuid,
    image.url,
    'Interior of tournament stay ' || s.number || ' near ' || v.name,
    image.sort_order,
    image.sort_order = 0
  FROM venues v
  CROSS JOIN generate_series(1, 55) AS s(number)
  CROSS JOIN LATERAL (
    VALUES
      ('https://images.pexels.com/photos/6585599/pexels-photo-6585599.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 0),
      ('https://images.pexels.com/photos/6434612/pexels-photo-6434612.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 1),
      ('https://images.pexels.com/photos/7195739/pexels-photo-7195739.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 2),
      ('https://images.pexels.com/photos/6394530/pexels-photo-6394530.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 3)
  ) AS image(url, sort_order)
  WHERE EXISTS (
    SELECT 1
    FROM listings l
    WHERE l.id = md5('karibu-extra-listing:' || v.id::text || ':' || s.number)::uuid
  )
  AND NOT EXISTS (
    SELECT 1
    FROM listing_images li
    WHERE li.listing_id = md5('karibu-extra-listing:' || v.id::text || ':' || s.number)::uuid
      AND li.sort_order = image.sort_order
  );
END $$;
