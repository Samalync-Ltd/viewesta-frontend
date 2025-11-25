import React from 'react';
import { useParams } from 'react-router-dom';
import { useMovies } from '../context/MovieContext';
import CategoryRow from '../components/CategoryRow';
import './Genre.css';

const Genre = () => {
  const { name } = useParams();
  const { getMoviesByGenre, loading } = useMovies();

  // Map URL parameter to actual genre names
  const genreMap = {
    'action': 'Action',
    'sci-fi': 'Sci-Fi',
    'animation': 'Animation',
    'drama': 'Drama',
    'comedy': 'Comedy',
    'crime': 'Crime',
    'fantasy': 'Fantasy',
    'horror': 'Horror',
    'mystery': 'Mystery',
    'romance': 'Romance',
    'thriller': 'Thriller'
  };
  
  const actualGenre = genreMap[name] || name;
  const title = actualGenre ? actualGenre : 'Genre';
  const genreMovies = actualGenre ? getMoviesByGenre(actualGenre) : [];

  return (
    <div className="genre-page">
      <div className="genre-container">
        {/* Genre Results */}
        {!loading && genreMovies.length > 0 && (
          <CategoryRow 
            title={`${title} Movies`}
            movies={genreMovies}
            isTrending={false}
            showViewAll={false}
          />
        )}
        {loading && <div className="genre-loading">Loading...</div>}
        {!loading && genreMovies.length === 0 && (
          <div className="no-results">No movies found for {title}</div>
        )}
      </div>
    </div>
  );
};

export default Genre;


