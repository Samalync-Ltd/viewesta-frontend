import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './NotFound.css';
import { useLocale } from '../context/LocaleContext';

export default function NotFound() {
  const { pathname } = useLocation();

  const { tx } = useLocale();

  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <p className="not-found-code">404</p>
      <h1 id="not-found-title" className="not-found-title">{tx('Page not found')}</h1>
      <p className="not-found-text">
        {tx("We couldn't find")} <code className="not-found-path">{pathname}</code>. {tx('The link may be broken, or the page may have been moved.')}
      </p>
      <div className="not-found-actions">
        <Link to="/" className="btn btn-primary">{tx('Go to Home')}</Link>
        <Link to="/movies" className="btn btn-outline">{tx('Browse movies')}</Link>
      </div>
    </section>
  );
}
