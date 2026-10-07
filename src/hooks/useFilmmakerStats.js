import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFilmmakerTitles, getFilmmakerMoviesWithPricing } from '../services/movieService';
import { getContract, getPayoutBalance } from '../services/earningsService';
import { summarizeContract } from '../utils/contract';
import { totalEarningsFromViews } from '../utils/earnings';

/**
 * The signed-in filmmaker's headline numbers, worked out the same way on every
 * screen (dashboard, studio profile): uploads = movies + series, and earnings =
 * each film's views × its price × the contract share (the backend balance is
 * used only when that cannot be worked out).
 */
export default function useFilmmakerStats() {
  const { user } = useAuth();
  const userId = user?.id;
  const [titleCount, setTitleCount] = useState(null); // null = loading
  const [movies, setMovies] = useState([]);
  const [contractRaw, setContractRaw] = useState(undefined); // undefined = loading
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    getFilmmakerTitles()
      .then(({ titles }) => { if (active) setTitleCount(titles.length); })
      .catch(() => { if (active) setTitleCount(0); });
    getFilmmakerMoviesWithPricing().then((m) => { if (active) setMovies(m); }).catch(() => {});
    Promise.all([getContract(), getPayoutBalance()]).then(([c, b]) => {
      if (!active) return;
      setContractRaw(c);
      setBalance(b);
    });
    return () => { active = false; };
  }, [userId]);

  const fromViews = totalEarningsFromViews(movies, summarizeContract(contractRaw).split);
  return {
    titleCount,
    contractRaw,
    earnings: {
      total: fromViews ? fromViews.earnings : Number(balance?.total_earnings ?? balance?.balance ?? 0),
      currency: balance?.currency || 'USD',
    },
  };
}
