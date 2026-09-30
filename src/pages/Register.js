import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { generateUsername } from '../utils/usernameUtils';
import './Register.css';
import { useLocale } from '../context/LocaleContext';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// here I added the firsname and lastname instead of name to be applicable with the backend
const Register = () => {
  const { tx } = useLocale();
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    confirmPassword: '',
    user_type: 'viewer',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false, confirmPassword: false });

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // The banner describes the last submit; drop it once the viewer edits a field.
    if (error) setError('');
  };

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  // Live, per-field validation state so the UI can point at the exact problem
  // instead of relying on the single submit-time banner below.
  const emailInvalid = formData.email.length > 0 && !EMAIL_REGEX.test(formData.email);
  const passwordTooShort = formData.password.length > 0 && formData.password.length < MIN_PASSWORD_LENGTH;
  const passwordsMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true, confirmPassword: true });
    setError('');

    if (!EMAIL_REGEX.test(formData.email)) {
      setError(tx('Please enter a valid email address'));
      return;
    }

    // Password length must be checked before the confirm-password match check —
    // otherwise a short password with an empty/different confirm field always
    // reports "Passwords do not match" and hides the real problem.
    if (formData.password.length < MIN_PASSWORD_LENGTH) {
      setError(tx('Password is too short — use at least {{n}} characters', { n: MIN_PASSWORD_LENGTH }));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(tx('Passwords do not match'));
      return;
    }

    setLoading(true);

    try {
      // Automatically generate a unique username from the email
      const generatedUsername = generateUsername(formData.email);
      console.log('Registering with generated username:', generatedUsername);

      // FIX: send correct backend payload including username
      const result = await register({
        first_name: formData.firstname,
        last_name: formData.lastname,
        email: formData.email,
        username: generatedUsername,
        password: formData.password,
        user_type: formData.user_type || 'viewer',
      });

      if (result.success) {
        const isFilmmaker =
          (result.user?.role || result.user?.user_type || '').toLowerCase() === 'filmmaker';

        navigate(isFilmmaker ? '/filmmaker-studio' : '/');
      } else {
        console.error('Registration failed:', result.error);
        setError(result.error || tx('Registration failed'));
      }
    } catch (err) {
      setError(tx('Something went wrong'));
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="register-page">
      <div className="register-brand">
        <div className="register-brand-content">
          <h1 className="register-brand-title">Viewesta</h1>
          <p className="register-brand-tagline">
            {tx('African cinema on demand. Join as a viewer or filmmaker — stream, subscribe, or upload.')}
          </p>
        </div>
      </div>

      <div className="register-form-section">
        <div className="register-form-wrap">
          <div className="register-header">
            <h1 className="register-title">{tx('Create account')}</h1>
            <p className="register-subtitle">{tx('Sign up to start streaming or uploading')}</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-group">
              <div className='name-input'>
                <div>
                  <label htmlFor='firstname' className='form-label'>{tx('First name')}</label>
                  <input
                    type="text"
                    id="firstname"
                    name="firstname"
                    value={formData.firstname}
                    onChange={handleChange}
                    className="form-input"
                    placeholder={tx('Your first name')}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="lastname" className="form-label">{tx('Last name')}</label>
                  <input
                    type="text"
                    id="lastname"
                    name="lastname"
                    value={formData.lastname}
                    onChange={handleChange}
                    className="form-input"
                    placeholder={tx('Your last name')}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">{tx('Email')}</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-input ${touched.email && emailInvalid ? 'input-invalid' : ''}`}
                placeholder="you@example.com"
                aria-invalid={touched.email && emailInvalid}
                aria-describedby="email-hint"
                required
              />
              {/* Always rendered so the hint appearing on blur doesn't shift the form
                  (that moved the Create account button away mid-click). */}
              <p
                id="email-hint"
                className={`field-hint ${touched.email && formData.email.length > 0 ? (emailInvalid ? 'field-hint--error' : 'field-hint--ok') : ''}`}
              >
                {touched.email && formData.email.length > 0 && (emailInvalid ? (
                  <><FaExclamationCircle /> {tx('Enter a valid email address (e.g. you@example.com)')}</>
                ) : (
                  <><FaCheckCircle /> {tx('Looks good')}</>
                ))}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">{tx('I am a')}</label>
              <div className="role-options">
                <label className="role-option">
                  <input
                    type="radio"
                    name="user_type"
                    value="viewer"
                    checked={formData.user_type === 'viewer'}
                    onChange={handleChange}
                  />
                  <span>{tx('Viewer')}</span>
                </label>
                <label className="role-option">
                  <input
                    type="radio"
                    name="user_type"
                    value="filmmaker"
                    checked={formData.user_type === 'filmmaker'}
                    onChange={handleChange}
                  />
                  <span>{tx('Filmmaker')}</span>
                </label>
              </div>

              <p className="form-hint">
                {tx('Viewers watch and subscribe. Filmmakers upload and earn.')}
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">{tx('Password')}</label>
              <div className={`password-input ${touched.password && passwordTooShort ? 'input-invalid' : ''}`}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="form-input"
                  placeholder="••••••••"
                  minLength={MIN_PASSWORD_LENGTH}
                  aria-invalid={touched.password && passwordTooShort}
                  aria-describedby="password-hint"
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
              <p
                id="password-hint"
                className={`field-hint ${touched.password && passwordTooShort ? 'field-hint--error' : ''} ${formData.password.length >= MIN_PASSWORD_LENGTH ? 'field-hint--ok' : ''}`}
              >
                {formData.password.length >= MIN_PASSWORD_LENGTH ? (
                  <><FaCheckCircle /> {tx('Meets the minimum length')}</>
                ) : touched.password ? (
                  <><FaExclamationCircle /> {tx('Use at least {{n}} characters ({{count}}/{{n}})', { n: MIN_PASSWORD_LENGTH, count: formData.password.length })}</>
                ) : (
                  tx('At least {{n}} characters', { n: MIN_PASSWORD_LENGTH })
                )}
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">{tx('Confirm password')}</label>
              <div className={`password-input ${touched.confirmPassword && passwordsMismatch ? 'input-invalid' : ''}`}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="form-input"
                  placeholder="••••••••"
                  minLength={MIN_PASSWORD_LENGTH}
                  aria-invalid={touched.confirmPassword && passwordsMismatch}
                  aria-describedby="confirm-password-hint"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={tx(showConfirmPassword ? 'Hide password' : 'Show password')}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <p
                id="confirm-password-hint"
                className={`field-hint ${touched.confirmPassword && formData.confirmPassword.length > 0 ? (passwordsMismatch ? 'field-hint--error' : 'field-hint--ok') : ''}`}
              >
                {touched.confirmPassword && formData.confirmPassword.length > 0 && (passwordsMismatch ? (
                  <><FaExclamationCircle /> {tx('Passwords do not match')}</>
                ) : (
                  <><FaCheckCircle /> {tx('Passwords match')}</>
                ))}
              </p>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input type="checkbox" id="accept-terms" required />
                <span>
                  {tx('I agree to the')} <Link to="/terms" className="link">{tx('Terms of Use')}</Link> {tx('and the')}{' '}
                  <Link to="/privacy" className="link">{tx('Privacy Policy')}</Link>
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {tx(loading ? 'Creating account...' : 'Create account')}
            </button>
          </form>


          <div className="register-footer">
            <p>
              {tx('Already have an account?')} <Link to="/login" className="link">{tx('Sign in')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
