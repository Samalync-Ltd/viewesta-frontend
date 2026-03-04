import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useMovies } from '../context/MovieContext';
import MovieCard from '../components/MovieCard';
import { FaHeart } from 'react-icons/fa';
import './Watchlist.css';

const Watchlist = () => {
  const { user } = useAuth();
  const { movies, watchlist } = useMovies();

  if (!user) {
    return (
      <div className="watchlist-not-found">
        <h2>Please log in to view your watchlist</h2>
      </div>
    );
  }

  const watchlistMovies = watchlist
    .map((id) => movies.find((m) => String(m.id) === String(id)))
    .filter(Boolean);

  return (
    <div className="watchlist-page">
      <div className="watchlist-container layout-container">
        <div className="watchlist-header">
          <h1 className="watchlist-title">
            <FaHeart />
            My Watchlist
          </h1>
          <p className="watchlist-subtitle">
            {watchlistMovies.length} movie{watchlistMovies.length !== 1 ? 's' : ''} saved
          </p>
        </div>

        {watchlistMovies.length > 0 ? (
          <div className="watchlist-grid">
            {watchlistMovies.map(movie => (
              <MovieCard key={movie.id} movie={movie} showWatchlist={false} />
            ))}
          </div>
        ) : (
          <div className="empty-watchlist">
            <FaHeart className="empty-icon" />
            <h3>Your watchlist is empty</h3>
            <p>Start adding movies to your watchlist to see them here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Watchlist;
