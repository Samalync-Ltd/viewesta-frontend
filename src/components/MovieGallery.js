import React, { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaChevronLeft, FaChevronRight, FaExpand, FaImages } from 'react-icons/fa';
import './MovieGallery.css';

/**
 * MovieGallery — responsive image gallery grid with full-screen lightbox.
 * Accepts an `images` array of { url, caption } objects.
 * Falls back to generating a gallery from movie poster + cover if no gallery prop.
 *
 * @param {{ images: Array<{url: string, caption?: string}>, title: string }} props
 */
const MovieGallery = ({ images = [], title = '' }) => {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [loaded, setLoaded] = useState({});

  const isOpen = lightboxIndex !== null;

  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const prev = useCallback(() => {
    setLightboxIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const next = useCallback(() => {
    setLightboxIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, prev, next]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!images || images.length === 0) return null;

  const handleImgLoad = (index) => setLoaded((prev) => ({ ...prev, [index]: true }));

  return (
    <section className="movie-gallery">
      <div className="movie-gallery__header">
        <FaImages className="movie-gallery__icon" />
        <h3 className="movie-gallery__title">Gallery</h3>
        <span className="movie-gallery__count">{images.length} photos</span>
      </div>

      <div className="movie-gallery__grid">
        {images.map((img, index) => (
          <button
            key={index}
            className={`gallery-thumb ${index === 0 ? 'gallery-thumb--featured' : ''}`}
            onClick={() => openLightbox(index)}
            aria-label={img.caption || `View photo ${index + 1}`}
          >
            <div className={`gallery-thumb__skeleton ${loaded[index] ? 'loaded' : ''}`} />
            <img
              src={img.url}
              alt={img.caption || `${title} photo ${index + 1}`}
              loading="lazy"
              onLoad={() => handleImgLoad(index)}
              className={`gallery-thumb__img ${loaded[index] ? 'loaded' : ''}`}
            />
            <div className="gallery-thumb__overlay">
              <FaExpand />
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {isOpen && (
        <div
          className="gallery-lightbox"
          onClick={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
        >
          <button className="lightbox__close" onClick={closeLightbox} aria-label="Close">
            <FaTimes />
          </button>

          <button
            className="lightbox__nav lightbox__nav--prev"
            onClick={prev}
            aria-label="Previous photo"
            disabled={images.length <= 1}
          >
            <FaChevronLeft />
          </button>

          <div className="lightbox__stage">
            <img
              key={lightboxIndex}
              src={images[lightboxIndex]?.url}
              alt={images[lightboxIndex]?.caption || `${title} photo`}
              className="lightbox__img"
            />
            {images[lightboxIndex]?.caption && (
              <p className="lightbox__caption">{images[lightboxIndex].caption}</p>
            )}
          </div>

          <button
            className="lightbox__nav lightbox__nav--next"
            onClick={next}
            aria-label="Next photo"
            disabled={images.length <= 1}
          >
            <FaChevronRight />
          </button>

          <div className="lightbox__counter">
            {lightboxIndex + 1} / {images.length}
          </div>

          {/* Filmstrip thumbnails */}
          <div className="lightbox__filmstrip">
            {images.map((img, i) => (
              <button
                key={i}
                className={`filmstrip__thumb ${i === lightboxIndex ? 'active' : ''}`}
                onClick={() => setLightboxIndex(i)}
                aria-label={`Go to photo ${i + 1}`}
              >
                <img src={img.url} alt="" />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default MovieGallery;
