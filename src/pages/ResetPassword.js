import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { requestPasswordReset, resetPassword, verifyResetCode } from '../utils/apiClient';
import CodeInput, { CODE_LENGTH } from '../components/CodeInput';
import './ForgotPassword.css';
import './VerifyEmail.css';

const MIN_PASSWORD_LENGTH = 8;
const RESEND_COOLDOWN_SECONDS = 30;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The reset token in a successful POST /auth/verify-reset-code answer.
 * /auth/reset requires a GUID token, so only a GUID counts. The usual names
 * are tried first, then any `*token*` field one level down, never an id.
 */
export function extractResetToken(body) {
  const data = body?.data ?? body;
  const named = [data?.reset_token, data?.token, data?.resetToken, body?.reset_token, body?.token];
  const hit = named.find((v) => typeof v === 'string' && GUID_REGEX.test(v));
  if (hit) return hit;
  const tokenLike = (obj) => (obj && typeof obj === 'object'
    ? Object.entries(obj).find(([k, v]) => /token/i.test(k) && typeof v === 'string' && GUID_REGEX.test(v))?.[1]
    : undefined);
  return tokenLike(data) ?? Object.values(data || {}).map(tokenLike).find(Boolean) ?? null;
}

/**
 * Second step of "Forgot password": the user enters the 6-digit code emailed
 * to them, a new password and its confirmation. Reached from ForgotPassword
 * with the email in the router state (or ?email=).
 */
