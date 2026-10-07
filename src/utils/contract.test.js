import { summarizeContract, contractDuration } from './contract';

// The real GET /filmmaker/me/contract `data` (2026-10-07), trimmed.
const REAL = {
  filmmaker: {
    id: 'd1201cff', user_type: 'filmmaker', is_active: true,
    content_partner_contract: { start_date: '2026-08-19T00:00:00.000Z', end_date: '2027-08-19T00:00:00.000Z', status: 'valid' },
    library_count: { movies: 3, series: 3 },
    created_at: '2026-07-10T08:50:03.415Z', updated_at: '2026-09-07T20:18:26.784Z',
  },
  filmmaker_split: 70,
  platform_split: 30,
  currency: 'USD',
};

describe('summarizeContract', () => {
  it('reads the real payload: dates, status, split, 1-year duration', () => {
    const c = summarizeContract(REAL, new Date('2026-10-07'));
    expect(c).toMatchObject({ status: 'valid', startDate: '2026-08-19T00:00:00.000Z', endDate: '2027-08-19T00:00:00.000Z', split: 70 });
    expect(contractDuration(c)).toBe('1 year');
  });
  it('is expired after the end date', () => {
    expect(summarizeContract(REAL, new Date('2027-09-01')).status).toBe('expired');
  });
  it('has no dates when the filmmaker has no contract', () => {
    expect(summarizeContract(null).status).toBe('none');
    expect(summarizeContract({ filmmaker: { content_partner_contract: null }, filmmaker_split: 70 }).startDate).toBeNull();
  });
});
