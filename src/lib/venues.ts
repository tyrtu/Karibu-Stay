import { supabase } from '@/lib/supabase';

export type VenueOption = {
  id: string;
  name: string;
  city: string;
};

export async function getVenueOptions(): Promise<VenueOption[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, city')
    .order('name');

  if (error) throw error;
  return data ?? [];
}
