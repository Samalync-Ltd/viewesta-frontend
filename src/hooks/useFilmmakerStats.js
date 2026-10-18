import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFilmmakerTitles } from '../services/movieService';
import { getContract, getEarningsBreakdown } from '../services/earningsService';

/**
 * The signed-in filmmaker's headline numbers, the same on every screen
 * (dashboard, studio profile): uploads = movies + series, and earnings =
 * `totals.earnings` (paid + pending) from GET /filmmaker/earnings/breakdown,
 * exactly as the backend reports it, so it matches the My Earnings page. The
 * backend owns the earnings calculation; nothing is worked out here.
 * `earnings.total` is null when the backend sent no value, so the screens can
 * say "Not available yet" instead of showing a made-up 0.00.
 */
export default function useFilmmakerStats() {
  const { user } = useAuth();
  const userId = user?.id;
  const [titleCount, setTitleCount] = useState(null); // null = loading
  const [contractRaw, setContractRaw] = useState(undefined); // undefined = loading
  const [breakdown, setBreakdown] = useState(undefined); // undefined = loading, null = could not load

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    getFilmmakerTitles()
      .then(({ titles }) => { if (active) setTitleCount(titles.length); })
      .catch(() => { if (active) setTitleCount(0); });
    Promise.all([getContract(), getEarningsBreakdown()]).then(([c, b]) => {
      if (!active) return;
      setContractRaw(c);
      setBreakdown(b);
    });
    return () => { active = false; };
  }, [userId]);

  return {
    titleCount,
    contractRaw,
    earnings: {
      loading: breakdown === undefined,
      total: breakdown?.totals?.earnings ?? null,
      currency: contractRaw?.currency || breakdown?.currency || 'USD',
    },
  };
}
