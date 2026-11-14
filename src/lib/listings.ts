import { supabase } from '@/lib/supabase';

export type ListingImage = {
  url: string;
  alt_text: string | null;
  sort_order: number;
};

export type ListingRecord = {
  id: string;
  title: string;
  description: string | null;
  property_type: 'apartment' | 'guesthouse' | 'homestay' | 'hotel_room';
  address: string;
  distance_to_venue_km: number;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  house_rules: string | null;
  cancellation_policy: string;
  latitude: number | null;
  longitude: number | null;
  venue: { name: string; city: string; latitude: number | null; longitude: number | null } | null;
  images: ListingImage[];
  host: { full_name: string | null; phone: string | null } | null;
};

const PAGE_SIZE = 12;

export async function getPublishedListings(page = 0): Promise<{ listings: ListingRecord[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE; // fetch one extra to detect hasMore

  const { data, error } = await supabase
    .from('listings')
    .select('id, title, description, property_type, address, distance_to_venue_km, price_per_night, max_guests, bedrooms, bathrooms, amenities, house_rules, cancellation_policy, latitude, longitude, venue:venues!nearest_venue_id(name, city, latitude, longitude), images:listing_images(url, alt_text, sort_order), host:profiles!host_id(full_name, phone)')
    .eq('status', 'published')
    .order('distance_to_venue_km', { ascending: true })
    .range(from, to); // inclusive, so fetches PAGE_SIZE + 1

  if (error) throw error;

  const rows = (data ?? []).map((listing) => ({
    ...listing,
    images: [...(listing.images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  })) as unknown as ListingRecord[];

  const hasMore = rows.length > PAGE_SIZE;
  return { listings: hasMore ? rows.slice(0, PAGE_SIZE) : rows, hasMore };
}
