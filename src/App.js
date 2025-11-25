import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Movies from './pages/Movies';
import MovieDetail from './pages/MovieDetail';
import Series from './pages/Series';
import SeriesDetail from './pages/SeriesDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Watchlist from './pages/Watchlist';
import Subscription from './pages/Subscription';
import Wallet from './pages/Wallet';
import Search from './pages/Search';
import Genre from './pages/Genre';
import Watch from './pages/Watch';

// Context
import { AuthProvider } from './context/AuthContext';
import { MovieProvider } from './context/MovieContext';
import { API_BASE_URL, healthCheck } from './utils/apiClient';

const initialStatus = {
  state: 'checking',
  message: 'Connecting to backend...',
};

function App() {
  const [backendStatus, setBackendStatus] = useState(initialStatus);

  useEffect(() => {
    let active = true;

    const describeSuccess = (payload) => {
      if (!payload) return 'Backend reachable';
      if (typeof payload === 'string') return 'Backend reachable (HTML response)';
      if (payload.message) return payload.message;
      if (payload.status) return `Backend status: ${payload.status}`;
      return 'Backend reachable';
    };

    const describeError = (error) => {
      if (error.response?.data?.error) return error.response.data.error;
      if (error.message) return error.message;
      return 'Unable to reach backend';
    };

    const pingBackend = async () => {
      setBackendStatus((prev) => ({
        ...prev,
        state: prev.state === 'ok' ? 'ok' : 'checking',
        message: prev.state === 'ok' ? prev.message : 'Connecting to backend...',
      }));

      try {
        const response = await healthCheck();
        if (!active) return;
        setBackendStatus({
          state: 'ok',
          message: describeSuccess(response?.data),
        });
      } catch (error) {
        if (!active) return;
        setBackendStatus({
          state: 'error',
          message: describeError(error),
        });
      }
    };

    pingBackend();
    const intervalId = setInterval(pingBackend, 60 * 1000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  const statusClass = `backend-status backend-status--${backendStatus.state}`;

  return (
    <AuthProvider>
      <MovieProvider>
        <Router>
          <ScrollToTop />
          <div className="App">
            <a href="#main-content" className="skip-to-main">Skip to main content</a>
            <div className={statusClass}>
              <span>{backendStatus.message}</span>
              <span className="backend-status__base">{API_BASE_URL}</span>
            </div>
            <Header />
            <main id="main-content" role="main" className="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/movies" element={<Movies />} />
                <Route path="/movie/:id" element={<MovieDetail />} />
                <Route path="/series" element={<Series />} />
                <Route path="/series/:id" element={<SeriesDetail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/watchlist" element={<Watchlist />} />
                <Route path="/subscription" element={<Subscription />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/search" element={<Search />} />
                <Route path="/genre/:name" element={<Genre />} />
                <Route path="/watch/:id" element={<Watch />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </MovieProvider>
    </AuthProvider>
  );
}

export default App;