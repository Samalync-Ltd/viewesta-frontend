import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFilmmakerMovies } from '../../services/movieService';
import { getFilmmakerShows } from '../../services/seriesService';
import { getContract, getEarningsBreakdown } from '../../services/earningsService';
import { FaArrowLeft } from 'react-icons/fa';
// Reuse existing styles where possible. We'll rely on the existing layout.
import '../EarningsDetail.css';

/*
 * Every figure here is shown exactly as GET /filmmaker/earnings/breakdown
 * returns it (see earningsService.js): nothing is added up, split or worked
 * out on the page, and a value the backend doesn't send reads "Not available yet".
 */

const NOT_AVAILABLE = 'Not available yet';
// Product rule for the filmmaker share; the contract's own split wins when the backend sends it.
const DEFAULT_FILMMAKER_SHARE = 70;
const PENDING_NOTE = 'Pending amounts are estimates until the payout date.';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'per-view', label: 'Per View' },
  { key: 'subscription', label: 'Subscription' },
  { key: 'monthly', label: 'Monthly' },
];

function fmt(amount, currency = 'USD') {
  if (amount === undefined || amount === null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
}

function plural(n, one, many) {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

/** A figure that counts as activity for a payment model: a count, gross or earnings above zero. */
const isActive = (...values) => values.some((v) => v !== null && v > 0);

/** "Paid $x · Pending $y (est.)" under an earnings amount, only for the parts the backend sent. */
function PaidPending({ paid, pending, currency }) {
  if (paid === null && pending === null) return null;
  return (
    <span className="earnings-subline">
      {paid !== null && <>Paid {fmt(paid, currency)}</>}
      {paid !== null && pending !== null && ' · '}
      {pending !== null && <>Pending {fmt(pending, currency)} (est.)</>}
    </span>
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

function StatCard({ label, children, highlight = false }) {
  return (
    <div className="earnings-summary-card">
      <div className="earnings-card-label">{label}</div>
      <div className={`earnings-card-value${highlight ? ' earnings-card-value--highlight' : ''}`}>{children}</div>
    </div>
  );
}

export default function FilmmakerEarnings() {
  const { user } = useAuth();

  const [breakdown, setBreakdown] = useState(null);
  const [meta, setMeta] = useState({}); // id -> { title, poster, kind } from the film and series lists
  const [contract, setContract] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [breakdownData, contractData, movies, shows] = await Promise.all([
        getEarningsBreakdown(),
        getContract(),
        // Only used for posters and names; the page works without them.
        getFilmmakerMovies().catch(() => []),
        getFilmmakerShows().catch(() => []),
      ]);

      // null = the request failed (an empty breakdown is still an object).
      if (!breakdownData) throw new Error('no earnings data');

      const lookup = {};
      (movies || []).forEach((m) => { lookup[String(m.id)] = { title: m.title, poster: m.poster, kind: 'film' }; });
      (shows || []).forEach((s) => { lookup[String(s.id)] = { title: s.title, poster: s.poster, kind: 'series' }; });

      setMeta(lookup);
      setBreakdown(breakdownData);
      setContract(contractData);
    } catch (err) {
      setError('Unable to load your earnings data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currency = contract?.currency || breakdown?.currency || user?.wallet?.currency || 'USD';
  const totals = breakdown?.totals;

  // Revenue split, straight from the contract.
  const contractSplit = contract?.filmmaker_split ?? contract?.split_percentage ?? null;
  const hasSplit = contractSplit !== null;
  const filmmakerSharePct = hasSplit ? contractSplit : DEFAULT_FILMMAKER_SHARE;
  const platformSplitPct = hasSplit ? 100 - contractSplit : null;
  const earningsHeading = `Your earnings (${filmmakerSharePct}%)`;

  // Minimum Guarantee, from the contract.
  const mgAmount = contract?.minimum_guarantee;
  const hasMG = mgAmount !== undefined && mgAmount !== null;

  // One entry per film or series from the breakdown; poster and name fall back to the lists.
  const titles = (breakdown?.titles || []).map((t, index) => {
    const known = meta[String(t.id)] || {};
    return {
      ...t,
      key: `${t.id ?? 'title'}-${index}`,
      title: t.title || known.title || 'Untitled',
      poster: known.poster || null,
      kind: known.kind || t.kind,
    };
  });

  // A title is on Per View only when the backend reports pay-per-view activity
  // for it, and on Subscription (with only the plans that have activity) only
  // when it reports subscription activity. A title with both appears on both,
  // each tab showing only its own figures.
  const perViewTitles = titles.filter((t) => t.payPerView
    && isActive(t.payPerView.purchases, t.payPerView.grossRevenue, t.payPerView.earnings));
  const perViewReported = titles.some((t) => t.payPerView);

  const subscriptionTitles = titles
    .map((t) => ({ ...t, activePlans: t.plans.filter((p) => isActive(p.views, p.earningViews, p.grossRevenue, p.earnings)) }))
    .filter((t) => t.activePlans.length > 0);
  const subscriptionReported = titles.some((t) => t.plans.length > 0);

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

          {/* Overview: totals, then one line per film or series */}
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
                <StatCard label="Total Earnings" highlight>
                  {totals.earnings !== null ? fmt(totals.earnings, currency) : <Missing />}
                </StatCard>
                <StatCard label="Gross Revenue">
                  {totals.grossRevenue !== null ? fmt(totals.grossRevenue, currency) : <Missing />}
                </StatCard>
                <StatCard label="Paid">
                  {totals.paidEarnings !== null ? fmt(totals.paidEarnings, currency) : <Missing />}
                </StatCard>
                <StatCard label="Pending (estimate)">
                  {totals.pendingEarnings !== null ? fmt(totals.pendingEarnings, currency) : <Missing />}
                </StatCard>
                <StatCard label="Views">
                  {totals.views !== null ? totals.views.toLocaleString() : <Missing />}
                </StatCard>
                <StatCard label="Earning Views">
                  {totals.earningViews !== null ? totals.earningViews.toLocaleString() : <Missing />}
                </StatCard>
                <StatCard label="Purchases">
                  {totals.purchases !== null ? totals.purchases.toLocaleString() : <Missing />}
                </StatCard>
              </div>
              <p className="earnings-tab-note earnings-tab-note--plain">
                Total earnings are paid plus pending. {PENDING_NOTE} Views count once a viewer has watched 20% or more.
              </p>

              <div className="earnings-films-table">
                <div className="earnings-title-head">
                  <span>Film / series</span>
                  <span>Gross revenue</span>
                  <span>Earnings</span>
                  <span>Paid</span>
                  <span>Pending (est.)</span>
                  <span>Views</span>
                  <span>Purchases</span>
                </div>
                {titles.length === 0 ? (
                  <p className="earnings-empty">You have no earnings on any film or series yet.</p>
                ) : titles.map((title) => {
                  const t = title.totals;
                  const payoutDate = formatDate(title.nextPayoutAt);
                  return (
                    <div key={title.key} className="earnings-title-row">
                      <TitleHeader title={title} />
                      <span className="earnings-source-cell" data-label="Gross revenue"><Money value={t.grossRevenue} currency={currency} /></span>
                      <span className="earnings-source-cell earnings-amount-highlight" data-label="Earnings"><Money value={t.earnings} currency={currency} /></span>
                      <span className="earnings-source-cell" data-label="Paid"><Money value={t.paidEarnings} currency={currency} /></span>
                      <span className="earnings-source-cell earnings-source-cell--stack" data-label="Pending (est.)">
                        <Money value={t.pendingEarnings} currency={currency} />
                        {payoutDate && <span className="earnings-subline">Paid on {payoutDate}</span>}
                      </span>
                      <span className="earnings-source-cell earnings-source-cell--stack" data-label="Views">
                        {t.views === null ? <Missing small /> : t.views.toLocaleString()}
                        {t.earningViews !== null && <span className="earnings-subline">{t.earningViews.toLocaleString()} earning</span>}
                      </span>
                      <span className="earnings-source-cell" data-label="Purchases">
                        {t.purchases === null ? <Missing small /> : t.purchases.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="earnings-split-card">
                <div className="earnings-split-label">Minimum Guarantee</div>
                {hasMG ? (
                  <div style={{ marginTop: 12 }}>
                    <p><strong>Total Guarantee:</strong> {fmt(mgAmount, currency)}</p>
                  </div>
                ) : (
                  <p className="earnings-missing-block">{NOT_AVAILABLE}.</p>
                )}
              </div>
            </div>
          )}

          {/* Per View: only titles bought pay-per-view */}
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
              {!perViewReported ? (
                <p className="earnings-empty"><Missing /></p>
              ) : perViewTitles.length === 0 ? (
                <p className="earnings-empty">None of your titles has been bought pay-per-view yet.</p>
              ) : perViewTitles.map((title) => {
                const p = title.payPerView;
                return (
                  <div key={title.key} className="earnings-source-row earnings-source-row--title">
                    <TitleHeader title={title} />
                    <span className="earnings-source-cell" data-label="Purchases">
                      <Count value={p.purchases} one="purchase" many="purchases" />
                    </span>
                    <span className="earnings-source-cell" data-label="Gross revenue">
                      <Money value={p.grossRevenue} currency={currency} />
                    </span>
                    <span className="earnings-source-cell earnings-source-cell--stack" data-label="Your earnings">
                      <span className="earnings-amount-highlight"><Money value={p.earnings} currency={currency} /></span>
                      <PaidPending paid={p.paidEarnings} pending={p.pendingEarnings} currency={currency} />
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Subscription: only titles watched through a subscription, one line per plan */}
          {activeTab === 'subscription' && (
            <div className="earnings-films-table">
              <p className="earnings-tab-note">
                Films and series watched through a subscription, with Monthly, Yearly and Mobile plans listed together.
                {' '}{PENDING_NOTE}
              </p>
              <div className="earnings-source-header">
                <span>Film / series · plan</span>
                <span>Views</span>
                <span>Gross revenue</span>
                <span>{earningsHeading}</span>
              </div>
              {!subscriptionReported ? (
                <p className="earnings-empty"><Missing /></p>
              ) : subscriptionTitles.length === 0 ? (
                <p className="earnings-empty">None of your titles has been watched through a subscription yet.</p>
              ) : subscriptionTitles.map((title) => {
                const payoutDate = formatDate(title.nextPayoutAt);
                return (
                  <div key={title.key} className="earnings-title-block">
                    <TitleHeader title={title} />
                    {payoutDate && <p className="earnings-subline earnings-subline--block">Pending earnings are paid on {payoutDate}</p>}
                    {title.activePlans.map((plan) => (
                      <div key={plan.key} className="earnings-source-row">
                        <span className="earnings-source-label">{plan.label}</span>
                        <span className="earnings-source-cell earnings-source-cell--stack" data-label="Views">
                          <Count value={plan.views} one="view" many="views" />
                          {plan.earningViews !== null && <span className="earnings-subline">{plan.earningViews.toLocaleString()} earning</span>}
                        </span>
                        <span className="earnings-source-cell" data-label="Gross revenue">
                          <Money value={plan.grossRevenue} currency={currency} />
                        </span>
                        <span className="earnings-source-cell earnings-source-cell--stack" data-label="Your earnings">
                          <span className="earnings-amount-highlight"><Money value={plan.earnings} currency={currency} /></span>
                          <PaidPending paid={plan.paidEarnings} pending={plan.pendingEarnings} currency={currency} />
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Monthly: the backend's own month-by-month figures */}
          {activeTab === 'monthly' && (
            <div className="earnings-films-table">
              <p className="earnings-tab-note">{PENDING_NOTE}</p>
              <div className="earnings-source-header">
                <span>Month</span>
                <span>Earnings</span>
                <span>Paid</span>
                <span>Pending (est.)</span>
              </div>
              {breakdown.monthly.length === 0 ? (
                <p className="earnings-empty">No monthly earnings yet.</p>
              ) : breakdown.monthly.map((m, index) => (
                <div key={m.month ?? index} className="earnings-source-row earnings-source-row--title">
                  <span className="earnings-film-title">{m.month ?? <Missing small />}</span>
                  <span className="earnings-source-cell earnings-amount-highlight" data-label="Earnings"><Money value={m.earnings} currency={currency} /></span>
                  <span className="earnings-source-cell" data-label="Paid"><Money value={m.paidEarnings} currency={currency} /></span>
                  <span className="earnings-source-cell" data-label="Pending (est.)"><Money value={m.pendingEarnings} currency={currency} /></span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
