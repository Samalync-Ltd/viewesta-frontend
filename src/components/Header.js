import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaSearch, FaUser, FaHeart, FaBars, FaTimes, FaChevronDown, FaTv } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenresOpen, setIsGenresOpen] = useState(false);
  const [isMobileGenresOpen, setIsMobileGenresOpen] = useState(false);
  const [isMobileCountryOpen, setIsMobileCountryOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const location = useLocation();
  const isWatchPage = location.pathname.startsWith('/watch/');
  const [isVisible, setIsVisible] = useState(!isWatchPage);
  const [autoHideEnabled, setAutoHideEnabled] = useState(isWatchPage);
  const lastScrollY = useRef(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Keep header visible on initial load except for watch page where we start minimised
    if (isWatchPage) {
      setIsVisible(false);
      setAutoHideEnabled(true);
    } else {
      setIsVisible(true);
      setAutoHideEnabled(false);
    }
    lastScrollY.current = window.scrollY;
  }, [isWatchPage]);
  
  useEffect(() => {
    const activationOffset = 80;
    const scrollDelta = 6;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY - lastScrollY.current > scrollDelta;
      const scrollingUp = lastScrollY.current - currentScrollY > scrollDelta;

      if (!autoHideEnabled && currentScrollY > activationOffset) {
        setAutoHideEnabled(true);
      }

      if (scrollingUp || currentScrollY <= activationOffset) {
        setIsVisible(true);
      } else if (autoHideEnabled && scrollingDown) {
        setIsVisible(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [autoHideEnabled]);

  const genres = [
    'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama', 
    'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller'
  ];

  const countries = [
    'United States', 'United Kingdom', 'Canada', 'Australia', 'India',
    'France', 'Germany', 'Japan', 'South Korea', 'Brazil', 'Mexico', 'Spain'
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    // Close mobile menu when opening/closing
    if (isMenuOpen) {
      setIsMobileGenresOpen(false);
      setIsMobileCountryOpen(false);
    }
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen && !event.target.closest('.mobile-menu-drawer') && !event.target.closest('.mobile-menu-button')) {
        setIsMenuOpen(false);
        setIsMobileGenresOpen(false);
        setIsMobileCountryOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const toggleMobileSearch = () => {
    setIsMobileSearchOpen(!isMobileSearchOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className={`header ${isVisible ? '' : 'header-hidden'}`} role="navigation" aria-label="Primary navigation">
      <div className="header-container">
        {/* Logo */}
        <Link to="/" className="logo">
          <span className="logo-text">Viewesta</span>
        </Link>

        {/* Search Bar */}
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button">
              <FaSearch />
            </button>
          </div>
        </form>

        {/* Navigation */}
        <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
          <Link to="/" className={`nav-link ${window.location.pathname === '/' ? 'active' : ''}`}>Home</Link>
          <Link to="/movies" className={`nav-link ${window.location.pathname.startsWith('/movies') ? 'active' : ''}`}>Movies</Link>
          <Link to="/series" className={`nav-link ${window.location.pathname.startsWith('/series') ? 'active' : ''}`}>
            <FaTv />
            <span>Series</span>
          </Link>
          
          {/* Genres Dropdown */}
          <div className="genres-dropdown">
            <button 
              className="nav-link genres-button"
              onClick={() => setIsGenresOpen(!isGenresOpen)}
              onBlur={() => setTimeout(() => setIsGenresOpen(false), 150)}
            >
              <span>Genres</span>
              <FaChevronDown className={`chevron ${isGenresOpen ? 'open' : ''}`} />
            </button>
            {isGenresOpen && (
              <div className="genres-menu" onMouseLeave={() => setIsGenresOpen(false)}>
                {genres.map(genre => (
                  <Link 
                    key={genre} 
                    to={`/genre/${genre.toLowerCase()}`} 
                    className="genre-link"
                    onClick={() => setIsGenresOpen(false)}
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          {user ? (
            <>
              <Link to="/watchlist" className={`nav-link ${window.location.pathname.startsWith('/watchlist') ? 'active' : ''}`}>
                <FaHeart />
                <span>Watchlist</span>
              </Link>
              <div className="user-menu">
                <button className="user-button">
                  <FaUser />
                  <span className="user-name">{user.name}</span>
                </button>
                <div className="user-dropdown">
                  <Link to="/profile" className={`dropdown-link ${window.location.pathname.startsWith('/profile') ? 'active' : ''}`}>Profile</Link>
                  <Link to="/subscription" className="dropdown-link">Subscription</Link>
                  <Link to="/wallet" className="dropdown-link">Wallet</Link>
                  <button onClick={handleLogout} className="dropdown-link">Logout</button>
                </div>
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-ghost">Login</Link>
              <Link to="/register" className="btn btn-primary">Sign Up</Link>
            </div>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button className="mobile-menu-button" onClick={toggleMenu} aria-label="Toggle menu">
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Mobile Search Icon */}
        <button className="mobile-search-button" onClick={toggleMobileSearch} aria-label="Search">
          <FaSearch />
        </button>
      </div>

      {/* Mobile Search Bar */}
      {isMobileSearchOpen && (
        <div className="mobile-search-container">
          <form className="mobile-search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mobile-search-input"
              autoFocus
            />
            <button type="submit" className="mobile-search-submit">
              <FaSearch />
            </button>
          </form>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu-overlay ${isMenuOpen ? 'open' : ''}`} onClick={toggleMenu}></div>

      {/* Mobile Menu Drawer */}
      <div className={`mobile-menu-drawer ${isMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <h3>Menu</h3>
          <button className="mobile-menu-close" onClick={toggleMenu} aria-label="Close menu">
            <FaTimes />
          </button>
        </div>
        
        <nav className="mobile-menu-nav">
          <Link to="/" className="mobile-menu-link" onClick={toggleMenu}>Home</Link>
          <Link to="/movies" className="mobile-menu-link" onClick={toggleMenu}>Movies</Link>
          <Link to="/series" className="mobile-menu-link" onClick={toggleMenu}>Series</Link>
          
          {/* Mobile Genres Dropdown */}
          <div className="mobile-menu-dropdown">
            <button 
              className="mobile-menu-link mobile-menu-dropdown-toggle"
              onClick={() => setIsMobileGenresOpen(!isMobileGenresOpen)}
            >
              <span>Genre</span>
              <FaChevronDown className={`mobile-chevron ${isMobileGenresOpen ? 'open' : ''}`} />
            </button>
            {isMobileGenresOpen && (
              <div className="mobile-menu-dropdown-content">
                <div className="mobile-genres-grid">
                  {genres.map(genre => (
                    <Link 
                      key={genre} 
                      to={`/genre/${genre.toLowerCase()}`} 
                      className="mobile-genre-link"
                      onClick={toggleMenu}
                    >
                      {genre}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Country Dropdown */}
          <div className="mobile-menu-dropdown">
            <button 
              className="mobile-menu-link mobile-menu-dropdown-toggle"
              onClick={() => setIsMobileCountryOpen(!isMobileCountryOpen)}
            >
              <span>Country</span>
              <FaChevronDown className={`mobile-chevron ${isMobileCountryOpen ? 'open' : ''}`} />
            </button>
            {isMobileCountryOpen && (
              <div className="mobile-menu-dropdown-content">
                <div className="mobile-country-list">
                  {countries.map(country => (
                    <Link 
                      key={country} 
                      to={`/search?country=${encodeURIComponent(country.toLowerCase())}`} 
                      className="mobile-country-link"
                      onClick={toggleMenu}
                    >
                      {country}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {user ? (
            <>
              <Link to="/watchlist" className="mobile-menu-link" onClick={toggleMenu}>
                Watchlist
              </Link>
              <Link to="/profile" className="mobile-menu-link" onClick={toggleMenu}>Profile</Link>
              <Link to="/subscription" className="mobile-menu-link" onClick={toggleMenu}>Subscription</Link>
              <Link to="/wallet" className="mobile-menu-link" onClick={toggleMenu}>Wallet</Link>
              <button onClick={() => { handleLogout(); toggleMenu(); }} className="mobile-menu-link mobile-menu-button-link">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="mobile-menu-link" onClick={toggleMenu}>Login</Link>
              <Link to="/register" className="mobile-menu-link" onClick={toggleMenu}>Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
