/*
# Seed published listings with multi-image galleries

Adds four fully-detailed published listings near different tournament venues,
each with 4-6 images covering living areas, bedrooms, kitchens, bathrooms,
and outdoor spaces. Uses the existing host profile.
*/

DO $$
DECLARE
  v_host uuid := 'f5744017-b91b-4464-bee3-c46aef0050ad';
  v_kasarani uuid := '908d9853-a95f-4935-9051-0d2918b316d7';
  v_nyayo uuid := '2103f5c9-cfae-43ad-a247-e0172f67e57b';
  v_mandela uuid := 'ffd4533b-b7a9-4b25-a372-6c83f2c1a41b';
  v_mkapa uuid := '80dcf683-ad85-49d0-87c0-97c06dee8685';
  l1 uuid; l2 uuid; l3 uuid; l4 uuid;
BEGIN
  -- Listing 1: The Olive House (apartment near Kasarani)
  INSERT INTO listings (id, host_id, venue_id, nearest_venue_id, title, description, property_type, address,
    distance_to_venue_km, price_per_night, max_guests, bedrooms, bathrooms, amenities, house_rules, cancellation_policy, status)
  VALUES (
    gen_random_uuid(), v_host, v_kasarani, v_kasarani, 'The Olive House',
    'A sun-filled two-bedroom apartment in Kilimani with floor-to-ceiling windows, a modern kitchen, and a private balcony overlooking the city. Walking distance to cafes and a short ride to Kasarani Stadium. Perfect for couples or small families attending tournament events.',
    'apartment', 'Kilimani, Nairobi', 1.8, 7500, 4, 2, 2,
    ARRAY['Fast Wi-Fi','Self check-in','Air conditioning','Free parking','Smart TV','Fully equipped kitchen','Washing machine'],
    'No smoking indoors. Quiet hours after 10 PM.', 'moderate', 'published'
  ) RETURNING id INTO l1;

  INSERT INTO listing_images (listing_id, url, alt_text, sort_order, is_cover) VALUES
    (l1, 'https://images.pexels.com/photos/6585598/pexels-photo-6585598.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Living room with comfortable sofa and dining zone', 0, true),
    (l1, 'https://images.pexels.com/photos/6585757/pexels-photo-6585757.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Bright modern bedroom with pendant lamps', 1, false),
    (l1, 'https://images.pexels.com/photos/7166645/pexels-photo-7166645.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Contemporary kitchen with sleek cabinets', 2, false),
    (l1, 'https://images.pexels.com/photos/6957081/pexels-photo-6957081.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Modern bathroom with round ceramic bathtub', 3, false),
    (l1, 'https://images.pexels.com/photos/13871246/pexels-photo-13871246.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Private balcony with seating area', 4, false);

  -- Listing 2: Safi Studio (apartment near Kasarani)
  INSERT INTO listings (id, host_id, venue_id, nearest_venue_id, title, description, property_type, address,
    distance_to_venue_km, price_per_night, max_guests, bedrooms, bathrooms, amenities, house_rules, cancellation_policy, status)
  VALUES (
    gen_random_uuid(), v_host, v_kasarani, v_kasarani, 'Safi Studio',
    'A sleek studio apartment in Westlands designed for the modern traveller. Features a dedicated workspace, building pool access, and a gym. Ideal for solo travellers or couples who want comfort and convenience close to the action.',
    'apartment', 'Westlands, Nairobi', 3.2, 6200, 2, 1, 1,
    ARRAY['Fast Wi-Fi','Workspace desk','Pool access','Gym access','Coffee machine','Air conditioning','Lift'],
    'No parties or loud music. Guests must use the building pass at all times.', 'strict', 'published'
  ) RETURNING id INTO l2;

  INSERT INTO listing_images (listing_id, url, alt_text, sort_order, is_cover) VALUES
    (l2, 'https://images.pexels.com/photos/7587828/pexels-photo-7587828.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Spacious studio living area with brick walls', 0, true),
    (l2, 'https://images.pexels.com/photos/30767888/pexels-photo-30767888.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Stylish bedroom area with warm tones', 1, false),
    (l2, 'https://images.pexels.com/photos/6908565/pexels-photo-6908565.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Contemporary kitchenette with wooden accents', 2, false),
    (l2, 'https://images.pexels.com/photos/8082195/pexels-photo-8082195.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Elegant bathroom with marble tiles', 3, false);

  -- Listing 3: Maji House (guesthouse near Nyayo)
  INSERT INTO listings (id, host_id, venue_id, nearest_venue_id, title, description, property_type, address,
    distance_to_venue_km, price_per_night, max_guests, bedrooms, bathrooms, amenities, house_rules, cancellation_policy, status)
  VALUES (
    gen_random_uuid(), v_host, v_nyayo, v_nyayo, 'Maji House',
    'A charming guesthouse in Lavington with a lush garden, swimming pool, and daily breakfast included. Three spacious bedrooms and an open-plan living area make it perfect for groups and families. A 15-minute drive to Nyayo National Stadium.',
    'guesthouse', 'Lavington, Nairobi', 4.6, 8900, 6, 3, 2,
    ARRAY['Swimming pool','Breakfast included','Garden','Fast Wi-Fi','Free parking','Air conditioning','Pet friendly','Daily housekeeping'],
    'Pets welcome but must be supervised in the garden. Pool hours 7 AM to 9 PM.', 'moderate', 'published'
  ) RETURNING id INTO l3;

  INSERT INTO listing_images (listing_id, url, alt_text, sort_order, is_cover) VALUES
    (l3, 'https://images.pexels.com/photos/8134745/pexels-photo-8134745.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Guesthouse exterior with swimming pool and garden', 0, true),
    (l3, 'https://images.pexels.com/photos/6920439/pexels-photo-6920439.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Open-plan living room with corner sofa', 1, false),
    (l3, 'https://images.pexels.com/photos/35203563/pexels-photo-35203563.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Elegant bedroom with classic furnishings', 2, false),
    (l3, 'https://images.pexels.com/photos/7045356/pexels-photo-7045356.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Stylish kitchen with wooden cabinets', 3, false),
    (l3, 'https://images.pexels.com/photos/7031840/pexels-photo-7031840.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Modern bathroom with glass shower cabin', 4, false),
    (l3, 'https://images.pexels.com/photos/14024758/pexels-photo-14024758.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Garden patio with rattan chairs', 5, false);

  -- Listing 4: Bahari Villa (homestay near Mandela National Stadium, Uganda)
  INSERT INTO listings (id, host_id, venue_id, nearest_venue_id, title, description, property_type, address,
    distance_to_venue_km, price_per_night, max_guests, bedrooms, bathrooms, amenities, house_rules, cancellation_policy, status)
  VALUES (
    gen_random_uuid(), v_host, v_mandela, v_mandela, 'Bahari Villa',
    'A spacious four-bedroom homestay in Kampala with a private infinity pool, landscaped garden, and 24-hour security. Perfect for larger groups attending events at Mandela National Stadium, just 2.5 km away. Includes a full kitchen and outdoor dining area.',
    'homestay', 'Naguru, Kampala', 2.5, 9500, 8, 4, 3,
    ARRAY['Swimming pool','Fast Wi-Fi','Free parking','Air conditioning','Fully equipped kitchen','Garden','24-hour security','Outdoor dining','Backup generator'],
    'No smoking indoors. Pool towels provided. Generator runs during power outages.', 'flexible', 'published'
  ) RETURNING id INTO l4;

  INSERT INTO listing_images (listing_id, url, alt_text, sort_order, is_cover) VALUES
    (l4, 'https://images.pexels.com/photos/12715456/pexels-photo-12715456.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Villa exterior with infinity pool', 0, true),
    (l4, 'https://images.pexels.com/photos/7546648/pexels-photo-7546648.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Stylish living room with blue couch and TV', 1, false),
    (l4, 'https://images.pexels.com/photos/36708054/pexels-photo-36708054.png?auto=compress&cs=tinysrgb&h=650&w=940', 'Modern bedroom with contemporary design', 2, false),
    (l4, 'https://images.pexels.com/photos/4221389/pexels-photo-4221389.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Contemporary kitchen with stainless steel appliances', 3, false),
    (l4, 'https://images.pexels.com/photos/6903210/pexels-photo-6903210.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Contemporary bathroom with modern bathtub', 4, false),
    (l4, 'https://images.pexels.com/photos/11315954/pexels-photo-11315954.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'Outdoor dining patio with wicker chairs', 5, false);
END $$;
