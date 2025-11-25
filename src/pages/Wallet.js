import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaWallet, FaPlus, FaCreditCard, FaMobile } from 'react-icons/fa';
import './Wallet.css';

const Wallet = () => {
  const { user, updateWallet } = useAuth();
  const [topUpAmount, setTopUpAmount] = useState(10);
  const [selectedMethod, setSelectedMethod] = useState('card');

  const topUpOptions = [10, 25, 50, 100];
  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: FaCreditCard },
    { id: 'mobile', name: 'Mobile Money', icon: FaMobile }
  ];

  const handleTopUp = () => {
    // TODO: Implement payment processing
    updateWallet(topUpAmount);
    alert(`Successfully added $${topUpAmount} to your wallet!`);
  };

  if (!user) {
    return (
      <div className="wallet-not-found">
        <h2>Please log in to view your wallet</h2>
      </div>
    );
  }

  return (
    <div className="wallet-page">
      <div className="wallet-container">
        <div className="wallet-header">
          <h1 className="wallet-title">
            <FaWallet />
            My Wallet
          </h1>
          <p className="wallet-subtitle">
            Manage your wallet balance and payment methods
          </p>
        </div>

        <div className="wallet-content">
          {/* Balance Card */}
          <div className="balance-card">
            <div className="balance-info">
              <h2 className="balance-label">Current Balance</h2>
              <div className="balance-amount">
                <span className="currency">$</span>
                <span className="amount">{user.wallet.balance.toFixed(2)}</span>
              </div>
              <p className="balance-subtitle">
                Available for movie purchases
              </p>
            </div>
            <div className="balance-icon">
              <FaWallet />
            </div>
          </div>

          {/* Top Up Section */}
          <div className="top-up-section">
            <h3 className="section-title">Top Up Wallet</h3>
            
            <div className="top-up-options">
              {topUpOptions.map(amount => (
                <button
                  key={amount}
                  className={`top-up-option ${topUpAmount === amount ? 'selected' : ''}`}
                  onClick={() => setTopUpAmount(amount)}
                >
                  ${amount}
                </button>
              ))}
            </div>

            <div className="custom-amount">
              <label htmlFor="customAmount">Custom Amount</label>
              <div className="amount-input">
                <span className="currency-symbol">$</span>
                <input
                  type="number"
                  id="customAmount"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(Number(e.target.value))}
                  min="1"
                  max="1000"
                />
              </div>
            </div>

            <div className="payment-methods">
              <h4>Payment Method</h4>
              <div className="method-options">
                {paymentMethods.map(method => {
                  const IconComponent = method.icon;
                  return (
                    <label 
                      key={method.id} 
                      className={`method-option ${selectedMethod === method.id ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                        checked={selectedMethod === method.id}
                        onChange={(e) => setSelectedMethod(e.target.value)}
                      />
                      <IconComponent />
                      <span>{method.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button 
              className="btn btn-primary btn-large"
              onClick={handleTopUp}
            >
              <FaPlus />
              Add ${topUpAmount} to Wallet
            </button>
          </div>

          {/* Transaction History */}
          <div className="transaction-section">
            <h3 className="section-title">Recent Transactions</h3>
            <div className="transaction-list">
              <div className="transaction-item">
                <div className="transaction-info">
                  <span className="transaction-type">Top Up</span>
                  <span className="transaction-date">Today</span>
                </div>
                <span className="transaction-amount positive">+$50.00</span>
              </div>
              <div className="transaction-item">
                <div className="transaction-info">
                  <span className="transaction-type">Movie Purchase</span>
                  <span className="transaction-date">Yesterday</span>
                </div>
                <span className="transaction-amount negative">-$7.99</span>
              </div>
              <div className="transaction-item">
                <div className="transaction-info">
                  <span className="transaction-type">Movie Purchase</span>
                  <span className="transaction-date">3 days ago</span>
                </div>
                <span className="transaction-amount negative">-$4.99</span>
              </div>
            </div>
          </div>

          {/* Wallet Info */}
          <div className="wallet-info">
            <h3 className="section-title">How Wallet Works</h3>
            <div className="info-grid">
              <div className="info-item">
                <h4>Flexible Spending</h4>
                <p>Pay only for the movies you watch. No subscriptions required.</p>
              </div>
              <div className="info-item">
                <h4>Multiple Payment Methods</h4>
                <p>Top up using credit cards, mobile money, or other payment options.</p>
              </div>
              <div className="info-item">
                <h4>Secure & Safe</h4>
                <p>Your payment information is encrypted and secure.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
