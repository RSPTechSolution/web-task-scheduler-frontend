import React, { useState, useEffect, useMemo, startTransition } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './styles.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = async (endpoint, options = {}) => {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });
  if (!res.ok) {
    if (res.status === 401) return { authenticated: false, error: 'Unauthorized' };
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
};

// --- Components ---

function Header({ snapshot, handleLogout }) {
  const location = useLocation();
  const isLogsPage = location.pathname === '/logs';

  return (
    <header className="dashboard-header">
      <div className="header-brand">
        <span className="micro-label">Automation Hub</span>
        <h1>Control Panel</h1>
      </div>
      <nav className="header-nav">
        <Link to="/" className={`nav-link ${!isLogsPage ? 'active' : ''}`}>
          <span className="nav-icon">🏠</span>
          <span>Dashboard</span>
        </Link>
        <Link to="/logs" className={`nav-link ${isLogsPage ? 'active' : ''}`}>
          <span className="nav-icon">📋</span>
          <span>Activity Logs</span>
        </Link>
      </nav>
      <div className="header-meta">
        <div className="refresh-status">
          <span>IST</span>
          <strong>{snapshot?.now ? snapshot.now.split(' ').slice(1).join(' ') : '--:--:--'}</strong>
        </div>
        <button className="logout-icon-button" onClick={handleLogout} title="Logout">
          🚪
        </button>
      </div>
    </header>
  );
}

function Dashboard({ snapshot, busyAction, handleRunNow, handleTogglePause, handleBlockDate, handleRemoveBlockedDate, selectedDate, setSelectedDate }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <section className="hero-panel-new">
        <div className="hero-status">
          <div className={`status-indicator ${snapshot.paused ? 'paused' : 'active'}`}>
            <div className="dot" />
            <span>Scheduler is {snapshot.paused ? 'Paused' : 'Active'}</span>
          </div>
          <h2>Ready for Next Task</h2>
          <p>All automated jobs are synchronized with Asia/Kolkata timezone. Blocked dates will be automatically skipped.</p>
        </div>
        <div className="hero-actions-grid">
          <button className="action-card run-now" onClick={handleRunNow} disabled={busyAction === "run"}>
            <span className="icon">🚀</span>
            <div className="label">
              <strong>Run Now</strong>
              <span>Trigger immediate task</span>
            </div>
          </button>
          <button className="action-card toggle-pause" onClick={handleTogglePause} disabled={busyAction === "pause"}>
            <span className="icon">{snapshot.paused ? '▶️' : '⏸️'}</span>
            <div className="label">
              <strong>{snapshot.paused ? 'Resume' : 'Pause'}</strong>
              <span>Scheduler control</span>
            </div>
          </button>
        </div>
      </section>

      <section className="stats-grid-new">
        <div className="stat-item">
          <span className="label">Current Date</span>
          <strong className="value">{snapshot.today}</strong>
          <span className="sub">Date in India</span>
        </div>
        <div className="stat-item">
          <span className="label">Active Rules</span>
          <strong className="value">Mon - Fri</strong>
          <span className="sub">Weekly Schedule</span>
        </div>
        <div className="stat-item">
          <span className="label">Blocked Days</span>
          <strong className="value">{snapshot.blocked_dates?.length || 0}</strong>
          <span className="sub">Upcoming exceptions</span>
        </div>
      </section>

      <div className="dashboard-layout">
        <div className="main-content">
          <section className="panel-section">
            <div className="section-header">
              <h2>Upcoming Schedules</h2>
              <span className="badge">Next 24h</span>
            </div>
            <div className="schedule-list">
              {snapshot.next_runs?.length > 0 ? snapshot.next_runs.map((run) => (
                <div className="schedule-item" key={run.id}>
                  <div className="item-info">
                    <span className="job-name">{run.name}</span>
                    <span className="job-id">{run.id}</span>
                  </div>
                  <div className="item-time">
                    <strong>{run.next_run}</strong>
                  </div>
                </div>
              )) : (
                <div className="empty-state">No upcoming runs scheduled.</div>
              )}
            </div>
          </section>

          <section className="panel-section">
            <div className="section-header">
              <h2>Previous Results</h2>
              <span className="badge gray">Execution History</span>
            </div>
            <div className="history-list">
              {snapshot.history?.length > 0 ? snapshot.history.map((entry, i) => (
                <div className={`history-item ${entry.status.toLowerCase()}`} key={i}>
                  <div className="history-info">
                    <div className="history-main">
                      <span className={`status-pill ${entry.status.toLowerCase()}`}>
                        {entry.status === 'Success' ? '✅' : entry.status === 'Skipped' ? '⏭️' : '❌'} {entry.status}
                      </span>
                      <strong>{entry.job_name}</strong>
                    </div>
                    <span className="history-msg">{entry.message}</span>
                  </div>
                  <time className="history-time">{entry.timestamp}</time>
                </div>
              )) : (
                <div className="empty-state">No execution history found yet.</div>
              )}
            </div>
          </section>
        </div>

        <aside className="side-content">
          <section className="panel-section">
            <div className="section-header">
              <h2>Block Calendar</h2>
            </div>
            <div className="calendar-block">
              <input
                type="date"
                value={selectedDate}
                min={snapshot.today}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="modern-date-input"
              />
              <button className="add-block-button" onClick={handleBlockDate} disabled={busyAction === "block" || !selectedDate}>
                {busyAction === "block" ? "Processing..." : "Add to Blocklist"}
              </button>
            </div>
            <div className="blocked-list">
              <AnimatePresence>
                {snapshot.blocked_dates?.map((date) => (
                  <motion.div
                    key={date}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="blocked-date-tag"
                  >
                    <span>{date}</span>
                    <button onClick={() => handleRemoveBlockedDate(date)} disabled={busyAction === date}>
                      ✕
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        </aside>
      </div>
    </motion.div>
  );
}

function LogsPage({ logs }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    if (!query) return logs;
    return logs.filter(l => l.message.toLowerCase().includes(query.toLowerCase()) || l.level.toLowerCase().includes(query.toLowerCase()));
  }, [logs, query]);

  return (
    <motion.div className="logs-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="panel-section full-logs">
        <div className="section-header">
          <h2>Detailed Activity Logs</h2>
          <input
            className="modern-search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter logs (e.g. success, error, login)..."
          />
        </div>
        <div className="big-log-stream">
          {filtered.length > 0 ? [...filtered].reverse().map((entry, i) => (
            <div key={i} className={`log-card-new ${entry.level.toLowerCase()}`}>
              <div className="log-card-header">
                <span className="log-icon">{entry.emoji || '📝'}</span>
                <span className={`log-level-badge ${entry.level.toLowerCase()}`}>{entry.level}</span>
                <span className="log-timestamp">{entry.timestamp}</span>
              </div>
              <div className="log-card-body">
                {entry.message}
              </div>
            </div>
          )) : (
            <div className="empty-state">No matching logs found.</div>
          )}
        </div>
      </section>
    </motion.div>
  );
}

