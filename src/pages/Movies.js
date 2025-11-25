import React, { useMemo, useCallback } from 'react';
import { FaFilm } from 'react-icons/fa';
import CategoryRow from '../components/CategoryRow';
import { useMovies } from '../context/MovieContext';
import './Movies.css';

const normalizeType = (item) => (item?.type || '').toLowerCase();

const Movies = () => {
  const { movies, featuredMovies, trendingMovies, loading, error, refreshCatalog } = useMovies();

  const movieOnly = useMemo(
    () => movies.filter((movie) => normalizeType(movie) !== 'series'),
    [movies]
  );

  const featured = useMemo(
    () => featuredMovies.filter((movie) => normalizeType(movie) !== 'series').slice(0, 12),
    [featuredMovies]
  );

  const recentlyAdded = useMemo(() => {
    return [...movieOnly]
      .sort((a, b) => {
        const aDate = new Date(a.raw?.release_date || `${a.year || '1970'}-01-01`).getTime();
        const bDate = new Date(b.raw?.release_date || `${b.year || '1970'}-01-01`).getTime();
        return bDate - aDate;
      })
      .slice(0, 12);
  }, [movieOnly]);

  const trendingMoviesOnly = useMemo(
    () => trendingMovies.filter((movie) => normalizeType(movie) !== 'series').slice(0, 12),
    [trendingMovies]
  );

  const filterByGenres = useCallback(
    (genres) => {
      const normalized = genres.map((g) => g.toLowerCase());
      return movieOnly
        .filter((movie) =>
          movie.genres?.some((genre) => normalized.includes(genre.toLowerCase()))
        )
        .slice(0, 12);
    },
    [movieOnly]
  );

  const actionAdventure = useMemo(
    () => filterByGenres(['Action', 'Adventure', 'Thriller']),
    [filterByGenres]
  );
  const sciFi = useMemo(() => filterByGenres(['Sci-Fi', 'Science Fiction', 'Fantasy']), [filterByGenres]);
  const drama = useMemo(() => filterByGenres(['Drama', 'Biography', 'History']), [filterByGenres]);
  const comedyFamily = useMemo(
    () => filterByGenres(['Comedy', 'Family', 'Animation', 'Kids']),
    [filterByGenres]
  );

  if (loading && !movies.length) {
    return (
      <div className="movies-page loading-state">
        <div className="loading" />
        <p>Loading movies...</p>
      </div>
    );
  }

  if (error && !movies.length) {
    return (
      <div className="movies-page error-state">
        <p>{error}</p>
        <button className="btn btn-primary" onClick={refreshCatalog}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="movies-page">
      <div className="movies-container">
        <div className="movies-header">
          <h1 className="movies-title">
            <FaFilm />
            Movies
          </h1>
          <p className="movies-subtitle">
            Discover the latest blockbusters, timeless classics, and hidden gems
          </p>
        </div>

        {error && movies.length > 0 && (
          <div className="movies-inline-error">
            <span>{error}</span>
            <button className="btn btn-ghost btn-small" onClick={refreshCatalog}>
              Retry
            </button>
          </div>
        )}

        <CategoryRow
          title="Recently Added"
          movies={recentlyAdded}
          viewAllLink="/movies"
          showViewAll={true}
        />

        <CategoryRow
          title="Trending Now"
          movies={trendingMoviesOnly}
          isTrending
          viewAllLink="/movies"
          showViewAll={true}
        />

        <CategoryRow
          title="Featured Movies"
          movies={featured}
          viewAllLink="/movies"
          showViewAll={true}
        />

        <CategoryRow
          title="Action & Adventure"
          movies={actionAdventure}
          viewAllLink="/genre/action"
          showViewAll={true}
        />

        <CategoryRow
          title="Science Fiction"
          movies={sciFi}
          viewAllLink="/genre/sci-fi"
          showViewAll={true}
        />

        <CategoryRow
          title="Award-Winning Drama"
          movies={drama}
          viewAllLink="/genre/drama"
          showViewAll={true}
        />

        <CategoryRow
          title="Comedy & Family"
          movies={comedyFamily}
          viewAllLink="/genre/comedy"
          showViewAll={true}
        />
      </div>
    </div>
  );
};

export default Movies;
