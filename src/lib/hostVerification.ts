import { supabase } from '@/lib/supabase';

export type VerificationRecord = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  phone_verified: boolean;
  created_at: string;
};

export async function getMyVerification(): Promise<VerificationRecord | null> {
  const { data, error } = await supabase
    .from('host_verifications')
    .select('id, status, phone_verified, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as VerificationRecord | null;
}

export async function submitVerification(payload: {
  id_document_url: string;
  selfie_url: string;
}): Promise<void> {
  const { error } = await supabase.from('host_verifications').insert({
    id_document_url: payload.id_document_url,
    selfie_url: payload.selfie_url,
    phone_verified: false,
    status: 'pending',
  });
  if (error) throw error;
}