// --- Main App ---

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('auth_hint') === 'true');
  const [isLoading, setIsLoading] = useState(true);
  const [snapshot, setSnapshot] = useState({});
  const [logs, setLogs] = useState([]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');

  const navigate = useNavigate();

  const checkSession = async () => {
    try {
      const data = await api('/api/auth/session');
      if (data.authenticated) {
        setIsLoggedIn(true);
        localStorage.setItem('auth_hint', 'true');
      } else {
        setIsLoggedIn(false);
        localStorage.removeItem('auth_hint');
      }
    } catch (err) {
      console.error('Session check failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const data = await api('/api/dashboard');
      if (data.authenticated === false) {
          setIsLoggedIn(false);
          return;
      }
      startTransition(() => {
        setSnapshot(data);
      });
    } catch (err) {
      console.error('Fetch failed', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await api('/api/logs');
      if (data.authenticated === false) return;
      setLogs(data.entries || []);
    } catch (err) {
      console.error('Logs fetch failed', err);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchDashboard();
    fetchLogs();
    const timer = setInterval(() => {
      fetchDashboard();
      fetchLogs();
    }, 10000);
    return () => clearInterval(timer);
  }, [isLoggedIn]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      if (data.ok) {
        setIsLoggedIn(true);
        localStorage.setItem('auth_hint', 'true');
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      setIsLoggedIn(false);
      localStorage.removeItem('auth_hint');
      navigate('/');
    }
  };

  const handleRunNow = async () => {
    setBusyAction("run");
    try {
      await api('/api/run', { method: 'POST' });
      fetchDashboard();
    } finally {
      setTimeout(() => setBusyAction(null), 1000);
    }
  };

  const handleTogglePause = async () => {
    setBusyAction("pause");
    try {
      const data = await api('/api/pause', { method: 'POST' });
      setSnapshot(data);
    } finally {
      setBusyAction(null);
    }
  };

  const handleBlockDate = async () => {
    if (!selectedDate) return;
    setBusyAction("block");
    try {
      const data = await api('/api/blocked-dates', {
        method: 'POST',
        body: JSON.stringify({ date: selectedDate }),
      });
      setSnapshot(data);
      setSelectedDate('');
    } finally {
      setBusyAction(null);
    }
  };

  const handleRemoveBlockedDate = async (date) => {
    setBusyAction(date);
    try {
      const data = await api(`/api/blocked-dates/${date}`, { method: 'DELETE' });
      setSnapshot(data);
    } finally {
      setBusyAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="login-screen">
        <BackgroundOrbs />
        <motion.div className="login-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <h1>System Login</h1>
          <p className="lead">Attendance Automation Dashboard</p>
          <form className="login-form" onSubmit={handleLogin}>
            <div className="field">
              <label>Master Password</label>
              <input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            {error && <div className="notice error">{error}</div>}
            <button className="primary-button" type="submit">Unlock System</button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="screen">
      <BackgroundOrbs />
      <main className="dashboard">
        <Header snapshot={snapshot} handleLogout={handleLogout} />
        
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={
              <Dashboard 
                snapshot={snapshot}
                busyAction={busyAction}
                handleRunNow={handleRunNow}
                handleTogglePause={handleTogglePause}
                handleBlockDate={handleBlockDate}
                handleRemoveBlockedDate={handleRemoveBlockedDate}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
              />
            } />
            <Route path="/logs" element={<LogsPage logs={logs} />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function BackgroundOrbs() {
  return (
    <div className="background-orbs" aria-hidden="true">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="orb orb-three" />
    </div>
  );
}
