import React, { useEffect, useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import { getSubscriptionPlans } from '../services/subscriptionService';
import { useLocale } from '../context/LocaleContext';
import './PlanOptions.css';

/**
 * The subscription plans, as a compact list for the "Watch Options" popup:
 * name, price, and what the plan includes, straight from GET /subscriptions/plans.
 */
export default function PlanOptions() {
  const { tx } = useLocale();
  const [plans, setPlans] = useState(null); // null = loading
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getSubscriptionPlans()
      .then((list) => { if (active) setPlans(Array.isArray(list) ? list : []); })
      .catch(() => { if (active) { setFailed(true); setPlans([]); } });
    return () => { active = false; };
  }, []);

  if (plans === null) return <p className="plan-options-note">{tx('Loading plans…')}</p>;
  if (failed || plans.length === 0) return null;

  return (
    <ul className="plan-options" aria-label={tx('Subscription plans')}>
      {plans.map((plan) => {
        const price = Number(plan.price ?? plan.amount);
        return (
          <li key={plan.id || plan.name} className="plan-option">
            <div className="plan-option-head">
              <span className="plan-option-name">{tx(plan.name)}</span>
              {price > 0 && (
                <span className="plan-option-price">
                  ${price.toFixed(2)}{plan.interval ? <small>/{tx(plan.interval)}</small> : null}
                </span>
              )}
            </div>
            <ul className="plan-option-features">
              {(plan.features || []).slice(0, 3).map((feature) => (
                <li key={feature}><FaCheck aria-hidden="true" /> {tx(feature)}</li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
