import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { requestPasswordReset } from '../utils/apiClient';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const { t, tx } = useLocale();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await requestPasswordReset({ email: email.trim() });
      // The email holds a 6-digit code: carry on to the screen where it is entered.
      navigate('/reset-password', {
        state: { email: email.trim(), expiresInMinutes: res?.data?.data?.expires_in_minutes ?? null },
      });
    } catch (err) {
      setError(err.message || tx('Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-card">
        <h1>{t('auth.forgotPassword')}</h1>
        <p className="forgot-password-desc">{tx("Enter your email and we'll send you a 6-digit code to reset your password.")}</p>
        <form onSubmit={handleSubmit} className="forgot-form">
          {error && <p className="forgot-password-error" role="alert">{error}</p>}
          <div className="form-group">
            <label htmlFor="forgot-email">{t('auth.email')}</label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              required
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {tx(loading ? 'Sending…' : 'Send code')}
          </button>
        </form>
        <p className="forgot-footer">
          <Link to="/login" className="forgot-password-back">{tx('Back to sign in')}</Link>
        </p>
      </div>
    </div>
  );
}
