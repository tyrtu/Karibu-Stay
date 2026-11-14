import { type FormEvent, useState } from 'react';
import { ArrowRight, CalendarDays, Users, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Venue = {
  id: number;
  name: string;
  area: string;
  distance: string;
  rate: number;
  listingId?: string;
  maxGuests?: number;
};

type Props = {
  venue: Venue;
  onClose: () => void;
  onBooked: () => void;
};

export default function BookingModal({ venue, onClose, onBooked }: Props) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestCount, setGuestCount] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nights = checkIn && checkOut ? Math.max(0, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)) : 0;
  const total = nights * venue.rate;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!venue.listingId) { setError('This preview stay cannot be booked yet.'); return; }
    if (nights < 1) { setError('Choose a check-out date after your check-in.'); return; }
    setLoading(true); setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? '';
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ listing_id: venue.listingId, check_in: checkIn, check_out: checkOut, guest_count: Number(guestCount) }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? 'We could not create the booking request.');
      }
      setLoading(false);
      onBooked();
    } catch (cause) {
      console.error('booking failed', cause);
      setError(cause instanceof Error ? cause.message : 'We could not create the booking request.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="auth-modal booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="drawer-close" onClick={onClose} aria-label="Close booking"><X size={18} /></button>
        <div className="eyebrow"><span className="eyebrow-line" /> REQUEST TO BOOK</div>
        <h2 id="booking-title">{venue.name}</h2>
        <p className="auth-intro">{venue.area} · KSh {venue.rate.toLocaleString()} per night{venue.maxGuests ? ` · up to ${venue.maxGuests} guests` : ''}</p>
        <form onSubmit={handleSubmit}>
          <div className="auth-fields">
            <label><span>CHECK-IN</span><div className="date-row"><CalendarDays size={16} /><input required type="date" min={new Date().toISOString().split('T')[0]} value={checkIn} onChange={(event) => setCheckIn(event.target.value)} /></div></label>
            <label><span>CHECK-OUT</span><div className="date-row"><CalendarDays size={16} /><input required type="date" min={checkIn || new Date().toISOString().split('T')[0]} value={checkOut} onChange={(event) => setCheckOut(event.target.value)} /></div></label>
            <label><span>GUESTS</span><div className="date-row"><Users size={16} /><input required min="1" max={venue.maxGuests ?? 20} type="number" value={guestCount} onChange={(event) => setGuestCount(event.target.value)} /></div></label>
          </div>
          {nights > 0 && (
            <div className="price-breakdown">
              <div className="price-row"><span>KSh {venue.rate.toLocaleString()} × {nights} night{nights > 1 ? 's' : ''}</span><span>KSh {total.toLocaleString()}</span></div>
              <div className="price-row total"><span>Total</span><span>KSh {total.toLocaleString()}</span></div>
            </div>
          )}
          {error && <p className="auth-error">{error}</p>}
          <button className="primary-button auth-submit" disabled={loading || !venue.listingId}>{loading ? 'Sending…' : 'Send request'} <ArrowRight size={16} /></button>
          {!venue.listingId && <p className="auth-error">This is a preview stay. Publish a listing to enable bookings.</p>}
        </form>
      </section>
    </div>
  );
}
