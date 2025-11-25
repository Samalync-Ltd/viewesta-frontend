import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMovies } from '../context/MovieContext';
import MovieCard from '../components/MovieCard';
import './Search.css';

const Search = () => {
  const { searchMovies, loading } = useMovies();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');

  useEffect(() => {
    setQuery(params.get('q') || '');
  }, [params]);

  const results = useMemo(() => {
    if (!query) return [];
    return searchMovies(query);
  }, [query, searchMovies]);

  return (
    <div className="search-page">
      <h1 className="search-title">Search</h1>
      <div className="search-input-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies and series"
          aria-label="Search movies and series"
          className="search-input-control"
        />
      </div>
      {loading && <div className="search-loading">Loading...</div>}
      {!loading && (
        <div className="search-results-grid">
          {results.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
          {!results.length && query && (
            <div className="no-results">No results for "{query}"</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;


