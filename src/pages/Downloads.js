import React from 'react';
import { FaDownload } from 'react-icons/fa';
import MovieCard from '../components/MovieCard';
import { useMovies } from '../context/MovieContext';
import './Downloads.css';
import { useLocale } from '../context/LocaleContext';

const Downloads = () => {
  const { tx } = useLocale();
  const { downloads, getMovieById } = useMovies();

  const downloadedMovies = downloads.map(id => getMovieById(id)).filter(Boolean);

  return (
    <div className="downloads-page">
      <div className="downloads-container layout-container">
        <div className="downloads-header">
          <h1 className="downloads-title">
            <FaDownload />
            {tx('Downloads')}
          </h1>
          <p className="downloads-subtitle">
            {tx('Content you download for offline viewing will appear here.')}
          </p>
        </div>
        
        {downloadedMovies.length > 0 ? (
          <div className="media-grid">
            {downloadedMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} showWatchlist />
            ))}
          </div>
        ) : (
          <div className="empty-downloads">
            <FaDownload className="empty-downloads-icon" />
            <h3>{tx('No downloads')}</h3>
            <p>{tx('No data available. Download titles from the catalog to watch offline.')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Downloads;
