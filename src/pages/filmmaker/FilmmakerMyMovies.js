import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMovies } from '../../context/MovieContext';
import MovieCard from '../../components/MovieCard';
import { SkeletonCard } from '../../components/Skeleton';
import './FilmmakerMyMovies.css';
import { FaEdit, FaEye } from 'react-icons/fa';

/**
 * Filmmaker — list of my uploaded movies (mock).
 * TODO: GET /filmmaker/movies
 */
function FilmmakerMyMovies() {
  const { user } = useAuth();
  const { getMovieById, loading } = useMovies();
  const myMovieIds = user?.myMovieIds || user?.myMovies || [];
  
  // Mock function to simulate approval status
  const getApprovalStatus = (movie) => {
    // In real app, this property comes from API
    if (movie.approvalStatus) return movie.approvalStatus;
    
    // Fallback logic for demo
    const idNum = parseInt(movie.id) || 0;
    if (idNum % 4 === 0) return 'DRAFT';
    if (idNum % 4 === 1) return 'PENDING';
    if (idNum % 4 === 2) return 'REJECTED';
    return 'APPROVED';
  };

  const myMovies = myMovieIds.map((id) => {
    const m = getMovieById(id);
    if (!m) return null;
    return { ...m, approvalStatus: getApprovalStatus(m) };
  }).filter(Boolean);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'DRAFT': return <span className="status-badge status-draft">Draft</span>;
      case 'PENDING': return <span className="status-badge status-pending">Pending Review</span>;
      case 'REJECTED': return <span className="status-badge status-rejected">Rejected</span>;
      case 'APPROVED': return <span className="status-badge status-approved">Approved</span>;
      default: return <span className="status-badge">Unknown</span>;
    }
  };

  return (
    <div className="filmmaker-mymovies page-container">
      <div className="page-header">
        <h1>My Movies</h1>
        <p className="subtitle">Manage your uploaded titles</p>
        <Link to="/filmmaker-studio/upload" className="btn btn-primary">Upload Movie</Link>
      </div>

      {loading ? (
        <div className="movies-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : myMovies.length === 0 ? (
        <div className="empty-state">
          <p>You haven't uploaded any movies yet.</p>
          <Link to="/filmmaker-studio/upload" className="btn btn-primary">Upload your first movie</Link>
        </div>
      ) : (
        <div className="movies-grid">
          {myMovies.map((movie) => (
            <div key={movie.id} className="movie-item-wrapper">
              <div className="movie-card-container">
                <MovieCard movie={movie} showWatchlist={false} />
                <div className="approval-overlay">
                   {getStatusBadge(movie.approvalStatus)}
                </div>
              </div>
              <div className="movie-actions-bar">
                <Link to={`/filmmaker-studio/edit/${movie.id}`} className="action-btn edit" title="Edit Metadata">
                  <FaEdit /> Edit
                </Link>
                <Link to={`/watch/${movie.id}`} className="action-btn view" title="View Public Page">
                  <FaEye /> View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FilmmakerMyMovies;
