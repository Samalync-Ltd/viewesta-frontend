import React from 'react';
import { AGE_RATINGS } from '../types';
import './AgeRatingBadge.css';

/**
 * AgeRatingBadge — displays a colored age-rating label on movie cards and detail pages.
 *
 * @param {{ rating: string, size?: 'sm'|'md'|'lg', showTooltip?: boolean }} props
 */
const AgeRatingBadge = ({ rating, size = 'sm', showTooltip = false }) => {
  if (!rating) return null;

  const config = AGE_RATINGS[rating] || {
    label: rating,
    color: '#6b7280',
    description: rating,
  };

  return (
    <span
      className={`age-rating-badge age-rating-badge--${size}`}
      style={{ '--badge-color': config.color }}
      title={showTooltip ? config.description : undefined}
      aria-label={`Age rating: ${config.description}`}
    >
      {config.label}
    </span>
  );
};

export default AgeRatingBadge;
