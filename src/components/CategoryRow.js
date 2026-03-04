import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronLeft, FaChevronRight, FaArrowRight } from 'react-icons/fa';
import MovieCard from './MovieCard';
import './CategoryRow.css';

const CategoryRow = ({ 
  title, 
  movies = [], 
  isTrending = false, 
  viewAllLink = null,
  showViewAll = true 
}) => {
  const [canScrollLeft, setCanScrollLeft] = useState(true);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollContainerRef = useRef(null);

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = window.innerWidth > 768 ? 400 : 200;
      scrollContainerRef.current.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = window.innerWidth > 768 ? 400 : 200;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = () => {
    checkScrollButtons();
  };

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, [movies]);

  if (!movies.length) return null;

  const renderMovies = () => {
    return movies.map((movie, index) => (
      <div key={movie.id || index} className="movie-item">
        <MovieCard 
          movie={movie} 
          isTrending={isTrending}
          showWatchlist={true}
        />
      </div>
    ));
  };

  return (
    <div className={`category-row ${isTrending ? 'trending' : ''}`}>
      <div className="category-header">
        <h2 className="category-title">{title}</h2>
        {showViewAll && viewAllLink && (
          <Link to={viewAllLink} className="view-all-button">
            View All
            <FaArrowRight />
          </Link>
        )}
        <div className="category-controls">
          <button 
            className={`scroll-button ${!canScrollLeft ? 'disabled' : ''}`}
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
          >
            <FaChevronLeft />
          </button>
          <button 
            className={`scroll-button ${!canScrollRight ? 'disabled' : ''}`}
            onClick={scrollRight}
            disabled={!canScrollRight}
            aria-label="Scroll right"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      <div className="category-content">
        <div 
          className="movies-container"
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
          {renderMovies()}
        </div>
      </div>
    </div>
  );
};

export default CategoryRow;