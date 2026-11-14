/*
# Add get_review_aggregates RPC

Replaces the client-side JS aggregation in src/lib/reviews.ts with a
single GROUP BY query executed on the server.

Returns one row per listing_id that has at least one approved review
(i.e. the booking is completed — enforced by the existing RLS policy
on the reviews table).
*/

CREATE OR REPLACE FUNCTION get_review_aggregates(p_listing_ids uuid[])
RETURNS TABLE (
  listing_id   uuid,
  avg_rating   numeric,
  review_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.listing_id,
    ROUND(AVG(r.rating)::numeric, 2) AS avg_rating,
    COUNT(*)                          AS review_count
  FROM   reviews r
  WHERE  r.listing_id = ANY(p_listing_ids)
  GROUP  BY r.listing_id;
$$;

-- Public read — matches the anon/authenticated access already granted on reviews
GRANT EXECUTE ON FUNCTION get_review_aggregates(uuid[]) TO anon, authenticated;
