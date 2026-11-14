import { useEffect, useState } from 'react';
import { CalendarDays, Clock, Loader2, Star, Users, X } from 'lucide-react';
import type { BookingRecord } from '@/lib/bookings';
import { formatDateRange, formatTimeRemaining } from '@/lib/dates';

const REVIEW_MIN = 20;
const REVIEW_MAX = 500;

type Props = {
  bookings: BookingRecord[];
  reviewedBookingIds: Set<string>;
  loading?: boolean;
  onCancel: (bookingId: string) => void;
  onReview: (bookingId: string, listingId: string, rating: number, comment: string) => void;
  onSignIn: () => void;
  signedIn: boolean;
};

/** Ticking countdown displayed on pending bookings that have an expires_at. */
function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => formatTimeRemaining(expiresAt));

  useEffect(() => {
    if (!remaining) return;
    const interval = setInterval(() => {
      const next = formatTimeRemaining(expiresAt);
      setRemaining(next);
      if (!next) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, remaining]);

  if (!remaining) {
    return (
      <span className="expiry-badge expiry-expired">
        <Clock size={11} /> Expired — host did not respond in time
      </span>
    );
  }
  return (
    <span className="expiry-badge">
      <Clock size={11} /> Host must confirm within {remaining}
    </span>
  );
}

/** Clickable 5-star rating row. */
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="star-rating" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star-btn ${star <= (hovered || value) ? 'active' : ''}`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          aria-pressed={star === value}
        >
          <Star size={22} fill={star <= (hovered || value) ? 'currentColor' : 'none'} strokeWidth={1.5} />
        </button>
      ))}
      <span className="star-label">
        {hovered || value
          ? ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][hovered || value]
          : 'Tap to rate'}
      </span>
    </div>
  );
}

export default function TripsPanel({ bookings, reviewedBookingIds, loading, onCancel, onReview, onSignIn, signedIn }: Props) {
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  const charsLeft = REVIEW_MAX - reviewComment.length;
  const tooShort = reviewComment.trim().length > 0 && reviewComment.trim().length < REVIEW_MIN;

  if (!signedIn) {
    return (
      <section className="page-section">
        <div className="eyebrow"><span className="eyebrow-line" /> YOUR TRIPS</div>
        <h2 className="page-title">Your trips live here.</h2>
        <p className="page-intro">Sign in to see your booking requests and past stays.</p>
        <button className="primary-button" onClick={onSignIn}>Sign in</button>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="page-section">
        <div className="eyebrow"><span className="eyebrow-line" /> YOUR TRIPS</div>
        <h2 className="page-title">Your bookings.</h2>
        <p className="page-intro">
          <Loader2 size={15} className="spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />
          Loading your trips…
        </p>
      </section>
    );
  }

  if (bookings.length === 0) {
    return (
      <section className="page-section">
        <div className="eyebrow"><span className="eyebrow-line" /> YOUR TRIPS</div>
        <h2 className="page-title">No trips yet.</h2>
        <p className="page-intro">When you send a booking request, it will appear here with its status.</p>
      </section>
    );
  }

  const openReview = (id: string) => {
    setReviewingId(id);
    setReviewRating(5);
    setReviewComment('');
    setReviewError('');
  };

  const submitReview = (booking: BookingRecord) => {
    if (!reviewComment.trim()) { setReviewError('Please write a few words about your stay.'); return; }
    if (reviewComment.trim().length < REVIEW_MIN) { setReviewError(`Your review needs at least ${REVIEW_MIN} characters.`); return; }
    if (!booking.listing?.id) { setReviewError('We could not identify the listing for this booking.'); return; }
    onReview(booking.id, booking.listing.id, reviewRating, reviewComment.trim());
    setReviewingId(null);
    setReviewComment('');
  };

  return (
    <section className="page-section" id="trips">
      <div className="eyebrow"><span className="eyebrow-line" /> YOUR TRIPS</div>
      <h2 className="page-title">Your bookings.</h2>
      <p className="page-intro">Track your requests, confirmations, and completed stays.</p>
      <div className="booking-list">
        {bookings.map((booking) => (
          <div className="booking-card" key={booking.id}>
            <div className="booking-card-head">
              <div>
                <h3>{booking.listing?.title ?? 'A stay'}</h3>
                <p>{booking.listing?.address ?? ''}</p>
              </div>
              <span className={`status-badge ${booking.status}`}>{booking.status}</span>
            </div>
            <div className="booking-card-meta">
              <span><CalendarDays size={14} /> {formatDateRange(booking.check_in, booking.check_out)}</span>
              <span><Users size={14} /> {booking.guest_count} guest{booking.guest_count > 1 ? 's' : ''}</span>
              <span>KSh {Number(booking.total_price).toLocaleString()}</span>
            </div>

            {booking.status === 'pending' && booking.expires_at && (
              <ExpiryCountdown expiresAt={booking.expires_at} />
            )}

            <div className="booking-card-actions">
              {(booking.status === 'pending' || booking.status === 'confirmed') && (
                cancelConfirmId === booking.id ? (
                  <>
                    <span className="confirm-text">Cancel this booking?</span>
                    <button className="outline-button small danger" onClick={() => { onCancel(booking.id); setCancelConfirmId(null); }}>Yes, cancel</button>
                    <button className="outline-button small" onClick={() => setCancelConfirmId(null)}>No</button>
                  </>
                ) : (
                  <button className="outline-button small" onClick={() => setCancelConfirmId(booking.id)}>Cancel</button>
                )
              )}
              {booking.status === 'completed' && !reviewedBookingIds.has(booking.id) && (
                <button className="outline-button small" onClick={() => openReview(booking.id)}>Leave a review</button>
              )}
            </div>

            {reviewingId === booking.id && (
              <div className="review-form">
                <button className="review-close" onClick={() => setReviewingId(null)} aria-label="Close review"><X size={15} /></button>

                {/* Star rating */}
                <div className="review-rating-row">
                  <span className="review-field-label">RATING</span>
                  <StarRating value={reviewRating} onChange={setReviewRating} />
                </div>

                {/* Comment with counter */}
                <label className="review-comment-label">
                  <span className="review-field-label">YOUR REVIEW</span>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => {
                      if (e.target.value.length <= REVIEW_MAX) setReviewComment(e.target.value);
                    }}
                    placeholder="What was your stay like? Share details to help future guests."
                    aria-describedby={`review-counter-${booking.id}`}
                  />
                  <div className="review-counter-row" id={`review-counter-${booking.id}`}>
                    {tooShort && (
                      <span className="review-counter-min">At least {REVIEW_MIN} characters</span>
                    )}
                    <span className={`review-char-count ${charsLeft < 50 ? 'review-char-count-warn' : ''}`}>
                      {charsLeft} left
                    </span>
                  </div>
                </label>

                {reviewError && <p className="auth-error">{reviewError}</p>}
                <button
                  className="primary-button"
                  onClick={() => submitReview(booking)}
                  disabled={tooShort}
                >
                  <Star size={15} /> Submit review
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
