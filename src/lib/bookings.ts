import { supabase } from '@/lib/supabase';

export type BookingRecord = {
  id: string;
  check_in: string;
  check_out: string;
  guest_count: number;
  nightly_rate: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  expires_at: string | null;
  listing: { id: string; title: string; address: string } | null;
  guest: { full_name: string | null } | null;
};

export async function getMyBookings(): Promise<BookingRecord[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, check_in, check_out, guest_count, nightly_rate, total_price, status, expires_at, listing:listings!listing_id(id, title, address)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  // guest is self for getMyBookings — not needed in UI, set null
  return ((data ?? []) as unknown as Omit<BookingRecord, 'guest'>[]).map((b) => ({ ...b, guest: null }));
}

export async function getIncomingBookings(): Promise<BookingRecord[]> {
  // Only return bookings for listings owned by the current user.
  // We filter server-side by joining through listings where host_id = auth.uid().
  // RLS already enforces this, but the explicit filter avoids mixing in the
  // user's own guest bookings when they are both a guest and a host.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  type RawRow = {
    id: string;
    check_in: string;
    check_out: string;
    guest_count: number;
    nightly_rate: number;
    total_price: number;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    expires_at: string | null;
    listing: { id: string; title: string; address: string; host_id: string } | null;
    guest: { full_name: string | null } | null;
  };

  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, check_in, check_out, guest_count, nightly_rate, total_price, status, expires_at, ' +
      'listing:listings!listing_id(id, title, address, host_id), ' +
      'guest:profiles!guest_id(full_name)',
    )
    .order('check_in', { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as unknown as RawRow[];

  // Filter to only bookings whose listing belongs to this user
  return rows
    .filter((b) => b.listing?.host_id === user.id)
    .map((b) => ({
      ...b,
      listing: b.listing
        ? { id: b.listing.id, title: b.listing.title, address: b.listing.address }
        : null,
      guest: b.guest ?? null,
    })) as BookingRecord[];
}

export async function confirmBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc('confirm_booking', { p_booking_id: bookingId });
  if (error) throw error;
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_booking', { p_booking_id: bookingId });
  if (error) throw error;
}

export async function completeBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc('complete_booking', { p_booking_id: bookingId });
  if (error) throw error;
}
