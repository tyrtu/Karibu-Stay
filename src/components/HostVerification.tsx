import { type FormEvent, useEffect, useState } from 'react';
import { ArrowRight, CheckCircle, Clock, Loader2, ShieldX, X } from 'lucide-react';
import {
  getMyVerification,
  submitVerification,
  type VerificationRecord,
} from '@/lib/hostVerification';

type Props = {
  onClose: () => void;
  onToast: (message: string, type?: 'success' | 'error') => void;
};

export default function HostVerification({ onClose, onToast }: Props) {
  const [existing, setExisting] = useState<VerificationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [idDocUrl, setIdDocUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyVerification()
      .then(setExisting)
      .catch(() => setExisting(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!idDocUrl.trim()) { setError('Please provide a link to your ID document.'); return; }
    if (!selfieUrl.trim()) { setError('Please provide a link to your selfie photo.'); return; }
    setSaving(true); setError('');
    try {
      await submitVerification({ id_document_url: idDocUrl.trim(), selfie_url: selfieUrl.trim() });
      onToast('Verification request submitted. We will review it shortly.');
      onClose();
    } catch (err) {
      console.error('verification submit failed', err);
      setError('We could not submit your request. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="auth-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="verification-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="drawer-close" onClick={onClose} aria-label="Close verification"><X size={18} /></button>
        <div className="eyebrow"><span className="eyebrow-line" /> HOST VERIFICATION</div>
        <h2 id="verification-title">Get verified.</h2>
        <p className="auth-intro">
          Verified hosts build more trust with guests. Submit a government-issued ID and a selfie to get started.
        </p>

        {loading ? (
          <p className="upload-progress">
            <Loader2 size={14} className="spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />
            Checking verification status…
          </p>
        ) : existing ? (
          /* Already submitted — show status */
          <div className="verification-status-block">
            {existing.status === 'pending' && (
              <div className="verification-status-row pending">
                <Clock size={18} />
                <div>
                  <strong>Under review</strong>
                  <p>Your verification request is being reviewed. We will update your profile once it is complete.</p>
                </div>
              </div>
            )}
            {existing.status === 'approved' && (
              <div className="verification-status-row approved">
                <CheckCircle size={18} />
                <div>
                  <strong>Verified</strong>
                  <p>Your identity has been confirmed. Your profile shows a verified badge.</p>
                </div>
              </div>
            )}
            {existing.status === 'rejected' && (
              <div className="verification-status-row rejected">
                <ShieldX size={18} />
                <div>
                  <strong>Not approved</strong>
                  <p>Your previous submission was not approved. Please resubmit with clearer documents.</p>
                </div>
              </div>
            )}

            {/* Allow resubmission if rejected */}
            {existing.status === 'rejected' && (
              <form onSubmit={handleSubmit} style={{ marginTop: 22 }}>
                <div className="auth-fields">
                  <label>
                    <span>ID DOCUMENT URL</span>
                    <input
                      required
                      type="url"
                      value={idDocUrl}
                      onChange={(e) => setIdDocUrl(e.target.value)}
                      placeholder="https://drive.google.com/…"
                    />
                  </label>
                  <label>
                    <span>SELFIE PHOTO URL</span>
                    <input
                      required
                      type="url"
                      value={selfieUrl}
                      onChange={(e) => setSelfieUrl(e.target.value)}
                      placeholder="https://drive.google.com/…"
                    />
                  </label>
                </div>
                {error && <p className="auth-error">{error}</p>}
                <button className="primary-button auth-submit" disabled={saving}>
                  {saving ? 'Submitting…' : 'Resubmit for review'} <ArrowRight size={16} />
                </button>
              </form>
            )}
          </div>
        ) : (
          /* First-time submission */
          <form onSubmit={handleSubmit}>
            <p className="verification-hint">
              Upload your documents to a cloud service (Google Drive, Dropbox, etc.), set them to
              publicly viewable, then paste the links below.
            </p>
            <div className="auth-fields">
              <label>
                <span>GOVERNMENT-ISSUED ID (National ID, Passport)</span>
                <input
                  required
                  type="url"
                  value={idDocUrl}
                  onChange={(e) => setIdDocUrl(e.target.value)}
                  placeholder="https://drive.google.com/…"
                />
              </label>
              <label>
                <span>SELFIE HOLDING YOUR ID</span>
                <input
                  required
                  type="url"
                  value={selfieUrl}
                  onChange={(e) => setSelfieUrl(e.target.value)}
                  placeholder="https://drive.google.com/…"
                />
              </label>
            </div>
            <p className="verification-privacy">
              Your documents are only used for identity verification and are never shared with guests.
            </p>
            {error && <p className="auth-error">{error}</p>}
            <button className="primary-button auth-submit" disabled={saving}>
              {saving ? 'Submitting…' : 'Submit for review'} <ArrowRight size={16} />
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
