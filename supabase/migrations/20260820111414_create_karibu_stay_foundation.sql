/*
# Create Karibu Stay foundation schema and published discovery data

1. New Tables
- `profiles` stores account display details and the guest/host/admin role.
- `venues` stores tournament venues and their city coordinates.
- `listings` stores host-owned stays, pricing, availability status, and proximity to a venue.
- `listing_images` stores ordered listing gallery images.
- `bookings` stores guest booking requests and confirmed date ranges.
- `payments` stores server-created payment records for bookings.
- `host_verifications` stores host identity review status.
- `reviews` stores post-stay guest ratings and comments.
- `price_guardrails` stores venue-specific price caps during the tournament window.

2. Security
- Row Level Security is enabled on every table.
- Published listings, venues, listing images, and approved reviews are readable publicly.
- Authenticated users can only manage their own profile, listings, bookings, verifications, and reviews.
- Payment records are not writable by browser clients.

3. Important Notes
- The first release does not include sign-in screens yet, so public discovery remains available to the anonymous role.
- Seed rows are inserted only when their unique names are not already present.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  role text NOT NULL DEFAULT 'guest' CHECK (role IN ('guest', 'host', 'admin')),
  avatar_url text,
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  city text NOT NULL CHECK (city IN ('Kenya', 'Uganda', 'Tanzania')),
  country text NOT NULL,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  property_type text NOT NULL CHECK (property_type IN ('apartment', 'guesthouse', 'homestay', 'hotel_room')),
  address text NOT NULL,
  latitude double precision,
  longitude double precision,
  nearest_venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
  distance_to_venue_km numeric NOT NULL CHECK (distance_to_venue_km >= 0),
  price_per_night numeric NOT NULL CHECK (price_per_night > 0),
  max_guests integer NOT NULL CHECK (max_guests > 0),
  bedrooms integer NOT NULL DEFAULT 1 CHECK (bedrooms > 0),
  bathrooms integer NOT NULL DEFAULT 1 CHECK (bathrooms > 0),
  amenities text[] NOT NULL DEFAULT '{}',
  house_rules text,
  cancellation_policy text NOT NULL DEFAULT 'moderate',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  is_cover boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  guest_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guest_count integer NOT NULL CHECK (guest_count > 0),
  nightly_rate numeric NOT NULL CHECK (nightly_rate > 0),
  total_price numeric NOT NULL CHECK (total_price > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_booking_dates CHECK (check_out > check_in)
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE RESTRICT,
  provider text NOT NULL DEFAULT 'mpesa' CHECK (provider IN ('mpesa', 'card')),
  provider_request_id text,
  provider_receipt_number text,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'KES',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS host_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  id_document_url text,
  selfie_url text,
  phone_verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_guardrails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  effective_start date NOT NULL,
  effective_end date NOT NULL,
  max_price_multiplier numeric NOT NULL DEFAULT 1.5 CHECK (max_price_multiplier >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_guardrail_dates CHECK (effective_end >= effective_start),
  UNIQUE (venue_id, effective_start, effective_end)
);

CREATE INDEX IF NOT EXISTS listings_status_venue_idx ON listings (status, nearest_venue_id, distance_to_venue_km);
CREATE INDEX IF NOT EXISTS listings_host_idx ON listings (host_id);
CREATE INDEX IF NOT EXISTS listing_images_listing_idx ON listing_images (listing_id, sort_order);
CREATE INDEX IF NOT EXISTS bookings_listing_dates_idx ON bookings (listing_id, check_in, check_out, status);
CREATE INDEX IF NOT EXISTS reviews_listing_idx ON reviews (listing_id, created_at DESC);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_guardrails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read venues" ON venues;
CREATE POLICY "public read venues" ON venues FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public read published listings" ON listings;
CREATE POLICY "public read published listings" ON listings FOR SELECT TO anon, authenticated USING (status = 'published');
DROP POLICY IF EXISTS "hosts insert own listings" ON listings;
CREATE POLICY "hosts insert own listings" ON listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
DROP POLICY IF EXISTS "hosts update own listings" ON listings;
CREATE POLICY "hosts update own listings" ON listings FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
DROP POLICY IF EXISTS "hosts delete own listings" ON listings;
CREATE POLICY "hosts delete own listings" ON listings FOR DELETE TO authenticated USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "public read published listing images" ON listing_images;
CREATE POLICY "public read published listing images" ON listing_images FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_images.listing_id AND listings.status = 'published'));
DROP POLICY IF EXISTS "hosts manage own listing images" ON listing_images;
CREATE POLICY "hosts manage own listing images" ON listing_images FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_images.listing_id AND listings.host_id = auth.uid()));
DROP POLICY IF EXISTS "hosts update own listing images" ON listing_images;
CREATE POLICY "hosts update own listing images" ON listing_images FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_images.listing_id AND listings.host_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_images.listing_id AND listings.host_id = auth.uid()));
DROP POLICY IF EXISTS "hosts delete own listing images" ON listing_images;
CREATE POLICY "hosts delete own listing images" ON listing_images FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_images.listing_id AND listings.host_id = auth.uid()));

DROP POLICY IF EXISTS "users read own profile" ON profiles;
CREATE POLICY "users read own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "users insert own profile" ON profiles;
CREATE POLICY "users insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "users update own profile" ON profiles;
CREATE POLICY "users update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "users read own bookings" ON bookings;
CREATE POLICY "users read own bookings" ON bookings FOR SELECT TO authenticated USING (auth.uid() = guest_id OR EXISTS (SELECT 1 FROM listings WHERE listings.id = bookings.listing_id AND listings.host_id = auth.uid()));
DROP POLICY IF EXISTS "guests create own bookings" ON bookings;
CREATE POLICY "guests create own bookings" ON bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = guest_id);
DROP POLICY IF EXISTS "guests update own bookings" ON bookings;
CREATE POLICY "guests update own bookings" ON bookings FOR UPDATE TO authenticated USING (auth.uid() = guest_id OR EXISTS (SELECT 1 FROM listings WHERE listings.id = bookings.listing_id AND listings.host_id = auth.uid())) WITH CHECK (auth.uid() = guest_id OR EXISTS (SELECT 1 FROM listings WHERE listings.id = bookings.listing_id AND listings.host_id = auth.uid()));
DROP POLICY IF EXISTS "users read own verifications" ON host_verifications;
CREATE POLICY "users read own verifications" ON host_verifications FOR SELECT TO authenticated USING (auth.uid() = host_id);
DROP POLICY IF EXISTS "users create own verifications" ON host_verifications;
CREATE POLICY "users create own verifications" ON host_verifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
DROP POLICY IF EXISTS "users update own verifications" ON host_verifications;
CREATE POLICY "users update own verifications" ON host_verifications FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
DROP POLICY IF EXISTS "public read approved reviews" ON reviews;
CREATE POLICY "public read approved reviews" ON reviews FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = reviews.booking_id AND bookings.status = 'completed'));
DROP POLICY IF EXISTS "guests create own reviews" ON reviews;
CREATE POLICY "guests create own reviews" ON reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = guest_id);
DROP POLICY IF EXISTS "guests update own reviews" ON reviews;
CREATE POLICY "guests update own reviews" ON reviews FOR UPDATE TO authenticated USING (auth.uid() = guest_id) WITH CHECK (auth.uid() = guest_id);
DROP POLICY IF EXISTS "public read price guardrails" ON price_guardrails;
CREATE POLICY "public read price guardrails" ON price_guardrails FOR SELECT TO anon, authenticated USING (true);

INSERT INTO venues (name, city, country, latitude, longitude)
VALUES
  ('Kasarani Stadium', 'Kenya', 'Kenya', -1.2215, 36.8971),
  ('Nyayo National Stadium', 'Kenya', 'Kenya', -1.3021, 36.8219),
  ('Mandela National Stadium', 'Uganda', 'Uganda', 0.3644, 32.6385),
  ('Benjamin Mkapa Stadium', 'Tanzania', 'Tanzania', -6.8235, 39.2695)
ON CONFLICT (name) DO NOTHING;

INSERT INTO price_guardrails (venue_id, effective_start, effective_end, max_price_multiplier)
SELECT id, '2027-07-01', '2027-07-31', 1.5
FROM venues
WHERE name = 'Kasarani Stadium'
  AND NOT EXISTS (SELECT 1 FROM price_guardrails pg WHERE pg.venue_id = venues.id AND pg.effective_start = '2027-07-01');
