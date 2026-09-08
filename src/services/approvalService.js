/**
 * Approval Service — Admin content review workflow.
 * Manages the lifecycle: draft → pending → approved/rejected.
 *
 * All functions now call the real backend via the shared axios client.
 */

import client from '../api/client';

// ─── Queue Queries ────────────────────────────────────────────────────────────

/**
 * Get all content pending admin review.
 * GET /movies?status=pending
 * @returns {Promise<Array>}
 */
export async function getPendingReviewQueue() {
  try {
    const response = await client.get('/movies', { params: { status: 'pending', limit: 100 } });
    const data = response.data?.data;
    if (Array.isArray(data?.movies)) return data.movies;
    if (Array.isArray(data)) return data;
    return [];
  } catch (err) {
    console.error('[ApprovalService] getPendingReviewQueue failed:', err?.response?.data || err?.message);
    return [];
  }
}

/**
 * Get all content with a given status.
 * GET /movies?status=<status>
 * @param {string} status
 * @returns {Promise<Array>}
 */
export async function getContentByStatus(status) {
  try {
    const response = await client.get('/movies', { params: { status, limit: 100 } });
    const data = response.data?.data;
    if (Array.isArray(data?.movies)) return data.movies;
    if (Array.isArray(data)) return data;
    return [];
  } catch (err) {
    console.error('[ApprovalService] getContentByStatus failed:', err?.response?.data || err?.message);
    return [];
  }
}

/**
 * Get approval statistics summary (counts per status).
 * Fetches movies in parallel for each status and aggregates counts.
 * @returns {Promise<{pending: number, approved: number, rejected: number, total: number}>}
 */
export async function getApprovalStats() {
  try {
    const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
      client.get('/movies', { params: { status: 'pending', limit: 1 } }).catch(() => null),
      client.get('/movies', { params: { status: 'approved', limit: 1 } }).catch(() => null),
      client.get('/movies', { params: { status: 'rejected', limit: 1 } }).catch(() => null),
    ]);

    const extractCount = (res) =>
      res?.data?.data?.total ?? res?.data?.total ?? 0;

    return {
      pending: extractCount(pendingRes),
      approved: extractCount(approvedRes),
      rejected: extractCount(rejectedRes),
    };
  } catch (err) {
    console.error('[ApprovalService] getApprovalStats failed:', err?.message);
    return { pending: 0, approved: 0, rejected: 0 };
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Submit new content for admin review.
 * Transitions status: draft → pending.
 * PUT /movies/:id  or  PUT /shows/:id { status: 'pending' }
 *
 * Was PATCH, which 404s on both routes — confirmed live, "Update Movie" and
 * "Update Show" are PUT-only (matches the API collection). Since movies and
 * shows both already come back with status "pending" immediately on
 * creation, this call was a no-op in practice (nothing depended on it
 * succeeding), which is why the silent 404 in FilmmakerUpload.js's
 * `.catch()` never surfaced as a visible bug — but a fixed method is still
 * correct in case that ever changes, and it stops a request that always
 * failed from failing.
 *
 * @param {string} id - The ID returned by createMovie() or createShow()
 * @param {boolean} isSeries - Whether the content is a series
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function submitForReview(id, isSeries = false) {
  if (!id) {
    console.warn('[ApprovalService] submitForReview: id is required');
    return { success: false, message: 'Missing content ID.' };
  }

  try {
    const endpoint = isSeries ? `/shows/${id}` : `/movies/${id}`;
    await client.put(endpoint, { status: 'pending' });
    console.log(`[ApprovalService] Content ${id} submitted for review.`);
    return {
      success: true,
      message: 'Content submitted for review. You will be notified once it is reviewed.',
    };
  } catch (err) {
    console.error('[ApprovalService] submitForReview failed:', err?.response?.data || err?.message);
    throw err;
  }
}

/**
 * Approve and publish a content item.
 * PUT /movies/:id  { status: 'approved' }
 *
 * Was PATCH (404 live, confirmed with an admin token — "Update Movie" is
 * PUT-only). Unlike submitForReview, this one is NOT a no-op: it's the only
 * way admin approval actually reaches the backend, so the 404 meant
 * approvals from this page silently failed outright.
 *
 * @param {string} movieId
 * @param {Object} [options]
 * @param {string} [options.notes]
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function approveContent(movieId, options = {}) {
  if (!movieId) {
    console.warn('[ApprovalService] approveContent: movieId is required');
    return { success: false, message: 'Missing movie ID.' };
  }

  try {
    const body = {
      status: 'approved',
      ...(options.notes ? { admin_notes: options.notes } : {}),
    };
    await client.put(`/movies/${movieId}`, body);
    console.log(`[ApprovalService] Movie ${movieId} approved.`);
    return { success: true, message: 'Content approved and published successfully.' };
  } catch (err) {
    console.error('[ApprovalService] approveContent failed:', err?.response?.data || err?.message);
    throw err;
  }
}

/**
 * Reject a content item with a reason.
 * PUT /movies/:id  { status: 'rejected', rejection_reason }
 *
 * Was PATCH (404 live, same as approveContent above).
 *
 * @param {string} movieId
 * @param {string} reason
 * @param {Object} [options]
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function rejectContent(movieId, reason, options = {}) {
  if (!movieId) {
    console.warn('[ApprovalService] rejectContent: movieId is required');
    return { success: false, message: 'Missing movie ID.' };
  }
  if (!reason?.trim()) {
    return { success: false, message: 'A rejection reason is required.' };
  }

  try {
    const body = {
      status: 'rejected',
      rejection_reason: reason.trim(),
      ...(options.notes ? { admin_notes: options.notes } : {}),
    };
    await client.put(`/movies/${movieId}`, body);
    console.log(`[ApprovalService] Movie ${movieId} rejected.`);
    return { success: true, message: 'Content rejected. The filmmaker will be notified.' };
  } catch (err) {
    console.error('[ApprovalService] rejectContent failed:', err?.response?.data || err?.message);
    throw err;
  }
}

/**
 * Request revisions on a content item (same as reject but with a revisions message).
 * @param {string} movieId
 * @param {string} notes
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function requestRevisions(movieId, notes) {
  const result = await rejectContent(movieId, `Revisions requested: ${notes}`);
  if (result.success) {
    return { success: true, message: 'Revision request sent to the filmmaker.' };
  }
  return result;
}
