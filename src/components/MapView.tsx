import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

export type MapMarker = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  price: number;
  isVenue?: boolean;
};

type MapViewProps = {
  markers: MapMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** When set, the map will fly to this venue's coordinates on change */
  focusVenueName?: string | null;
};

export default function MapView({ markers, selectedId, onSelect, focusVenueName }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<Record<string, mapboxgl.Marker>>({});
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // ── Initialise map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [36.82, -1.27],
      zoom: 11,
      cooperativeGestures: false,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    // Compact attribution satisfies Mapbox ToS without the ⓘ button
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

    // Shared popup instance for venue hover tooltips
    popupRef.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 14,
      className: 'venue-popup',
    });

    return () => {
      Object.values(markerRefs.current).forEach((m) => m.remove());
      markerRefs.current = {};
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Sync markers ────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const validMarkers = markers.filter((m) => m.latitude != null && m.longitude != null);

    // ── Diff: remove markers that are no longer in the list ──
    const incomingIds = new Set(validMarkers.map((m) => m.id));
    for (const [id, mbMarker] of Object.entries(markerRefs.current)) {
      if (!incomingIds.has(id)) {
        mbMarker.remove();
        delete markerRefs.current[id];
      }
    }

    if (validMarkers.length === 0) return;

    // ── Add or update markers ──
    validMarkers.forEach((marker) => {
      const isActive = marker.id === selectedId;
      const existing = markerRefs.current[marker.id];

      if (existing) {
        // Update element classes/label without recreating the marker
        const el = existing.getElement();
        el.className = `mapbox-marker-pin ${marker.isVenue ? 'is-venue' : ''} ${isActive ? 'is-active' : ''}`.trim();
        if (!marker.isVenue) {
          el.innerHTML = `<span class="marker-label">${isActive ? marker.title : 'KSh\u00a0' + marker.price.toLocaleString()}</span>`;
        }
        return;
      }

      // Create new marker element
      const el = document.createElement('button');
      el.className = `mapbox-marker-pin ${marker.isVenue ? 'is-venue' : ''} ${isActive ? 'is-active' : ''}`.trim();
      el.setAttribute('aria-label', marker.isVenue ? `Venue: ${marker.title}` : `${marker.title} — KSh ${marker.price.toLocaleString()} per night`);

      if (marker.isVenue) {
        el.innerHTML = `<span class="marker-venue-icon"></span>`;

        // Hover tooltip for venues
        el.addEventListener('mouseenter', () => {
          popupRef.current
            ?.setLngLat([marker.longitude, marker.latitude])
            .setHTML(`<span class="venue-popup-label">${marker.title}</span>`)
            .addTo(map);
        });
        el.addEventListener('mouseleave', () => {
          popupRef.current?.remove();
        });
      } else {
        el.innerHTML = `<span class="marker-label">${isActive ? marker.title : 'KSh\u00a0' + marker.price.toLocaleString()}</span>`;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectRef.current(marker.id);
        });
      }

      const mbMarker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([marker.longitude, marker.latitude])
        .addTo(map);
      markerRefs.current[marker.id] = mbMarker;
    });

    // ── Camera ──
    if (selectedId && markerRefs.current[selectedId]) {
      const sel = validMarkers.find((m) => m.id === selectedId);
      if (sel) {
        map.flyTo({
          center: [sel.longitude, sel.latitude],
          zoom: Math.max(map.getZoom(), 13),
          duration: 500,
          essential: true,
        });
      }
    }
  }, [markers, selectedId]);

  // ── Fly to venue when venue filter changes ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Find the venue marker to centre on
    const venueMarker = markers.find((m) => m.isVenue && m.title === focusVenueName);
    if (venueMarker) {
      map.flyTo({
        center: [venueMarker.longitude, venueMarker.latitude],
        zoom: 12,
        duration: 700,
        essential: true,
      });
      return;
    }

    // No specific venue — fit all visible markers
    const valid = markers.filter((m) => m.latitude != null && m.longitude != null);
    if (valid.length === 0) return;

    // Wait for map to be loaded before calling fitBounds
    const fit = () => {
      const bounds = new mapboxgl.LngLatBounds();
      valid.forEach((m) => bounds.extend([m.longitude, m.latitude]));
      map.fitBounds(bounds, { padding: 70, maxZoom: 13, duration: 700 });
    };

    if (map.loaded()) {
      fit();
    } else {
      map.once('load', fit);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusVenueName, markers.length]);

  return <div ref={containerRef} className="mapbox-container" />;
}
