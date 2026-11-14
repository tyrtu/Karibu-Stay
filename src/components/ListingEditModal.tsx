import { type FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowRight, ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { updateListing, type HostListingRecord } from '@/lib/hostListings';
import { getListingImages, uploadListingImages, deleteListingImage, type ListingImageRecord } from '@/lib/listingImages';
import type { VenueOption } from '@/lib/venues';

const MAX_PHOTOS = 10;
const MAX_FILE_MB = 5;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

type Props = {
  listing: HostListingRecord;
  venues: VenueOption[];
  onClose: () => void;
  onSaved: (updated: HostListingRecord) => void;
  onToast: (message: string) => void;
};

type PropertyType = 'apartment' | 'guesthouse' | 'homestay' | 'hotel_room';

export default function ListingEditModal({ listing, venues, onClose, onSaved, onToast }: Props) {
  const [title, setTitle] = useState(listing.title);
  const [type, setType] = useState<PropertyType>(listing.property_type);
  const [address, setAddress] = useState(listing.address);
  const [venueId, setVenueId] = useState(listing.nearest_venue_id);
  const [distance, setDistance] = useState(String(listing.distance_to_venue_km));
  const [price, setPrice] = useState(String(listing.price_per_night));
  const [guests, setGuests] = useState(String(listing.max_guests));
  const [bedrooms, setBedrooms] = useState(String(listing.bedrooms));
  const [bathrooms, setBathrooms] = useState(String(listing.bathrooms));
  const [amenities, setAmenities] = useState(listing.amenities.join(', '));
  const [description, setDescription] = useState(listing.description ?? '');
  const [houseRules, setHouseRules] = useState(listing.house_rules ?? '');
  const [cancellationPolicy, setCancellationPolicy] = useState(listing.cancellation_policy);
  const [latitude, setLatitude] = useState(listing.latitude != null ? String(listing.latitude) : '');
  const [longitude, setLongitude] = useState(listing.longitude != null ? String(listing.longitude) : '');

  // Existing DB images
  const [existingImages, setExistingImages] = useState<ListingImageRecord[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [deleteConfirmImageId, setDeleteConfirmImageId] = useState<string | null>(null);

  // New files to upload
  const [newPreviews, setNewPreviews] = useState<{ file: File; previewUrl: string }[]>([]);
  const [uploadProgress, setUploadProgress] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDirtyWarning, setShowDirtyWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute dirty state — any field changed from original or new photos queued
  const isDirty =
    title !== listing.title ||
    type !== listing.property_type ||
    address !== listing.address ||
    venueId !== listing.nearest_venue_id ||
    distance !== String(listing.distance_to_venue_km) ||
    price !== String(listing.price_per_night) ||
    guests !== String(listing.max_guests) ||
    bedrooms !== String(listing.bedrooms) ||
    bathrooms !== String(listing.bathrooms) ||
    amenities !== listing.amenities.join(', ') ||
    description !== (listing.description ?? '') ||
    houseRules !== (listing.house_rules ?? '') ||
    cancellationPolicy !== listing.cancellation_policy ||
    latitude !== (listing.latitude != null ? String(listing.latitude) : '') ||
    longitude !== (listing.longitude != null ? String(listing.longitude) : '') ||
    newPreviews.length > 0;

  const handleClose = () => {
    if (isDirty) { setShowDirtyWarning(true); return; }
    onClose();
  };

  // Load existing images on mount
  useEffect(() => {
    getListingImages(listing.id)
      .then(setExistingImages)
      .catch(() => setExistingImages([]))
      .finally(() => setImagesLoading(false));
  }, [listing.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
    const tooBig = files.filter((f) => f.size > MAX_FILE_BYTES);
    const totalExisting = existingImages.length + newPreviews.length;
    const remaining = MAX_PHOTOS - totalExisting;

    if (tooBig.length > 0) {
      setError(`${tooBig.length} file${tooBig.length > 1 ? 's' : ''} exceed the ${MAX_FILE_MB}MB limit and were skipped.`);
    }
    const sized = files.filter((f) => f.size <= MAX_FILE_BYTES).slice(0, remaining);
    if (sized.length < files.filter((f) => f.size <= MAX_FILE_BYTES).length) {
      setError(`You can add up to ${MAX_PHOTOS} photos per listing.`);
    }
    setNewPreviews((cur) => [
      ...cur,
      ...sized.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeNewPreview = (index: number) => {
    setNewPreviews((cur) => {
      URL.revokeObjectURL(cur[index].previewUrl);
      return cur.filter((_, i) => i !== index);
    });
  };

  const handleDeleteExisting = async (image: ListingImageRecord) => {
    // First click sets confirm, second click executes
    if (deleteConfirmImageId !== image.id) {
      setDeleteConfirmImageId(image.id);
      return;
    }
    setDeleteConfirmImageId(null);
    setDeletingImageId(image.id);
    try {
      await deleteListingImage(image.id, image.url);
      setExistingImages((cur) => cur.filter((img) => img.id !== image.id));
    } catch {
      onToast('Could not remove that photo. Try again.');
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!venueId) { setError('Please choose a nearby venue.'); return; }
    setSaving(true); setError('');

    try {
      await updateListing(listing.id, {
        title,
        property_type: type,
        address,
        nearest_venue_id: venueId,
        venue_id: venueId,
        distance_to_venue_km: Number(distance),
        price_per_night: Number(price),
        max_guests: Number(guests),
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        amenities: amenities.split(',').map((s) => s.trim()).filter(Boolean),
        description,
        house_rules: houseRules || null,
        cancellation_policy: cancellationPolicy,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      });

      if (newPreviews.length > 0) {
        setUploadProgress(`Uploading ${newPreviews.length} photo${newPreviews.length > 1 ? 's' : ''}…`);
        await uploadListingImages(listing.id, newPreviews.map((p) => p.file), existingImages.length);
        newPreviews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
        setNewPreviews([]);
      }

      // Build updated record to pass back
      const updatedVenue = venues.find((v) => v.id === venueId);
      const updatedRecord: HostListingRecord = {
        ...listing,
        title,
        property_type: type,
        address,
        nearest_venue_id: venueId,
        distance_to_venue_km: Number(distance),
        price_per_night: Number(price),
        max_guests: Number(guests),
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        amenities: amenities.split(',').map((s) => s.trim()).filter(Boolean),
        description,
        house_rules: houseRules || null,
        cancellation_policy: cancellationPolicy,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        venue: updatedVenue ? { name: updatedVenue.name } : listing.venue,
      };

      onSaved(updatedRecord);
      onToast('Listing updated.');
    } catch (err) {
      console.error('listing update failed', err);
      setError('We could not save those changes. Please try again.');
      setSaving(false);
    }
  };

  const totalImages = existingImages.length + newPreviews.length;

  return (
    <div className="auth-backdrop host-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <section
        className="host-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-listing-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="drawer-close" onClick={handleClose} aria-label="Close edit listing"><X size={18} /></button>
        <div className="eyebrow"><span className="eyebrow-line" /> EDIT LISTING</div>
        <h2 id="edit-listing-title">Edit your place.</h2>
        <p className="auth-intro">Update any details and save. Changes apply to future bookings only.</p>

        <form onSubmit={handleSubmit}>
          <div className="host-form-grid">
            <label className="wide"><span>LISTING NAME</span><input required value={title} onChange={(e) => setTitle(e.target.value)} /></label>
            <label><span>PROPERTY TYPE</span>
              <select value={type} onChange={(e) => setType(e.target.value as PropertyType)}>
                <option value="apartment">Apartment</option>
                <option value="guesthouse">Guesthouse</option>
                <option value="homestay">Homestay</option>
                <option value="hotel_room">Hotel room</option>
              </select>
            </label>
            <label><span>NEAREST VENUE</span>
              <select required value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                <option value="">Select a venue</option>
                {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </label>
            <label className="wide"><span>ADDRESS OR AREA</span><input required value={address} onChange={(e) => setAddress(e.target.value)} /></label>
            <label><span>DISTANCE TO VENUE (KM)</span><input required min="0.1" step="0.1" type="number" value={distance} onChange={(e) => setDistance(e.target.value)} /></label>
            <label><span>NIGHTLY PRICE (KES)</span><input required min="1" type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
            <label><span>GUESTS</span><input required min="1" type="number" value={guests} onChange={(e) => setGuests(e.target.value)} /></label>
            <label><span>BEDROOMS</span><input required min="1" type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} /></label>
            <label><span>BATHROOMS</span><input required min="1" type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} /></label>
            <label><span>CANCELLATION POLICY</span>
              <select value={cancellationPolicy} onChange={(e) => setCancellationPolicy(e.target.value)}>
                <option value="flexible">Flexible</option>
                <option value="moderate">Moderate</option>
                <option value="strict">Strict</option>
              </select>
            </label>
            <label><span>LATITUDE (optional)</span><input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="-1.2920" /></label>
            <label><span>LONGITUDE (optional)</span><input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="36.7820" /></label>
            <label className="wide"><span>AMENITIES, COMMA SEPARATED</span><input value={amenities} onChange={(e) => setAmenities(e.target.value)} /></label>
            <label className="wide"><span>SHORT DESCRIPTION</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will guests love about staying here?" /></label>
            <label className="wide"><span>HOUSE RULES (optional)</span><textarea value={houseRules} onChange={(e) => setHouseRules(e.target.value)} placeholder="e.g. No smoking, quiet hours after 10pm" /></label>
          </div>

          {/* ── Photo management ────────────────────────────────── */}
          <div className="photo-upload-section">
            <span className="photo-upload-label">PHOTOS {totalImages > 0 && <span className="photo-count">({totalImages})</span>}</span>
            <p className="photo-upload-hint">Manage photos for your listing. The first photo is the cover.</p>

            {imagesLoading ? (
              <p className="upload-progress">
                <Loader2 size={13} className="spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />
                Loading photos…
              </p>
            ) : (
              <div className="photo-preview-grid">
                {existingImages.map((img, i) => (
                  <div key={img.id} className={`photo-preview-item ${deleteConfirmImageId === img.id ? 'photo-confirm-delete' : ''}`}>
                    <img src={img.url} alt={img.alt_text ?? `Photo ${i + 1}`} />
                    {i === 0 && <span className="photo-cover-label">Cover</span>}
                    {deleteConfirmImageId === img.id ? (
                      <div className="photo-delete-confirm">
                        <button
                          type="button"
                          className="photo-remove-btn photo-remove-confirm"
                          onClick={() => void handleDeleteExisting(img)}
                          aria-label="Confirm delete photo"
                        >
                          <Trash2 size={11} /> Yes
                        </button>
                        <button
                          type="button"
                          className="photo-remove-btn photo-remove-cancel"
                          onClick={() => setDeleteConfirmImageId(null)}
                          aria-label="Cancel delete photo"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="photo-remove-btn"
                        onClick={() => void handleDeleteExisting(img)}
                        disabled={deletingImageId === img.id}
                        aria-label={i === 0 ? 'Remove cover photo' : 'Remove photo'}
                      >
                        {deletingImageId === img.id
                          ? <Loader2 size={13} className="spin" />
                          : <Trash2 size={13} />}
                      </button>
                    )}
                  </div>
                ))}
                {newPreviews.map((p, i) => (
                  <div key={p.previewUrl} className="photo-preview-item photo-preview-new">
                    <img src={p.previewUrl} alt={`New photo ${i + 1}`} />
                    <span className="photo-new-label">New</span>
                    <button type="button" className="photo-remove-btn" onClick={() => removeNewPreview(i)} aria-label="Remove photo">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
              aria-label="Upload listing photos"
            />
            <button
              type="button"
              className="outline-button small photo-add-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving || existingImages.length + newPreviews.length >= MAX_PHOTOS}
              title={existingImages.length + newPreviews.length >= MAX_PHOTOS ? `Maximum ${MAX_PHOTOS} photos reached` : undefined}
            >
              <ImagePlus size={15} /> {existingImages.length + newPreviews.length >= MAX_PHOTOS ? `Max ${MAX_PHOTOS} photos` : 'Add photos'}
            </button>
          </div>

          {uploadProgress && (
            <p className="upload-progress">
              <Loader2 size={13} className="spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />
              {uploadProgress}
            </p>
          )}
          {error && <p className="auth-error">{error}</p>}
          {showDirtyWarning && (
            <div className="dirty-warning" role="alert">
              <span>You have unsaved changes. Discard them?</span>
              <button type="button" className="outline-button small danger" onClick={onClose}>Discard</button>
              <button type="button" className="outline-button small" onClick={() => setShowDirtyWarning(false)}>Keep editing</button>
            </div>
          )}
          <div className="host-actions">
            <button type="button" className="outline-button" onClick={handleClose} disabled={saving}>Cancel</button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'} <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
