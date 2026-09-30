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
import { ENABLE_MOBILE_MONEY } from '../config/features';
import { friendlyApiError } from '../utils/apiErrors';
import { useLocale } from '../context/LocaleContext';
import './Wallet.css';

// Backend limits for one wallet top-up (USD).
const MIN_TOP_UP = 1;
const MAX_TOP_UP = 10000;

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
  const { tx: tr } = useLocale();
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
  const [summaryUnavailable, setSummaryUnavailable] = useState(false);

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
  ].filter((method) => method.id !== 'mobile' || ENABLE_MOBILE_MONEY);

  const paymentProviders = [
    { id: 'pesapal', name: 'Pesapal' },
    { id: 'virtualpay', name: 'VirtualPay (Coming Soon)' },
  ];

  const finalAmount = customValue !== '' ? Number(customValue) : topUpAmount;
  const amountTooHigh = finalAmount > MAX_TOP_UP;
  const amountTooLow = customValue !== '' && !(finalAmount >= MIN_TOP_UP);

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
      setWalletError(friendlyApiError(err, "We couldn't load your wallet. Please try again."));
    } finally {
      setWalletLoading(false);
    }
  }, []);

  /* ── Fetch wallet summary (Total Topped Up / Total Spent / Transactions) ── */
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');
    setSummaryUnavailable(false);
    try {
      const result = await getWalletSummary();
      setSummary(result);
    } catch (err) {
      if ((err?.response?.status ?? err?.status) === 404) {
        // The totals endpoint isn't available on this API yet — hide the totals
        // rather than show an error or placeholder numbers.
        setSummaryUnavailable(true);
      } else {
        setSummaryError(friendlyApiError(err, "We couldn't load your wallet totals."));
      }
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
      setTxLoadMoreError(friendlyApiError(err, "We couldn't load more transactions. Please try again."));
    } finally {
      setTxLoadingMore(false);
    }
  };

  const handleTopUp = async () => {
    if (!finalAmount || finalAmount < MIN_TOP_UP || finalAmount > MAX_TOP_UP) return;
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
        // Pesapal's return address is fixed on the server, so remember where to
        // send the viewer once the payment landing page has verified the top-up.
        sessionStorage.setItem('vw_payment_return_to', '/wallet');
        window.location.href = redirectUrl;
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
      // Full details stay in the console for debugging; the viewer gets a sentence.
      console.error('Top-up API Error:', JSON.stringify(err.response?.data, null, 2) || err.message);
      setTopError(friendlyApiError(err, 'Top-up failed. Please try again.'));
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
        <h2>{tr('Sign in to view your wallet')}</h2>
        <p>{tr('Track your balance and transactions in one place.')}</p>
      </div>
    );
  }

  return (
    <div className="wallet-page">
      <div className="wallet-container">

        {/* ── Header ── */}
        <div className="wallet-header">
          <h1 className="wallet-title"><FaWallet /> {tr('My Wallet')}</h1>
          <p className="wallet-subtitle">{tr('Manage your balance and payment methods')}</p>
        </div>

        <div className="wallet-content">

          {/* ── Balance Card ── */}
          <div className="balance-card">
            <div className="balance-card__shine" aria-hidden="true" />
            <div className="balance-info">
              <p className="balance-label">{tr('Current Balance')}</p>
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
                {currency} · {tr('Available for purchases & rentals')}
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
              <FaExclamationTriangle /> {tr(walletError)}
              <button className="btn btn-ghost btn-small" onClick={fetchWallet}>{tr('Retry')}</button>
            </div>
          )}

          {/* ── Quick Stats (hidden entirely when the totals endpoint isn't available) ── */}
          {summaryUnavailable ? null : summaryLoading ? (
            <div className="quick-stats">
              {['Total Topped Up', 'Total Spent', 'Transactions'].map((label) => (
                <div className="stat-card" key={label}>
                  <span className="stat-label">{tr(label)}</span>
                  <span className="stat-value stat-value--neutral"><FaSpinner className="spin-icon" /></span>
                </div>
              ))}
            </div>
          ) : summaryError ? (
            <div className="wallet-fetch-error">
              <FaExclamationTriangle /> {tr(summaryError)}
              <button className="btn btn-ghost btn-small" onClick={fetchSummary}>{tr('Retry')}</button>
            </div>
          ) : (
            <div className="quick-stats">
              <div className="stat-card">
                <span className="stat-label">{tr('Total Topped Up')}</span>
                <span className="stat-value stat-value--green">
                  {totalToppedUp !== null ? `$${totalToppedUp.toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">{tr('Total Spent')}</span>
                <span className="stat-value stat-value--red">
                  {totalSpent !== null ? `$${totalSpent.toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">{tr('Transactions')}</span>
                <span className="stat-value stat-value--neutral">
                  {transactionCount !== null ? transactionCount : '—'}
                </span>
              </div>
            </div>
          )}

          {/* ── Top Up ── */}
          <div className="wallet-card">
            <h3 className="section-title">{tr('Top Up Wallet')}</h3>

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
              <label htmlFor="customAmount">{tr('Or enter a custom amount')}</label>
              <div className={`amount-input ${amountTooHigh || amountTooLow ? 'amount-input--invalid' : ''}`}>
                <span className="currency-symbol">$</span>
                <input
                  type="number"
                  id="customAmount"
                  placeholder="0.00"
                  value={customValue}
                  onChange={(e) => { setCustomValue(e.target.value); setTopError(''); }}
                  min={MIN_TOP_UP}
                  max={MAX_TOP_UP}
                  aria-describedby="customAmount-hint"
                  aria-invalid={amountTooHigh || amountTooLow}
                />
              </div>
              <p id="customAmount-hint" className={`amount-hint ${amountTooHigh || amountTooLow ? 'amount-hint--error' : ''}`}>
                {amountTooHigh
                  ? tr('The maximum top-up is {{max}}. Enter a smaller amount.', { max: `$${MAX_TOP_UP.toLocaleString('en-US')}` })
                  : amountTooLow
                    ? tr('The minimum top-up is {{min}}.', { min: `$${MIN_TOP_UP}` })
                    : tr('From {{min}} up to {{max}} per top-up.', { min: `$${MIN_TOP_UP}`, max: `$${MAX_TOP_UP.toLocaleString('en-US')}` })}
              </p>
            </div>

            <div className="payment-methods">
              <h4 className="pm-label">{tr('Payment Provider')}</h4>
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
              <h4 className="pm-label">{tr('Payment Method')}</h4>
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
                      <span className="method-name">{tr(method.name)}</span>
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
                <FaExclamationTriangle /> {tr(topError)}
              </div>
            )}

            <button
              className="btn btn-primary topup-btn"
              onClick={handleTopUp}
              disabled={topping || !finalAmount || finalAmount < MIN_TOP_UP || amountTooHigh}
            >
              {topping ? (
                <><FaSpinner className="btn-spin" /> {tr('Processing…')}</>
              ) : (
                <><FaPlus /> {tr('Add {{amount}} to Wallet', { amount: `$${(finalAmount || 0).toFixed(2)}` })}</>
              )}
            </button>

            <p className="topup-note"><FaShieldAlt /> {tr('Secured with 256-bit encryption')}</p>
          </div>

          {/* ── Transactions ── */}
          <div className="wallet-card">
            <h3 className="section-title">{tr('Recent Transactions')}</h3>
            {walletLoading ? (
              <div className="tx-loading"><FaSpinner className="spin-icon" /> {tr('Loading transactions…')}</div>
            ) : transactions.length === 0 ? (
              <p className="tx-empty">{tr('No transactions yet. Top up to get started.')}</p>
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
                    <FaExclamationTriangle /> {tr(txLoadMoreError)}
                  </div>
                )}
                {txHasMore && (
                  <button
                    className="btn btn-ghost tx-load-more-btn"
                    onClick={handleLoadMoreTransactions}
                    disabled={txLoadingMore}
                  >
                    {txLoadingMore
                      ? <><FaSpinner className="btn-spin" /> {tr('Loading…')}</>
                      : tr('Load more transactions')}
                  </button>
                )}
              </>
            )}
          </div>

          {/* ── How It Works ── */}
          <div className="wallet-card">
            <h3 className="section-title">{tr('How It Works')}</h3>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-icon info-icon--orange"><FaBolt /></div>
                <h4>{tr('Flexible Spending')}</h4>
                <p>{tr('Pay only for content you watch — no forced subscriptions.')}</p>
              </div>
              <div className="info-item">
                <div className="info-icon info-icon--blue"><FaCreditCard /></div>
                <h4>{tr('Multiple Methods')}</h4>
                <p>{ENABLE_MOBILE_MONEY
                  ? tr('Top up via credit card, debit card, or mobile money.')
                  : tr('Top up securely with your credit or debit card.')}</p>
              </div>
              <div className="info-item">
                <div className="info-icon info-icon--green"><FaShieldAlt /></div>
                <h4>{tr('Secure & Safe')}</h4>
                <p>{tr('Your payment info is encrypted end-to-end at all times.')}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Wallet;
