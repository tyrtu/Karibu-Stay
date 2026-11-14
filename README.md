# Karibu Stay

A short-term rental marketplace built around African football tournament venues. Guests discover and book accommodation close to the stadiums; hosts list and manage their properties.

Built with React, TypeScript, Vite, Supabase, and Mapbox GL JS.

---

## Features

**For guests**
- Browse published listings filtered by venue, price range, property type, and guest count
- Interactive Mapbox map with price-label pins; flies to the selected venue automatically
- Save listings to favourites (synced to your account, or stored locally before sign-in)
- Request to book with date selection and a live price breakdown
- Track booking status (pending, confirmed, cancelled, completed)
- Leave a review after a completed stay

**For hosts**
- Create and manage listings with photo uploads, amenities, house rules, and coordinates
- Edit existing listings including photo management
- Publish or draft listings at any time
- Confirm, decline, and mark bookings as complete
- Pending booking badge on the dashboard nav link
- Submit identity verification documents for review

**General**
- Email/password authentication with guest and host roles
- Password reset via email
- Profile settings (name and phone)
- Responsive layout for mobile and desktop

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, custom CSS design system |
| Map | Mapbox GL JS v3 |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Icons | Lucide React |

---

## Project Structure

```
src/
  components/       React components
    App.tsx           Root component — all state and view routing
    AuthModal.tsx     Sign in / sign up / forgot password
    BookingModal.tsx  Date picker and booking request form
    DetailDrawer.tsx  Listing detail panel with gallery and reviews
    HostDashboard.tsx Host listing and booking management
    HostVerification.tsx  Identity verification submission
    HostWorkspace.tsx Listing creation form with photo upload
    ListingEditModal.tsx  Edit an existing listing
    MapView.tsx       Mapbox GL JS map with diffed marker updates
    ProfileSettings.tsx  Edit name and phone
    TripsPanel.tsx    Guest booking history and review form

  lib/              Data access layer (Supabase queries)
    bookings.ts
    dates.ts
    favorites.ts
    hostListings.ts
    hostVerification.ts
    listingImages.ts
    listings.ts
    profiles.ts
    reviews.ts
    supabase.ts
    venues.ts

supabase/
  functions/
    create-booking/   Edge Function — booking validation and insert
  migrations/         SQL migrations in chronological order
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- A Mapbox account with a public access token

### Environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_MAPBOX_TOKEN=<your-mapbox-public-token>
```

### Install and run

```bash
npm install
npm run dev
```

### Database setup

Apply the migrations in order using the Supabase CLI:

```bash
supabase db push
```

Or paste each file from `supabase/migrations/` into the Supabase SQL editor.

### Storage

Create a public storage bucket named `listing-images` in the Supabase dashboard under Storage. This is required for host photo uploads.

### Booking expiry (optional)

The migration `20261109000001_expire_pending_bookings.sql` creates a function that cancels expired pending bookings. To run it on a schedule, enable the `pg_cron` extension in the Supabase dashboard under Database > Extensions before applying the migration.

---

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build locally
npm run typecheck    # Run TypeScript type check without emitting
npm run lint         # Run ESLint
```

---

## Database Overview

| Table | Purpose |
|---|---|
| `profiles` | User account details and guest/host role |
| `venues` | Tournament stadium locations and coordinates |
| `listings` | Host-owned stay listings |
| `listing_images` | Ordered gallery images per listing |
| `bookings` | Guest booking requests and confirmed stays |
| `payments` | Payment records (server-only, M-Pesa/card) |
| `reviews` | Post-stay guest ratings and comments |
| `host_verifications` | Host identity review submissions |
| `price_guardrails` | Venue-specific price caps during tournament windows |
| `favorites` | Saved listings per user |

Row Level Security is enabled on every table. Browser clients cannot write to `payments` directly. Booking inserts go through the `create-booking` Edge Function; status changes go through SECURITY DEFINER RPCs.

---

## Notes

- The payment flow (M-Pesa / card) is modelled in the schema but not yet implemented in the UI.
- Listings require a `listing-images` Storage bucket to support photo uploads.
- The `venues.city` column currently stores country names (`Kenya`, `Uganda`, `Tanzania`) rather than city names — a known schema quirk carried from the initial migration.
