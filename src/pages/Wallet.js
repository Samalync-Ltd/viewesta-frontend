import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FaWallet,
  FaPlus,
  FaCreditCard,
  FaMobile,
  FaArrowUp,
  FaFilm,
  FaShieldAlt,
  FaBolt,
  FaCheckCircle,
} from 'react-icons/fa';
import './Wallet.css';

const MOCK_TRANSACTIONS = [
  { id: 1, type: 'topup',   label: 'Wallet Top Up',     date: 'Today, 10:42 AM',     amount: 50.00,  positive: true  },
  { id: 2, type: 'movie',   label: 'Lionheart',          date: 'Yesterday, 8:15 PM',  amount: -7.99,  positive: false },
  { id: 3, type: 'movie',   label: 'King of Boys',       date: 'Dec 29, 3:00 PM',     amount: -4.99,  positive: false },
  { id: 4, type: 'topup',   label: 'Wallet Top Up',      date: 'Dec 27, 11:20 AM',    amount: 25.00,  positive: true  },
  { id: 5, type: 'movie',   label: 'Blood Sisters S1E1', date: 'Dec 25, 9:05 PM',     amount: -2.99,  positive: false },
];

const TxIcon = ({ type }) => (
  <div className={`tx-icon tx-icon--${type}`}>
    {type === 'topup' ? <FaArrowUp /> : <FaFilm />}
  </div>
);

const Wallet = () => {
  const { user, updateWallet } = useAuth();
  const [topUpAmount, setTopUpAmount] = useState(25);
  const [customValue, setCustomValue] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [success, setSuccess] = useState(false);

  const topUpOptions = [10, 25, 50, 100];
  const paymentMethods = [
    { id: 'card',   name: 'Credit / Debit Card', icon: FaCreditCard },
    { id: 'mobile', name: 'Mobile Money',         icon: FaMobile    },
  ];

  const finalAmount = customValue !== '' ? Number(customValue) : topUpAmount;

  const handleTopUp = () => {
    if (!finalAmount || finalAmount < 1) return;
    updateWallet(finalAmount);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const balance = Number(user?.wallet?.balance ?? 0);
  const spent   = MOCK_TRANSACTIONS.filter(t => !t.positive).reduce((s, t) => s + Math.abs(t.amount), 0);
  const topped  = MOCK_TRANSACTIONS.filter(t =>  t.positive).reduce((s, t) => s + t.amount, 0);

  if (!user) {
    return (
      <div className="wallet-not-found">
        <FaWallet className="wallet-nf-icon" />
        <h2>Sign in to view your wallet</h2>
        <p>Track your balance and transactions in one place.</p>
      </div>
    );
  }

  return (
    <div className="wallet-page">
      <div className="wallet-container">

        {/* ── Header ── */}
        <div className="wallet-header">
          <h1 className="wallet-title"><FaWallet /> My Wallet</h1>
          <p className="wallet-subtitle">Manage your balance and payment methods</p>
        </div>

        <div className="wallet-content">

          {/* ── Balance Card ── */}
          <div className="balance-card">
            <div className="balance-card__shine" aria-hidden="true" />
            <div className="balance-info">
              <p className="balance-label">Current Balance</p>
              <div className="balance-amount">
                <span className="balance-currency">$</span>
                <span className="balance-value">{balance.toFixed(2)}</span>
              </div>
              <p className="balance-subtitle">Available for purchases &amp; rentals</p>
            </div>
            <div className="balance-icon" aria-hidden="true"><FaWallet /></div>
          </div>

          {/* ── Quick Stats ── */}
          <div className="quick-stats">
            <div className="stat-card">
              <span className="stat-label">Total Topped Up</span>
              <span className="stat-value stat-value--green">${topped.toFixed(2)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Spent</span>
              <span className="stat-value stat-value--red">${spent.toFixed(2)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Transactions</span>
              <span className="stat-value stat-value--neutral">{MOCK_TRANSACTIONS.length}</span>
            </div>
          </div>

          {/* ── Top Up ── */}
          <div className="wallet-card">
            <h3 className="section-title">Top Up Wallet</h3>

            <div className="top-up-options">
              {topUpOptions.map(amt => (
                <button
                  key={amt}
                  className={`top-up-option ${
                    customValue === '' && topUpAmount === amt ? 'selected' : ''
                  }`}
                  onClick={() => { setTopUpAmount(amt); setCustomValue(''); }}
                >
                  ${amt}
                </button>
              ))}
            </div>

            <div className="custom-amount">
              <label htmlFor="customAmount">Or enter a custom amount</label>
              <div className="amount-input">
                <span className="currency-symbol">$</span>
                <input
                  type="number"
                  id="customAmount"
                  placeholder="0.00"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  min="1"
                  max="1000"
                />
              </div>
            </div>

            <div className="payment-methods">
              <h4 className="pm-label">Payment Method</h4>
              <div className="method-options">
                {paymentMethods.map(method => {
                  const Icon = method.icon;
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
                      <Icon className="method-icon" />
                      <span className="method-name">{method.name}</span>
                      {selectedMethod === method.id && <FaCheckCircle className="method-check" />}
                    </label>
                  );
                })}
              </div>
            </div>

            {success && (
              <div className="topup-success">
                <FaCheckCircle /> ${finalAmount.toFixed(2)} added successfully!
              </div>
            )}

            <button
              className="btn btn-primary topup-btn"
              onClick={handleTopUp}
              disabled={!finalAmount || finalAmount < 1}
            >
              <FaPlus />
              Add ${(finalAmount || 0).toFixed(2)} to Wallet
            </button>

            <p className="topup-note"><FaShieldAlt /> Secured with 256-bit encryption</p>
          </div>

          {/* ── Transactions ── */}
          <div className="wallet-card">
            <h3 className="section-title">Recent Transactions</h3>
            <div className="transaction-list">
              {MOCK_TRANSACTIONS.map(tx => (
                <div key={tx.id} className="transaction-item">
                  <TxIcon type={tx.type} />
                  <div className="transaction-info">
                    <span className="transaction-label">{tx.label}</span>
                    <span className="transaction-date">{tx.date}</span>
                  </div>
                  <span className={`transaction-amount ${tx.positive ? 'tx--positive' : 'tx--negative'}`}>
                    {tx.positive ? '+' : ''}{tx.amount < 0 ? '-' : ''}${Math.abs(tx.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── How It Works ── */}
          <div className="wallet-card">
            <h3 className="section-title">How It Works</h3>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-icon info-icon--orange"><FaBolt /></div>
                <h4>Flexible Spending</h4>
                <p>Pay only for content you watch — no forced subscriptions.</p>
              </div>
              <div className="info-item">
                <div className="info-icon info-icon--blue"><FaCreditCard /></div>
                <h4>Multiple Methods</h4>
                <p>Top up via credit card, debit card, or mobile money.</p>
              </div>
              <div className="info-item">
                <div className="info-icon info-icon--green"><FaShieldAlt /></div>
                <h4>Secure &amp; Safe</h4>
                <p>Your payment info is encrypted end-to-end at all times.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Wallet;
