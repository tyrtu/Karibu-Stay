import { supabase } from '@/lib/supabase';

export type ProfileRecord = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'guest' | 'host' | 'admin';
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
};

export async function getMyProfile(): Promise<ProfileRecord | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, verification_status')
    .maybeSingle();
  if (error) throw error;
  return data as ProfileRecord | null;
}

export type ProfileUpdatePayload = {
  full_name: string;
  phone: string;
};

export async function updateProfile(payload: ProfileUpdatePayload): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: payload.full_name, phone: payload.phone || null })
    .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '');
  if (error) throw error;
}
