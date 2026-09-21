/**
 * Genres listing page — /genres: grid of category links to /genre/:slug.
 * The list comes from GET /categories, so it always matches what the backend
 * actually offers.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaBolt, FaCompass, FaPalette, FaBook, FaSmile,
  FaUserSecret, FaVideo, FaTheaterMasks, FaUsers,
  FaMagic, FaLandmark, FaSkull, FaStar, FaSearch,
  FaHeart, FaRocket, FaExclamationTriangle,
} from 'react-icons/fa';
import { useLocale } from '../context/LocaleContext';
import useCategories from '../hooks/useCategories';
import { genreLabel } from '../utils/genreHelpers';
import '../components/Skeleton.css';
import './Genres.css';

const GENRE_ICONS = {
  'Action':      FaBolt,
  'Adventure':   FaCompass,
  'Animation':   FaPalette,
  'Biography':   FaBook,
  'Comedy':      FaSmile,
  'Crime':       FaUserSecret,
  'Documentary': FaVideo,
  'Drama':       FaTheaterMasks,
  'Family':      FaUsers,
  'Fantasy':     FaMagic,
  'History':     FaLandmark,
  'Horror':      FaSkull,
  'Kids':        FaStar,
  'Mystery':     FaSearch,
  'Romance':     FaHeart,
  'Sci-Fi':      FaRocket,
  'Thriller':    FaExclamationTriangle,
};

export default function Genres() {
  const { t } = useLocale();
  const { categories, loading, error, reload } = useCategories();

  return (
    <div className="genres-page layout-container">
      <div className="genres-header">
        <h1 className="genres-title">{t('genres')}</h1>
        <p className="genres-subtitle">{t('genresSubtitle')}</p>
      </div>

      {loading ? (
        <div className="genres-grid" aria-busy="true">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="genre-card genre-card--skeleton skeleton" aria-hidden="true" />
          ))}
        </div>
      ) : error ? (
        <div className="genres-state">
          <p>Unable to load genres right now.</p>
          <button type="button" className="btn btn-outline btn-small" onClick={reload}>Try again</button>
        </div>
      ) : categories.length === 0 ? (
        <div className="genres-state">
          <p>No genres are available yet.</p>
        </div>
      ) : (
        <div className="genres-grid">
          {categories.map((category) => {
            const Icon = GENRE_ICONS[category.name] || FaVideo;
            return (
              <Link
                key={category.id || category.slug}
                to={`/genre/${category.slug}`}
                className="genre-card"
              >
                <Icon className="genre-card-icon" />
                <span className="genre-card-name">{genreLabel(t, category.name)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
