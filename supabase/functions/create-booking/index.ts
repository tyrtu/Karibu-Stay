import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Sign in is required." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Booking service is unavailable." }, 503);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const token = authorization.replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Sign in is required." }, 401);

    const body = await req.json();
    const listingId = typeof body.listing_id === "string" ? body.listing_id : "";
    const checkIn = typeof body.check_in === "string" ? body.check_in : "";
    const checkOut = typeof body.check_out === "string" ? body.check_out : "";
    const guestCount = Number(body.guest_count);
    const start = new Date(`${checkIn}T00:00:00Z`);
    const end = new Date(`${checkOut}T00:00:00Z`);
    const nights = Math.ceil((end.getTime() - start.getTime()) / 86400000);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (!listingId || !/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut) || !Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20 || nights < 1 || nights > 30) {
      return json({ error: "Please choose valid dates and guest details." }, 400);
    }
    if (start < today) {
      return json({ error: "Check-in date cannot be in the past." }, 400);
    }

    const { data: listing, error: listingError } = await admin
      .from("listings")
      .select("id, price_per_night, max_guests, status")
      .eq("id", listingId)
      .maybeSingle();
    if (listingError || !listing || listing.status !== "published") return json({ error: "That stay is no longer available." }, 404);
    if (guestCount > listing.max_guests) return json({ error: "This stay cannot host that many guests." }, 400);

    const { data: conflicts, error: conflictError } = await admin
      .from("bookings")
      .select("id")
      .eq("listing_id", listingId)
      .in("status", ["pending", "confirmed"])
      .lt("check_in", checkOut)
      .gt("check_out", checkIn)
      .limit(1);
    if (conflictError) return json({ error: "We could not check those dates." }, 503);
    if (conflicts?.length) return json({ error: "Those dates were just booked. Please choose another range." }, 409);

    const totalPrice = Number(listing.price_per_night) * nights;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .insert({ listing_id: listingId, guest_id: userData.user.id, check_in: checkIn, check_out: checkOut, guest_count: guestCount, nightly_rate: listing.price_per_night, total_price: totalPrice, status: "pending", expires_at: expiresAt })
      .select("id, check_in, check_out, guest_count, nightly_rate, total_price, status, expires_at")
      .maybeSingle();
    if (bookingError || !booking) return json({ error: "We could not create the booking request." }, 503);

    return json({ booking });
  } catch (error) {
    console.error("create-booking failed", error);
    return json({ error: "We could not create the booking request." }, 500);
  }
});
