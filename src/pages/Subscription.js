import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FaCheck, FaCrown, FaStar, FaFilm, FaDownload,
  FaBan, FaHeadset, FaShieldAlt, FaBolt, FaGem,
} from 'react-icons/fa';
import './Subscription.css';

const plans = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 9.99,
    period: 'month',
    icon: <FaBolt />,
    tag: null,
    features: [
      'Unlimited movies & series',
      'All quality options (4K, 1080p, 720p)',
      'No ads – pure viewing',
      'Download for offline viewing',
      'Cancel anytime',
    ],
    popular: false,
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: 99.99,
    period: 'year',
    icon: <FaGem />,
    tag: 'Save 17%',
    originalPrice: 119.88,
    features: [
      'Everything in Monthly',
      'Priority customer support',
      'Early access to new releases',
      'Exclusive filmmaker content',
      'Free months every year',
    ],
    popular: true,
  },
];

const trustItems = [
  { icon: <FaFilm />,     title: 'Unlimited Content',   desc: 'Access thousands of African films and series anytime.' },
  { icon: <FaDownload />, title: 'Offline Downloads',    desc: 'Save your favourites and watch without internet.' },
  { icon: <FaBan />,      title: 'Zero Ads',             desc: 'Uninterrupted viewing from start to finish.' },
  { icon: <FaHeadset />,  title: 'Priority Support',     desc: 'Real humans ready to help whenever you need.' },
];

const Subscription = () => {
  const { user } = useAuth();

  const handleSubscribe = (planId) => {
    console.log(`Subscribing to ${planId} plan`);
  };

  if (!user) {
    return (
      <div className="subscription-not-found">
        <h2>Please log in to view subscription options</h2>
      </div>
    );
  }

  return (
    <div className="subscription-page">

      {/* ── Hero ── */}
      <div className="sub-hero">
        <div className="sub-hero-glow" />
        <FaCrown className="sub-hero-crown" />
        <h1 className="sub-hero-title">Unlimited African Cinema</h1>
        <p className="sub-hero-subtitle">
          Stream the best Nollywood, Afrobeats docs, and pan-African originals —
          in stunning 4K, with no interruptions.
        </p>
        <div className="sub-hero-badges">
          <span><FaShieldAlt /> Secure payments</span>
          <span><FaBan /> No ads, ever</span>
          <span><FaCheck /> Cancel anytime</span>
        </div>
      </div>

      <div className="subscription-container layout-container">

        {/* ── Plan Cards ── */}
        <div className="plans-grid">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`plan-card ${plan.popular ? 'popular' : ''}`}
            >
              {plan.popular && (
                <div className="popular-badge">
                  <FaStar /> Most Popular
                </div>
              )}

              <div className="plan-icon">{plan.icon}</div>

              <div className="plan-header">
                <h3 className="plan-name">{plan.name}</h3>
                {plan.tag && <span className="plan-tag">{plan.tag}</span>}
                <div className="plan-price">
                  <span className="price">${plan.price}</span>
                  <span className="period">/{plan.period}</span>
                </div>
                {plan.originalPrice && (
                  <div className="original-price">was ${plan.originalPrice}</div>
                )}
              </div>

              <ul className="plan-features">
                {plan.features.map((feature, i) => (
                  <li key={i} className="feature-item">
                    <FaCheck className="check-icon" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={`btn ${plan.popular ? 'btn-primary' : 'btn-outline'} btn-full sub-btn`}
                onClick={() => handleSubscribe(plan.id)}
              >
                {user.subscription?.active ? 'Manage Subscription' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>

        {/* ── Trust Grid ── */}
        <div className="trust-section">
          <h2 className="trust-title">Why Viewesta?</h2>
          <div className="trust-grid">
            {trustItems.map((item, i) => (
              <div key={i} className="trust-item">
                <div className="trust-icon">{item.icon}</div>
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Guarantee Strip ── */}
        <div className="guarantee-strip">
          <FaShieldAlt className="guarantee-icon" />
          <div>
            <strong>30-Day Money-Back Guarantee</strong>
            <p>Not satisfied? We'll refund you in full — no questions asked.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Subscription;
