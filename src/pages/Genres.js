/**
 * Genres listing page — /genres: grid of category links to /genre/:id
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
import { GENRES } from '../services/mockData/genres';
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

  return (
    <div className="genres-page layout-container">
      <div className="genres-header">
        <h1 className="genres-title">{t('genres')}</h1>
        <p className="genres-subtitle">{t('genresSubtitle')}</p>
      </div>
      <div className="genres-grid">
        {GENRES.map((genre) => {
          const Icon = GENRE_ICONS[genre] || FaVideo;
          const label = t(`genre.${genre}`) || genre;
          return (
            <Link
              key={genre}
              to={`/genre/${genre.toLowerCase().replace(/\s+/g, '-')}`}
              className="genre-card"
            >
              <Icon className="genre-card-icon" />
              <span className="genre-card-name">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}


