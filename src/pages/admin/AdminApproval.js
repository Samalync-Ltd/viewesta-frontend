import React, { useState, useEffect, useCallback } from 'react';
import { FaCheck, FaTimes, FaEdit, FaClock, FaFilm, FaExclamationTriangle, FaSearch } from 'react-icons/fa';
import {
  getApprovalStats,
  getContentByStatus,
  approveContent,
  rejectContent,
  requestRevisions,
} from '../../services/approvalService';
import AgeRatingBadge from '../../components/AgeRatingBadge';
import './AdminApproval.css';

const STATUS_TABS = [
  { key: 'pending_review', label: 'Pending Review', icon: <FaClock /> },
  { key: 'approved', label: 'Approved', icon: <FaCheck /> },
  { key: 'rejected', label: 'Rejected', icon: <FaTimes /> },
  { key: 'published', label: 'Published', icon: <FaFilm /> },
];

const AdminApproval = () => {
  const [activeTab, setActiveTab] = useState('pending_review');
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState(null);

  // Reject modal state
  const [rejectModal, setRejectModal] = useState({ open: false, item: null });
  const [rejectReason, setRejectReason] = useState('');
  const [rejectMode, setRejectMode] = useState('reject'); // 'reject' | 'revisions'

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await getApprovalStats();
      setStats(data);
    } catch {}
    setStatsLoading(false);
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getContentByStatus(activeTab);
      setItems(data);
    } catch (err) {
      setError('Failed to load content.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleApprove = async (item) => {
    setProcessingId(item.id);
    try {
      await approveContent(item.id);
      await fetchItems();
      await fetchStats();
    } catch (err) {
      setError(err.message || 'Approval failed.');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (item, mode = 'reject') => {
    setRejectModal({ open: true, item });
    setRejectMode(mode);
    setRejectReason('');
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) return;
    const { item } = rejectModal;
    setProcessingId(item.id);
    setRejectModal({ open: false, item: null });
    try {
      if (rejectMode === 'revisions') {
        await requestRevisions(item.id, rejectReason);
      } else {
        await rejectContent(item.id, rejectReason);
      }
      await fetchItems();
      await fetchStats();
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (item.title || '').toLowerCase().includes(q) ||
      (item.director || '').toLowerCase().includes(q)
    );
  });

  const typeBadge = (type) => {
    if (type === 'ShortFilm') return 'Short';
    return type || 'Movie';
  };

  return (
    <div className="admin-approval page-container">
      <div className="aa-header">
        <div>
          <h1 className="aa-title">Content Approval</h1>
          <p className="aa-subtitle">Review, approve, or reject submitted content.</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="aa-stats">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="aa-stat-card aa-stat-loading" />)
        ) : stats ? (
          <>
            <div className="aa-stat-card aa-stat--pending">
              <span className="aa-stat-value">{stats.pending}</span>
              <span className="aa-stat-label">Pending</span>
            </div>
            <div className="aa-stat-card aa-stat--approved">
              <span className="aa-stat-value">{stats.approved}</span>
              <span className="aa-stat-label">Approved</span>
            </div>
            <div className="aa-stat-card aa-stat--rejected">
              <span className="aa-stat-value">{stats.rejected}</span>
              <span className="aa-stat-label">Rejected</span>
            </div>
            <div className="aa-stat-card aa-stat--published">
              <span className="aa-stat-value">{stats.published}</span>
              <span className="aa-stat-label">Published</span>
            </div>
            <div className="aa-stat-card aa-stat--total">
              <span className="aa-stat-value">{stats.total}</span>
              <span className="aa-stat-label">Total</span>
            </div>
          </>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="aa-tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`aa-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            {tab.label}
            {stats && (
              <span className="aa-tab-count">
                {tab.key === 'pending_review' ? stats.pending :
                 tab.key === 'approved' ? stats.approved :
                 tab.key === 'rejected' ? stats.rejected :
                 stats.published}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="aa-search-row">
        <div className="aa-search">
          <FaSearch className="aa-search-icon" />
          <input
            type="text"
            placeholder="Search by title or director…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="aa-search-input"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="aa-error">
          <FaExclamationTriangle />
          {error}
          <button onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      {/* Items list */}
      <div className="aa-list">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aa-item aa-item-loading" />
          ))
        ) : filtered.length === 0 ? (
          <div className="aa-empty">
            <FaFilm className="aa-empty-icon" />
            <p>No {activeTab.replace('_', ' ')} content{search ? ` matching "${search}"` : ''}.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className={`aa-item ${processingId === item.id ? 'aa-item-loading' : ''}`}>
              {/* Poster */}
              <div className="aa-item-poster">
                {item.poster ? (
                  <img src={item.poster} alt={item.title} loading="lazy" />
                ) : (
                  <div className="aa-item-poster-placeholder">
                    <FaFilm />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="aa-item-info">
                <div className="aa-item-badges">
                  <span className={`aa-type-badge aa-type--${(item.type || 'movie').toLowerCase().replace('_','')}`}>
                    {typeBadge(item.type)}
                  </span>
                  {item.age_rating && (
                    <AgeRatingBadge rating={item.age_rating} size="sm" showTooltip={false} />
                  )}
                </div>
                <h3 className="aa-item-title">{item.title}</h3>
                <p className="aa-item-meta">
                  {item.director && <span>Dir. {item.director}</span>}
                  {item.year && <span> · {item.year}</span>}
                  {item.duration && <span> · {item.duration} min</span>}
                </p>
                {item.description && (
                  <p className="aa-item-desc">
                    {item.description.length > 150
                      ? item.description.slice(0, 150) + '…'
                      : item.description}
                  </p>
                )}
                {item.rejection_reason && (
                  <div className="aa-rejection-note">
                    <strong>Reason:</strong> {item.rejection_reason}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="aa-item-actions">
                {activeTab === 'pending_review' && (
                  <>
                    <button
                      className="aa-btn aa-btn--approve"
                      onClick={() => handleApprove(item)}
                      disabled={processingId === item.id}
                    >
                      <FaCheck />
                      Approve
                    </button>
                    <button
                      className="aa-btn aa-btn--revisions"
                      onClick={() => openRejectModal(item, 'revisions')}
                      disabled={processingId === item.id}
                    >
                      <FaEdit />
                      Revisions
                    </button>
                    <button
                      className="aa-btn aa-btn--reject"
                      onClick={() => openRejectModal(item, 'reject')}
                      disabled={processingId === item.id}
                    >
                      <FaTimes />
                      Reject
                    </button>
                  </>
                )}
                {activeTab === 'approved' && (
                  <span className="aa-status-tag aa-status--approved">
                    <FaCheck /> Approved
                  </span>
                )}
                {activeTab === 'rejected' && (
                  <span className="aa-status-tag aa-status--rejected">
                    <FaTimes /> Rejected
                  </span>
                )}
                {activeTab === 'published' && (
                  <span className="aa-status-tag aa-status--published">
                    <FaFilm /> Published
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reject / Revisions Modal */}
      {rejectModal.open && (
        <div className="aa-modal-overlay" onClick={() => setRejectModal({ open: false, item: null })}>
          <div className="aa-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="aa-modal-title">
              {rejectMode === 'revisions' ? 'Request Revisions' : 'Reject Content'}
            </h3>
            <p className="aa-modal-sub">
              <strong>{rejectModal.item?.title}</strong>
              {rejectMode === 'revisions'
                ? ' — Describe what needs to be fixed before resubmission.'
                : ' — Provide a reason that will be shared with the filmmaker.'}
            </p>
            <textarea
              className="aa-modal-textarea"
              placeholder={rejectMode === 'revisions' ? 'What needs to change…' : 'Rejection reason…'}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
            <div className="aa-modal-actions">
              <button
                className="aa-modal-cancel"
                onClick={() => setRejectModal({ open: false, item: null })}
              >
                Cancel
              </button>
              <button
                className={`aa-modal-confirm ${rejectMode === 'reject' ? 'aa-modal-confirm--reject' : ''}`}
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim()}
              >
                {rejectMode === 'revisions' ? 'Send for Revisions' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApproval;
