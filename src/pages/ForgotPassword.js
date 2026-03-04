import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-card">
        <h1>{t('auth.forgotPassword')}</h1>
        <p className="forgot-desc">Enter your email and we&apos;ll send you a link to reset your password.</p>
        {submitted ? (
          <div className="forgot-success">
            <p>If an account exists for that email, you will receive a reset link shortly.</p>
            <Link to="/login" className="btn btn-primary">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="forgot-form">
            <div className="form-group">
              <label htmlFor="forgot-email">{t('auth.email')}</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full">Send reset link</button>
          </form>
        )}
        <p className="forgot-footer">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
