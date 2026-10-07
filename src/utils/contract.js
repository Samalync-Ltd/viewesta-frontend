/**
 * Reads GET /filmmaker/me/contract into what the dashboard shows. The real
 * payload keeps the dates in `data.filmmaker.content_partner_contract` and the
 * split at the top level; other nestings (`contract`, `terms`, `agreement`) are
 * merged too, and keys are matched by what they mean (…start…, …end/expir…)
 * rather than by one exact spelling.
 */
const present = (v) => v !== undefined && v !== null && v !== '';
const pick = (...values) => values.find(present);
const isDateLike = (v) => (typeof v === 'string' || v instanceof Date) && Number.isFinite(new Date(v).getTime()) && /\d{4}/.test(String(v));

function flatten(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const merged = { ...raw };
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const KEYS = ['contract', 'content_partner_contract', 'terms', 'agreement', 'current_contract', 'active_contract'];
  KEYS.forEach((k) => { if (isObj(raw[k])) Object.assign(merged, raw[k]); });
  // Real shape: { filmmaker: { …, content_partner_contract: { start_date, end_date, status } },
  //               filmmaker_split, platform_split, currency }
  if (isObj(raw.filmmaker)) KEYS.forEach((k) => { if (isObj(raw.filmmaker[k])) Object.assign(merged, raw.filmmaker[k]); });
  return merged;
}

const findDate = (c, pattern, exclude) => {
  const key = Object.keys(c).find((k) => pattern.test(k) && !(exclude && exclude.test(k)) && isDateLike(c[k]));
  return key ? c[key] : undefined;
};

export function summarizeContract(raw, now = new Date()) {
  const c = flatten(raw);
  const empty = { status: 'none', startDate: null, endDate: null, durationMonths: null, split: null, minimumGuarantee: null };
  if (Object.keys(c).length === 0) return empty;

  const startDate = pick(
    c.start_date, c.startDate, c.effective_date, c.effective_from, c.valid_from, c.signed_at,
    findDate(c, /start|begin|effective|valid_?from|signed/i),
  );
  const endDate = pick(
    c.end_date, c.endDate, c.expires_at, c.expiry_date, c.effective_to, c.valid_until, c.valid_to,
    findDate(c, /(^|_)end|expir|valid_?(to|until)|terminat/i, /status|reason/i),
  );
  const durationMonths = pick(
    c.duration_months, c.term_months, c.contract_months, c.contract_length_months,
    c.duration_in_months, c.durationMonths,
  );
  const split = pick(c.filmmaker_split, c.split_percentage, c.revenue_share, c.filmmaker_share);
  const minimumGuarantee = pick(c.minimum_guarantee, c.minimumGuarantee);

  const label = String(pick(c.status, c.contract_status, '')).toLowerCase();
  let status = 'valid';
  if (/terminat|cancel/.test(label)) status = 'terminated';
  else if (/expire/.test(label) || (endDate && new Date(endDate) < now)) status = 'expired';
  else if (c.is_active === false || /inactive|pending|draft/.test(label)) status = 'none';

  return {
    status,
    startDate: startDate || null,
    endDate: endDate || null,
    durationMonths: present(durationMonths) ? Number(durationMonths) : null,
    split: split ?? null,
    minimumGuarantee: minimumGuarantee ?? null,
  };
}

/** "2 years", "6 months" from the dates, or from a stated number of months; null when unknown. */
export function contractDuration(contract) {
  let months = null;
  if (contract.startDate && contract.endDate) {
    months = Math.round((new Date(contract.endDate) - new Date(contract.startDate)) / (1000 * 60 * 60 * 24 * 30.44));
  } else if (Number.isFinite(contract.durationMonths)) {
    months = contract.durationMonths;
  }
  if (!Number.isFinite(months) || months <= 0) return null;
  if (months % 12 === 0) return `${months / 12} ${months === 12 ? 'year' : 'years'}`;
  return `${months} ${months === 1 ? 'month' : 'months'}`;
}
