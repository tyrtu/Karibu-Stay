/*
# Add Talanta Stadium as a tournament venue with nearby stays

1. New Venue
- `venues` row for Talanta Stadium (Kenya), at its Ngong Road location.
- Added only if no venue with that name exists yet.

2. New Listings
- 5 new published stays near Talanta Stadium, each linked to it as both the venue and the nearest venue.
- Each has a host, price per night, capacity, amenities, house rules, cancellation policy, distance, and map coordinates.

3. New Listing Images
- Each new stay gets 4 to 5 gallery photos, with the first marked as the cover.

4. Security
- No table, policy, or grant changes. Existing row level security applies unchanged.

5. Important Notes
- Listing ids are fixed and inserts use ON CONFLICT / NOT EXISTS, so re-running is safe.
- The venue is looked up by name, not by stored id, so a rebuild from empty stays consistent.
*/

INSERT INTO venues (name, city, country, latitude, longitude)
SELECT 'Talanta Stadium', 'Kenya', 'Kenya', -1.30611, 36.75028
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name = 'Talanta Stadium');

INSERT INTO listings (id, host_id, venue_id, nearest_venue_id, title, description, property_type, address,
  distance_to_venue_km, price_per_night, max_guests, bedrooms, bathrooms, amenities, house_rules, cancellation_policy,
  status, latitude, longitude)
VALUES
  ('a0000000-0000-4000-8000-000000000017', 'f5744017-b91b-4464-bee3-c46aef0050ad',
    (SELECT id FROM venues WHERE name = 'Talanta Stadium'), (SELECT id FROM venues WHERE name = 'Talanta Stadium'),
    'Ngong Road Garden Apartment', 'A bright one-bedroom apartment a short walk from Talanta Stadium, with a private balcony, a modern kitchen, and fast internet for working between matches.',
    'apartment', 'Ngong Road, Nairobi', 0.8, 6500, 3, 1, 1,
    ARRAY['Fast Wi-Fi','Balcony','Air conditioning','Free parking','Fully equipped kitchen','Backup generator'],
    'No smoking indoors. Quiet hours after 10 PM.', 'flexible', 'published', -1.3000, 36.7520),
  ('a0000000-0000-4000-8000-000000000018', 'f5744017-b91b-4464-bee3-c46aef0050ad',
    (SELECT id FROM venues WHERE name = 'Talanta Stadium'), (SELECT id FROM venues WHERE name = 'Talanta Stadium'),
    'Jamhuri Family Homestay', 'A family homestay near Jamhuri Grounds with a large garden, three bedrooms, and a covered outdoor dining area. Parking for two cars on site.',
    'homestay', 'Jamhuri Estate, Nairobi', 1.6, 8900, 6, 3, 2,
    ARRAY['Garden','Free parking','Fast Wi-Fi','Fully equipped kitchen','Outdoor dining','24-hour security'],
    'Keep the garden gate closed. Quiet hours after 10 PM.', 'moderate', 'published', -1.2960, 36.7490),
  ('a0000000-0000-4000-8000-000000000019', 'f5744017-b91b-4464-bee3-c46aef0050ad',
    (SELECT id FROM venues WHERE name = 'Talanta Stadium'), (SELECT id FROM venues WHERE name = 'Talanta Stadium'),
    'Dagoretti Corner Hotel Room', 'A comfortable hotel-style room at Dagoretti Corner with a queen bed, a workspace, and a private bathroom. Matatu and taxi stops within easy reach.',
    'hotel_room', 'Dagoretti Corner, Nairobi', 1.9, 4900, 2, 1, 1,
    ARRAY['Fast Wi-Fi','Air conditioning','Smart TV','Daily housekeeping','24-hour security'],
    'Valid ID required at check-in.', 'flexible', 'published', -1.3020, 36.7380),
  ('a0000000-0000-4000-8000-000000000020', 'f5744017-b91b-4464-bee3-c46aef0050ad',
    (SELECT id FROM venues WHERE name = 'Talanta Stadium'), (SELECT id FROM venues WHERE name = 'Talanta Stadium'),
    'Kilimani Hillside Apartment', 'A modern two-bedroom apartment in Kilimani with a lift, a fully equipped open kitchen, and a balcony overlooking leafy streets.',
    'apartment', 'Kilimani, Nairobi', 4.2, 7800, 4, 2, 2,
    ARRAY['Lift','Balcony','Fast Wi-Fi','Free parking','Air conditioning','Fully equipped kitchen','24-hour security'],
    'No parties. Guests must sign in with the building desk.', 'moderate', 'published', -1.2920, 36.7830),
  ('a0000000-0000-4000-8000-000000000021', 'f5744017-b91b-4464-bee3-c46aef0050ad',
    (SELECT id FROM venues WHERE name = 'Talanta Stadium'), (SELECT id FROM venues WHERE name = 'Talanta Stadium'),
    'Karen Garden Homestay', 'A peaceful homestay in Karen with a sunny brick-walled garden, three bedrooms, and a terrace for evening meals. A calm base a short drive from the stadium.',
    'homestay', 'Karen, Nairobi', 5.6, 9200, 6, 3, 2,
    ARRAY['Garden','Free parking','Fast Wi-Fi','Breakfast included','Daily housekeeping','Backup generator'],
    'No parties. Pets not allowed.', 'flexible', 'published', -1.3190, 36.7090)
