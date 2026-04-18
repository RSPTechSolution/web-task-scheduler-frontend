import { useDeferredValue, useEffect, useMemo, useState, startTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

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

  const deferredLogQuery = useDeferredValue(logQuery);

  const filteredLogs = useMemo(() => {
    if (!deferredLogQuery.trim()) {
      return logs;
    }
    const query = deferredLogQuery.toLowerCase();
    return logs.filter((entry) => entry.human.toLowerCase().includes(query));
  }, [logs, deferredLogQuery]);

  async function refreshDashboard() {
    const [dashboardPayload, logsPayload] = await Promise.all([
      api("/api/dashboard"),
      api("/api/logs"),
    ]);
    startTransition(() => {
      setSnapshot(dashboardPayload);
      setLogs(logsPayload.entries || []);
    });
  }

  useEffect(() => {
    let timerId;

    api("/api/auth/session")
      .then((payload) => {
        if (payload.authenticated) {
          setAuthenticated(true);
          return refreshDashboard();
        }
        return null;
      })
      .catch(() => null);

    timerId = window.setInterval(() => {
      if (authenticated) {
        refreshDashboard().catch(() => null);
      }
    }, 5000);

    return () => {
      window.clearInterval(timerId);
    };
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
      await refreshDashboard();
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
      await refreshDashboard();
    } finally {
      setBusyAction("");
    }
  }

  async function handleTogglePause() {
    setBusyAction("pause");
    try {
      const payload = await api("/api/pause", { method: "POST" });
      setSnapshot(payload);
    } finally {
      setBusyAction("");
    }
  }

  async function handleBlockDate() {
    if (!selectedDate) {
      return;
    }
    setBusyAction("block");
    try {
      const payload = await api("/api/blocked-dates", {
        method: "POST",
        body: JSON.stringify({ date: selectedDate }),
      });
      setSnapshot(payload);
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
      setSnapshot(payload);
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
          <span className="micro-label">Independent Frontend</span>
          <h1>Attendance Control Center</h1>
          <p className="lead">
            A polished React dashboard for your Oracle-hosted automation backend, with password auth, live job visibility, readable logs, and calendar-based pause controls.
          </p>
          <form onSubmit={handleLogin} className="login-form">
            <label htmlFor="password">Dashboard Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter dashboard password"
              autoComplete="current-password"
            />
            {authError ? <div className="notice error">{authError}</div> : null}
            <button type="submit" className="primary-button" disabled={busyAction === "login"}>
              {busyAction === "login" ? "Unlocking..." : "Unlock Dashboard"}
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
          Preparing dashboard...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="screen">
      <BackgroundOrbs />
      <main className="dashboard">
        <motion.section
          className="hero-panel"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="hero-copy">
            <span className="micro-label">React Dashboard</span>
            <h1>Command your attendance automation with clarity.</h1>
            <p className="lead">
              Separate frontend for Netlify, separate backend for Oracle, one smoother workflow. Scheduler timings, logs, and dashboard status all stay aligned to Indian timezone.
            </p>
          </div>
          <div className="hero-actions">
            <button className="primary-button" onClick={handleRunNow} disabled={busyAction === "run"}>
              {busyAction === "run" ? "Starting..." : "Run Attendance Now"}
            </button>
            <button className="secondary-button" onClick={handleTogglePause} disabled={busyAction === "pause"}>
              {busyAction === "pause"
                ? "Updating..."
                : snapshot.paused
                  ? "Resume Scheduler"
                  : "Pause Scheduler"}
            </button>
            <button className="ghost-button" onClick={handleLogout} disabled={busyAction === "logout"}>
              {busyAction === "logout" ? "Signing out..." : "Logout"}
            </button>
          </div>
        </motion.section>

        <section className="stats-grid">
          {dashboardCards.map((card, index) => (
            <motion.article
              key={card.key}
              className={`stat-card ${card.accent}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: index * 0.08 }}
            >
              <span className="stat-label">{card.label}</span>
              {card.key === "scheduler" ? (
                <>
                  <strong className={`status-badge ${snapshot.paused ? "paused" : "running"}`}>
                    {snapshot.paused ? "Paused" : "Running"}
                  </strong>
                  <p>Automatic jobs respect your India-time schedule and blocked dates.</p>
                </>
              ) : null}
              {card.key === "clock" ? (
                <>
                  <strong>{snapshot.now}</strong>
                  <p>Live backend time in {snapshot.timezone} for easier debugging.</p>
                </>
              ) : null}
              {card.key === "blocked" ? (
                <>
                  <strong>{snapshot.blocked_dates.length}</strong>
                  <p>Dates currently skipped from weekday scheduler execution.</p>
                </>
              ) : null}
            </motion.article>
          ))}
        </section>

        <section className="dashboard-grid">
          <motion.article
            className="panel schedule-panel"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
          >
            <div className="panel-head">
              <div>
                <span className="micro-label">Automation Rhythm</span>
                <h2>Upcoming runs</h2>
              </div>
              <div className="beacon" />
            </div>
            <div className="timeline">
              {snapshot.next_runs.map((run) => (
                <div className="timeline-item" key={run.job_id}>
                  <div>
                    <strong>{run.name}</strong>
                    <span>{run.job_id}</span>
                  </div>
                  <time>{run.next_run}</time>
                </div>
              ))}
            </div>
          </motion.article>

          <motion.article
            className="panel calendar-panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
          >
            <div className="panel-head">
              <div>
                <span className="micro-label">Calendar Control</span>
                <h2>Pause specific days</h2>
              </div>
            </div>
            <p className="panel-copy">
              Select individual dates when you want the scheduler to stay quiet. Manual attendance runs continue to work.
            </p>
            <div className="calendar-controls">
              <input
                type="date"
                value={selectedDate}
                min={snapshot.today}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
              <button className="secondary-button" onClick={handleBlockDate} disabled={busyAction === "block"}>
                {busyAction === "block" ? "Saving..." : "Block Date"}
              </button>
            </div>
            <div className="chips">
              <AnimatePresence mode="popLayout">
                {snapshot.blocked_dates.length ? (
                  snapshot.blocked_dates.map((date) => (
                    <motion.button
                      key={date}
                      layout
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.88 }}
                      className="chip"
                      onClick={() => handleRemoveBlockedDate(date)}
                      disabled={busyAction === date}
                    >
                      <span>{date}</span>
                      <span>{busyAction === date ? "Removing..." : "Remove"}</span>
                    </motion.button>
                  ))
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="empty-state"
                  >
                    No blocked dates yet.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.article>
        </section>

        <motion.section
          className="panel logs-panel"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="panel-head">
            <div>
              <span className="micro-label">Readable Debugging</span>
              <h2>Live logs in IST</h2>
            </div>
            <input
              className="log-search"
              type="search"
              value={logQuery}
              onChange={(event) => setLogQuery(event.target.value)}
              placeholder="Filter logs by keyword"
            />
          </div>
          <div className="log-stream">
            {filteredLogs.length ? (
              filteredLogs
                .slice()
                .reverse()
                .map((entry) => (
                  <motion.article
                    key={`${entry.timestamp}-${entry.level}-${entry.message.slice(0, 24)}`}
                    className={`log-card ${entry.level.toLowerCase()}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    <div className="log-card-head">
                      <span className={`log-level ${entry.level.toLowerCase()}`}>
                        {formatLogLevel(entry.level)}
                      </span>
                      <time>{`${entry.timestamp} ${entry.timezone}`}</time>
                    </div>
                    <pre>{entry.message}</pre>
                  </motion.article>
                ))
            ) : (
              <div className="empty-state">No logs matched your search.</div>
            )}
          </div>
        </motion.section>
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
