/**
 * Reads GET /filmmaker/me/contract into what the dashboard shows. The field
 * names are accepted in their usual spellings; a missing contract is "none".
 */
const pick = (...values) => values.find((v) => v !== undefined && v !== null && v !== '');

export function summarizeContract(raw, now = new Date()) {
  const c = raw && typeof raw === 'object' ? (raw.contract || raw) : null;
  if (!c || Object.keys(c).length === 0) return { status: 'none', startDate: null, endDate: null, split: null, minimumGuarantee: null };

  const startDate = pick(c.start_date, c.startDate, c.effective_date, c.effective_from, c.signed_at);
  const endDate = pick(c.end_date, c.endDate, c.expires_at, c.expiry_date, c.effective_to);
  const split = pick(c.filmmaker_split, c.split_percentage, c.revenue_share);
  const minimumGuarantee = pick(c.minimum_guarantee, c.minimumGuarantee);

  const label = String(pick(c.status, '')).toLowerCase();
  let status = 'valid';
  if (/terminat|cancel/.test(label)) status = 'terminated';
  else if (/expire/.test(label) || (endDate && new Date(endDate) < now)) status = 'expired';
  else if (c.is_active === false || /inactive|pending|draft/.test(label)) status = 'none';

  return { status, startDate: startDate || null, endDate: endDate || null, split: split ?? null, minimumGuarantee: minimumGuarantee ?? null };
}
