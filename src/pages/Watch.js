import React from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useMovies } from '../context/MovieContext';
import { useAuth } from '../context/AuthContext';
import { FaStar, FaCalendar, FaClock } from 'react-icons/fa';
import VideoPlayer from '../components/VideoPlayer';
import './Watch.css';

const Watch = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { getMovieById } = useMovies();
  const { user } = useAuth();

  const quality = params.get('q') || '1080p';
  const movie = getMovieById(id);

  if (!movie) {
    return (
      <div className="watch-not-found">
        <h2>Movie not found</h2>
        <button onClick={() => navigate('/')} className="btn btn-primary">Go Home</button>
      </div>
    );
  }

  const canWatch = user && (user.subscription?.active || (user.purchasedMovies?.includes?.(movie.id)));

  if (!canWatch) {
    return (
      <div className="watch-locked">
        <h2>Access Required</h2>
        <p>You need an active subscription or purchase to watch this movie.</p>
        <div className="actions">
          <Link to={`/movie/${movie.id}`} className="btn btn-outline">Back to Details</Link>
          <Link to="/subscription" className="btn btn-primary">Subscribe</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="watch-page">
      <div className="watch-container">
        <VideoPlayer movie={movie} initialQuality={quality} />
        <section className="watch-details">
          <h1 className="watch-title">{movie.title}</h1>
          <div className="watch-meta">
            <div className="meta-item rating">
              <FaStar className="icon" />
              <span>{movie.rating}</span>
            </div>
            <div className="meta-item">
              <FaCalendar className="icon" />
              <span>{movie.year}</span>
            </div>
            {movie.duration && (
              <div className="meta-item">
                <FaClock className="icon" />
                <span>{Math.floor(movie.duration / 60)}h {movie.duration % 60}m</span>
              </div>
            )}
          </div>
          {movie.genres && (
            <div className="watch-genres">
              {movie.genres.map((g, idx) => (
                <span key={idx} className="genre-tag">{g}</span>
              ))}
            </div>
          )}
          {movie.description && (
            <p className="watch-description">{movie.description}</p>
          )}
          <div className="watch-specs">
            <div className="spec"><strong>Director:</strong> {movie.director}</div>
            {Array.isArray(movie.cast) && (
              <div className="spec"><strong>Cast:</strong> {movie.cast.join(', ')}</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Watch;


