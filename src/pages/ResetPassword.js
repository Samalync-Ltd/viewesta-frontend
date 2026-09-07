import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../utils/apiClient';
import './ForgotPassword.css';

export default function ResetPassword() {
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

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="forgot-password-page">
        <div className="forgot-password-card">
          <h1>Invalid Reset Link</h1>
          <p className="forgot-password-desc">
            This password reset link is invalid or missing. Please request a new one.
          </p>
          <Link to="/forgot-password" className="btn btn-primary btn-full">Request new link</Link>
          <p className="forgot-footer">
            <Link to="/login" className="forgot-password-back">Back to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-card">
        <h1>Reset Password</h1>
        {success ? (
          <div className="forgot-password-sent">
            <p>Your password has been reset successfully. Redirecting to sign in…</p>
          </div>
        ) : (
          <>
            <p className="forgot-password-desc">Enter your new password below.</p>
            <form onSubmit={handleSubmit} className="forgot-form">
              {error && <p className="forgot-password-error">{error}</p>}
              <div className="form-group">
                <label htmlFor="reset-password">New Password</label>
                <input
                  id="reset-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="reset-confirm-password">Confirm Password</label>
                <input
                  id="reset-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Re-enter your new password"
                  disabled={loading}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
        <p className="forgot-footer">
          <Link to="/login" className="forgot-password-back">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
