import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bath, BedDouble, Phone, Shield, Star, Users, X } from 'lucide-react';
import type { ReviewRecord } from '@/lib/reviews';

type Venue = {
  id: number;
  name: string;
  area: string;
  distance: string;
  rate: number;
  image: string;
  images: { url: string; alt_text: string | null; sort_order: number }[];
  type: string;
  rating: number;
  reviews: number;
  description?: string | null;
  maxGuests?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  houseRules?: string | null;
  cancellationPolicy?: string;
  hostName?: string | null;
  hostPhone?: string | null;
};

type Props = {
  venue: Venue;
  reviews: ReviewRecord[];
  onClose: () => void;
  onBook: () => void;
};

const cancellationLabels: Record<string, string> = {
  flexible: 'Flexible — full refund up to 24 hours before check-in',
  moderate: 'Moderate — full refund up to 5 days before check-in',
  strict: 'Strict — 50% refund up to 7 days before check-in',
};

export default function DetailDrawer({ venue, reviews, onClose, onBook }: Props) {
  const galleryImages = venue.images.length > 0 ? venue.images : [{ url: venue.image, alt_text: venue.name, sort_order: 0 }];
  const [activeImage, setActiveImage] = useState(0);
  const drawerRef = useRef<HTMLDivElement>(null);

  const bedrooms = venue.bedrooms ?? 1;
  const maxGuests = venue.maxGuests ?? 2;
  const bathrooms = venue.bathrooms ?? 1;
  const amenities = venue.amenities ?? [];
  const policyLabel = cancellationLabels[venue.cancellationPolicy ?? 'moderate'] ?? venue.cancellationPolicy ?? 'Moderate cancellation policy';

  // Close on click outside the drawer panel — works on all screen sizes
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="detail-drawer-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        ref={drawerRef}
        className="detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${venue.name} details`}
        onMouseDown={(e) => e.stopPropagation()}
      >
      <button className="drawer-close" onClick={onClose} aria-label="Close details"><X size={18} /></button>

      <div className="drawer-gallery">
        <img
          src={galleryImages[activeImage]?.url ?? venue.image}
          alt={galleryImages[activeImage]?.alt_text ?? venue.name}
          className="drawer-gallery-main"
        />
      </div>
      {galleryImages.length > 1 && (
        <div className="drawer-gallery-thumbs">
          {galleryImages.map((img, i) => (
            <img
              key={i}
              src={img.url}
              alt={img.alt_text ?? ''}
              className={`drawer-gallery-thumb ${i === activeImage ? 'active' : ''}`}
              onClick={() => setActiveImage(i)}
            />
          ))}
        </div>
      )}

      <div className="drawer-content">
        <span className="listing-topline">
          {venue.type}
          {venue.reviews > 0 && (
            <span className="rating"><Star size={12} fill="currentColor" /> {venue.rating}</span>
          )}
        </span>
        <h2>{venue.name}</h2>
        <p>{venue.area} · {venue.distance}</p>

        <div className="drawer-meta">
          <span><BedDouble size={15} /> {bedrooms} bed{bedrooms > 1 ? 's' : ''}</span>
          <span><Users size={15} /> {maxGuests} guest{maxGuests > 1 ? 's' : ''}</span>
          <span><Bath size={15} /> {bathrooms} bath{bathrooms > 1 ? 's' : ''}</span>
        </div>

        {venue.description && (
          <div className="drawer-section">
            <span className="drawer-section-title">About this stay</span>
            <p className="drawer-description">{venue.description}</p>
          </div>
        )}

        {amenities.length > 0 && (
          <div className="drawer-section">
            <span className="drawer-section-title">What this place offers</span>
            <div className="drawer-amenities">
              {amenities.map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
        )}

        {venue.houseRules && (
          <div className="drawer-section">
            <span className="drawer-section-title">House rules</span>
            <p className="drawer-rules">{venue.houseRules}</p>
          </div>
        )}

        <div className="drawer-section">
          <span className="drawer-section-title">Cancellation</span>
          <p className="drawer-rules">{policyLabel}</p>
        </div>

        {(venue.hostName || venue.hostPhone) && (
          <div className="drawer-section">
            <span className="drawer-section-title">Host</span>
            <div className="drawer-host">
              <Shield size={16} />
              <div>
                <strong>{venue.hostName ?? 'Verified host'}</strong>
                {venue.hostPhone && (
                    <div className="drawer-host-contact">
                      <Phone size={11} />
                      <a href={`tel:${venue.hostPhone}`}>{venue.hostPhone}</a>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {reviews.length > 0 && (
          <div className="drawer-section">
            <span className="drawer-section-title">Recent reviews</span>
            {reviews.slice(0, 3).map((review) => (
              <div key={review.id} className="review-item">
                <span className="rating"><Star size={12} fill="currentColor" /> {review.rating}</span>
                <p>{review.comment}</p>
                <small>{review.guest?.full_name ?? 'A guest'}</small>
              </div>
            ))}
          </div>
        )}

        <div className="drawer-section">
          <div className="listing-bottom" style={{ marginBottom: 12 }}>
            <span className="rate"><strong>KSh {venue.rate.toLocaleString()}</strong> / night</span>
          </div>
          <button className="primary-button" onClick={onBook}>Request to book <ArrowRight size={16} /></button>
        </div>
      </div>
      </div>
    </div>
  );
}
