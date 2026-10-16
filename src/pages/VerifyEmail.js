import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ForgotPassword.css';
import './VerifyEmail.css';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyCode = () => Array(CODE_LENGTH).fill('');

/**
 * Sign-up confirmation: enter the 6-digit code emailed after registering.
 * Reached from Register (state.reason = 'signup') and from Login when the
 * backend answers EMAIL_NOT_VERIFIED (state.reason = 'login').
 */
export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmail, resendVerificationCode } = useAuth();

  const reason = location.state?.reason || null;
  const [email, setEmail] = useState(location.state?.email || '');
  const [emailConfirmed, setEmailConfirmed] = useState(Boolean(location.state?.email));
  const [expiresInMinutes, setExpiresInMinutes] = useState(location.state?.expiresInMinutes ?? 15);

  const [digits, setDigits] = useState(emptyCode);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  // True once the backend says the code can no longer work (expired, used, locked).
  const [needsNewCode, setNeedsNewCode] = useState(false);

  const [resending, setResending] = useState(false);
  const [resendInfo, setResendInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const inputsRef = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (emailConfirmed) inputsRef.current[0]?.focus();
  }, [emailConfirmed]);

  const focusBox = (index) => {
    const box = inputsRef.current[Math.max(0, Math.min(CODE_LENGTH - 1, index))];
    if (box) {
      box.focus();
      box.select();
    }
  };

  const submitCode = async (code) => {
    if (verifying) return;
    setVerifying(true);
    setError('');
    setResendInfo('');

    // The code is sent as a string so leading zeros survive.
    const result = await verifyEmail(email.trim(), code);
    if (result.success) {
      const isFilmmaker = (result.user?.role || result.user?.user_type || '').toLowerCase() === 'filmmaker';
      navigate(isFilmmaker ? '/filmmaker-studio' : '/', { replace: true });
      return;
    }

    setVerifying(false);
    setDigits(emptyCode());
    if (result.reason === 'wrong_code') {
      setNeedsNewCode(false);
      setError(`That code isn\u2019t right. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? '' : 's'} left.`);
      focusBox(0);
    } else if (result.reason === 'expired') {
      setNeedsNewCode(true);
      setError('This code is invalid or has expired. Send a new code to try again.');
    } else {
      // Network / server problem: the code itself may still be fine.
      setError(result.error);
      focusBox(0);
    }
  };

  const updateDigits = (next) => {
    setDigits(next);
    if (error && !needsNewCode) setError('');
    if (next.every((d) => d !== '')) submitCode(next.join(''));
  };

  const handleChange = (index, value) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }
    // Typing over a filled box or an autofill of the whole code into one box.
    const next = [...digits];
    clean.slice(0, CODE_LENGTH - index).split('').forEach((d, i) => {
      next[index + i] = d;
    });
    focusBox(index + clean.length);
    updateDigits(next);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      e.preventDefault();
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      focusBox(index - 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusBox(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = emptyCode();
    pasted.split('').forEach((d, i) => {
      next[i] = d;
    });
    focusBox(pasted.length);
    updateDigits(next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== CODE_LENGTH) {
      setError(`Enter all ${CODE_LENGTH} digits of the code.`);
      return;
    }
    submitCode(code);
  };

  const handleResend = async () => {
    if (resending || cooldown > 0) return;
    setResending(true);
    setError('');
    setResendInfo('');
    const result = await resendVerificationCode(email.trim());
    setResending(false);
    if (result.success) {
      if (result.expiresInMinutes) setExpiresInMinutes(result.expiresInMinutes);
      setNeedsNewCode(false);
      setDigits(emptyCode());
      setResendInfo('A new code is on its way. It replaces any code we sent before.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      focusBox(0);
    } else {
      setError(result.error);
    }
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setEmailConfirmed(true);
  };

  // Opened directly (e.g. bookmarked) without an email: ask for it first.
  if (!emailConfirmed) {
    return (
      <div className="forgot-password-page">
        <div className="forgot-password-card">
          <h1>Verify your email</h1>
          <p className="forgot-password-desc">
            Enter the email you signed up with. Then type the 6-digit code we sent you, or ask for a new one.
          </p>
          <form onSubmit={handleEmailSubmit} className="forgot-form" noValidate>
            {error && <p className="forgot-password-error" role="alert">{error}</p>}
            <div className="form-group">
              <label htmlFor="verify-email-address">Email</label>
              <input
                id="verify-email-address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full">Continue</button>
          </form>
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
        <h1>Check your email</h1>

        {reason === 'login' && (
          <p className="verify-email-notice" role="status">
            Your account isn&apos;t verified yet. Enter the code we emailed you to finish signing in.
            If your last code has expired, send a new one below.
          </p>
        )}

        <p className="forgot-password-desc">
          We sent a 6-digit code to <strong className="verify-email-address">{email}</strong>.
          {' '}It expires in {expiresInMinutes} minutes.
        </p>

        <form onSubmit={handleSubmit} className="forgot-form" noValidate>
          {error && <p className="forgot-password-error" role="alert">{error}</p>}
          {resendInfo && <p className="verify-email-success" role="status">{resendInfo}</p>}

          <fieldset className="verify-code-fieldset" disabled={verifying || needsNewCode}>
            <legend className="verify-code-legend">Verification code</legend>
            <div className="verify-code-boxes" onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputsRef.current[index] = el; }}
                  className="verify-code-box"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  maxLength={CODE_LENGTH}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onFocus={(e) => e.target.select()}
                  aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
                />
              ))}
            </div>
          </fieldset>

          {!needsNewCode && (
            <button type="submit" className="btn btn-primary btn-full" disabled={verifying}>
              {verifying ? 'Verifying…' : 'Verify email'}
            </button>
          )}
        </form>

        <div className="verify-resend">
          {!needsNewCode && <span>Didn&apos;t get the email? Check your spam folder, or</span>}
          <button
            type="button"
            className={needsNewCode ? 'btn btn-primary btn-full' : 'verify-resend-link'}
            onClick={handleResend}
            disabled={resending || cooldown > 0}
          >
            {resending
              ? 'Sending…'
              : cooldown > 0
                ? `Resend code in ${cooldown}s`
                : needsNewCode ? 'Send a new code' : 'Resend code'}
          </button>
        </div>

        <p className="forgot-footer">
          <Link to="/register" className="forgot-password-back">Use a different email</Link>
        </p>
        <p className="forgot-footer">
          <Link to="/login" className="forgot-password-back">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
