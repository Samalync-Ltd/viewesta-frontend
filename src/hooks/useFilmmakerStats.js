import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFilmmakerTitles } from '../services/movieService';
import { getContract, getPayoutBalance } from '../services/earningsService';

/**
 * The signed-in filmmaker's headline numbers, the same on every screen
 * (dashboard, studio profile): uploads = movies + series, and earnings =
 * `total_earnings` (GET /filmmaker/payouts/balance) exactly as the backend
 * reports it. The backend owns the earnings calculation; nothing is worked
 * out here. `earnings.total` is null when the backend sent no value, so the
 * screens can say "Not available yet" instead of showing a made-up 0.00.
 */
export default function useFilmmakerStats() {
  const { user } = useAuth();
  const userId = user?.id;
  const [titleCount, setTitleCount] = useState(null); // null = loading
  const [contractRaw, setContractRaw] = useState(undefined); // undefined = loading
  const [balance, setBalance] = useState(undefined); // undefined = loading, null = backend gave nothing

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    getFilmmakerTitles()
      .then(({ titles }) => { if (active) setTitleCount(titles.length); })
      .catch(() => { if (active) setTitleCount(0); });
    Promise.all([getContract(), getPayoutBalance()]).then(([c, b]) => {
      if (!active) return;
      setContractRaw(c);
      setBalance(b);
    });
    return () => { active = false; };
  }, [userId]);

  return {
    titleCount,
    contractRaw,
    earnings: {
      loading: balance === undefined,
      total: balance?.total_earnings == null ? null : Number(balance.total_earnings),
      currency: balance?.currency || 'USD',
    },
  };
}
