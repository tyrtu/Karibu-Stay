import { supabase } from '@/lib/supabase';

export type ListingImageRecord = {
  id: string;
  listing_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_cover: boolean;
};

/**
 * Upload image files to the `listing-images` Supabase Storage bucket,
 * then insert rows into `listing_images`.
 *
 * Returns the inserted records or throws.
 */
export async function uploadListingImages(
  listingId: string,
  files: File[],
  existingCount = 0,
): Promise<ListingImageRecord[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('You must be signed in to upload images.');

  const inserted: ListingImageRecord[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${userId}/${listingId}/${Date.now()}-${i}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('listing-images')
      .upload(path, file, { upsert: false, contentType: file.type });

    if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage
      .from('listing-images')
      .getPublicUrl(path);

    const sortOrder = existingCount + i;
    const isCover = existingCount === 0 && i === 0;

    const { data, error: insertError } = await supabase
      .from('listing_images')
      .insert({
        listing_id: listingId,
        url: urlData.publicUrl,
        alt_text: null,
        sort_order: sortOrder,
        is_cover: isCover,
      })
      .select()
      .maybeSingle();

    if (insertError) throw new Error(`Image record insert failed: ${insertError.message}`);
    if (data) inserted.push(data as ListingImageRecord);
  }

  return inserted;
}

/**
 * Delete a listing image record and its storage object.
 */
export async function deleteListingImage(imageId: string, storageUrl: string): Promise<void> {
  // Extract the storage path from the public URL
  const marker = '/object/public/listing-images/';
  const idx = storageUrl.indexOf(marker);
  if (idx !== -1) {
    const storagePath = decodeURIComponent(storageUrl.slice(idx + marker.length));
    await supabase.storage.from('listing-images').remove([storagePath]);
  }
  const { error } = await supabase.from('listing_images').delete().eq('id', imageId);
  if (error) throw error;
}

/**
 * Fetch all images for a listing owned by the current user.
 */
export async function getListingImages(listingId: string): Promise<ListingImageRecord[]> {
  const { data, error } = await supabase
    .from('listing_images')
    .select('id, listing_id, url, alt_text, sort_order, is_cover')
    .eq('listing_id', listingId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ListingImageRecord[];
}
