import React from 'react';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import FilmmakerEarnings from './FilmmakerEarnings';
import { readBreakdown, getEarningsBreakdown, getContract } from '../../services/earningsService';
import { getFilmmakerMovies } from '../../services/movieService';
import { getFilmmakerShows } from '../../services/seriesService';

// CRA's Jest cannot load react-router v7's `react-router/dom` entry; the page only needs <Link>.
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}));
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { wallet: { currency: 'USD' } } }) }));
jest.mock('../../services/movieService', () => ({ getFilmmakerMovies: jest.fn() }));
jest.mock('../../services/seriesService', () => ({ getFilmmakerShows: jest.fn() }));
jest.mock('../../services/earningsService', () => ({
  ...jest.requireActual('../../services/earningsService'),
  getEarningsBreakdown: jest.fn(),
  getContract: jest.fn(),
}));

const totals = (o) => ({ earnings: 0, gross_revenue: 0, paid_earnings: 0, pending_earnings: 0, views: 0, ...o });

const data = {
  totals: totals({ earnings: '3.12', gross_revenue: '4.00', paid_earnings: '2.80', pending_earnings: '0.32', views: 6 }),
  titles: [
    {
      id: 'm1', title: 'yaya',
      totals: totals({ earnings: '3.12', gross_revenue: '4.00', paid_earnings: '2.80', pending_earnings: '0.32', views: 6 }),
      pay_per_view: { purchases: 2, gross_revenue: '2.00', earnings: '1.40' },
      subscription: { next_payout_at: '2026-11-17T00:00:00.000Z', by_plan: { monthly: { views: 3, gross_revenue: '1.00', earnings: '0.70' } } },
    },
    {
      id: 'm2', title: 'Quiet Film', totals: totals({}),
      pay_per_view: { purchases: 0, gross_revenue: 0, earnings: 0 },
      subscription: { by_plan: { monthly: { views: 0, gross_revenue: 0, earnings: 0 } } },
    },
  ],
  monthly: [{ month: '2026-10', earnings: '3.12', paid_earnings: '2.80', pending_earnings: '0.32' }],
};

const renderPage = () => render(<FilmmakerEarnings />);
const open = (name) => fireEvent.click(screen.getByRole('tab', { name }));

// CRA's Jest config resets mock implementations before every test, so they are set here.
beforeEach(() => {
  getContract.mockResolvedValue({ filmmaker_split: 70 });
  getFilmmakerMovies.mockResolvedValue([
    { id: 'm1', title: 'yaya', poster: 'p1.jpg' },
    { id: 'm2', title: 'Quiet Film', poster: 'p2.jpg' },
  ]);
  getFilmmakerShows.mockResolvedValue([]);
});

test('overview shows the backend totals, paid and pending separately', async () => {
  getEarningsBreakdown.mockResolvedValue(readBreakdown(data));
  renderPage();
  const total = await screen.findByText('Total Earnings');
  expect(within(total.parentElement).getByText('$3.12')).toBeInTheDocument();
  expect(within(screen.getByText('Paid', { selector: '.earnings-card-label' }).parentElement).getByText('$2.80')).toBeInTheDocument();
  expect(within(screen.getByText('Pending (estimate)').parentElement).getByText('$0.32')).toBeInTheDocument();
  // PR #68 fields are not in this payload yet
  expect(within(screen.getByText('Earning Views').parentElement).getByText('Not available yet')).toBeInTheDocument();
  expect(within(screen.getByText('Purchases', { selector: '.earnings-card-label' }).parentElement).getByText('Not available yet')).toBeInTheDocument();
});

test('Per View lists only titles bought pay-per-view', async () => {
  getEarningsBreakdown.mockResolvedValue(readBreakdown(data));
  renderPage();
  await screen.findByText('Total Earnings');
  open('Per View');
  expect(screen.getByText('yaya')).toBeInTheDocument();
  expect(screen.getByText('2 purchases')).toBeInTheDocument();
  expect(screen.getByText('$1.40')).toBeInTheDocument();
  expect(screen.queryByText('Quiet Film')).not.toBeInTheDocument();
  expect(screen.queryByText('$0.70')).not.toBeInTheDocument(); // the subscription figure stays off this tab
});

test('Subscription lists only active plans and the payout date', async () => {
  getEarningsBreakdown.mockResolvedValue(readBreakdown(data));
  renderPage();
  await screen.findByText('Total Earnings');
  open('Subscription');
  expect(screen.getByText('yaya')).toBeInTheDocument();
  expect(screen.getByText('3 views')).toBeInTheDocument();
  expect(screen.getByText('$0.70')).toBeInTheDocument();
  expect(screen.getByText(/paid on Nov 1[67], 2026/)).toBeInTheDocument();
  expect(screen.queryByText('Quiet Film')).not.toBeInTheDocument();
  expect(screen.queryByText('$1.40')).not.toBeInTheDocument(); // the pay-per-view figure stays off this tab
});

test('Monthly shows the backend months', async () => {
  getEarningsBreakdown.mockResolvedValue(readBreakdown(data));
  renderPage();
  await screen.findByText('Total Earnings');
  open('Monthly');
  expect(screen.getByText('2026-10')).toBeInTheDocument();
  expect(screen.getByText('$0.32')).toBeInTheDocument();
});

test('says it could not load when the request fails', async () => {
  getEarningsBreakdown.mockResolvedValue(null);
  renderPage();
  await waitFor(() => expect(screen.getByText(/Unable to load your earnings data/)).toBeInTheDocument());
});

test('Minimum Guarantee is read from the nested contract, like the dashboard', async () => {
  getEarningsBreakdown.mockResolvedValue(readBreakdown(data));
  getContract.mockResolvedValue({
    filmmaker_split: 70,
    filmmaker: { content_partner_contract: { status: 'active', minimum_guarantee: '500.00' } },
  });
  renderPage();
  const label = await screen.findByText('Minimum Guarantee');
  expect(within(label.parentElement).getByText(/\$500\.00/)).toBeInTheDocument();
});

test('Minimum Guarantee says not available when the contract has none', async () => {
  getEarningsBreakdown.mockResolvedValue(readBreakdown(data));
  getContract.mockResolvedValue({ filmmaker_split: 70 });
  renderPage();
  const label = await screen.findByText('Minimum Guarantee');
  expect(within(label.parentElement).getByText('Not available yet.')).toBeInTheDocument();
});
