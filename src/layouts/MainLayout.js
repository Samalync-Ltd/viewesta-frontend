import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

/**
 * Global layout: Header + main content (Outlet) + Footer.
 */
function MainLayout() {
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

export default MainLayout;
