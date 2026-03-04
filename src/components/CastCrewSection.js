import React, { useState } from 'react';
import './CastCrewSection.css';

/**
 * CastCrewSection — horizontally scrollable premium cast rail.
 * Shows circular avatar (photo or initials), name, character & role.
 *
 * @param {{ castCrew: Array }} props
 */
const CastCrewSection = ({ castCrew = [] }) => {
  const [photoErrors, setPhotoErrors] = useState({});

  if (!castCrew || castCrew.length === 0) return null;

  const handlePhotoError = (id) => {
    setPhotoErrors((prev) => ({ ...prev, [id]: true }));
  };

  /** Generate up-to-2-letter initials from a name */
  const getInitials = (name = '') => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <section className="cast-section">
      <h3 className="cast-section__title">Cast &amp; Crew</h3>
      <div className="cast-rail-wrapper">
        <div className="cast-rail">
          {castCrew.map((member, index) => {
            const memberId = member.id || `member-${index}`;
            const hasPhoto = member.photo && !photoErrors[memberId];

            return (
              <div key={memberId} className="cast-card">
                <div className="cast-card__avatar">
                  {hasPhoto ? (
                    <img
                      src={member.photo}
                      alt={member.name}
                      loading="lazy"
                      className="cast-card__img"
                      onError={() => handlePhotoError(memberId)}
                    />
                  ) : (
                    <span className="cast-card__initials">{getInitials(member.name)}</span>
                  )}
                  <div className="cast-card__avatar-ring" />
                </div>
                <div className="cast-card__info">
                  <span className="cast-card__name">{member.name}</span>
                  {member.character && (
                    <span className="cast-card__character">{member.character}</span>
                  )}
                  <span className="cast-card__role">{member.role}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="cast-rail__fade cast-rail__fade--left" />
        <div className="cast-rail__fade cast-rail__fade--right" />
      </div>
    </section>
  );
};

export default CastCrewSection;
