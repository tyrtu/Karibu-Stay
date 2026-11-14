import { supabase } from '@/lib/supabase';

export type FavoriteRecord = {
  id: string;
  listing_id: string;
};

export async function getMyFavorites(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('favorites')
    .select('listing_id');
  if (error) throw error;
  return new Set((data ?? []).map((f) => f.listing_id));
}

export async function addFavorite(listingId: string): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .insert({ listing_id: listingId });
  if (error) throw error;
}

export async function removeFavorite(listingId: string): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('listing_id', listingId);
  if (error) throw error;
}
