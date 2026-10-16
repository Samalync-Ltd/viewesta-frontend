import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFilmmakerMovies } from '../../services/movieService';
import { getFilmmakerShows } from '../../services/seriesService';
import {
  getContract,
  getPayoutBalance,
  getPayouts,
  readEarningsSummary,
  readTitleEarnings,
} from '../../services/earningsService';
import { FaArrowLeft } from 'react-icons/fa';
// Reuse existing styles where possible. We'll rely on the existing layout.
import '../EarningsDetail.css';

const NOT_AVAILABLE = 'Not available yet';
// Product rule for the filmmaker share; the contract's own split wins when the backend sends it.
const DEFAULT_FILMMAKER_SHARE = 70;

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'per-film', label: 'Per Film' },
  { key: 'subscription', label: 'Subscription' },
];

function fmt(amount, currency = 'USD') {
  if (amount === undefined || amount === null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
}

function plural(n, one, many) {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

function Missing({ small = false }) {
  return <span className={`earnings-missing${small ? ' earnings-missing--small' : ''}`}>{NOT_AVAILABLE}</span>;
}

function Money({ value, currency }) {
  return value === null ? <Missing small /> : fmt(value, currency);
}

function Count({ value, one, many }) {
  return value === null ? <Missing small /> : plural(value, one, many);
}

function PayoutStatus({ status }) {
  if (status === 'paid') return <span className="earnings-status earnings-status--paid">Paid</span>;
  if (status === 'pending') return <span className="earnings-status earnings-status--pending">Pending</span>;
  return <span className="earnings-status earnings-status--unknown">Status {NOT_AVAILABLE.toLowerCase()}</span>;
}

/** One revenue line, e.g. "Pay-per-view: 2 purchases → $2.00 → $1.40". */
function RevenueLine({ label, count, gross, earnings, currency, status }) {
  return (
    <div className="earnings-source-row">
      <span className="earnings-source-label">{label}</span>
      <span className="earnings-source-cell" data-label="Count">{count}</span>
      <span className="earnings-source-cell" data-label="Gross revenue"><Money value={gross} currency={currency} /></span>
      <span className="earnings-source-cell earnings-amount-highlight" data-label="Your earnings">
        <Money value={earnings} currency={currency} />
        {status !== undefined && <PayoutStatus status={status} />}
      </span>
    </div>
  );
}

function TitleHeader({ title }) {
  return (
    <div className="earnings-film-cell">
      {title.poster ? <img src={title.poster} alt="" className="earnings-film-poster" /> : <div className="earnings-film-poster" />}
      <div>
        <div className="earnings-film-title">{title.title}</div>
        <div className="earnings-film-status">{title.kind === 'series' ? 'Series' : 'Film'}</div>
      </div>
    </div>
  );
}

export default function FilmmakerEarnings() {
  const { user } = useAuth();

  const [titles, setTitles] = useState([]);
  const [contract, setContract] = useState(null);
  const [balance, setBalance] = useState(null);
  const [payouts, setPayouts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [moviesRes, showsRes, contractData, balanceData, payoutsData] = await Promise.all([
        getFilmmakerMovies().then((d) => ({ ok: true, d }), () => ({ ok: false, d: [] })),
        getFilmmakerShows().then((d) => ({ ok: true, d }), () => ({ ok: false, d: [] })),
        getContract(),
        getPayoutBalance(),
        getPayouts(),
      ]);

      if (!moviesRes.ok && !showsRes.ok) {
        throw new Error('Could not load titles');
      }
      // The service calls return null on failure; with nothing at all, say so rather than show empty cards.
      if (!contractData && !balanceData && !(payoutsData || []).length
        && !(moviesRes.d || []).length && !(showsRes.d || []).length) {
        throw new Error('no earnings data');
      }

      const toTitle = (kind) => (item) => ({
        id: `${kind}-${item.id}`,
        kind,
        title: item.title,
        poster: item.poster,
        earnings: readTitleEarnings(item.raw || item),
      });

      setTitles([
        ...(moviesRes.d || []).map(toTitle('film')),
        ...(showsRes.d || []).map(toTitle('series')),
      ]);
      setContract(contractData);
      setBalance(balanceData);
      setPayouts(Array.isArray(payoutsData) ? payoutsData : []);
    } catch (err) {
      setError('Unable to load your earnings data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currency = contract?.currency || balance?.currency || user?.wallet?.currency || 'USD';
  const summary = readEarningsSummary(balance);

  // Revenue split, straight from the contract.
  const contractSplit = contract?.filmmaker_split ?? contract?.split_percentage ?? null;
  const hasSplit = contractSplit !== null;
  const filmmakerSharePct = hasSplit ? contractSplit : DEFAULT_FILMMAKER_SHARE;
  const platformSplitPct = hasSplit ? 100 - contractSplit : null;

  // Minimum Guarantee
  const mgAmount = contract?.minimum_guarantee;
  const hasMG = mgAmount !== undefined && mgAmount !== null;
  const mgRecouped = balance?.mg_recouped;
  const mgRemaining = balance?.mg_remaining;

  const earningsHeading = `Your earnings (${filmmakerSharePct}%)`;

  return (
    <div className="earnings-page layout-container">
      {/* Breadcrumb */}
      <div className="earnings-breadcrumb">
        <Link to="/filmmaker-studio" className="btn btn-ghost btn-small">
          <FaArrowLeft style={{ marginRight: 8 }} /> Dashboard
        </Link>
      </div>

      <div className="earnings-header">
        <h1>My Earnings</h1>
        <p className="earnings-subtitle">Revenue from your published content on Viewesta</p>
      </div>

      {loading ? (
        <div className="earnings-loading">
          {[1, 2, 3].map((i) => <div key={i} className="earnings-skeleton" />)}
        </div>
      ) : error ? (
        <div className="earnings-error">
          <p>{error}</p>
          <button className="btn btn-primary btn-small" onClick={fetchData}>Try Again</button>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="earnings-summary-grid">
            <div className="earnings-summary-card">
              <div className="earnings-card-label">Total Earnings</div>
              <div className="earnings-card-value earnings-card-value--highlight">
                {summary.totalEarnings !== null ? fmt(summary.totalEarnings, currency) : <Missing />}
              </div>
            </div>
            <div className="earnings-summary-card">
              <div className="earnings-card-label">Gross Revenue</div>
              <div className="earnings-card-value">
                {summary.grossRevenue !== null ? fmt(summary.grossRevenue, currency) : <Missing />}
              </div>
            </div>
            <div className="earnings-summary-card">
              <div className="earnings-card-label">Total Views</div>
              <div className="earnings-card-value">
                {summary.totalViews !== null ? summary.totalViews.toLocaleString() : <Missing />}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="earnings-tabs" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`earnings-tab${activeTab === tab.key ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Per-film tab: pay-per-view and subscription for each film or series */}
          {activeTab === 'per-film' && (
            <div className="earnings-films-table">
              <div className="earnings-source-header">
                <span>Source</span>
                <span>Purchases / views</span>
                <span>Gross revenue</span>
                <span>{earningsHeading}</span>
              </div>
              {titles.length === 0 ? (
                <p className="earnings-empty">You have no published films or series yet.</p>
              ) : titles.map((title) => {
                const e = title.earnings;
                return (
                  <div key={title.id} className="earnings-title-block">
                    <TitleHeader title={title} />
                    <RevenueLine
                      label="Pay-per-view"
                      count={<Count value={e.ppvPurchases} one="purchase" many="purchases" />}
                      gross={e.ppvGrossRevenue}
                      earnings={e.ppvEarnings}
                      currency={currency}
                    />
                    <RevenueLine
                      label="Subscription"
                      count={<Count value={e.subscriptionViews} one="view" many="views" />}
                      gross={e.subscriptionGrossRevenue}
                      earnings={e.subscriptionEarnings}
                      status={e.subscriptionStatus}
                      currency={currency}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Subscription tab: all plans together (Monthly, Yearly and Mobile) */}
          {activeTab === 'subscription' && (
            <div className="earnings-films-table">
              <p className="earnings-tab-note">
                All subscription plans together: Monthly, Yearly and Mobile. Earnings stay Pending
                until the 30-day cycle closes, then show as Paid.
              </p>
              <div className="earnings-source-header">
                <span>Film / series</span>
                <span>Views</span>
                <span>Gross revenue</span>
                <span>{earningsHeading}</span>
              </div>
              {titles.length === 0 ? (
                <p className="earnings-empty">You have no published films or series yet.</p>
              ) : titles.map((title) => {
                const e = title.earnings;
                return (
                  <div key={title.id} className="earnings-source-row earnings-source-row--title">
                    <TitleHeader title={title} />
                    <span className="earnings-source-cell" data-label="Views">
                      <Count value={e.subscriptionViews} one="view" many="views" />
                    </span>
                    <span className="earnings-source-cell" data-label="Gross revenue">
                      <Money value={e.subscriptionGrossRevenue} currency={currency} />
                    </span>
                    <span className="earnings-source-cell earnings-amount-highlight" data-label="Your earnings">
                      <Money value={e.subscriptionEarnings} currency={currency} />
                      <PayoutStatus status={e.subscriptionStatus} />
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Overview tab */}
          {activeTab === 'overview' && (
            <div className="earnings-overview">
              <div className="earnings-split-card">
                <div className="earnings-split-label">Revenue Split</div>
                {hasSplit ? (
                  <>
                    <div className="earnings-split-bar">
                      <div className="earnings-split-filmmaker" style={{ width: `${contractSplit}%` }}>
                        <span>You — {contractSplit}%</span>
                      </div>
                      <div className="earnings-split-platform" style={{ width: `${platformSplitPct}%` }}>
                        <span>Platform — {platformSplitPct}%</span>
                      </div>
                    </div>
                    <p className="earnings-split-note">
                      Based on your contract, your revenue split is {contractSplit}% / {platformSplitPct}%.
                    </p>
                  </>
                ) : (
                  <p className="earnings-missing-block">{NOT_AVAILABLE}.</p>
                )}
              </div>

              <div className="earnings-split-card">
                <div className="earnings-split-label">Minimum Guarantee</div>
                {hasMG ? (
                  <div style={{ marginTop: 12 }}>
                    <p><strong>Total Guarantee:</strong> {fmt(mgAmount, currency)}</p>
                    {mgRemaining !== undefined && <p><strong>Remaining:</strong> {fmt(mgRemaining, currency)}</p>}
                    <p><strong>Status:</strong> {mgRecouped ? 'Recouped' : 'Remaining'}</p>
                  </div>
                ) : (
                  <p className="earnings-missing-block">{NOT_AVAILABLE}.</p>
                )}
              </div>

              <div className="earnings-chart-card">
                <h3 className="earnings-section-title">Payout History</h3>
                {payouts.length > 0 ? (
                  payouts.map((payout, idx) => (
                    <div key={payout.id || idx} className="earnings-month-row">
                      <div className="earnings-month-label">
                        {payout.month || payout.period || (payout.created_at
                          ? new Date(payout.created_at).toLocaleString('default', { month: 'short', year: 'numeric' })
                          : '—')}
                      </div>
                      <div className="earnings-month-amount">
                        {fmt(payout.amount ?? payout.earnings, currency) ?? <Missing small />}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="earnings-missing-block">{NOT_AVAILABLE}.</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
