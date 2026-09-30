import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../utils/apiClient';
import './ForgotPassword.css';
import { useLocale } from '../context/LocaleContext';

export default function ResetPassword() {
  const { tx } = useLocale();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    if (password.length < 8) {
      setError(tx('Password is too short — use at least {{n}} characters', { n: 8 }));
      return;
    }
    if (password !== confirmPassword) {
      setError(tx('Passwords do not match'));
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message || tx('Failed to reset password. The link may have expired.'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="forgot-password-page">
        <div className="forgot-password-card">
          <h1>{tx('Invalid Reset Link')}</h1>
          <p className="forgot-password-desc">
            This password reset link is invalid or missing. Please request a new one.
          </p>
          <Link to="/forgot-password" className="btn btn-primary btn-full">{tx('Request new link')}</Link>
          <p className="forgot-footer">
            <Link to="/login" className="forgot-password-back">{tx('Back to sign in')}</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-card">
        <h1>{tx('Reset Password')}</h1>
        {success ? (
          <div className="forgot-password-sent">
            <p>{tx('Your password has been reset successfully. Redirecting to sign in…')}</p>
          </div>
        ) : (
          <>
            <p className="forgot-password-desc">{tx('Enter your new password below.')}</p>
            <form onSubmit={handleSubmit} className="forgot-form">
              {error && <p className="forgot-password-error">{error}</p>}
              <div className="form-group">
                <label htmlFor="reset-password">{tx('New Password')}</label>
                <input
                  id="reset-password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  required
                  minLength={8}
                  placeholder={tx('At least {{n}} characters', { n: 8 })}
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="reset-confirm-password">{tx('Confirm Password')}</label>
                <input
                  id="reset-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  required
                  minLength={8}
                  placeholder={tx('Re-enter your new password')}
                  disabled={loading}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {tx(loading ? 'Resetting…' : 'Reset Password')}
              </button>
            </form>
          </>
        )}
        <p className="forgot-footer">
          <Link to="/login" className="forgot-password-back">{tx('Back to sign in')}</Link>
        </p>
      </div>
    </div>
  );
}
