import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaFacebook, FaInstagram,
  FaFilm, FaHome, FaList, FaHeart, FaWallet,
  FaEnvelope, FaQuestionCircle, FaShieldAlt, FaFileAlt,
} from 'react-icons/fa';
import { SiTiktok } from 'react-icons/si';
import { useLocale } from '../context/LocaleContext';
import './Footer.css';

const Footer = () => {
  const { t } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          {/* Brand */}
          <div className="footer-section footer-brand">
            <div className="footer-logo-wrap">
              <img src="/viewesta.png" alt="Viewesta" className="footer-logo-img" />
            </div>
            <p className="footer-description">{t('footerDesc')}</p>
            <div className="social-links">
              <a href="https://facebook.com" className="social-link" aria-label="Facebook" target="_blank" rel="noreferrer">
                <FaFacebook />
              </a>
              <a href="https://instagram.com" className="social-link" aria-label="Instagram" target="_blank" rel="noreferrer">
                <FaInstagram />
              </a>
              <a href="https://tiktok.com" className="social-link" aria-label="TikTok" target="_blank" rel="noreferrer">
                <SiTiktok />
              </a>
            </div>
          </div>

          {/* Browse */}
          <div className="footer-section">
            <h4 className="footer-title">{t('footerBrowse')}</h4>
            <ul className="footer-links">
              <li><Link to="/"><FaHome className="footer-link-icon" />{t('navHome')}</Link></li>
              <li><Link to="/watch"><FaFilm className="footer-link-icon" />{t('navMovies')}</Link></li>
              <li><Link to="/series"><FaList className="footer-link-icon" />{t('navShows')}</Link></li>
              <li><Link to="/genres"><FaList className="footer-link-icon" />{t('navGenres')}</Link></li>
              <li><Link to="/watchlist"><FaHeart className="footer-link-icon" />{t('navWishlist')}</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div className="footer-section">
            <h4 className="footer-title">{t('footerAccount')}</h4>
            <ul className="footer-links">
              <li><Link to="/profile"><FaFilm className="footer-link-icon" />{t('profile')}</Link></li>
              <li><Link to="/subscription"><FaFileAlt className="footer-link-icon" />{t('subscriptions')}</Link></li>
              <li><Link to="/wallet"><FaWallet className="footer-link-icon" />{t('wallet')}</Link></li>
              <li><Link to="/downloads"><FaList className="footer-link-icon" />{t('navDownloads')}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div className="footer-section">
            <h4 className="footer-title">{t('footerSupport')}</h4>
            <ul className="footer-links">
              <li><Link to="/help"><FaQuestionCircle className="footer-link-icon" />{t('helpCenter')}</Link></li>
              <li><Link to="/contact"><FaEnvelope className="footer-link-icon" />{t('contactUs')}</Link></li>
              <li><span className="footer-plain-item"><FaFileAlt className="footer-link-icon" />{t('footerTerms')}</span></li>
              <li><span className="footer-plain-item"><FaShieldAlt className="footer-link-icon" />{t('footerPrivacy')}</span></li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <p className="copyright">{t('footerCopyright').replace('{{year}}', year)}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
