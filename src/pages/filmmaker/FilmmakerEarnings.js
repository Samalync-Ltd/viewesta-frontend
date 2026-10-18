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
  { key: 'per-view', label: 'Per View' },
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

  // Which tab a title belongs on is decided by the backend's own count for that
  // payment model: purchases for Per View, views for Subscription. A title with
  // none of that model stays off its tab; one with both appears on both, each
  // tab showing only its own figures. No amounts are added up here.
  const byModel = (countKey) => {
    const known = titles.filter((t) => t.earnings[countKey] !== null);
    if (known.length === 0) return { state: 'unavailable', rows: [] };
    return { state: 'ok', rows: known.filter((t) => t.earnings[countKey] > 0) };
  };
  const perViewTitles = byModel('ppvPurchases');
  const subscriptionTitles = byModel('subscriptionViews');

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

          {/* Overview: general statistics, all straight from the backend */}
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
                  <div className="earnings-card-label">Subscription Views</div>
                  <div className="earnings-card-value">
                    {summary.subscriptionViews !== null ? summary.subscriptionViews.toLocaleString() : <Missing />}
                  </div>
                </div>
                <div className="earnings-summary-card">
                  <div className="earnings-card-label">Per View (Purchases)</div>
                  <div className="earnings-card-value">
                    {summary.ppvPurchases !== null ? summary.ppvPurchases.toLocaleString() : <Missing />}
                  </div>
                </div>
              </div>
              <p className="earnings-tab-note earnings-tab-note--plain">
                Earnings include pay-per-view purchases and subscription views.
              </p>

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

          {/* Per View: only titles that were bought pay-per-view */}
          {activeTab === 'per-view' && (
            <div className="earnings-films-table">
              <p className="earnings-tab-note">
                Films and series bought one by one (pay-per-view). Subscription views are not counted here.
              </p>
              <div className="earnings-source-header">
                <span>Film / series</span>
                <span>Purchases</span>
                <span>Gross revenue</span>
                <span>{earningsHeading}</span>
              </div>
              {perViewTitles.state === 'unavailable' ? (
                <p className="earnings-empty"><Missing /></p>
              ) : perViewTitles.rows.length === 0 ? (
                <p className="earnings-empty">None of your titles has been bought pay-per-view yet.</p>
              ) : perViewTitles.rows.map((title) => {
                const e = title.earnings;
                return (
                  <div key={title.id} className="earnings-source-row earnings-source-row--title">
                    <TitleHeader title={title} />
                    <span className="earnings-source-cell" data-label="Purchases">
                      <Count value={e.ppvPurchases} one="purchase" many="purchases" />
                    </span>
                    <span className="earnings-source-cell" data-label="Gross revenue">
                      <Money value={e.ppvGrossRevenue} currency={currency} />
                    </span>
                    <span className="earnings-source-cell earnings-amount-highlight" data-label="Your earnings">
                      <Money value={e.ppvEarnings} currency={currency} />
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Subscription: only titles watched through an active subscription (all plans together) */}
          {activeTab === 'subscription' && (
            <div className="earnings-films-table">
              <p className="earnings-tab-note">
                Films and series watched through a subscription: Monthly, Yearly and Mobile plans together.
                Earnings stay Pending until the 30-day cycle closes, then show as Paid.
              </p>
              <div className="earnings-source-header">
                <span>Film / series</span>
                <span>Views</span>
                <span>Gross revenue</span>
                <span>{earningsHeading}</span>
              </div>
              {subscriptionTitles.state === 'unavailable' ? (
                <p className="earnings-empty"><Missing /></p>
              ) : subscriptionTitles.rows.length === 0 ? (
                <p className="earnings-empty">None of your titles has been watched through a subscription yet.</p>
              ) : subscriptionTitles.rows.map((title) => {
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
        </>
      )}
    </div>
  );
}
