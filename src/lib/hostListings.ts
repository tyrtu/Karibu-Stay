import { supabase } from '@/lib/supabase';

export type HostListingRecord = {
  id: string;
  title: string;
  property_type: 'apartment' | 'guesthouse' | 'homestay' | 'hotel_room';
  address: string;
  distance_to_venue_km: number;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  description: string | null;
  house_rules: string | null;
  cancellation_policy: string;
  latitude: number | null;
  longitude: number | null;
  nearest_venue_id: string;
  status: 'draft' | 'published' | 'suspended';
  venue: { name: string } | null;
};

export type ListingUpdatePayload = {
  title: string;
  property_type: 'apartment' | 'guesthouse' | 'homestay' | 'hotel_room';
  address: string;
  nearest_venue_id: string;
  venue_id: string;
  distance_to_venue_km: number;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  description: string;
  house_rules: string | null;
  cancellation_policy: string;
  latitude: number | null;
  longitude: number | null;
};

export async function getMyListings(): Promise<HostListingRecord[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(
      'id, title, property_type, address, distance_to_venue_km, price_per_night, ' +
      'max_guests, bedrooms, bathrooms, amenities, description, house_rules, ' +
      'cancellation_policy, latitude, longitude, nearest_venue_id, status, ' +
      'venue:venues!nearest_venue_id(name)',
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as HostListingRecord[];
}

export async function updateListing(listingId: string, payload: ListingUpdatePayload): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', listingId);
  if (error) throw error;
}

export async function updateListingStatus(listingId: string, status: 'draft' | 'published'): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', listingId);
  if (error) throw error;
}

export async function deleteListing(listingId: string): Promise<void> {
  const { error } = await supabase.from('listings').delete().eq('id', listingId);
  if (error) throw error;
}
