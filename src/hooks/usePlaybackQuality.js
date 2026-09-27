import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMovies } from '../context/MovieContext';
import { getPlanLimits } from '../services/subscriptionService';
import { qualityRank } from '../utils/quality';

/**
 * The highest quality the signed-in viewer may stream for a title.
 *
 * - Subscribers: the plan's `max_quality` (e.g. the Mobile plan is 480p).
 * - Pay-per-view buyers: the quality they bought.
 * - Both: whichever is higher. The title's own filmmaker: no limit.
 *
 * @param {object|null} title normalized movie/show (for ownership + purchase lookup)
 * @returns {{ maxQuality: string|null, planName: string|null, planMaxQuality: string|null, ready: boolean }}
 *   `maxQuality` null = no known limit; `ready` false while the plan is being looked up.
 */
export default function usePlaybackQuality(title) {
  const { user } = useAuth();
  const { purchaseQualities } = useMovies();

  const sub = user?.subscription;
  const planType = sub?.active ? (sub.plan_type || sub.type || sub.planId || null) : null;
  // Prefer a limit sent with the subscription itself, if the backend includes one.
  const subMax = sub?.active ? (sub.max_quality || sub.plan?.max_quality || null) : null;

  const [plan, setPlan] = useState({ key: null, maxQuality: null, name: null });
  useEffect(() => {
    if (!planType) return undefined;
    let active = true;
    getPlanLimits(planType).then((limits) => {
      if (active) setPlan({ key: planType, maxQuality: limits.maxQuality, name: limits.name });
    });
    return () => { active = false; };
  }, [planType]);

  const planLoaded = !planType || Boolean(subMax) || plan.key === planType;
  const planMaxQuality = subMax || (plan.key === planType ? plan.maxQuality : null);
  const planName = plan.key === planType ? plan.name : null;

  const isOwner = Boolean(user && title) &&
    String(user.id) === String(title.filmmakerId || title.raw?.filmmaker_id);
  const purchasedQuality = title ? purchaseQualities?.[String(title.id)] || null : null;

  let maxQuality = null;
  if (!isOwner) {
    const caps = [planMaxQuality, purchasedQuality].filter((q) => qualityRank(q) >= 0);
    if (caps.length) maxQuality = caps.reduce((a, b) => (qualityRank(a) >= qualityRank(b) ? a : b));
  }

  return { maxQuality, planName, planMaxQuality, ready: planLoaded };
}
