import React from 'react';
import './Skeleton.css';

/**
 * Skeleton loader for cards and text. Use for loading states.
 */
export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-poster" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-meta" />
    </div>
  );
}

export function SkeletonText({ lines = 2 }) {
  return (
    <div className="skeleton-text" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton skeleton-line" style={{ width: i === lines - 1 && lines > 1 ? '70%' : '100%' }} />
      ))}
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="skeleton-hero" aria-hidden="true">
      <div className="skeleton skeleton-backdrop" />
      <div className="skeleton-hero-content">
        <div className="skeleton skeleton-hero-poster" />
        <div className="skeleton-hero-info">
          <div className="skeleton skeleton-hero-title" />
          <div className="skeleton skeleton-hero-meta" />
          <div className="skeleton skeleton-hero-desc" />
        </div>
      </div>
    </div>
  );
}

export default SkeletonCard;
