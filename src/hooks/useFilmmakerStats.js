import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFilmmakerTitles } from '../services/movieService';
import { getContract, getPayoutBalance } from '../services/earningsService';

/**
 * The signed-in filmmaker's headline numbers, the same on every screen
 * (dashboard, studio profile): uploads = movies + series, and earnings =
 * `total_earnings` exactly as the backend reports it. The backend owns the
 * earnings calculation; nothing is worked out here.
 */
export default function useFilmmakerStats() {
  const { user } = useAuth();
  const userId = user?.id;
  const [titleCount, setTitleCount] = useState(null); // null = loading
  const [contractRaw, setContractRaw] = useState(undefined); // undefined = loading
  const [balance, setBalance] = useState(null);

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
      total: Number(balance?.total_earnings ?? 0),
      currency: balance?.currency || 'USD',
    },
  };
}
