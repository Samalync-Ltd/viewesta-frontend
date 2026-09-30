import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaWallet, FaCreditCard, FaMobileAlt, FaExclamationCircle, FaSpinner } from 'react-icons/fa';
import { getWallet } from '../services/walletService';
import { ENABLE_MOBILE_MONEY } from '../config/features';
import './PaymentMethodModal.css';
import { useLocale } from '../context/LocaleContext';

/**
 * `busy` / `error` let the caller keep the modal open while the purchase runs
 * and show why it failed, instead of closing it and alerting.
 */
const PaymentMethodModal = ({ isOpen, onClose, onContinue, amount, title = "Choose Payment Method", busy = false, error = '' }) => {
  const { tx } = useLocale();
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState('');

  // Fetch the wallet balance as soon as the modal opens, so the balance (and
  // whether it covers the price) is visible before choosing a method.
  useEffect(() => {
    if (isOpen) {
      let isMounted = true;
      setWalletLoading(true);
      setWalletError('');
      
      getWallet()
        .then(data => {
          if (isMounted) {
            setWalletBalance(Number(data?.balance ?? 0));
            setWalletLoading(false);
          }
        })
        .catch(err => {
          if (isMounted) {
            setWalletError('Failed to fetch wallet balance.');
            setWalletLoading(false);
          }
        });

      return () => { isMounted = false; };
    }
    return undefined;
  }, [isOpen]);

  if (!isOpen) return null;

  const walletShort = !walletLoading && !walletError && walletBalance < amount;
  const isWalletInsufficient = selectedMethod === 'wallet' && walletShort;
  
  const canContinue = !busy && (
    selectedMethod === 'card' ||
    (ENABLE_MOBILE_MONEY && selectedMethod === 'mobile') ||
    (selectedMethod === 'wallet' && !isWalletInsufficient && !walletLoading && !walletError));

  const handleContinue = () => {
    if (canContinue) {
      onContinue(selectedMethod);
    }
  };

  const handleTopUp = () => {
    onClose();
    navigate('/wallet');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="purchase-modal payment-method-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title === 'Choose Payment Method' ? tx(title) : title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="pm-amount-display">
            <div className="pm-amount-label">{tx('Amount to Pay')}</div>
            <div className="pm-amount-value">${Number(amount).toFixed(2)}</div>
          </div>

          <div className="pm-options">
            {/* Wallet Option */}
            <div 
              className={`pm-option ${selectedMethod === 'wallet' ? 'active' : ''}`}
              onClick={() => setSelectedMethod('wallet')}
            >
              <div className="pm-option-info">
                <div className="pm-option-icon">
                  <FaWallet />
                </div>
                <div className="pm-option-text">
                  <span className="pm-option-title">{tx('Wallet Balance')}</span>
                  <span className="pm-option-desc">
                    {walletLoading
                      ? tx('Checking your balance…')
                      : walletError
                        ? tx('Pay instantly from your Viewesta wallet')
                        : walletShort
                          ? tx('Balance {{balance}} — not enough for this purchase', { balance: `$${walletBalance.toFixed(2)}` })
                          : tx('Balance {{balance}} — pay instantly', { balance: `$${walletBalance.toFixed(2)}` })}
                  </span>
                </div>
              </div>
            </div>

            {/* Wallet Details (Visible only when selected) */}
            {selectedMethod === 'wallet' && (
              <div className="pm-wallet-details">
                <div className="pm-wallet-balance">
                  <span className="pm-wallet-balance-label">{tx('Current Balance:')}</span>
                  <span className="pm-wallet-balance-value">
                    {walletLoading ? <FaSpinner className="fa-spin" /> : `$${walletBalance.toFixed(2)}`}
                  </span>
                </div>
                
                {walletError && (
                  <div className="pm-wallet-warning">
                    <FaExclamationCircle /> {tx(walletError)}
                  </div>
                )}

                {isWalletInsufficient && (
                  <>
                    <div className="pm-wallet-warning">
                      <FaExclamationCircle /> {tx('Your wallet has {{balance}}, but this costs {{amount}}. Top up your wallet or pay by card.', { balance: `$${walletBalance.toFixed(2)}`, amount: `$${Number(amount).toFixed(2)}` })}
                    </div>
                    <button className="btn btn-outline pm-wallet-topup-btn" onClick={handleTopUp}>
                      {tx('Top Up Wallet')}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Card Option */}
            <div 
              className={`pm-option ${selectedMethod === 'card' ? 'active' : ''}`}
              onClick={() => setSelectedMethod('card')}
            >
              <div className="pm-option-info">
                <div className="pm-option-icon">
                  <FaCreditCard />
                </div>
                <div className="pm-option-text">
                  <span className="pm-option-title">{tx('Credit / Debit Card')}</span>
                  <span className="pm-option-desc">{tx('Secure payment via Pesapal')}</span>
                </div>
              </div>
            </div>

            {/* Mobile Money Option — hidden until enabled for launch (see config/features.js) */}
            {ENABLE_MOBILE_MONEY && (
              <div
                className={`pm-option ${selectedMethod === 'mobile' ? 'active' : ''}`}
                onClick={() => setSelectedMethod('mobile')}
              >
                <div className="pm-option-info">
                  <div className="pm-option-icon">
                    <FaMobileAlt />
                  </div>
                  <div className="pm-option-text">
                    <span className="pm-option-title">{tx('Mobile Money')}</span>
                    <span className="pm-option-desc">{tx('Secure payment via Pesapal')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="pm-error" role="alert">
            <FaExclamationCircle /> {error}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            {tx('Cancel')}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleContinue}
            disabled={!canContinue}
          >
            {busy ? <><FaSpinner className="fa-spin" /> {tx('Processing…')}</> : tx('Continue')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodModal;
