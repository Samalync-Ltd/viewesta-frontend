/**
 * Viewer main layout: Header + main content (Outlet) + Footer.
 * Used for all public and viewer routes (home, watch, profile, etc.).
 */
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function ViewerLayout() {
  return (
    <>
      <Header />
      <main id="main-content" role="main" className="main-content">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
