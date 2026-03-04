/**
 * Approval Service — Admin content review workflow.
 * Manages the lifecycle: draft → pending_review → approved/rejected → published.
 * TODO: Replace with API calls when backend is ready.
 */

import { mockMovies } from './mockData/movies';
import { mockSeries } from './mockData/series';
import { mockShortFilms } from './mockData/shortFilms';
import { APPROVAL_STATUS } from '../types';

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// In-memory store simulating backend state updates
// In production this would be persisted via API calls
let _overrides = {};

/**
 * Get current approval status for a content item (with override support).
 * @param {string} id
 * @returns {string}
 */
function getStatus(id, defaultStatus) {
  return _overrides[id]?.status || defaultStatus;
}

// ─── Queue Queries ────────────────────────────────────────────────────────

/**
 * Get all content pending admin review.
 * @returns {Promise<Array>}
 */
export async function getPendingReviewQueue() {
  await delay(400);
  const all = [
    ...mockMovies.map((m) => ({ ...m, _contentType: 'Movie' })),
    ...mockSeries.map((s) => ({ ...s, _contentType: 'Series' })),
    ...mockShortFilms.map((sf) => ({ ...sf, _contentType: 'ShortFilm' })),
  ];
  return all
    .map((item) => ({ ...item, approval_status: getStatus(item.id, item.approval_status) }))
    .filter((item) => item.approval_status === APPROVAL_STATUS.PENDING_REVIEW);
}

/**
 * Get all content with a given status.
 * @param {string} status
 * @returns {Promise<Array>}
 */
export async function getContentByStatus(status) {
  await delay(400);
  const all = [
    ...mockMovies.map((m) => ({ ...m, _contentType: 'Movie' })),
    ...mockSeries.map((s) => ({ ...s, _contentType: 'Series' })),
    ...mockShortFilms.map((sf) => ({ ...sf, _contentType: 'ShortFilm' })),
  ];
  return all
    .map((item) => ({ ...item, approval_status: getStatus(item.id, item.approval_status) }))
    .filter((item) => item.approval_status === status);
}

/**
 * Get approval statistics summary.
 * @returns {Promise<{pending: number, approved: number, rejected: number, published: number, total: number}>}
 */
export async function getApprovalStats() {
  await delay(200);
  const all = [
    ...mockMovies.map((m) => ({ ...m, _contentType: 'Movie' })),
    ...mockSeries.map((s) => ({ ...s, _contentType: 'Series' })),
    ...mockShortFilms.map((sf) => ({ ...sf, _contentType: 'ShortFilm' })),
  ].map((item) => ({ ...item, approval_status: getStatus(item.id, item.approval_status) }));

  return {
    pending: all.filter((i) => i.approval_status === APPROVAL_STATUS.PENDING_REVIEW).length,
    approved: all.filter((i) => i.approval_status === APPROVAL_STATUS.APPROVED).length,
    rejected: all.filter((i) => i.approval_status === APPROVAL_STATUS.REJECTED).length,
    published: all.filter((i) => i.approval_status === APPROVAL_STATUS.PUBLISHED).length,
    draft: all.filter((i) => i.approval_status === APPROVAL_STATUS.DRAFT).length,
    total: all.length,
  };
}

// ─── Actions ──────────────────────────────────────────────────────────────

/**
 * Approve and publish a content item.
 * @param {string} contentId
 * @param {Object} [options]
 * @param {string} [options.reviewerId]
 * @param {string} [options.notes]
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function approveContent(contentId, options = {}) {
  await delay(500);
  _overrides[contentId] = {
    status: APPROVAL_STATUS.PUBLISHED,
    reviewed_at: new Date().toISOString(),
    reviewer_id: options.reviewerId || 'admin',
    notes: options.notes || '',
  };
  return { success: true, message: 'Content approved and published successfully.' };
}

/**
 * Reject a content item with a reason.
 * @param {string} contentId
 * @param {string} reason
 * @param {Object} [options]
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function rejectContent(contentId, reason, options = {}) {
  await delay(500);
  if (!reason?.trim()) {
    return { success: false, message: 'A rejection reason is required.' };
  }
  _overrides[contentId] = {
    status: APPROVAL_STATUS.REJECTED,
    rejection_reason: reason,
    reviewed_at: new Date().toISOString(),
    reviewer_id: options.reviewerId || 'admin',
  };
  return { success: true, message: 'Content rejected. The filmmaker will be notified.' };
}

/**
 * Submit new content for admin review.
 * Transitions from draft → pending_review.
 * @param {string} contentId
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function submitForReview(contentId) {
  await delay(400);
  _overrides[contentId] = {
    status: APPROVAL_STATUS.PENDING_REVIEW,
    submitted_at: new Date().toISOString(),
  };
  return {
    success: true,
    message: 'Content submitted for review. You will be notified once it is reviewed.',
  };
}

/**
 * Request revisions on a content item (keeps it in pending_review, adds notes).
 * @param {string} contentId
 * @param {string} notes
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function requestRevisions(contentId, notes) {
  await delay(400);
  _overrides[contentId] = {
    ...(_overrides[contentId] || {}),
    status: APPROVAL_STATUS.REJECTED,
    rejection_reason: `Revisions requested: ${notes}`,
    reviewed_at: new Date().toISOString(),
  };
  return { success: true, message: 'Revision request sent to the filmmaker.' };
}

/**
 * Reset the in-memory override store (useful for testing).
 */
export function _resetOverrides() {
  _overrides = {};
}
