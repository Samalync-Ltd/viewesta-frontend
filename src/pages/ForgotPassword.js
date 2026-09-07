import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { requestPasswordReset } from '../utils/apiClient';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await requestPasswordReset({ email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-card">
        <h1>{t('auth.forgotPassword')}</h1>
        <p className="forgot-password-desc">Enter your email and we&apos;ll send you a link to reset your password.</p>
        {submitted ? (
          <div className="forgot-password-sent">
            <p>If an account exists for that email, you will receive a reset link shortly.</p>
            <Link to="/login" className="btn btn-primary">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="forgot-form">
            {error && <p className="forgot-password-error">{error}</p>}
            <div className="form-group">
              <label htmlFor="forgot-email">{t('auth.email')}</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        <p className="forgot-footer">
          <Link to="/login" className="forgot-password-back">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