export default function ResetPassword() {
  const { tx } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialEmail = location.state?.email || searchParams.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [emailConfirmed, setEmailConfirmed] = useState(Boolean(initialEmail));
  const [expiresInMinutes, setExpiresInMinutes] = useState(location.state?.expiresInMinutes ?? 15);

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // True once the backend says the code can no longer work (expired, used, locked).
  const [needsNewCode, setNeedsNewCode] = useState(false);
  const [success, setSuccess] = useState(false);

  const [resending, setResending] = useState(false);
  const [resendInfo, setResendInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const codeRef = useRef(null);
  // Set once the code is accepted, so a retry (e.g. after the server rejects
  // the password) does not need a new code. Cleared when a new code is sent.
  const resetTokenRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => navigate('/login'), 2500);
    return () => clearTimeout(timer);
  }, [success, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    if (code.length !== CODE_LENGTH) {
      setError(tx('Enter all 6 digits of the code.'));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(tx('Password is too short — use at least {{n}} characters', { n: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (password !== confirmPassword) {
      setError(tx('Passwords do not match'));
      return;
    }

    setLoading(true);

    // Step 1: exchange the emailed code for a reset token.
    if (!resetTokenRef.current) {
      try {
        // The code is sent as a string so leading zeros survive.
        const res = await verifyResetCode({ email: email.trim(), code });
        resetTokenRef.current = extractResetToken(res.data);
      } catch (err) {
        setLoading(false);
        const attemptsLeft = err.data?.data?.attempts_left;
        if (!err.status) {
          setError(tx('Unable to connect to the server. Please check your internet connection and try again.'));
        } else if (err.status === 400 || err.status === 404) {
          setCode('');
          if (typeof attemptsLeft === 'number' && attemptsLeft > 0) {
            setNeedsNewCode(false);
            setError(tx('That code isn’t right. {{n}} attempts left.', { n: attemptsLeft }));
            codeRef.current?.focus();
          } else {
            setNeedsNewCode(true);
            setError(tx('This code is wrong or has expired. Send a new code to try again.'));
          }
        } else {
          setError(tx('Something went wrong. Please try again.'));
        }
        return;
      }
      if (!resetTokenRef.current) {
        setLoading(false);
        console.error('[ResetPassword] /auth/verify-reset-code succeeded but returned no reset token');
        setError(tx('Something went wrong. Please try again.'));
        return;
      }
    }

    // Step 2: set the new password with that token.
    try {
      await resetPassword({ token: resetTokenRef.current, password });
      setSuccess(true);
    } catch (err) {
      const details = err.data?.error?.details;
      const fields = Array.isArray(details) ? details : [];
      const passwordProblem = fields.find((d) => d.field === 'password');

      if (!err.status) {
        setError(tx('Unable to connect to the server. Please check your internet connection and try again.'));
      } else if (passwordProblem) {
        // The token is still good: fixing the password and resubmitting is enough.
        setError(passwordProblem.message?.replace(/"/g, ''));
      } else if (err.status === 400 || err.status === 404) {
        // The token was rejected (expired or already used): start again with a new code.
        resetTokenRef.current = null;
        setCode('');
        setNeedsNewCode(true);
        setError(tx('This code is wrong or has expired. Send a new code to try again.'));
      } else {
        setError(tx('Something went wrong. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending || cooldown > 0) return;
    setResending(true);
    setError('');
    setResendInfo('');
    try {
      const res = await requestPasswordReset({ email: email.trim() });
      const minutes = res?.data?.data?.expires_in_minutes;
      if (minutes) setExpiresInMinutes(minutes);
      setNeedsNewCode(false);
      setCode('');
      resetTokenRef.current = null;
      setResendInfo(tx('A new code is on its way. It replaces any code we sent before.'));
      setCooldown(RESEND_COOLDOWN_SECONDS);
      codeRef.current?.focus();
    } catch (err) {
      setError(err.status
        ? tx('Could not send a new code. Please try again.')
        : tx('Unable to connect to the server. Please check your internet connection and try again.'));
    } finally {
      setResending(false);
    }
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email.trim())) {
      setError(tx('Please enter a valid email address'));
      return;
    }
    setError('');
    setEmailConfirmed(true);
  };

  // Opened directly without an email (e.g. bookmarked): ask for it first.
  if (!emailConfirmed) {
    return (
      <div className="forgot-password-page">
        <div className="forgot-password-card">
          <h1>{tx('Reset Password')}</h1>
          <p className="forgot-password-desc">{tx('Enter the email you used to request the code.')}</p>
          <form onSubmit={handleEmailSubmit} className="forgot-form" noValidate>
            {error && <p className="forgot-password-error" role="alert">{error}</p>}
            <div className="form-group">
              <label htmlFor="reset-email">{tx('Email')}</label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full">{tx('Continue')}</button>
          </form>
          <p className="forgot-footer">
            <Link to="/forgot-password" className="forgot-password-back">{tx('Send me a code')}</Link>
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
          <div className="forgot-password-sent" role="status">
            <p><strong>{tx('Password updated')}</strong></p>
            <p>{tx('You can now sign in with your new password. Taking you to sign in…')}</p>
            <Link to="/login" className="btn btn-primary btn-full">{tx('Back to sign in')}</Link>
          </div>
        ) : (
          <>
            <p className="forgot-password-desc">
              {tx('We sent a 6-digit code to')} <strong className="verify-email-address">{email}</strong>.
              {' '}{tx('It expires in {{n}} minutes.', { n: expiresInMinutes })}
            </p>
            <form onSubmit={handleSubmit} className="forgot-form" noValidate>
              {error && <p className="forgot-password-error" role="alert">{error}</p>}
              {resendInfo && <p className="verify-email-success" role="status">{resendInfo}</p>}

              <div className="form-group">
                <label htmlFor="reset-code">{tx('Verification code')}</label>
                <CodeInput
                  id="reset-code"
                  ref={codeRef}
                  value={code}
                  onChange={(next) => { setCode(next); if (!needsNewCode) setError(''); }}
                  disabled={loading || needsNewCode}
                  label={tx('Verification code')}
                  autoFocus
                />
              </div>

              {!needsNewCode && (
                <>
                  <div className="form-group">
                    <label htmlFor="reset-password">{tx('New Password')}</label>
                    <input
                      id="reset-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      autoComplete="new-password"
                      placeholder={tx('At least {{n}} characters', { n: MIN_PASSWORD_LENGTH })}
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="reset-confirm-password">{tx('Confirm Password')}</label>
                    <input
                      id="reset-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      autoComplete="new-password"
                      placeholder={tx('Re-enter your new password')}
                      disabled={loading}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                    {tx(loading ? 'Resetting…' : 'Reset Password')}
                  </button>
                </>
              )}
            </form>

            <div className="verify-resend">
              {!needsNewCode && <span>{tx("Didn't get the email? Check your spam folder, or")}</span>}
              <button
                type="button"
                className={needsNewCode ? 'btn btn-primary btn-full' : 'verify-resend-link'}
                onClick={handleResend}
                disabled={resending || cooldown > 0}
              >
                {resending
                  ? tx('Sending…')
                  : cooldown > 0
                    ? tx('Resend code in {{n}}s', { n: cooldown })
                    : tx(needsNewCode ? 'Send a new code' : 'Resend code')}
              </button>
            </div>
          </>
        )}
        <p className="forgot-footer">
          <Link to="/login" className="forgot-password-back">{tx('Back to sign in')}</Link>
        </p>
      </div>
    </div>
  );
}
