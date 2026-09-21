import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyPayment } from '../services/paymentService';
import { useAuth } from '../context/AuthContext';
import { useMovies } from '../context/MovieContext';
import { FaSpinner, FaCheckCircle, FaExclamationTriangle, FaClock } from 'react-icons/fa';
import './PaymentCallback.css';

/**
 * Where the browser lands after paying on Pesapal.
 *
 * The backend's payment callback redirects here — `/payments/success` or
 * `/payments/failure` — and the older `/payment-callback?OrderTrackingId=…`
 * form is still supported. Purchase, subscription and wallet top-up flows all
 * leave the app for Pesapal, so the page they came from is remembered in
 * sessionStorage (`vw_payment_return_to`) and the viewer is sent back to it.
 *
 * Props:
 *   outcome  'success' | 'failure' | undefined (undefined = verify via the tracking id in the URL)
 */

const RETURN_KEY = 'vw_payment_return_to';
const REDIRECT_DELAY_MS = 3000;
const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 6;

const SUCCESS_STATUSES = ['completed', 'complete', 'success', 'successful', 'paid'];
const PENDING_STATUSES = ['pending', 'processing', 'initiated', 'in_progress'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const safeDecode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

// In-app paths only — never follow a `return_to` that points off-site.
const isSafePath = (path) => typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');

function resolveReturnTo(search) {
  const params = new URLSearchParams(search);
  const raw = params.get('return_to') || sessionStorage.getItem(RETURN_KEY);
  const decoded = raw ? safeDecode(raw) : null;
  return isSafePath(decoded) ? decoded : null;
}

// After a failed payment, /watch/:id would only say "purchase to watch" — send
// the viewer back to the movie page where they can try again.
function failureBackPath(returnTo) {
  if (!returnTo) return '/wallet';
  const watch = returnTo.match(/^\/watch\/([^/?#]+)/);
  return watch ? `/movie/${watch[1]}` : returnTo;
}

// The verify response carries `payment_status` (or the transaction's status).
// No status at all on a 2xx response means the backend has fulfilled it.
function classifyPayment(result) {
  const raw = String(
    result?.data?.payment_status ||
    result?.data?.transaction?.status ||
    result?.payment_status ||
    ''
  ).toLowerCase();
  if (!raw || SUCCESS_STATUSES.includes(raw)) return { state: 'success', raw };
  if (PENDING_STATUSES.includes(raw)) return { state: 'pending', raw };
  return { state: 'failed', raw };
}

const PaymentCallback = ({ outcome }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const { refreshPurchases } = useMovies();

  const [returnTo] = useState(() => resolveReturnTo(location.search));
  const [status, setStatus] = useState(outcome === 'failure' ? 'error' : 'verifying'); // 'verifying' | 'success' | 'pending' | 'error'
  const [message, setMessage] = useState(() => {
    if (outcome !== 'failure') return 'Verifying your payment...';
    const params = new URLSearchParams(location.search);
    return params.get('message') || params.get('error') || params.get('reason') ||
      'Your payment was not completed, so you have not been charged.';
  });

  // The sync helpers change identity whenever the signed-in user does, and the
  // sync itself changes the user — keep them in a ref so this page verifies
  // exactly once instead of looping.
  const syncRef = useRef({ refreshProfile, refreshPurchases });
  syncRef.current = { refreshProfile, refreshPurchases };

  // The remembered return path has been read; don't leave it behind.
  useEffect(() => {
    sessionStorage.removeItem(RETURN_KEY);
  }, []);

  useEffect(() => {
    if (outcome === 'failure') return undefined;

    const params = new URLSearchParams(location.search);
    const orderTrackingId = params.get('requestID') || params.get('requestId') || params.get('OrderTrackingId') || params.get('order_tracking_id');
    const merchantReference = params.get('merchant_reference') || params.get('OrderMerchantReference');
    const hasIds = Boolean(orderTrackingId || merchantReference);

    if (!hasIds && outcome !== 'success') {
      setStatus('error');
      setMessage('Invalid payment callback: Missing tracking ID.');
      return undefined;
    }

    let cancelled = false;
    let redirectTimer;

    const run = async () => {
      try {
        // /payments/success is only reached after the backend has verified the
        // payment, so it may arrive without ids; then there is nothing to verify.
        let result = { state: 'success', raw: '' };
        if (hasIds) {
          for (let attempt = 0; ; attempt += 1) {
            const response = await verifyPayment({
              order_tracking_id: orderTrackingId,
              merchant_reference: merchantReference,
            });
            if (cancelled) return;
            result = classifyPayment(response);
            if (result.state !== 'pending' || attempt >= MAX_POLLS) break;
            await sleep(POLL_INTERVAL_MS);
            if (cancelled) return;
          }
        }

        if (result.state === 'failed') {
          setStatus('error');
          setMessage(
            result.raw
              ? `This payment was not completed (status: ${result.raw}).`
              : 'This payment was not completed.'
          );
          return;
        }

        // Bring wallet / subscription / purchases up to date before moving on.
        const { refreshProfile: syncProfile, refreshPurchases: syncPurchases } = syncRef.current;
        await Promise.allSettled([
          syncProfile ? syncProfile() : null,
          syncPurchases ? syncPurchases() : null,
        ]);
        if (cancelled) return;

        if (result.state === 'pending') {
          setStatus('pending');
          setMessage('Your payment is still being confirmed. This can take a minute — your account will update automatically once it is.');
          return;
        }

        setStatus('success');
        setMessage('Payment successful! Taking you back...');
        redirectTimer = setTimeout(() => navigate(returnTo || '/wallet'), REDIRECT_DELAY_MS);
      } catch (error) {
        if (cancelled) return;
        setStatus('error');
        setMessage(error?.response?.data?.message || 'Payment verification failed. Please contact support.');
      }
    };

    run();

    return () => {
      cancelled = true;
      clearTimeout(redirectTimer);
    };
  }, [outcome, location.search, navigate, returnTo]);

  const continueTo = returnTo || '/wallet';

  return (
    <div className="payment-callback-page">
      <div className="payment-callback-card">
        {status === 'verifying' && (
          <>
            <FaSpinner className="callback-icon spin" />
            <h2>Verifying Payment</h2>
            <p>{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <FaCheckCircle className="callback-icon success" />
            <h2>Payment Successful</h2>
            <p>{message}</p>
            <div className="callback-actions">
              <button className="btn btn-primary" onClick={() => navigate(continueTo)}>
                Continue
              </button>
            </div>
          </>
        )}
        {status === 'pending' && (
          <>
            <FaClock className="callback-icon pending" />
            <h2>Payment Processing</h2>
            <p>{message}</p>
            <div className="callback-actions">
              <button className="btn btn-primary" onClick={() => navigate(continueTo)}>
                Continue
              </button>
            </div>
          </>
        )}
        {status === 'error' && (
          <>
            <FaExclamationTriangle className="callback-icon error" />
            <h2>{outcome === 'failure' ? 'Payment Not Completed' : 'Verification Failed'}</h2>
            <p>{message}</p>
            <div className="callback-actions">
              <button className="btn btn-primary" onClick={() => navigate(failureBackPath(returnTo))}>
                {returnTo ? 'Try again' : 'Return to Wallet'}
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/')}>
                Back to home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;
