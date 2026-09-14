import React, { useCallback, useEffect, useState } from 'react';
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
  FaSpinner,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { getWallet, getWalletTransactions, getWalletSummary, topUpWallet } from '../services/walletService';
import { submitVirtualPayForm } from '../utils/virtualPayHelper';
import './Wallet.css';

const TxIcon = ({ type }) => (
  <div className={`tx-icon tx-icon--${type}`}>
    {type === 'topup' ? <FaArrowUp /> : <FaFilm />}
  </div>
);

const CREDIT_TRANSACTION_TYPES = ['wallet_topup', 'refund'];
const TX_PAGE_SIZE = 20;

// Wallet transactions always report a positive magnitude in `amount` — direction
// (credit vs debit) comes from `transaction_type`, not the sign of the amount.
function isCreditTransaction(tx) {
  if (tx.transaction_type) return CREDIT_TRANSACTION_TYPES.includes(tx.transaction_type);
  return tx.positive ?? tx.amount > 0;
}

const Wallet = () => {
  const { user } = useAuth();

  /* ── Wallet state (from backend) ── */
  const [walletData, setWalletData]     = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError]   = useState('');

  /* ── Transaction list + pagination state ── */
  const [transactions, setTransactions]     = useState([]);
  const [txOffset, setTxOffset]             = useState(0);
  const [txHasMore, setTxHasMore]           = useState(false);
  const [txLoadingMore, setTxLoadingMore]   = useState(false);
  const [txLoadMoreError, setTxLoadMoreError] = useState('');

  /* ── Wallet summary (GET /wallet/summary) — fetched separately so a slow or
     failing summary call never blocks the balance/transactions above it ── */
  const [summary, setSummary]               = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError]     = useState('');

  /* ── Top-up form state ── */
  const [topUpAmount, setTopUpAmount]   = useState(25);
  const [customValue, setCustomValue]   = useState('');
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [selectedProvider, setSelectedProvider] = useState('pesapal');
  const [topping, setTopping]           = useState(false);
  const [topSuccess, setTopSuccess]     = useState(false);
  const [topError, setTopError]         = useState('');

  const topUpOptions     = [10, 25, 50, 100];
  const paymentMethods   = [
    { id: 'card',   name: 'Credit / Debit Card', icon: FaCreditCard },
    { id: 'mobile', name: 'Mobile Money',         icon: FaMobile    },
  ];

  const paymentProviders = [
    { id: 'pesapal', name: 'Pesapal' },
    { id: 'virtualpay', name: 'VirtualPay (Coming Soon)' },
  ];

  const finalAmount = customValue !== '' ? Number(customValue) : topUpAmount;

  /* ── Fetch wallet (always resets the transaction list back to page 1) ── */
  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    setWalletError('');
    setTxLoadMoreError('');
    try {
      const [wallet, txResult] = await Promise.all([
        getWallet(),
        getWalletTransactions({ limit: TX_PAGE_SIZE, offset: 0 }),
      ]);
      setWalletData(wallet);
      setTransactions(txResult.transactions);
      setTxOffset(txResult.transactions.length);
      // A page shorter than the requested size means we've hit the end.
      // Pagination metadata is left unused here since its "count" field
      // isn't documented as page-count vs. lifetime-total.
      setTxHasMore(txResult.transactions.length === TX_PAGE_SIZE);
    } catch (err) {
      setWalletError(
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load wallet. Please try again.'
      );
    } finally {
      setWalletLoading(false);
    }
  }, []);

  /* ── Fetch wallet summary (Total Topped Up / Total Spent / Transactions) ── */
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const result = await getWalletSummary();
      setSummary(result);
    } catch (err) {
      setSummaryError(
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load wallet summary.'
      );
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchWallet();
      fetchSummary();
    }
  }, [user, fetchWallet, fetchSummary]);

  /* ── Load the next page of transactions ── */
  const handleLoadMoreTransactions = async () => {
    if (txLoadingMore || !txHasMore) return;
    setTxLoadingMore(true);
    setTxLoadMoreError('');
    try {
      const result = await getWalletTransactions({ limit: TX_PAGE_SIZE, offset: txOffset });
      setTransactions((prev) => [...prev, ...result.transactions]);
      setTxOffset((prev) => prev + result.transactions.length);
      setTxHasMore(result.transactions.length === TX_PAGE_SIZE);
    } catch (err) {
      setTxLoadMoreError(
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load more transactions. Please try again.'
      );
    } finally {
      setTxLoadingMore(false);
    }
  };

  const handleTopUp = async () => {
    if (!finalAmount || finalAmount < 1) return;
    setTopping(true);
    setTopError('');
    setTopSuccess(false);
    try {
      const result = await topUpWallet({
        amount: finalAmount,
        payment_provider: selectedProvider,
        payment_method: selectedMethod,
      });

      // Support nested redirect_url in result.data or top-level redirect_url
      const redirectUrl = result?.data?.redirect_url || result?.redirect_url;
      if (redirectUrl) {
        // Append return_to so the callback can route us back to Wallet
        const returnTo = encodeURIComponent(`/wallet`);
        const url = new URL(redirectUrl);
        url.searchParams.append('return_to', returnTo);
        window.location.href = url.toString();
        return; // Don't stop topping, we are redirecting
      }

      if (result && (result.data?.payment_form || result.payment_form)) {
        const paymentForm = result.data?.payment_form || result.payment_form;
        submitVirtualPayForm(paymentForm);
        return;
      }

      await Promise.all([fetchWallet(), fetchSummary()]);

      if (result && (result.status === 'pending' || result.data?.status === 'pending')) {
        setTopError('Top-up initiated. Please complete the payment on your device.');
        setTopSuccess(false);
      } else {
        setTopSuccess(true);
        setTimeout(() => setTopSuccess(false), 3500);
      }
      
      setCustomValue('');
      setTopping(false);
    } catch (err) {
      console.error('Top-up API Error:', JSON.stringify(err.response?.data, null, 2) || err.message);
      
      let errorMsg = 'Top-up failed. Please try again.';
      if (err?.response?.data) {
        const data = err.response.data;
        if (data.error?.details) {
          errorMsg = JSON.stringify(data.error.details);
        } else if (data.error?.message) {
          errorMsg = data.error.message;
        } else if (data.error) {
          errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
        } else if (data.message) {
          errorMsg = typeof data.message === 'object' ? JSON.stringify(data.message) : data.message;
        } else if (data.errors) {
          errorMsg = JSON.stringify(data.errors);
        }
      } else if (err?.message) {
        errorMsg = err.message;
      }
      
      if (typeof errorMsg === 'object') {
        errorMsg = JSON.stringify(errorMsg);
      }
      
      setTopError(errorMsg);
      setTopping(false);
    }
  };

  /* ── Derive display values ── */
  const balance      = Number(walletData?.balance ?? 0);
  const currency     = walletData?.currency ?? 'USD';

  // Set by the backend when a top-up has been reversed, so a negative
  // balance is never shown without an explanation. Accept either a plain
  // string or an { amount, message } object, since the exact shape isn't
  // pinned down yet.
  const balanceExplanation = walletData?.balanceExplanation ?? null;
  const explanationMessage = typeof balanceExplanation === 'string'
    ? balanceExplanation
    : balanceExplanation?.message || balanceExplanation?.reason || balanceExplanation?.text || null;
  const explanationAmountRaw = typeof balanceExplanation === 'object' && balanceExplanation !== null
    ? (balanceExplanation.amount ?? balanceExplanation.reversed_amount ?? balanceExplanation.reversal_amount)
    : null;
  const explanationAmount = explanationAmountRaw !== null && explanationAmountRaw !== undefined && !isNaN(explanationAmountRaw)
    ? Number(explanationAmountRaw)
    : null;

  // Sourced from GET /wallet/summary (SQL-computed lifetime totals), not from
  // summing the loaded transaction page — that was the old, silently-wrong
  // approach. Each figure is `null` if the backend didn't send a field this
  // parser recognizes, which the UI renders as "—", never as a fabricated 0.
  const totalToppedUp    = summary?.totalToppedUp ?? null;
  const totalSpent       = summary?.totalSpent ?? null;
  const transactionCount = summary?.transactionCount ?? null;

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
                {walletLoading ? (
                  <span className="balance-loading"><FaSpinner className="spin-icon" /></span>
                ) : walletError ? (
                  <span className="balance-error-text">—</span>
                ) : (
                  <>
                    <span className="balance-currency">{balance < 0 ? '-$' : '$'}</span>
                    <span className="balance-value">{Math.abs(balance).toFixed(2)}</span>
                  </>
                )}
              </div>
              <p className="balance-subtitle">
                {currency} · Available for purchases &amp; rentals
              </p>
              {!walletLoading && !walletError && explanationMessage && (
                <div className={`balance-explanation ${balance < 0 ? 'balance-explanation--negative' : ''}`}>
                  <FaExclamationTriangle className="balance-explanation-icon" />
                  <span>
                    {explanationMessage}
                    {explanationAmount !== null && (
                      <strong> (${Math.abs(explanationAmount).toFixed(2)})</strong>
                    )}
                  </span>
                </div>
              )}
            </div>
            <div className="balance-icon" aria-hidden="true"><FaWallet /></div>
          </div>

          {/* ── Wallet error ── */}
          {walletError && !walletLoading && (
            <div className="wallet-fetch-error">
              <FaExclamationTriangle /> {walletError}
              <button className="btn btn-ghost btn-small" onClick={fetchWallet}>Retry</button>
            </div>
          )}

          {/* ── Quick Stats ── */}
          {summaryLoading ? (
            <div className="quick-stats">
              {['Total Topped Up', 'Total Spent', 'Transactions'].map((label) => (
                <div className="stat-card" key={label}>
                  <span className="stat-label">{label}</span>
                  <span className="stat-value stat-value--neutral"><FaSpinner className="spin-icon" /></span>
                </div>
              ))}
            </div>
          ) : summaryError ? (
            <div className="wallet-fetch-error">
              <FaExclamationTriangle /> {summaryError}
              <button className="btn btn-ghost btn-small" onClick={fetchSummary}>Retry</button>
            </div>
          ) : (
            <div className="quick-stats">
              <div className="stat-card">
                <span className="stat-label">Total Topped Up</span>
                <span className="stat-value stat-value--green">
                  {totalToppedUp !== null ? `$${totalToppedUp.toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Total Spent</span>
                <span className="stat-value stat-value--red">
                  {totalSpent !== null ? `$${totalSpent.toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Transactions</span>
                <span className="stat-value stat-value--neutral">
                  {transactionCount !== null ? transactionCount : '—'}
                </span>
              </div>
            </div>
          )}

          {/* ── Top Up ── */}
          <div className="wallet-card">
            <h3 className="section-title">Top Up Wallet</h3>

            <div className="top-up-options">
              {topUpOptions.map((amt) => (
                <button
                  key={amt}
                  className={`top-up-option ${customValue === '' && topUpAmount === amt ? 'selected' : ''}`}
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
              <h4 className="pm-label">Payment Provider</h4>
              <div className="method-options">
                {paymentProviders.map((provider) => (
                  <label
                    key={provider.id}
                    className={`method-option ${selectedProvider === provider.id ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="paymentProvider"
                      value={provider.id}
                      checked={selectedProvider === provider.id}
                      onChange={(e) => setSelectedProvider(e.target.value)}
                    />
                    <span className="method-name">{provider.name}</span>
                    {selectedProvider === provider.id && <FaCheckCircle className="method-check" />}
                  </label>
                ))}
              </div>
            </div>

            <div className="payment-methods" style={{ marginTop: '20px' }}>
              <h4 className="pm-label">Payment Method</h4>
              <div className="method-options">
                {paymentMethods.map((method) => {
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

            {topSuccess && (
              <div className="topup-success">
                <FaCheckCircle /> ${finalAmount.toFixed(2)} added successfully!
              </div>
            )}

            {topError && (
              <div className="topup-error">
                <FaExclamationTriangle /> {topError}
              </div>
            )}

            <button
              className="btn btn-primary topup-btn"
              onClick={handleTopUp}
              disabled={topping || !finalAmount || finalAmount < 1}
            >
              {topping ? (
                <><FaSpinner className="btn-spin" /> Processing…</>
              ) : (
                <><FaPlus /> Add ${(finalAmount || 0).toFixed(2)} to Wallet</>
              )}
            </button>

            <p className="topup-note"><FaShieldAlt /> Secured with 256-bit encryption</p>
          </div>

          {/* ── Transactions ── */}
          <div className="wallet-card">
            <h3 className="section-title">Recent Transactions</h3>
            {walletLoading ? (
              <div className="tx-loading"><FaSpinner className="spin-icon" /> Loading transactions…</div>
            ) : transactions.length === 0 ? (
              <p className="tx-empty">No transactions yet. Top up to get started.</p>
            ) : (
              <div className="transaction-list">
                {transactions.map((tx, idx) => {
                  const isPositive = isCreditTransaction(tx);
                  const type       = isPositive ? 'topup' : 'movie';
                  const label      = tx.label ?? tx.description ?? tx.transaction_type ?? 'Transaction';
                  const date       = tx.date  ?? tx.created_at
                    ? new Date(tx.date ?? tx.created_at).toLocaleString()
                    : '';
                  const amt        = Math.abs(tx.amount ?? 0);
                  return (
                    <div key={tx.id ?? idx} className="transaction-item">
                      <TxIcon type={type} />
                      <div className="transaction-info">
                        <span className="transaction-label">{label}</span>
                        {date && <span className="transaction-date">{date}</span>}
                      </div>
                      <span className={`transaction-amount ${isPositive ? 'tx--positive' : 'tx--negative'}`}>
                        {isPositive ? '+' : '-'}${amt.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {!walletLoading && transactions.length > 0 && (
              <>
                {txLoadMoreError && (
                  <div className="tx-load-more-error">
                    <FaExclamationTriangle /> {txLoadMoreError}
                  </div>
                )}
                {txHasMore && (
                  <button
                    className="btn btn-ghost tx-load-more-btn"
                    onClick={handleLoadMoreTransactions}
                    disabled={txLoadingMore}
                  >
                    {txLoadingMore
                      ? <><FaSpinner className="btn-spin" /> Loading…</>
                      : 'Load more transactions'}
                  </button>
                )}
              </>
            )}
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
