import { supabase } from '@/lib/supabase';

export type ReviewRecord = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  guest: { full_name: string | null } | null;
};

export async function getMyReviewIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('reviews').select('booking_id');
  if (error) return new Set();
  return new Set((data ?? []).map((r) => r.booking_id as string));
}

export async function getListingReviews(listingId: string): Promise<ReviewRecord[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, guest:profiles!guest_id(full_name)')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ReviewRecord[];
}

export type ReviewAggregate = {
  listing_id: string;
  avg_rating: number;
  review_count: number;
};

export async function getReviewAggregates(listingIds: string[]): Promise<Map<string, ReviewAggregate>> {
  if (listingIds.length === 0) return new Map();

  const { data, error } = await supabase.rpc('get_review_aggregates', {
    p_listing_ids: listingIds,
  });

  if (error) return new Map();

  const map = new Map<string, ReviewAggregate>();
  for (const row of data ?? []) {
    map.set(row.listing_id as string, {
      listing_id: row.listing_id as string,
      avg_rating: Number(row.avg_rating),
      review_count: Number(row.review_count),
    });
  }
  return map;
}

export async function createReview(bookingId: string, listingId: string, rating: number, comment: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('You must be signed in to leave a review.');
  const { error } = await supabase.from('reviews').insert({ booking_id: bookingId, listing_id: listingId, guest_id: userData.user.id, rating, comment });
  if (error) throw error;
}
