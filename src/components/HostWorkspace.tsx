import { type FormEvent, useRef, useState } from 'react';
import { ArrowRight, ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadListingImages } from '@/lib/listingImages';
import type { VenueOption } from '@/lib/venues';

type Props = {
  venues: VenueOption[];
  onClose: () => void;
  onCreated: () => void;
  onToast: (message: string) => void;
};

type PropertyType = 'apartment' | 'guesthouse' | 'homestay' | 'hotel_room';

const MAX_PHOTOS = 10;
const MAX_FILE_MB = 5;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

type ImagePreview = {
  file: File;
  previewUrl: string;
};

export default function HostWorkspace({ venues, onClose, onCreated, onToast }: Props) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<PropertyType>('apartment');
  const [address, setAddress] = useState('');
  const [venueId, setVenueId] = useState('');
  const [distance, setDistance] = useState('1.5');
  const [price, setPrice] = useState('7500');
  const [guests, setGuests] = useState('2');
  const [bedrooms, setBedrooms] = useState('1');
  const [bathrooms, setBathrooms] = useState('1');
  const [amenities, setAmenities] = useState('Fast Wi-Fi, Self check-in');
  const [description, setDescription] = useState('');
  const [houseRules, setHouseRules] = useState('');
  const [cancellationPolicy, setCancellationPolicy] = useState('flexible');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'draft' | 'published' | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const valid = files.filter((f) => f.type.startsWith('image/'));
    const tooBig = valid.filter((f) => f.size > MAX_FILE_BYTES);
    const remaining = MAX_PHOTOS - imagePreviews.length;

    if (tooBig.length > 0) {
      setError(`${tooBig.length} file${tooBig.length > 1 ? 's' : ''} exceed the ${MAX_FILE_MB}MB limit and were skipped.`);
    }
    const sized = valid.filter((f) => f.size <= MAX_FILE_BYTES).slice(0, remaining);
    if (sized.length < valid.filter((f) => f.size <= MAX_FILE_BYTES).length) {
      setError(`You can add up to ${MAX_PHOTOS} photos per listing.`);
    }
    const previews: ImagePreview[] = sized.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setImagePreviews((current) => [...current, ...previews]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePreview = (index: number) => {
    setImagePreviews((current) => {
      URL.revokeObjectURL(current[index].previewUrl);
      return current.filter((_, i) => i !== index);
    });
  };

  const create = async (status: 'draft' | 'published') => {
    if (!venueId) { setError('Please choose a nearby venue.'); return; }
    setSaving(true); setSavingStatus(status); setError(''); setUploadProgress('');

    const payload: Record<string, unknown> = {
      venue_id: venueId, nearest_venue_id: venueId, title, property_type: type, address,
      distance_to_venue_km: Number(distance), price_per_night: Number(price), max_guests: Number(guests),
      bedrooms: Number(bedrooms), bathrooms: Number(bathrooms),
      amenities: amenities.split(',').map((item) => item.trim()).filter(Boolean),
      description, house_rules: houseRules || null, cancellation_policy: cancellationPolicy, status,
    };
    if (latitude && longitude) {
      payload.latitude = Number(latitude);
      payload.longitude = Number(longitude);
    }

    const { data: listingData, error: insertError } = await supabase
      .from('listings')
      .insert(payload)
      .select('id')
      .maybeSingle();

    if (insertError || !listingData) {
      console.error('listing create failed', insertError);
      setError('We could not save this listing. Check the fields and try again.');
      setSaving(false);
      setSavingStatus(null);
      return;
    }

    const listingId = listingData.id as string;

    // Upload images if any were selected
    if (imagePreviews.length > 0) {
      setUploadProgress(`Uploading ${imagePreviews.length} photo${imagePreviews.length > 1 ? 's' : ''}…`);
      try {
        await uploadListingImages(listingId, imagePreviews.map((p) => p.file));
        imagePreviews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      } catch (uploadErr) {
        console.error('image upload failed', uploadErr);
        // Listing was created — surface a non-fatal warning
        onToast('Listing saved, but some photos could not be uploaded. You can add them later.');
        setSaving(false);
        setSavingStatus(null);
        setUploadProgress('');
        setImagePreviews([]);
        onCreated();
        return;
      }
    }

    setSaving(false);
    setSavingStatus(null);
    setTitle(''); setAddress(''); setDescription(''); setAmenities('Fast Wi-Fi, Self check-in');
    setHouseRules(''); setLatitude(''); setLongitude(''); setImagePreviews([]);
    onCreated();
    onToast(status === 'published' ? 'Your stay is now live.' : 'Your listing was saved as a draft.');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void create('draft'); };

  return (
    <div className="auth-backdrop host-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="host-modal" role="dialog" aria-modal="true" aria-labelledby="host-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="drawer-close" onClick={onClose} aria-label="Close host workspace"><X size={18} /></button>
        <div className="eyebrow"><span className="eyebrow-line" /> HOST WORKSPACE</div>
        <h2 id="host-title">List your place.</h2>
        <p className="auth-intro">Start with the essentials, then add photos before going live.</p>
        {venues.length === 0 ? (
          <p className="auth-error">We could not load the venue list. Please close and try again.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="host-form-grid">
              <label className="wide"><span>LISTING NAME</span><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Olive House" /></label>
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
              <label className="wide"><span>ADDRESS OR AREA</span><input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Kilimani, Nairobi" /></label>
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
              <label className="wide"><span>AMENITIES, COMMA SEPARATED</span><input value={amenities} onChange={(e) => setAmenities(e.target.value)} placeholder="Fast Wi-Fi, Parking, Breakfast" /></label>
              <label className="wide"><span>SHORT DESCRIPTION</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will guests love about staying here?" /></label>
              <label className="wide"><span>HOUSE RULES (optional)</span><textarea value={houseRules} onChange={(e) => setHouseRules(e.target.value)} placeholder="e.g. No smoking, quiet hours after 10pm" /></label>
            </div>

            {/* ── Photo upload ─────────────────────────────────────── */}
            <div className="photo-upload-section">
              <span className="photo-upload-label">PHOTOS</span>
              <p className="photo-upload-hint">Add photos of your place. The first image will be used as the cover.</p>
              {imagePreviews.length > 0 && (
                <div className="photo-preview-grid">
                  {imagePreviews.map((preview, i) => (
                    <div key={preview.previewUrl} className="photo-preview-item">
                      <img src={preview.previewUrl} alt={`Preview ${i + 1}`} />
                      {i === 0 && <span className="photo-cover-label">Cover</span>}
                      <button
                        type="button"
                        className="photo-remove-btn"
                        onClick={() => removePreview(i)}
                        aria-label="Remove photo"
                      >
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
                disabled={saving || imagePreviews.length >= MAX_PHOTOS}
                title={imagePreviews.length >= MAX_PHOTOS ? `Maximum ${MAX_PHOTOS} photos reached` : undefined}
              >
                <ImagePlus size={15} /> {imagePreviews.length >= MAX_PHOTOS ? `Max ${MAX_PHOTOS} photos` : imagePreviews.length > 0 ? 'Add more photos' : 'Add photos'}
              </button>
            </div>

            {uploadProgress && (
              <p className="upload-progress">
                <Loader2 size={13} className="spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />
                {uploadProgress}
              </p>
            )}
            {error && <p className="auth-error">{error}</p>}
            <div className="host-actions">
              <button type="submit" className="outline-button" disabled={saving}>
                {saving && savingStatus === 'draft' ? 'Saving…' : 'Save draft'}
              </button>
              <button type="button" className="primary-button" disabled={saving} onClick={() => void create('published')}>
                {saving && savingStatus === 'published' ? 'Saving…' : 'Publish listing'} <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
