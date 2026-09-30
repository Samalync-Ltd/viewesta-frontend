import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './Login.css';
import { useLocale } from '../context/LocaleContext';

const Login = () => {
  const { tx } = useLocale();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  // Set by ProtectedRoute when a guest opens a page that needs an account.
  const from = useLocation().state?.from;
  const returnTo = from?.pathname && from.pathname !== '/login'
    ? `${from.pathname}${from.search || ''}`
    : null;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // The error describes the last attempt; drop it once the viewer edits a field.
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        const isFilmmaker = (result.user?.role || result.user?.user_type || '').toLowerCase() === 'filmmaker';
        navigate(returnTo || (isFilmmaker ? '/filmmaker-studio' : '/'), { replace: Boolean(returnTo) });
      } else {
        setError(result.error || tx('Login failed'));
      }
    } catch (err) {
      setError(tx('Something went wrong'));
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-brand-content">
          <h1 className="login-brand-title">Viewesta</h1>
          <p className="login-brand-tagline">
            {tx('African cinema on demand. Stream the best of Nollywood and beyond — subscribe or pay per view.')}
          </p>
        </div>
      </div>

      <div className="login-form-section">
        <div className="login-form-wrap">
          <div className="login-header">
            <h1 className="login-title">{tx('Welcome back')}</h1>
            <p className="login-subtitle">{tx('Sign in to your account to continue')}</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">{tx('Email')}</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">{tx('Password')}</label>
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={tx(showPassword ? 'Hide password' : 'Show password')}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>{tx('Remember me')}</span>
              </label>
              <Link to="/forgot-password" className="forgot-link">{tx('Forgot password?')}</Link>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading" aria-hidden />
                  {tx('Signing in...')}
                </>
              ) : (
                tx('Sign in')
              )}
            </button>
          </form>


          <div className="login-footer">
            <p>
              {tx("Don't have an account?")}{' '}
              <Link to="/register" className="link">{tx('Sign up')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
