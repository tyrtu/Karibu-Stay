import { type FormEvent, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { updateProfile, type ProfileRecord } from '@/lib/profiles';

type Props = {
  profile: ProfileRecord;
  email: string | null;
  onClose: () => void;
  onSaved: (updated: ProfileRecord) => void;
  onToast: (message: string) => void;
};

const VERIFICATION_LABELS: Record<string, string> = {
  unverified: 'Unverified',
  pending: 'Pending review',
  verified: 'Verified',
  rejected: 'Not approved',
};

export default function ProfileSettings({ profile, email, onClose, onSaved, onToast }: Props) {
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { setError('Please enter your name.'); return; }
    setSaving(true); setError('');
    try {
      await updateProfile({ full_name: fullName.trim(), phone: phone.trim() });
      onSaved({ ...profile, full_name: fullName.trim(), phone: phone.trim() || null });
      onToast('Profile updated.');
      onClose();
    } catch (err) {
      console.error('profile update failed', err);
      setError('We could not save those changes. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="auth-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-settings-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="drawer-close" onClick={onClose} aria-label="Close profile settings"><X size={18} /></button>
        <div className="eyebrow"><span className="eyebrow-line" /> YOUR PROFILE</div>
        <h2 id="profile-settings-title">Profile settings.</h2>
        <p className="auth-intro">Update your display name and contact number. Your email address cannot be changed here.</p>

        {!profile.full_name && (
          <div className="profile-name-prompt" role="note">
            Your name is not set yet. Add it so hosts and guests can identify you.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="auth-fields">
            <label>
              <span>EMAIL ADDRESS</span>
              <input
                type="email"
                value={email ?? ''}
                readOnly
                aria-readonly="true"
                style={{ opacity: 0.55, cursor: 'default' }}
              />
            </label>
            <label>
              <span>ROLE</span>
              <input
                value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                readOnly
                aria-readonly="true"
                style={{ opacity: 0.55, cursor: 'default' }}
              />
            </label>
            <label>
              <span>FULL NAME</span>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Amina Otieno"
              />
            </label>
            <label>
              <span>PHONE NUMBER (optional)</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +254 712 345 678"
              />
            </label>
          </div>

          <div className="profile-status-row">
            <span className="profile-status-label">Verification status</span>
            <span className={`status-badge ${profile.verification_status === 'verified' ? 'confirmed' : profile.verification_status === 'rejected' ? 'cancelled' : 'pending'}`}>
              {VERIFICATION_LABELS[profile.verification_status] ?? profile.verification_status}
            </span>
          </div>

          {error && <p className="auth-error">{error}</p>}
          <button className="primary-button auth-submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'} <ArrowRight size={16} />
          </button>
        </form>
      </section>
    </div>
  );
}