ON CONFLICT (id) DO NOTHING;

INSERT INTO listing_images (listing_id, url, alt_text, sort_order, is_cover)
SELECT v.lid::uuid, v.url, v.alt, v.ord, v.cover
FROM (VALUES
  ('a0000000-0000-4000-8000-000000000017', 'https://images.pexels.com/photos/6758284/pexels-photo-6758284.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Sofa and round tables in a modern apartment', 0, true),
  ('a0000000-0000-4000-8000-000000000017', 'https://images.pexels.com/photos/7745929/pexels-photo-7745929.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Modern bedroom with large bed and balcony access', 1, false),
  ('a0000000-0000-4000-8000-000000000017', 'https://images.pexels.com/photos/7587864/pexels-photo-7587864.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Contemporary blue kitchen with granite island', 2, false),
  ('a0000000-0000-4000-8000-000000000017', 'https://images.pexels.com/photos/6394530/pexels-photo-6394530.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Modern bathroom with shower cabin and mirror', 3, false),
  ('a0000000-0000-4000-8000-000000000018', 'https://images.pexels.com/photos/8143671/pexels-photo-8143671.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Elegant home with garden and pool', 0, true),
  ('a0000000-0000-4000-8000-000000000018', 'https://images.pexels.com/photos/6489117/pexels-photo-6489117.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Modern living area with TV and dining table', 1, false),
  ('a0000000-0000-4000-8000-000000000018', 'https://images.pexels.com/photos/8082564/pexels-photo-8082564.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Luxurious hotel-style bedroom', 2, false),
  ('a0000000-0000-4000-8000-000000000018', 'https://images.pexels.com/photos/6186828/pexels-photo-6186828.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Modern kitchen with counter and cabinets', 3, false),
  ('a0000000-0000-4000-8000-000000000018', 'https://images.pexels.com/photos/7045352/pexels-photo-7045352.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Sleek bathroom with wood paneling and bathtub', 4, false),
  ('a0000000-0000-4000-8000-000000000019', 'https://images.pexels.com/photos/6394651/pexels-photo-6394651.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Hotel suite bed with robes and warm lights', 0, true),
  ('a0000000-0000-4000-8000-000000000019', 'https://images.pexels.com/photos/28011238/pexels-photo-28011238.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Modern hotel room with double bed and workspace', 1, false),
  ('a0000000-0000-4000-8000-000000000019', 'https://images.pexels.com/photos/6899357/pexels-photo-6899357.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Bright washroom with shower and sink', 2, false),
  ('a0000000-0000-4000-8000-000000000019', 'https://images.pexels.com/photos/8089172/pexels-photo-8089172.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Open-plan living room with modern design', 3, false),
  ('a0000000-0000-4000-8000-000000000020', 'https://images.pexels.com/photos/8135496/pexels-photo-8135496.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Open-plan living room with modern lighting', 0, true),
  ('a0000000-0000-4000-8000-000000000020', 'https://images.pexels.com/photos/6585602/pexels-photo-6585602.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Minimalist bedroom with wooden furniture', 1, false),
  ('a0000000-0000-4000-8000-000000000020', 'https://images.pexels.com/photos/6969875/pexels-photo-6969875.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Kitchen with central island and marble counters', 2, false),
  ('a0000000-0000-4000-8000-000000000020', 'https://images.pexels.com/photos/6492399/pexels-photo-6492399.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Bathroom with marble tiles and shower', 3, false),
  ('a0000000-0000-4000-8000-000000000021', 'https://images.pexels.com/photos/20350326/pexels-photo-20350326.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Sunny brick-walled garden with potted plants', 0, true),
  ('a0000000-0000-4000-8000-000000000021', 'https://images.pexels.com/photos/5435195/pexels-photo-5435195.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Home surrounded by lush exotic plants', 1, false),
  ('a0000000-0000-4000-8000-000000000021', 'https://images.pexels.com/photos/6920439/pexels-photo-6920439.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Open-plan living room with corner sofa', 2, false),
  ('a0000000-0000-4000-8000-000000000021', 'https://images.pexels.com/photos/7045356/pexels-photo-7045356.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Stylish kitchen with wooden cabinets', 3, false),
  ('a0000000-0000-4000-8000-000000000021', 'https://images.pexels.com/photos/7045358/pexels-photo-7045358.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Modern bathroom with wooden accents', 4, false)
) AS v(lid, url, alt, ord, cover)
WHERE NOT EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = v.lid::uuid);
