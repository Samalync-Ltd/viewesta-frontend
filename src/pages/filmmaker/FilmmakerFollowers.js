import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FaArrowLeft } from 'react-icons/fa';
import './FilmmakerFollowers.css';

/**
 * Filmmaker — followers list (mock).
 * TODO: GET /filmmaker/followers
 */
const MOCK_FOLLOWERS = [
  { id: '1', name: 'Amina O.', avatar: null },
  { id: '2', name: 'Chidi N.', avatar: null },
  { id: '3', name: 'Folake M.', avatar: null },
];

function FilmmakerFollowers() {
  const { user } = useAuth();
  const count = user?.followersCount ?? MOCK_FOLLOWERS.length;

  return (
    <div className="filmmaker-followers page-container">
      <div className="page-header">
        <Link to="/filmmaker-studio" className="back-link"><FaArrowLeft /> Dashboard</Link>
        <h1>Followers</h1>
        <p className="subtitle">{count} people follow your work (mock list)</p>
      </div>

      <div className="followers-list">
        {MOCK_FOLLOWERS.map((f) => (
          <div key={f.id} className="follower-item">
            <div className="follower-avatar">
              {f.avatar ? <img src={f.avatar} alt="" /> : <span>{f.name.charAt(0)}</span>}
            </div>
            <span className="follower-name">{f.name}</span>
          </div>
        ))}
      </div>
      <p className="followers-note">Full follower list will load from API when connected.</p>
    </div>
  );
}

export default FilmmakerFollowers;
