import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Heart,
  MapPin,
  Menu,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { getPublishedListings, type ListingImage } from '@/lib/listings';
import MapView, { type MapMarker } from '@/components/MapView';
import { getVenueOptions, type VenueOption } from '@/lib/venues';
import { supabase } from '@/lib/supabase';
import { getMyBookings, getIncomingBookings, confirmBooking, cancelBooking, completeBooking, type BookingRecord } from '@/lib/bookings';
import { getMyListings, updateListing, updateListingStatus, deleteListing, type HostListingRecord } from '@/lib/hostListings';
import { getListingReviews, createReview, getMyReviewIds, getReviewAggregates, type ReviewRecord } from '@/lib/reviews';
import { getMyFavorites, addFavorite, removeFavorite } from '@/lib/favorites';
import { getMyProfile, type ProfileRecord } from '@/lib/profiles';import AuthModal from '@/components/AuthModal';
import HostWorkspace from '@/components/HostWorkspace';
import BookingModal from '@/components/BookingModal';
import DetailDrawer from '@/components/DetailDrawer';
import TripsPanel from '@/components/TripsPanel';
import HostDashboard from '@/components/HostDashboard';
import ProfileSettings from '@/components/ProfileSettings';
import HostVerification from '@/components/HostVerification';

type AuthMode = 'signin' | 'signup';
type AuthRole = 'guest' | 'host';
type View = 'discover' | 'saved' | 'trips' | 'host';

type Venue = {
  id: number;
  name: string;
  area: string;
  distance: string;
  rate: number;
  image: string;
  images: ListingImage[];
  type: string;
  rating: number;
  reviews: number;
  tags: string[];
  verified?: boolean;
  listingId?: string;
  description?: string | null;
  maxGuests?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  houseRules?: string | null;
  cancellationPolicy?: string;
  hostName?: string | null;
  hostPhone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  venueLat?: number | null;
  venueLng?: number | null;
  venueName?: string | null;
};

const DEFAULT_VENUE = 'Talanta Stadium';

const fallbackVenues: Venue[] = [
  {
    id: 1,
    name: 'The Olive House',
    area: 'Kilimani, Nairobi',
    distance: '1.8 km from Kasarani Stadium',
    rate: 7500,
    image: 'https://images.pexels.com/photos/6585598/pexels-photo-6585598.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    images: [],
    type: 'Apartment',
    rating: 4.9,
    reviews: 18,
    tags: ['Self check-in', 'Fast Wi-Fi'],
    verified: true,
  },
  {
    id: 2,
    name: 'Safi Studio',
    area: 'Westlands, Nairobi',
    distance: '3.2 km from Kasarani Stadium',
    rate: 6200,
    image: 'https://images.pexels.com/photos/7587828/pexels-photo-7587828.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    images: [],
    type: 'Studio',
    rating: 4.8,
    reviews: 27,
    tags: ['Pool', 'Workspace'],
    verified: true,
  },
  {
    id: 3,
    name: 'Maji House',
    area: 'Lavington, Nairobi',
    distance: '4.6 km from Kasarani Stadium',
    rate: 8900,
    image: 'https://images.pexels.com/photos/8134745/pexels-photo-8134745.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    images: [],
    type: 'Guesthouse',
    rating: 4.7,
    reviews: 42,
    tags: ['Breakfast', 'Garden'],
  },
];



