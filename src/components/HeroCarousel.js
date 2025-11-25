import React, { useState, useEffect, useRef } from 'react';
import { FaChevronLeft, FaChevronRight, FaPlay, FaPause } from 'react-icons/fa';
import './HeroCarousel.css';

const HeroCarousel = ({ items = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef(null);

  // Auto-scroll functionality
  useEffect(() => {
    if (isPlaying && !isHovered && items.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
      }, 5000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, isHovered, items.length]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? items.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  if (!items.length) return null;

  return (
    <div 
      className="hero-carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="carousel-container">
        {/* Main Content */}
        <div className="carousel-content">
          <div 
            className="carousel-track"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {items.map((item, index) => (
              <div key={index} className="carousel-slide">
                <div className="slide-background">
                  <img src={item.backdrop} alt={item.title} />
                  <div className="slide-overlay"></div>
                </div>
                
                <div className="slide-content">
                  <div className="slide-info">
                    <h1 className="slide-title">{item.title}</h1>
                    <p className="slide-description">{item.description}</p>
                    <div className="slide-meta">
                      <span className="slide-year">{item.year}</span>
                      <span className="slide-rating">⭐ {item.rating}</span>
                      <span className="slide-duration">{item.duration}m</span>
                    </div>
                    <div className="slide-actions">
                      <button className="btn btn-primary btn-large">
                        <FaPlay />
                        Watch Now
                      </button>
                      <button className="btn btn-outline">
                        Add to Watchlist
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Arrows */}
        <button 
          className="carousel-arrow carousel-arrow-left"
          onClick={goToPrevious}
        >
          <FaChevronLeft />
        </button>
        <button 
          className="carousel-arrow carousel-arrow-right"
          onClick={goToNext}
        >
          <FaChevronRight />
        </button>

        {/* Pagination Dots */}
        <div className="carousel-pagination">
          {items.map((_, index) => (
            <button
              key={index}
              className={`pagination-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeroCarousel;
