import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FaBolt, FaCompass, FaPalette, FaBook, FaSmile,
  FaUserSecret, FaVideo, FaTheaterMasks, FaUsers,
  FaMagic, FaLandmark, FaSkull, FaStar, FaSearch,
  FaHeart, FaRocket, FaExclamationTriangle,
} from 'react-icons/fa';
import { useMovies } from '../context/MovieContext';
import { useLocale } from '../context/LocaleContext';
import CategoryRow from '../components/CategoryRow';
import { GENRE_SLUG_MAP } from '../services/mockData/genres';
import './Genre.css';

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

const GENRE_BG = {
  'Action':      'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=1200&q=60&fit=crop',
  'Adventure':   'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=60&fit=crop',
  'Animation':   'https://images.unsplash.com/photo-1533310266094-8898a03807dd?w=1200&q=60&fit=crop',
  'Biography':   'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1200&q=60&fit=crop',
  'Comedy':      'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=1200&q=60&fit=crop',
  'Crime':       'https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?w=1200&q=60&fit=crop',
  'Documentary': 'https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?w=1200&q=60&fit=crop',
  'Drama':       'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&q=60&fit=crop',
  'Family':      'https://images.unsplash.com/photo-1511895426328-dc8714191011?w=1200&q=60&fit=crop',
  'Fantasy':     'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=60&fit=crop',
  'History':     'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=1200&q=60&fit=crop',
  'Horror':      'https://images.unsplash.com/photo-1536257104079-aa99c6460a5a?w=1200&q=60&fit=crop',
  'Kids':        'https://images.unsplash.com/photo-1545996124-0501ebae84d0?w=1200&q=60&fit=crop',
  'Mystery':     'https://images.unsplash.com/photo-1580477667995-2b94f01c9516?w=1200&q=60&fit=crop',
  'Romance':     'https://images.unsplash.com/photo-1474552226712-ac0f0961a954?w=1200&q=60&fit=crop',
  'Sci-Fi':      'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&q=60&fit=crop',
  'Thriller':    'https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?w=1200&q=60&fit=crop',
};

const Genre = () => {
  const { name } = useParams();
  const { getMoviesByGenre, loading } = useMovies();
  const { t } = useLocale();

  const slug = (name || '').toLowerCase();
  const actualGenre = GENRE_SLUG_MAP[slug] || (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : '');
  const genreMovies = actualGenre ? getMoviesByGenre(actualGenre) : [];
  const Icon = GENRE_ICONS[actualGenre] || FaVideo;
  const bg = GENRE_BG[actualGenre] || '';
  const localizedName = t(`genre.${actualGenre}`) || actualGenre || 'Genre';

  return (
    <div className="genre-page">
      {/* Hero Banner */}
      {actualGenre && (
        <div
          className="genre-hero"
          style={{ backgroundImage: bg ? `url(${bg})` : 'none' }}
        >
          <div className="genre-hero-overlay" />
          <div className="genre-hero-content layout-container">
            <Link to="/genres" className="genre-back-link">← {t('navGenres')}</Link>
            <Icon className="genre-hero-icon" />
            <h1 className="genre-hero-title">{localizedName}</h1>
            {!loading && (
              <p className="genre-hero-count">
                {genreMovies.length} {genreMovies.length === 1 ? 'title' : 'titles'}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="genre-container">
        {/* Genre Results */}
        {!loading && genreMovies.length > 0 && (
          <CategoryRow
            title={`${localizedName} ${t('navMovies')}`}
            movies={genreMovies}
            isTrending={false}
            showViewAll={false}
          />
        )}
        {loading && <div className="genre-loading">Loading...</div>}
        {!loading && genreMovies.length === 0 && (
          <div className="genre-empty">
            <Icon className="genre-empty-icon" />
            <p>{t('noMoviesForGenre')} <strong>{localizedName}</strong></p>
            <Link to="/genres" className="btn btn-outline btn-small">Browse all genres</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Genre;



