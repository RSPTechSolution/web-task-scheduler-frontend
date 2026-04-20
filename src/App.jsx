import { useDeferredValue, useEffect, useMemo, useState, startTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const dashboardCards = [
  { key: "scheduler", label: "Scheduler State", accent: "mint" },
  { key: "clock", label: "Indian Time", accent: "gold" },
  { key: "blocked", label: "Blocked Dates", accent: "blue" },
];

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
}

function formatLogLevel(level) {
  return level.charAt(0) + level.slice(1).toLowerCase();
}

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logQuery, setLogQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState("");

  const deferredLogQuery = useDeferredValue(logQuery);

  const filteredLogs = useMemo(() => {
    if (!deferredLogQuery.trim()) {
      return logs;
    }
    const query = deferredLogQuery.toLowerCase();
    return logs.filter((entry) => entry.human.toLowerCase().includes(query));
  }, [logs, deferredLogQuery]);

  async function refreshDashboard(showLoading = false) {
    try {
      const [dashboardPayload, logsPayload] = await Promise.all([
        api("/api/dashboard"),
        api("/api/logs"),
      ]);
      
      startTransition(() => {
        setSnapshot(dashboardPayload);
        setLogs(logsPayload.entries || []);
        setLastRefreshed(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }));
      });
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  }

  useEffect(() => {
    if (!authenticated) return;
    
    refreshDashboard();
    const timerId = window.setInterval(() => {
      refreshDashboard();
    }, 10000); // 10s refresh is enough and less laggy

    return () => window.clearInterval(timerId);
  }, [authenticated]);

  async function handleLogin(event) {
    event.preventDefault();
    setBusyAction("login");
    setAuthError("");
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setAuthenticated(true);
      setPassword("");
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setBusyAction("");
    }
  }

  async function handleLogout() {
    setBusyAction("logout");
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      setAuthenticated(false);
      setSnapshot(null);
      setLogs([]);
      setBusyAction("");
    }
  }

  async function handleRunNow() {
    setBusyAction("run");
    try {
      await api("/api/run", { method: "POST" });
      setTimeout(() => refreshDashboard(), 2000);
    } finally {
      setBusyAction("");
    }
  }

  async function handleTogglePause() {
    setBusyAction("pause");
    try {
      const payload = await api("/api/pause", { method: "POST" });
      setSnapshot(prev => ({ ...prev, ...payload }));
    } finally {
      setBusyAction("");
    }
  }

  async function handleBlockDate() {
    if (!selectedDate) return;
    setBusyAction("block");
    try {
      const payload = await api("/api/blocked-dates", {
        method: "POST",
        body: JSON.stringify({ date: selectedDate }),
      });
      setSnapshot(prev => ({ ...prev, ...payload }));
      setSelectedDate("");
    } finally {
      setBusyAction("");
    }
  }

  async function handleRemoveBlockedDate(date) {
    setBusyAction(date);
    try {
      const payload = await api(`/api/blocked-dates/${date}`, {
        method: "DELETE",
      });
      setSnapshot(prev => ({ ...prev, ...payload }));
    } finally {
      setBusyAction("");
    }
  }

  if (!authenticated) {
    return (
      <div className="screen login-screen">
        <BackgroundOrbs />
        <motion.section
          className="login-card"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <span className="micro-label">Security Gateway</span>
          <h1>Attendance Dashboard</h1>
          <p className="lead">
            Access your automated attendance control center. Secure, real-time, and synchronized with Indian Standard Time.
          </p>
          <form onSubmit={handleLogin} className="login-form">
            <label htmlFor="password">Master Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {authError ? <div className="notice error">{authError}</div> : null}
            <button type="submit" className="primary-button" disabled={busyAction === "login"}>
              {busyAction === "login" ? "Authenticating..." : "Unlock Access"}
            </button>
          </form>
        </motion.section>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="screen loading-screen">
        <BackgroundOrbs />
        <motion.div
          className="loading-shell"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          Initializing Secure Session...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="screen">
      <BackgroundOrbs />
      <main className="dashboard">
        <header className="dashboard-header">
          <div className="header-brand">
            <span className="micro-label">Automation Hub</span>
            <h1>Control Panel</h1>
          </div>
          <div className="header-meta">
            <div className="refresh-status">
              <span>IST</span>
              <strong>{snapshot.now.split(' ').slice(1).join(' ')}</strong>
            </div>
            <button className="logout-icon-button" onClick={handleLogout} title="Logout">
              🚪
            </button>
          </div>
        </header>

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
            <strong className="value">{snapshot.blocked_dates.length}</strong>
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
                {snapshot.next_runs.length > 0 ? snapshot.next_runs.map((run) => (
                  <div className="schedule-item" key={run.job_id}>
                    <div className="item-info">
                      <span className="job-name">{run.name}</span>
                      <span className="job-id">{run.job_id}</span>
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
                {snapshot.history && snapshot.history.length > 0 ? snapshot.history.map((entry, i) => (
                  <div className={`history-item ${entry.status.toLowerCase()}`} key={i}>
                    <div className="history-info">
                      <div className="history-main">
                        <span className={`status-pill ${entry.status.toLowerCase()}`}>{entry.status}</span>
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
                  {snapshot.blocked_dates.map((date) => (
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

            <section className="panel-section logs-section">
              <div className="section-header">
                <h2>Activity Logs</h2>
              </div>
              <input
                className="modern-search-input"
                type="search"
                value={logQuery}
                onChange={(event) => setLogQuery(event.target.value)}
                placeholder="Search logs..."
              />
              <div className="mini-log-stream">
                {filteredLogs.slice().reverse().slice(0, 15).map((entry, i) => (
                  <div key={i} className={`mini-log-item ${entry.level.toLowerCase()}`}>
                    <span className="log-time">{entry.timestamp.split(' ')[1]}</span>
                    <span className="log-msg">{entry.message}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
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

export default App;
