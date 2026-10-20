import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWallet, WALLET_CHANGED_EVENT } from '../services/walletService';

/**
 * The signed-in user's wallet balance, read live from GET /wallet — the same
 * source as the Wallet page — instead of the copy saved in the user at login,
 * which went stale after every top-up or purchase until the next sign-in.
 *
 * It re-reads when the app reports a balance change (top-up, purchase,
 * confirmed payment) and when the tab comes back into view, so a payment
 * finished in another tab or on the phone shows up too.
 *
 * Returns { balance, currency, loading, error }. `balance` is null until the
 * first answer arrives (and stays null if it never does).
 */
export default function useWalletBalance() {
  const { user } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState({ balance: null, currency: null, loading: true, error: false });
  const latestRequest = useRef(0);

  const load = useCallback(() => {
    // Only the newest answer counts, so a slow early request can't overwrite a newer balance.
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    return getWallet()
      .then((wallet) => {
        if (latestRequest.current !== requestId) return;
        setState({ balance: wallet.balance, currency: wallet.currency, loading: false, error: false });
      })
      .catch(() => {
        if (latestRequest.current !== requestId) return;
        setState((prev) => ({ ...prev, loading: false, error: true }));
      });
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    load();

    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener(WALLET_CHANGED_EVENT, load);
    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      latestRequest.current += 1; // ignore answers that arrive after unmount
      window.removeEventListener(WALLET_CHANGED_EVENT, load);
      window.removeEventListener('focus', load);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, load]);

  return state;
}