function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [localFavorites, setLocalFavorites] = useState<Set<string>>(new Set());
  const [where, setWhere] = useState('Nairobi, Kenya');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2 guests');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortMode, setSortMode] = useState<'recommended' | 'price-low' | 'price-high' | 'distance'>('recommended');
  const [priceFilter, setPriceFilter] = useState<'all' | 'under-7k' | '7k-9k' | 'over-9k'>('all');
  const [propertyFilter, setPropertyFilter] = useState<'all' | 'apartment' | 'studio' | 'guesthouse' | 'villa'>('all');
  const [venueFilter, setVenueFilter] = useState<string>(DEFAULT_VENUE);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [venueData, setVenueData] = useState<Venue[]>(fallbackVenues);
  const [loadingListings, setLoadingListings] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [authRole, setAuthRole] = useState<AuthRole>('guest');
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [view, setView] = useState<View>('discover');
  const [hostOpen, setHostOpen] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [hostVenues, setHostVenues] = useState<VenueOption[]>([]);
  const [bookingVenue, setBookingVenue] = useState<Venue | null>(null);
  const [myBookings, setMyBookings] = useState<BookingRecord[]>([]);
  const [incomingBookings, setIncomingBookings] = useState<BookingRecord[]>([]);
  const [myListings, setMyListings] = useState<HostListingRecord[]>([]);
  const [detailReviews, setDetailReviews] = useState<ReviewRecord[]>([]);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [tripsLoading, setTripsLoading] = useState(false);
  const [hostLoading, setHostLoading] = useState(false);
  const [listingsPage, setListingsPage] = useState(0);
  const [hasMoreListings, setHasMoreListings] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAccountEmail(data.session?.user.email ?? null);
      setAccountId(data.session?.user.id ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccountEmail(session?.user.email ?? null);
      setAccountId(session?.user.id ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!accountId) { setProfile(null); setFavoriteIds(new Set()); return; }
    getMyProfile().then(setProfile).catch(() => setProfile(null));
    getMyFavorites().then(async (dbFavs) => {
      // Merge any locally saved favorites that aren't already in the DB
      const localIds = [...localFavorites].filter((id) => !dbFavs.has(id));
      if (localIds.length > 0) {
        await Promise.allSettled(localIds.map((id) => addFavorite(id)));
        // Re-fetch to get the merged set
        getMyFavorites().then((merged) => {
          setFavoriteIds(merged);
          // Clear localStorage now they're synced
          try { localStorage.removeItem('karibu_local_favorites'); } catch { /* ignore */ }
          setLocalFavorites(new Set());
        }).catch(() => setFavoriteIds(dbFavs));
      } else {
        setFavoriteIds(dbFavs);
      }
    }).catch(() => {});
  }, [accountId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      const stored = localStorage.getItem('karibu_local_favorites');
      if (stored) setLocalFavorites(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let mounted = true;
    getPublishedListings(0)
      .then(async ({ listings, hasMore }) => {
        if (!mounted) return;
        if (listings.length) {
          const aggregates = await getReviewAggregates(listings.map((l) => l.id)).catch(() => new Map());
          setVenueData(listings.map((listing, index) => {
            const agg = aggregates.get(listing.id);
            return {
              id: index + 1,
              name: listing.title,
              area: listing.address,
              distance: listing.venue ? `${listing.distance_to_venue_km} km from ${listing.venue.name}` : `${listing.distance_to_venue_km} km from the venue`,
              rate: Number(listing.price_per_night),
              image: listing.images[0]?.url ?? fallbackVenues[index % fallbackVenues.length].image,
              images: listing.images,
              type: listing.property_type.replace('_', ' '),
              rating: agg ? Math.round(agg.avg_rating * 10) / 10 : 0,
              reviews: agg?.review_count ?? 0,
              tags: listing.amenities.slice(0, 2),
              verified: true,
              listingId: listing.id,
              description: listing.description,
              maxGuests: listing.max_guests,
              bedrooms: listing.bedrooms,
              bathrooms: listing.bathrooms,
              amenities: listing.amenities,
              houseRules: listing.house_rules,
              cancellationPolicy: listing.cancellation_policy,
              hostName: listing.host?.full_name,
              hostPhone: listing.host?.phone,
              latitude: listing.latitude,
              longitude: listing.longitude,
              venueLat: listing.venue?.latitude ?? null,
              venueLng: listing.venue?.longitude ?? null,
              venueName: listing.venue?.name ?? null,
            };
          }));
          setListingsPage(0);
          setHasMoreListings(hasMore);
        }
      })
      .catch(() => { if (mounted) { setToast('Live listings are unavailable, so we are showing the preview stays.'); setToastType('error'); } })
      .finally(() => { if (mounted) setLoadingListings(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (view === 'trips' && accountId) {
      setTripsLoading(true);
      Promise.all([
        getMyBookings().then(setMyBookings).catch(() => { setToast('We could not load your trips.'); setToastType('error'); }),
        getMyReviewIds().then(setReviewedBookingIds).catch(() => {}),
      ]).finally(() => setTripsLoading(false));
    }
  }, [view, accountId]);

  useEffect(() => {
    if (view === 'host' && accountId) {
      setHostLoading(true);
      Promise.all([
        getIncomingBookings().then(setIncomingBookings).catch(() => { setToast('We could not load your booking requests.'); setToastType('error'); }),
        getMyListings().then(setMyListings).catch(() => { setToast('We could not load your listings.'); setToastType('error'); }),
        getVenueOptions().then(setHostVenues).catch(() => {}),
      ]).finally(() => setHostLoading(false));
    }
  }, [view, accountId]);

  useEffect(() => {
    if (!selectedVenue?.listingId) { setDetailReviews([]); return; }
    getListingReviews(selectedVenue.listingId).then(setDetailReviews).catch(() => setDetailReviews([]));
  }, [selectedVenue]);

  const venueOptions = useMemo(() => {
    const names = [...new Set(venueData.map((venue) => venue.venueName).filter((name): name is string => Boolean(name)))];
    return names.sort((a, b) => (a === DEFAULT_VENUE ? -1 : b === DEFAULT_VENUE ? 1 : a.localeCompare(b)));
  }, [venueData]);

  const visibleVenues = useMemo(() => {
    // Parse guest count from the search input (e.g. "2 guests", "3", "2 adults")
    const guestMatch = guests.match(/\d+/);
    const guestCount = guestMatch ? parseInt(guestMatch[0], 10) : 0;

    let result = venueData.filter((venue) => {
      if (!where.trim()) return true;
      return `${venue.name} ${venue.area}`.toLowerCase().includes(where.toLowerCase()) || where.toLowerCase().includes('nairobi');
    });
    // Filter by guest capacity when a valid count is entered
    if (guestCount > 0) {
      result = result.filter((v) => !v.maxGuests || v.maxGuests >= guestCount);
    }
    if (venueFilter !== 'all') {
      result = result.filter((v) => v.venueName === venueFilter);
    }
    if (priceFilter !== 'all') {
      result = result.filter((v) => {
        if (priceFilter === 'under-7k') return v.rate < 7000;
        if (priceFilter === '7k-9k') return v.rate >= 7000 && v.rate <= 9000;
        if (priceFilter === 'over-9k') return v.rate > 9000;
        return true;
      });
    }
    if (propertyFilter !== 'all') {
      result = result.filter((v) => v.type.toLowerCase().includes(propertyFilter));
    }
    if (sortMode === 'price-low') result = [...result].sort((a, b) => a.rate - b.rate);
    else if (sortMode === 'price-high') result = [...result].sort((a, b) => b.rate - a.rate);
    else if (sortMode === 'distance') {
      result = [...result].sort((a, b) => {
        const da = parseFloat(a.distance);
        const db = parseFloat(b.distance);
        return (isNaN(da) ? 999 : da) - (isNaN(db) ? 999 : db);
      });
    }
    return result;
  }, [where, guests, venueData, venueFilter, priceFilter, propertyFilter, sortMode]);

  const mapMarkers: MapMarker[] = useMemo(() => {
    const listingMarkers: MapMarker[] = visibleVenues
      .filter((v) => v.listingId && v.latitude != null && v.longitude != null)
      .map((v) => ({
        id: v.listingId!,
        title: v.name,
        latitude: v.latitude!,
        longitude: v.longitude!,
        price: v.rate,
      }));
    const venueMarkers: MapMarker[] = visibleVenues
      .filter((v) => v.venueLat != null && v.venueLng != null)
      .reduce<MapMarker[]>((acc, v) => {
        const key = `venue-${v.venueName ?? v.area}`;
        if (!acc.some((m) => m.id === key)) {
          acc.push({ id: key, title: v.venueName ?? 'Venue', latitude: v.venueLat!, longitude: v.venueLng!, price: 0, isVenue: true });
        }
        return acc;
      }, []);
    return [...listingMarkers, ...venueMarkers];
  }, [visibleVenues]);

  const isFavorited = (venue: Venue) => {
    if (!venue.listingId) return false;
    return accountId ? favoriteIds.has(venue.listingId) : localFavorites.has(venue.listingId);
  };

  const toggleFavorite = async (venue: Venue) => {
    if (!venue.listingId) return;
    if (!accountId) {
      setLocalFavorites((current) => {
        const next = new Set(current);
        if (next.has(venue.listingId!)) next.delete(venue.listingId!);
        else next.add(venue.listingId!);
        try { localStorage.setItem('karibu_local_favorites', JSON.stringify([...next])); } catch { /* ignore */ }
        return next;
      });
      return;
    }
    const isFav = favoriteIds.has(venue.listingId);
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (isFav) next.delete(venue.listingId!);
      else next.add(venue.listingId!);
      return next;
    });
    try {
      if (isFav) await removeFavorite(venue.listingId);
      else await addFavorite(venue.listingId);
    } catch {
      setFavoriteIds((current) => {
        const next = new Set(current);
        if (isFav) next.add(venue.listingId!);
        else next.delete(venue.listingId!);
        return next;
      });
      showToast('We could not save that change.');
    }
  };

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast(message);
    setToastType(type);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 2800);
  }, []);

  const openAuth = (mode: AuthMode) => { setAuthMode(mode); setAuthOpen(true); };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setHostOpen(false);
    setView('discover');
    showToast('You have been signed out.');
  };

  const openHostWorkspace = async () => {
    if (!accountId) { setAuthRole('host'); openAuth('signup'); return; }
    if (profile?.role !== 'host') { showToast('Only host accounts can create listings.'); return; }
    setHostOpen(true);
    try {
      const options = await getVenueOptions();
      setHostVenues(options);
    } catch {
      showToast('We could not load the venue list.');
    }
  };

  const switchView = (next: View) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (next !== 'discover' && !accountId) { openAuth('signin'); return; }
    setMenuOpen(false);
    setSelectedVenue(null);
    setView(next);
  };

  const handleBookingCreated = () => {
    setBookingVenue(null);
    setView('trips');
    showToast('Your booking request was sent to the host.');
  };

  const handleConfirmBooking = async (bookingId: string) => {
    try { await confirmBooking(bookingId); setIncomingBookings((current) => current.map((b) => b.id === bookingId ? { ...b, status: 'confirmed' } : b)); showToast('Booking confirmed.'); }
    catch { showToast('We could not confirm that booking.', 'error'); }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try { await cancelBooking(bookingId); const update = (current: BookingRecord[]) => current.map((b) => b.id === bookingId ? { ...b, status: 'cancelled' as const } : b); setMyBookings(update); setIncomingBookings(update); showToast('Booking cancelled.'); }
    catch { showToast('We could not cancel that booking.', 'error'); }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    try { await completeBooking(bookingId); setIncomingBookings((current) => current.map((b) => b.id === bookingId ? { ...b, status: 'completed' } : b)); showToast('Stay marked complete. The guest can now leave a review.'); }
    catch { showToast('We could not complete that booking.', 'error'); }
  };

  const handleToggleListingStatus = async (listingId: string, status: 'draft' | 'published') => {
    try { await updateListingStatus(listingId, status); setMyListings((current) => current.map((l) => l.id === listingId ? { ...l, status } : l)); showToast(status === 'published' ? 'Listing published.' : 'Listing moved to draft.'); }
    catch { showToast('We could not update that listing.', 'error'); }
  };

  const handleDeleteListing = async (listingId: string) => {
    try { await deleteListing(listingId); setMyListings((current) => current.filter((l) => l.id !== listingId)); showToast('Listing removed.'); }
    catch { showToast('We could not remove that listing.', 'error'); }
  };

  const handleListingUpdated = (updated: HostListingRecord) => {
    setMyListings((current) => current.map((l) => l.id === updated.id ? updated : l));
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const nextPage = listingsPage + 1;
    try {
      const { listings: more, hasMore } = await getPublishedListings(nextPage);
      if (more.length) {
        const aggregates = await getReviewAggregates(more.map((l) => l.id)).catch(() => new Map());
        const startIndex = venueData.length;
        const newVenues: Venue[] = more.map((listing, i) => {
          const agg = aggregates.get(listing.id);
          return {
            id: startIndex + i + 1,
            name: listing.title,
            area: listing.address,
            distance: listing.venue ? `${listing.distance_to_venue_km} km from ${listing.venue.name}` : `${listing.distance_to_venue_km} km from the venue`,
            rate: Number(listing.price_per_night),
            image: listing.images[0]?.url ?? fallbackVenues[i % fallbackVenues.length].image,
            images: listing.images,
            type: listing.property_type.replace('_', ' '),
            rating: agg ? Math.round(agg.avg_rating * 10) / 10 : 0,
            reviews: agg?.review_count ?? 0,
            tags: listing.amenities.slice(0, 2),
            verified: true,
            listingId: listing.id,
            description: listing.description,
            maxGuests: listing.max_guests,
            bedrooms: listing.bedrooms,
            bathrooms: listing.bathrooms,
            amenities: listing.amenities,
            houseRules: listing.house_rules,
            cancellationPolicy: listing.cancellation_policy,
            hostName: listing.host?.full_name,
            hostPhone: listing.host?.phone,
            latitude: listing.latitude,
            longitude: listing.longitude,
            venueLat: listing.venue?.latitude ?? null,
            venueLng: listing.venue?.longitude ?? null,
            venueName: listing.venue?.name ?? null,
          };
        });
        setVenueData((current) => [...current, ...newVenues]);
        setListingsPage(nextPage);
        setHasMoreListings(hasMore);
      }
    } catch {
      showToast('We could not load more stays.', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  // Count pending incoming bookings for the badge
  const pendingBookingCount = incomingBookings.filter((b) => b.status === 'pending').length;

  const handleSubmitReview = async (bookingId: string, listingId: string, rating: number, comment: string) => {
    try { await createReview(bookingId, listingId, rating, comment); setReviewedBookingIds((current) => new Set(current).add(bookingId)); if (selectedVenue?.listingId === listingId) { const updated = await getListingReviews(listingId); setDetailReviews(updated); } showToast('Thank you for your review.'); }
    catch { showToast('We could not save your review.', 'error'); }
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Karibu Stay home">
          <img src="/logo-horizontal-dark-text.png" alt="Karibu Stay" className="brand-logo" />
        </a>
        <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`}>
          <a className={view === 'discover' ? 'active' : ''} href="#search" onClick={switchView('discover')}>Find a stay</a>
          <a className={view === 'saved' ? 'active' : ''} href="#saved" onClick={switchView('saved')}>Saved</a>
          <a className={view === 'trips' ? 'active' : ''} href="#trips" onClick={switchView('trips')}>My trips</a>
          <a className={view === 'host' ? 'active' : ''} href="#host" onClick={switchView('host')}>
            Host dashboard{pendingBookingCount > 0 && <span className="nav-badge">{pendingBookingCount}</span>}
          </a>
          {/* Mobile-only auth actions injected into hamburger menu */}
          <div className="nav-mobile-auth">
            {accountEmail ? (
              <>
                <button className="nav-mobile-account" onClick={() => { setMenuOpen(false); setProfileSettingsOpen(true); }}>
                  <UserRound size={13} /> {accountEmail}
                </button>
                <button className="outline-button small" onClick={() => { setMenuOpen(false); void handleSignOut(); }}>Sign out</button>
              </>
            ) : (
              <>
                <button className="text-button" onClick={() => { setMenuOpen(false); openAuth('signin'); }}>Log in</button>
                <button className="outline-button small" onClick={() => { setMenuOpen(false); openAuth('signup'); }}>Sign up</button>
              </>
            )}
          </div>
        </nav>
        <div className="header-actions">
          {accountEmail ? <>
            <button className="account-label account-label-btn" onClick={() => setProfileSettingsOpen(true)} aria-label="Open profile settings" title="Profile settings">
              <UserRound size={14} /> {accountEmail}
            </button>
            <button className="outline-button small" onClick={handleSignOut}>Sign out</button>
          </> : <>
            <button className="text-button" onClick={() => openAuth('signin')}>Log in</button>
            <button className="outline-button small" onClick={() => openAuth('signup')}>Sign up</button>
          </>}
        </div>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>

      <main id="top">
        {view === 'discover' && <>
          <section className="hero" id="search">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-line" /> AFRICA ON THE MOVE 2027</div>
              <h1>Stay close to<br /><span>what matters.</span></h1>
              <p>Thoughtfully placed stays for tournament days, city weekends, and the journeys in between.</p>
            </div>
            <div className="hero-note">
              <Sparkles size={15} />
              <span>Built for the<br />way you travel.</span>
            </div>
          </section>

          <section className="search-panel-wrap" aria-label="Search for a stay">
            <div className="search-panel">
              <label className="search-field location-field">
                <span>WHERE</span>
                <div><MapPin size={17} /><input value={where} onChange={(event) => setWhere(event.target.value)} aria-label="Where" /></div>
              </label>
              <label className="search-field">
                <span>CHECK-IN</span>
                <div><CalendarDays size={17} /><input type="date" value={checkIn} min={new Date().toISOString().split('T')[0]} onChange={(e) => { setCheckIn(e.target.value); if (checkOut && e.target.value >= checkOut) setCheckOut(''); }} aria-label="Check-in date" /></div>
              </label>
              <label className="search-field">
                <span>CHECK-OUT</span>
                <div><CalendarDays size={17} /><input type="date" value={checkOut} min={checkIn || new Date().toISOString().split('T')[0]} onChange={(e) => setCheckOut(e.target.value)} aria-label="Check-out date" /></div>
              </label>
              <label className="search-field">
                <span>GUESTS</span>
                <div><Users size={17} /><input type="number" min="1" max="20" value={guests.match(/\d+/)?.[0] ?? '2'} onChange={(e) => setGuests(`${e.target.value} guests`)} aria-label="Number of guests" /></div>
              </label>
              <button className="primary-button search-button" onClick={() => showToast(`Showing stays near ${where || 'your destination'}${guests ? ` for ${guests}` : ''}.`)}><Search size={18} /> Search</button>
            </div>
          </section>

          <section className="results-section" id="how-it-works">
            <div className="results-intro">
              <div>
                <div className="eyebrow"><span className="eyebrow-line" /> DISCOVER YOUR STAY</div>
                <h2>Made for the moment.</h2>
                <p>Places with personality, positioned around the venues that bring us together.</p>
              </div>
              <div className="results-tools">
                <button className={`filter-toggle ${filterOpen ? 'selected' : ''}`} onClick={() => setFilterOpen(!filterOpen)}><SlidersHorizontal size={16} /> Filters <ChevronDown size={15} /></button>
                <label className="sort-toggle">
                  <span>Sort:</span>
                  <select value={sortMode} onChange={(e) => setSortMode(e.target.value as typeof sortMode)} aria-label="Sort stays">
                    <option value="recommended">Recommended</option>
                    <option value="price-low">Price: low to high</option>
                    <option value="price-high">Price: high to low</option>
                    <option value="distance">Distance to venue</option>
                  </select>
                  <ChevronDown size={15} />
                </label>
              </div>
            </div>
            <div className="venue-filter" role="group" aria-label="Choose a venue">
              <span className="venue-filter-label">Choose a venue</span>
              <div className="venue-chip-row">
                <button type="button" className={`venue-chip ${venueFilter === 'all' ? 'is-active' : ''}`} aria-pressed={venueFilter === 'all'} onClick={() => setVenueFilter('all')}>All venues</button>
                {venueOptions.map((name) => (
                  <button key={name} type="button" className={`venue-chip ${venueFilter === name ? 'is-active' : ''}`} aria-pressed={venueFilter === name} onClick={() => setVenueFilter(name)}>{name}</button>
                ))}
              </div>
            </div>
            {filterOpen && <div className="filter-strip">
              <select className="filter-select" value={priceFilter} onChange={(e) => setPriceFilter(e.target.value as typeof priceFilter)} aria-label="Filter by price">
                <option value="all">All prices</option>
                <option value="under-7k">Under KSh 7,000</option>
                <option value="7k-9k">KSh 7,000 – 9,000</option>
                <option value="over-9k">Over KSh 9,000</option>
              </select>
              <select className="filter-select" value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value as typeof propertyFilter)} aria-label="Filter by property type">
                <option value="all">All types</option>
                <option value="apartment">Apartment</option>
                <option value="studio">Studio</option>
                <option value="guesthouse">Guesthouse</option>
                <option value="villa">Villa</option>
              </select>
              {(priceFilter !== 'all' || propertyFilter !== 'all') && <button className="filter-clear" onClick={() => { setPriceFilter('all'); setPropertyFilter('all'); }}>Clear filters</button>}
              <button onClick={() => setFilterOpen(false)} aria-label="Close filters"><X size={15} /></button>
            </div>}

            <div className="results-layout">
              <div className="listing-column">
                <div className="listing-count">
                  <span>{loadingListings ? 'Loading stays…' : `${visibleVenues.length || 0} ${visibleVenues.length === 1 ? 'stay' : 'stays'}`}</span>
                  <span className="subtle">
                    {venueFilter !== 'all' ? `near ${venueFilter}` : priceFilter !== 'all' || propertyFilter !== 'all' ? 'filtered' : 'near tournament venues'}
                  </span>
                </div>
                <div className="listing-cards-grid">
                  {visibleVenues.length ? visibleVenues.map((venue, index) => (
                    <article
                      className={`listing-row ${selectedVenue?.id === venue.id ? 'is-selected' : ''}`}
                      key={venue.id}
                      onClick={() => setSelectedVenue(venue)}
                      tabIndex={0}
                      role="button"
                      aria-label={`View details for ${venue.name}`}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedVenue(venue); } }}
                    >
                      <div className="listing-image-wrap">
                        <img src={venue.image} alt={`${venue.name} interior`} className="listing-image" />
                        {index === 0 && <span className="image-label">Guest favourite</span>}
                      </div>
                      <div className="listing-info">
                        <div className="listing-topline"><span>{venue.type}</span><button className="heart-button" onClick={(event) => { event.stopPropagation(); toggleFavorite(venue); }} aria-label={`Save ${venue.name}`}><Heart size={18} fill={isFavorited(venue) ? 'currentColor' : 'none'} /></button></div>
                        <h3>{venue.name}</h3>
                        <p className="muted-line">{venue.area} <span>·</span> {venue.distance}</p>
                        <div className="tags">{venue.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                        <div className="listing-bottom"><span className="rating">{venue.reviews > 0 ? <><Star size={13} fill="currentColor" /> {venue.rating} <small>({venue.reviews})</small></> : <small style={{ color: '#938b7e' }}>New listing</small>}</span><span className="rate"><strong>KSh {venue.rate.toLocaleString()}</strong> / night</span></div>
                      </div>
                    </article>
                  )) : <div className="empty-state"><Search size={20} /><p>No stays matched that place. Try searching Nairobi.</p></div>}
                </div>
                {hasMoreListings && (
                  <button className="outline-button load-more" onClick={() => void handleLoadMore()} disabled={loadingMore}>
                    {loadingMore ? <><span className="spin" style={{ display: 'inline-block' }}>↻</span> Loading…</> : <>Load more stays <ArrowRight size={16} /></>}
                  </button>
                )}
              </div>

              {/* MAP PANEL — temporarily commented out, to be re-integrated with a fixed-position approach
              <div className="map-panel" aria-label={`Map of stays near ${venueFilter !== 'all' ? venueFilter : 'tournament venues'}`}>
                <div className="map-overlay map-title">
                  <span className="map-dot" />
                  {venueFilter !== 'all' ? venueFilter : 'All venues'}
                  <span>·</span>
                  {(() => {
                    const venueMarker = mapMarkers.find((m) => m.isVenue && (venueFilter === 'all' || m.title === venueFilter));
                    if (!venueMarker) return 'Nairobi';
                    const name = venueMarker.title.toLowerCase();
                    if (name.includes('mandela')) return 'Kampala';
                    if (name.includes('mkapa')) return 'Dar es Salaam';
                    return 'Nairobi';
                  })()}
                </div>
                <MapView
                  markers={mapMarkers}
                  selectedId={selectedVenue?.listingId ?? null}
                  focusVenueName={venueFilter !== 'all' ? venueFilter : null}
                  onSelect={(id) => {
                    const venue = venueData.find((v) => v.listingId === id);
                    if (venue) setSelectedVenue(venue);
                  }}
                />
                <div className="map-legend"><span><i className="legend-stay" /> Stay</span><span><i className="legend-venue" /> Venue</span></div>
              </div>
              */}
            </div>
          </section>

          <section className="trust-strip" id="become-a-host">
            <div className="trust-item"><div className="trust-icon"><Check size={17} /></div><div><strong>Verified stays</strong><span>Every host is checked before going live.</span></div></div>
            <div className="trust-item"><div className="trust-icon"><Clock3 size={17} /></div><div><strong>Made for tournament days</strong><span>Stay close, arrive rested, enjoy more.</span></div></div>
            <div className="trust-item"><div className="trust-icon"><BedDouble size={17} /></div><div><strong>Local, by design</strong><span>Feel at home wherever you land.</span></div></div>
          </section>
        </>}

        {view === 'saved' && (() => {
          const savedVenues = venueData.filter((v) => isFavorited(v));
          return (
            <section className="page-section" id="saved">
              <div className="eyebrow"><span className="eyebrow-line" /> YOUR COLLECTION</div>
              <h2 className="page-title">Saved stays</h2>
              <p className="page-intro">Places you have set aside for later. Sign in to keep them across devices.</p>
              {!accountId && localFavorites.size > 0 && <p className="page-intro" style={{ color: 'var(--rust)' }}>These are saved on this device only. Sign in to sync them.</p>}
              {savedVenues.length ? (
                <div className="saved-grid">
                  {savedVenues.map((venue) => (
                    <article
                      className={`listing-row ${selectedVenue?.id === venue.id ? 'is-selected' : ''}`}
                      key={venue.id}
                      onClick={() => setSelectedVenue(venue)}
                      tabIndex={0}
                      role="button"
                      aria-label={`View details for ${venue.name}`}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedVenue(venue); } }}
                    >
                      <div className="listing-image-wrap">
                        <img src={venue.image} alt={`${venue.name} interior`} className="listing-image" />
                      </div>
                      <div className="listing-info">
                        <div className="listing-topline"><span>{venue.type}</span><button className="heart-button" onClick={(event) => { event.stopPropagation(); toggleFavorite(venue); }} aria-label={`Remove ${venue.name} from saved`}><Heart size={18} fill="currentColor" /></button></div>
                        <h3>{venue.name}</h3>
                        <p className="muted-line">{venue.area} <span>·</span> {venue.distance}</p>
                        <div className="listing-bottom"><span className="rate"><strong>KSh {venue.rate.toLocaleString()}</strong> / night</span></div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state"><Heart size={20} /><p>{accountId ? 'You have not saved any stays yet. Browse and tap the heart on any listing.' : 'No saved stays yet. Tap the heart on any listing to save it here.'}</p></div>
              )}
            </section>
          );
        })()}

        {view === 'trips' && <TripsPanel bookings={myBookings} reviewedBookingIds={reviewedBookingIds} loading={tripsLoading} onCancel={(id) => handleCancelBooking(id)} onReview={handleSubmitReview} onSignIn={() => openAuth('signin')} signedIn={Boolean(accountId)} />}

        {view === 'host' && <HostDashboard listings={myListings} incomingBookings={incomingBookings} profile={profile} venues={hostVenues} loading={hostLoading} onConfirm={handleConfirmBooking} onCancel={(id) => handleCancelBooking(id)} onComplete={handleCompleteBooking} onToggleStatus={handleToggleListingStatus} onDelete={handleDeleteListing} onListingUpdated={handleListingUpdated} onAddListing={() => void openHostWorkspace()} onVerify={() => setVerificationOpen(true)} onSignIn={() => openAuth('signin')} onToast={showToast} signedIn={Boolean(accountId)} isHost={profile?.role === 'host'} />}
      </main>

      {selectedVenue && (
        <DetailDrawer
          key={selectedVenue.id}
          venue={selectedVenue}
          reviews={detailReviews}
          onClose={() => setSelectedVenue(null)}
          onBook={() => (accountId ? setBookingVenue(selectedVenue) : openAuth('signin'))}
        />
      )}

      {bookingVenue && (
        <BookingModal venue={bookingVenue} onClose={() => setBookingVenue(null)} onBooked={handleBookingCreated} />
      )}

      {hostOpen && (
        <HostWorkspace venues={hostVenues} onClose={() => setHostOpen(false)} onCreated={() => { setHostOpen(false); setView('host'); showToast('Your listing was saved.'); }} onToast={showToast} />
      )}

      {authOpen && (
        <AuthModal mode={authMode} role={authRole} onRoleChange={setAuthRole} onClose={() => setAuthOpen(false)} onModeChange={(mode) => setAuthMode(mode)} onToast={showToast} />
      )}

      {profileSettingsOpen && profile && (
        <ProfileSettings
          profile={profile}
          email={accountEmail}
          onClose={() => setProfileSettingsOpen(false)}
          onSaved={(updated) => setProfile(updated)}
          onToast={showToast}
        />
      )}

      {verificationOpen && (
        <HostVerification
          onClose={() => setVerificationOpen(false)}
          onToast={showToast}
        />
      )}

      {toast && <div role="status" aria-live="polite" aria-atomic="true" className={`toast ${toastType === 'error' ? 'toast-error' : ''}`}>{toastType === 'error' ? <X size={16} /> : <Check size={16} />} {toast}</div>}
    </div>
  );
}

export default App;
