import { useState } from 'react';
import { CalendarDays, Check, House, Loader2, Pencil, Plus, UserRound, Users } from 'lucide-react';
import type { BookingRecord } from '@/lib/bookings';
import type { HostListingRecord } from '@/lib/hostListings';
import type { ProfileRecord } from '@/lib/profiles';
import type { VenueOption } from '@/lib/venues';
import { formatDateRange } from '@/lib/dates';
import ListingEditModal from '@/components/ListingEditModal';

type BookingStatusFilter = 'active' | 'completed' | 'cancelled';

const STATUS_TABS: { key: BookingStatusFilter; label: string }[] = [
  { key: 'active',    label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

type Props = {
  listings: HostListingRecord[];
  incomingBookings: BookingRecord[];
  profile: ProfileRecord | null;
  venues: VenueOption[];
  loading?: boolean;
  onConfirm: (bookingId: string) => void;
  onCancel: (bookingId: string) => void;
  onComplete: (bookingId: string) => void;
  onToggleStatus: (listingId: string, status: 'draft' | 'published') => void;
  onDelete: (listingId: string) => void;
  onListingUpdated: (updated: HostListingRecord) => void;
  onAddListing: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onVerify: () => void;
  onSignIn: () => void;
  onToast: (message: string) => void;
  signedIn: boolean;
  isHost: boolean;
};

export default function HostDashboard({
  listings, incomingBookings, profile, venues, loading,
  onConfirm, onCancel, onComplete, onToggleStatus, onDelete,
  onListingUpdated, onAddListing, onVerify, onSignIn, onToast, signedIn, isHost,
}: Props) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<HostListingRecord | null>(null);
  const [bookingFilter, setBookingFilter] = useState<BookingStatusFilter>('active');

  if (!signedIn) {
    return (
      <section className="page-section">
        <div className="eyebrow"><span className="eyebrow-line" /> HOST DASHBOARD</div>
        <h2 className="page-title">Your stays, your bookings.</h2>
        <p className="page-intro">Sign in as a host to manage your listings and booking requests.</p>
        <button className="primary-button" onClick={onSignIn}>Sign in</button>
      </section>
    );
  }

  if (!isHost) {
    return (
      <section className="page-section">
        <div className="eyebrow"><span className="eyebrow-line" /> HOST DASHBOARD</div>
        <h2 className="page-title">Hosts only.</h2>
        <p className="page-intro">You are signed in as a guest. Create a host account to list your place.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="page-section">
        <div className="eyebrow"><span className="eyebrow-line" /> HOST DASHBOARD</div>
        <h2 className="page-title">Your stays.</h2>
        <p className="page-intro">
          <Loader2 size={15} className="spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />
          Loading your dashboard…
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="page-section" id="host">
        <div className="dashboard-head">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> HOST DASHBOARD</div>
            <h2 className="page-title">Your stays.</h2>
            <p className="page-intro">Manage listings, review booking requests, and mark stays complete.</p>
            {profile && (
              <div className="verification-badge">
                <Check size={14} /> Verification: <strong>{{
                  unverified: 'Unverified',
                  pending: 'Pending review',
                  verified: 'Verified',
                  rejected: 'Not approved',
                }[profile.verification_status] ?? profile.verification_status}</strong>
                {(profile.verification_status === 'unverified' || profile.verification_status === 'rejected') && (
                  <button className="verify-cta" onClick={onVerify}>
                    Get verified →
                  </button>
                )}
              </div>
            )}
          </div>
          <button className="primary-button" onClick={onAddListing}><Plus size={16} /> Add listing</button>
        </div>

        <div className="dashboard-columns">
          {/* ── Listings column ─────────────────────────────── */}
          <div className="dashboard-column">
            <h3 className="column-title">Your listings</h3>
            {listings.length === 0 ? (
              <p className="empty-card">You have not added any stays yet.</p>
            ) : (
              <div className="listing-manage-list">
                {listings.map((listing) => (
                  <div className="listing-manage-card" key={listing.id}>
                    <div className="listing-manage-head">
                      <div>
                        <h4>{listing.title}</h4>
                        <p>{listing.address} · {listing.venue?.name ?? 'Nearby venue'}</p>
                      </div>
                      <span className={`status-badge ${listing.status}`}>{listing.status}</span>
                    </div>
                    <div className="listing-manage-meta">
                      <span>KSh {Number(listing.price_per_night).toLocaleString()}/night</span>
                      <span><Users size={13} /> {listing.max_guests}</span>
                      <span><House size={13} /> {listing.bedrooms} bed{listing.bedrooms > 1 ? 's' : ''}</span>
                      <span>{listing.distance_to_venue_km} km to venue</span>
                    </div>
                    <div className="listing-manage-actions">
                      {/* Edit */}
                      <button
                        className="outline-button small"
                        onClick={() => setEditingListing(listing)}
                        aria-label={`Edit ${listing.title}`}
                      >
                        <Pencil size={13} /> Edit
                      </button>

                      {/* Publish / Unpublish */}
                      {listing.status === 'draft' && (
                        <button className="outline-button small" onClick={() => onToggleStatus(listing.id, 'published')}>
                          Publish
                        </button>
                      )}
                      {listing.status === 'published' && (
                        <button className="outline-button small" onClick={() => onToggleStatus(listing.id, 'draft')}>
                          Unpublish
                        </button>
                      )}

                      {/* Delete with confirm */}
                      {deleteConfirmId === listing.id ? (
                        <>
                          <span className="confirm-text">Delete permanently?</span>
                          <button className="outline-button small danger" onClick={() => { onDelete(listing.id); setDeleteConfirmId(null); }}>
                            Yes, delete
                          </button>
                          <button className="outline-button small" onClick={() => setDeleteConfirmId(null)}>No</button>
                        </>
                      ) : (
                        <button className="outline-button small danger" onClick={() => setDeleteConfirmId(listing.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Bookings column ─────────────────────────────── */}
          <div className="dashboard-column">
            <h3 className="column-title">Booking requests</h3>

            {/* Status filter tabs */}
            <div className="booking-filter-tabs" role="tablist" aria-label="Filter bookings by status">
              {STATUS_TABS.map((tab) => {
                const count = incomingBookings.filter((b) =>
                  tab.key === 'active'
                    ? b.status === 'pending' || b.status === 'confirmed'
                    : b.status === tab.key,
                ).length;
                return (
                  <button
                    key={tab.key}
                    role="tab"
                    aria-selected={bookingFilter === tab.key}
                    className={`booking-filter-tab ${bookingFilter === tab.key ? 'is-active' : ''}`}
                    onClick={() => setBookingFilter(tab.key)}
                  >
                    {tab.label}
                    {count > 0 && <span className="tab-count">{count}</span>}
                  </button>
                );
              })}
            </div>

            {(() => {
              const filtered = incomingBookings.filter((b) =>
                bookingFilter === 'active'
                  ? b.status === 'pending' || b.status === 'confirmed'
                  : b.status === bookingFilter,
              );

              if (filtered.length === 0) {
                return (
                  <p className="empty-card">
                    {bookingFilter === 'active'
                      ? 'No active booking requests.'
                      : bookingFilter === 'completed'
                      ? 'No completed stays yet.'
                      : 'No cancelled bookings.'}
                  </p>
                );
              }

              return (
                <div className="booking-manage-list">
                  {filtered.map((booking) => (
                    <div className="booking-manage-card" key={booking.id}>
                      <div className="booking-manage-head">
                        <div>
                          <h4>{booking.listing?.title ?? 'A stay'}</h4>
                          <p><CalendarDays size={12} /> {formatDateRange(booking.check_in, booking.check_out)}</p>
                        </div>
                        <span className={`status-badge ${booking.status}`}>{booking.status}</span>
                      </div>
                      <div className="booking-manage-meta">
                        {booking.guest?.full_name && (
                          <span className="booking-guest-name">
                            <UserRound size={12} /> {booking.guest.full_name}
                          </span>
                        )}
                        <span><Users size={13} /> {booking.guest_count} guest{booking.guest_count > 1 ? 's' : ''}</span>
                        <span>KSh {Number(booking.total_price).toLocaleString()}</span>
                      </div>
                      <div className="booking-manage-actions">
                        {booking.status === 'pending' && (
                          <button className="primary-button small" onClick={() => onConfirm(booking.id)}>Confirm</button>
                        )}
                        {(booking.status === 'pending' || booking.status === 'confirmed') && (
                          <button className="outline-button small" onClick={() => onCancel(booking.id)}>Decline</button>
                        )}
                        {booking.status === 'confirmed' && (
                          <button className="outline-button small" onClick={() => onComplete(booking.id)}>Mark complete</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Edit listing modal */}
      {editingListing && (
        <ListingEditModal
          listing={editingListing}
          venues={venues}
          onClose={() => setEditingListing(null)}
          onSaved={(updated) => {
            setEditingListing(null);
            onListingUpdated(updated);
          }}
          onToast={onToast}
        />
      )}
    </>
  );
}
