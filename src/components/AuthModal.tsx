import { type FormEvent, useState } from 'react';
import { ArrowRight, Eye, EyeOff, House, Users, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type AuthMode = 'signin' | 'signup';
type AuthRole = 'guest' | 'host';
type AuthView = 'form' | 'forgot' | 'reset-sent';

type Props = {
  mode: AuthMode;
  role: AuthRole;
  onRoleChange: (role: AuthRole) => void;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onToast: (message: string) => void;
};

export default function AuthModal({ mode, role, onRoleChange, onClose, onModeChange, onToast }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('form');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: name, role } } });

    if (result.error) {
      setError(result.error.message.includes('Invalid login') ? 'That email or password did not match.' : result.error.message);
      setLoading(false);
      return;
    }

    if (mode === 'signup' && result.data.user && result.data.session) {
      await supabase.from('profiles').upsert({ id: result.data.user.id, full_name: name, role });
    }
    setLoading(false);
    onClose();
    setEmail(''); setPassword(''); setName('');
    onToast(mode === 'signin' ? 'Welcome back.' : `Your ${role} account is ready.`);
  };

  const handleForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setAuthView('reset-sent');
  };

  if (authView === 'reset-sent') {
    return (
      <div className="auth-backdrop" role="presentation" onMouseDown={onClose}>
        <section className="auth-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
          <button className="drawer-close" onClick={onClose} aria-label="Close account dialog"><X size={18} /></button>
          <div className="eyebrow"><span className="eyebrow-line" /> PASSWORD RESET</div>
          <h2>Check your email.</h2>
          <p className="auth-intro">We sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.</p>
          <button className="primary-button auth-submit" onClick={() => { setAuthView('form'); onModeChange('signin'); setEmail(''); }}>Back to log in <ArrowRight size={16} /></button>
        </section>
      </div>
    );
  }

  if (authView === 'forgot') {
    return (
      <div className="auth-backdrop" role="presentation" onMouseDown={onClose}>
        <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}>
          <button className="drawer-close" onClick={onClose} aria-label="Close account dialog"><X size={18} /></button>
          <div className="eyebrow"><span className="eyebrow-line" /> RESET PASSWORD</div>
          <h2 id="auth-title">Forgot your password?</h2>
          <p className="auth-intro">Enter your email and we will send you a link to reset it.</p>
          <form onSubmit={handleForgotPassword}>
            <div className="auth-fields">
              <label><span>EMAIL ADDRESS</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button className="primary-button auth-submit" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'} <ArrowRight size={16} /></button>
          </form>
          <button className="text-button" style={{ marginTop: 16, fontSize: 11 }} onClick={() => { setAuthView('form'); setError(''); }}>Back to log in</button>
        </section>
      </div>
    );
  }

  return (
    <div className="auth-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="drawer-close" onClick={onClose} aria-label="Close account dialog"><X size={18} /></button>
        <div className="eyebrow"><span className="eyebrow-line" /> KARIBU STAY ACCOUNT</div>
        <h2 id="auth-title">{mode === 'signin' ? 'Welcome back.' : 'Make room for more.'}</h2>
        <p className="auth-intro">{mode === 'signin' ? 'Sign in to keep your stays and booking requests together.' : 'Create an account to book a stay or share your place with thoughtful travellers.'}</p>
        <div className="auth-tabs">
          <button className={mode === 'signin' ? 'active' : ''} onClick={() => { onModeChange('signin'); setError(''); }}>Log in</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => { onModeChange('signup'); setError(''); }}>Sign up</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="auth-fields">
            {mode === 'signup' && <label><span>YOUR NAME</span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Amina Otieno" /></label>}
            <label><span>EMAIL ADDRESS</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
            <label><span>PASSWORD</span>
              <div className="password-field">
                <input required minLength={6} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          </div>
          {mode === 'signup' && (
            <div className="role-picker">
              <span>I AM HERE TO</span>
              <div>
                <button type="button" className={role === 'guest' ? 'selected' : ''} onClick={() => onRoleChange('guest')}><Users size={15} /> Find a stay</button>
                <button type="button" className={role === 'host' ? 'selected' : ''} onClick={() => onRoleChange('host')}><House size={15} /> Host a stay</button>
              </div>
            </div>
          )}
          {mode === 'signin' && <button type="button" className="text-button forgot-link" onClick={() => { setAuthView('forgot'); setError(''); }}>Forgot password?</button>}
          {error && <p className="auth-error">{error}</p>}
          <button className="primary-button auth-submit" disabled={loading}>{loading ? 'Working…' : mode === 'signin' ? 'Log in' : 'Create account'} <ArrowRight size={16} /></button>
        </form>
      </section>
    </div>
  );
}
