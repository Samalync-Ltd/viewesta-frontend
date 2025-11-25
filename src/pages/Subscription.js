import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaCheck, FaCrown, FaStar } from 'react-icons/fa';
import './Subscription.css';

const Subscription = () => {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  const plans = [
    {
      id: 'monthly',
      name: 'Monthly',
      price: 9.99,
      period: 'month',
      features: [
        'Unlimited movies',
        'All quality options (4K, 1080p, 720p, 480p)',
        'No ads',
        'Download for offline viewing',
        'Cancel anytime'
      ],
      popular: false
    },
    {
      id: 'yearly',
      name: 'Yearly',
      price: 99.99,
      period: 'year',
      originalPrice: 119.88,
      features: [
        'Everything in Monthly',
        'Save 17%',
        'Priority customer support',
        'Early access to new releases',
        'Exclusive content'
      ],
      popular: true
    }
  ];

  const handleSubscribe = (planId) => {
    // TODO: Implement subscription logic
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
      <div className="subscription-container">
        <div className="subscription-header">
          <h1 className="subscription-title">
            <FaCrown />
            Choose Your Plan
          </h1>
          <p className="subscription-subtitle">
            Get unlimited access to our entire movie library
          </p>
        </div>

        <div className="billing-toggle">
          <button 
            className={`toggle-btn ${selectedPlan === 'monthly' ? 'active' : ''}`}
            onClick={() => setSelectedPlan('monthly')}
          >
            Monthly
          </button>
          <button 
            className={`toggle-btn ${selectedPlan === 'yearly' ? 'active' : ''}`}
            onClick={() => setSelectedPlan('yearly')}
          >
            Yearly
            <span className="save-badge">Save 17%</span>
          </button>
        </div>

        <div className="plans-grid">
          {plans.map(plan => (
            <div 
              key={plan.id} 
              className={`plan-card ${plan.popular ? 'popular' : ''}`}
            >
              {plan.popular && (
                <div className="popular-badge">
                  <FaStar />
                  Most Popular
                </div>
              )}
              
              <div className="plan-header">
                <h3 className="plan-name">{plan.name}</h3>
                <div className="plan-price">
                  <span className="price">${plan.price}</span>
                  <span className="period">/{plan.period}</span>
                </div>
                {plan.originalPrice && (
                  <div className="original-price">
                    <span>${plan.originalPrice}</span>
                  </div>
                )}
              </div>

              <ul className="plan-features">
                {plan.features.map((feature, index) => (
                  <li key={index} className="feature-item">
                    <FaCheck className="check-icon" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button 
                className={`btn ${plan.popular ? 'btn-primary' : 'btn-outline'} btn-full`}
                onClick={() => handleSubscribe(plan.id)}
              >
                {user.subscription?.active ? 'Manage Subscription' : 'Subscribe Now'}
              </button>
            </div>
          ))}
        </div>

        <div className="subscription-info">
          <h3>Why Choose Viewesta?</h3>
          <div className="info-grid">
            <div className="info-item">
              <h4>Flexible Access</h4>
              <p>Choose from subscription, pay-per-view, or wallet-based access models.</p>
            </div>
            <div className="info-item">
              <h4>Multiple Quality Options</h4>
              <p>Watch in 480p, 720p, 1080p, or stunning 4K quality.</p>
            </div>
            <div className="info-item">
              <h4>No Commitment</h4>
              <p>Cancel your subscription anytime with no penalties.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
