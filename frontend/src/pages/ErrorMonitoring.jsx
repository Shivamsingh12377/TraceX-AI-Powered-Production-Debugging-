
import { useCallback, useEffect, useState } from "react";
import { socket } from "../socket";
import "./ErrorMonitoring.css";

const API_URL = `${import.meta.env.VITE_API_URL}/api/errors`;

const panelStyle = {
  marginTop: 20,
  padding: 18,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
};

const textareaStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: 12,
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  fontFamily: "inherit",
  fontSize: 14,
  resize: "vertical",
};

const primaryButtonStyle = {
  padding: "12px 20px",
  border: "none",
  borderRadius: 9,
  background: "#4f46e5",
  color: "#ffffff",
  fontWeight: 600,
  cursor: "pointer",
};

function formatDate(value) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getAuthHeaders(includeJson = false) {
  const headers = {};

  const token = localStorage.getItem("tracexToken");

  if (token) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

async function readApiResponse(response) {
  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("Invalid response from server.");
  }

  if (response.status === 401) {
    window.dispatchEvent(new Event("tracex:auth-expired"));
  }

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || `Request failed (${response.status})`
    );
  }

  return result;
}

function readLocalJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocalJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Local storage error:", error);
    return false;
  }
}

function solutionStorageKey(id) {
  return `tracex:error-solution:${id}`;
}

function readSolution(id) {
  const value = readLocalJson(solutionStorageKey(id), {});

  return {
    checked: Array.isArray(value.checked)
      ? value.checked
      : [],
    notes: typeof value.notes === "string"
      ? value.notes
      : "",
    verified: value.verified === true,
    history: Array.isArray(value.history)
      ? value.history
      : [],
  };
}

function ProgressBar({ completed, total }) {
  const percentage = total > 0
    ? Math.round((completed / total) * 100)
    : 0;

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        <span>Solution Progress</span>
        <span>
          {completed}/{total} steps ({percentage}%)
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          marginTop: 8,
          height: 10,
          background: "#e2e8f0",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            background: "#10b981",
            transition: "width .2s ease",
          }}
        />
      </div>
    </div>
  );
}

function Checklist({ steps, checked, onToggle }) {
  if (!steps.length) {
    return <p>No solution steps available.</p>;
  }

  return (
    <div style={{ marginTop: 12 }}>
      {steps.map((step, index) => {
        const isChecked = checked.includes(index);

        return (
          <label
            key={index}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: 12,
              marginBottom: 8,
              border: "1px solid #e2e8f0",
              borderRadius: 9,
              background: isChecked
                ? "#ecfdf5"
                : "#ffffff",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => onToggle(index)}
              style={{
                width: 18,
                height: 18,
                marginTop: 2,
                accentColor: "#059669",
              }}
            />

            <span
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: "#334155",
              }}
            >
              {step}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export default function ErrorMonitoring() {
  // ======================================
  // ERROR MONITORING STATES
  // ======================================

  const [stats, setStats] = useState({
    totalErrors: 0,
    criticalErrors: 0,
    unresolvedErrors: 0,
    resolvedErrors: 0,
  });

  const [errors, setErrors] = useState([]);
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [socketConnected, setSocketConnected] = useState(
    socket.connected
  );

  // ======================================
  // ERROR DETAILS STATES
  // ======================================

  const [selectedError, setSelectedError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [modalError, setModalError] = useState("");

  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const [solution, setSolution] = useState({
    checked: [],
    notes: "",
    verified: false,
    history: [],
  });

  // ======================================
  // SMART PROBLEM SOLVER STATES
  // ======================================

  const [problemInput, setProblemInput] = useState("");
  const [problemResult, setProblemResult] = useState(null);
  const [solving, setSolving] = useState(false);
  const [solveError, setSolveError] = useState("");

  const [solverChecked, setSolverChecked] = useState([]);
  const [solverVerified, setSolverVerified] = useState(false);
  const [solverNotes, setSolverNotes] = useState("");
  const [solverSaveMessage, setSolverSaveMessage] = useState("");

  // ======================================
  // NEW: MONGODB HISTORY STATES
  // ======================================

  const [solverHistory, setSolverHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [savingHistory, setSavingHistory] = useState(false);
  const [deletingHistoryId, setDeletingHistoryId] = useState(null);
  const [savedCurrentSolution, setSavedCurrentSolution] = useState(false);

  // ======================================
  // FETCH ERROR MONITORING DATA
  // ======================================

  const fetchData = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setErrorMessage("");

        const params = new URLSearchParams({
          page: String(page),
          limit: "10",
        });

        if (severity) {
          params.set("severity", severity);
        }

        if (status) {
          params.set("resolved", status);
        }

        const headers = getAuthHeaders();

        const [statsResponse, errorsResponse] =
          await Promise.all([
            fetch(`${API_URL}/stats`, {
              headers,
              signal,
            }),
            fetch(`${API_URL}?${params.toString()}`, {
              headers,
              signal,
            }),
          ]);

        const statsResult = await readApiResponse(statsResponse);
        const errorsResult = await readApiResponse(errorsResponse);

        if (signal.aborted) return;

        setStats(statsResult.data);

        const newErrors = Array.isArray(errorsResult.data)
          ? errorsResult.data
          : [];

        setErrors(newErrors);

        setTotalPages(
          Math.max(1, Number(errorsResult.totalPages) || 1)
        );

        setSelectedError((previous) => {
          if (!previous) return null;

          return (
            newErrors.find(
              (item) => item._id === previous._id
            ) || previous
          );
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          setErrorMessage(
            error.message || "Unable to load monitoring data."
          );
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    },
    [page, severity, status]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchData(controller.signal);

    return () => controller.abort();
  }, [fetchData, refreshKey]);

  // ======================================
  // SOCKET.IO REAL-TIME MONITORING
  // ======================================

  useEffect(() => {
    const handleConnect = () => {
      setSocketConnected(true);
      setRefreshKey((previous) => previous + 1);
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleConnectError = (error) => {
      console.error("Socket error:", error.message);
      setSocketConnected(false);
    };

    const handleErrorEvent = () => {
      setRefreshKey((previous) => previous + 1);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("error:new", handleErrorEvent);
    socket.on("error:updated", handleErrorEvent);

    if (!socket.connected) {
      socket.connect();
    } else {
      setSocketConnected(true);
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("error:new", handleErrorEvent);
      socket.off("error:updated", handleErrorEvent);
    };
  }, []);

  // ======================================
  // NEW: FETCH MONGODB SOLUTION HISTORY
  // ======================================

  const fetchSolverHistory = useCallback(
    async (signal) => {
      try {
        setHistoryLoading(true);
        setHistoryError("");

        const token = localStorage.getItem("tracexToken");

        if (!token) {
          throw new Error(
            "Please log in to view your saved solutions."
          );
        }

        const response = await fetch(
          `${API_URL}/solutions`,
          {
            method: "GET",
            headers: getAuthHeaders(),
            signal,
          }
        );

        const result = await readApiResponse(response);

        if (signal?.aborted) return;

        setSolverHistory(
          Array.isArray(result.data) ? result.data : []
        );
      } catch (error) {
        if (error.name !== "AbortError") {
          setHistoryError(
            error.message || "Unable to load solution history."
          );
        }
      } finally {
        if (!signal?.aborted) {
          setHistoryLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchSolverHistory(controller.signal);

    return () => controller.abort();
  }, [fetchSolverHistory]);

  // ======================================
  // FILTER HANDLERS
  // ======================================

  const handleRefresh = () => {
    setRefreshKey((previous) => previous + 1);
    fetchSolverHistory();
  };

  const handleSeverityChange = (event) => {
    setSeverity(event.target.value);
    setPage(1);
  };

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
    setPage(1);
  };

  // ======================================
  // SMART SOLVER: FIND SOLUTION
  // ======================================

  const handleSolveProblem = async () => {
    const problem = problemInput.trim();

    if (!problem) {
      setSolveError("Please enter your error message.");
      return;
    }

    if (problem.length > 10000) {
      setSolveError("Maximum 10000 characters allowed.");
      return;
    }

    if (solving) return;

    try {
      setSolving(true);
      setSolveError("");
      setProblemResult(null);

      setSolverChecked([]);
      setSolverVerified(false);
      setSolverNotes("");
      setSolverSaveMessage("");
      setSavedCurrentSolution(false);

      const response = await fetch(`${API_URL}/solve`, {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ problem }),
      });

      const result = await readApiResponse(response);

      setProblemResult(result.data);
    } catch (error) {
      setSolveError(
        error.message || "Unable to find a solution."
      );
    } finally {
      setSolving(false);
    }
  };

  // ======================================
  // SMART SOLVER CHECKLIST
  // ======================================

  const solverSteps = Array.isArray(problemResult?.steps)
    ? problemResult.steps
    : [];

  const solverCompleted = solverSteps.filter(
    (_, index) => solverChecked.includes(index)
  ).length;

  const solverProgress = solverSteps.length > 0
    ? Math.round(
        (solverCompleted / solverSteps.length) * 100
      )
    : 0;

  const toggleSolverStep = (index) => {
    setSolverChecked((previous) =>
      previous.includes(index)
        ? previous.filter((item) => item !== index)
        : [...previous, index]
    );

    setSolverVerified(false);
    setSolverSaveMessage("");
    setSavedCurrentSolution(false);
  };

  // ======================================
  // NEW: SAVE SOLUTION IN MONGODB
  // ======================================

  const saveSolverHistory = async () => {
    if (savingHistory || savedCurrentSolution) return;

    if (
      !problemResult ||
      !problemResult.matched ||
      solverSteps.length === 0 ||
      solverProgress !== 100 ||
      !solverVerified ||
      !solverNotes.trim()
    ) {
      setSolverSaveMessage(
        "Complete all steps, verify the fix, and add notes."
      );
      return;
    }

    if (!localStorage.getItem("tracexToken")) {
      setSolverSaveMessage(
        "Please log in before saving your solution."
      );
      return;
    }

    try {
      setSavingHistory(true);
      setSolverSaveMessage("");

      const payload = {
        problem: problemInput.trim(),
        ruleId: problemResult.ruleId || "",
        title: problemResult.title || "Solved Problem",
        category: problemResult.category || "General",
        notes: solverNotes.trim(),
        verified: true,
        stepsCompleted: solverCompleted,
        totalSteps: solverSteps.length,
      };

      const response = await fetch(
        `${API_URL}/solutions`,
        {
          method: "POST",
          headers: getAuthHeaders(true),
          body: JSON.stringify(payload),
        }
      );

      const result = await readApiResponse(response);

      if (result.data) {
        setSolverHistory((previous) => [
          result.data,
          ...previous.filter(
            (entry) => entry._id !== result.data._id
          ),
        ]);
      }

      setSavedCurrentSolution(true);

      setSolverSaveMessage(
        "✓ Solution saved successfully in MongoDB!"
      );

      setHistoryError("");
    } catch (error) {
      setSolverSaveMessage(
        error.message || "Unable to save solution."
      );
    } finally {
      setSavingHistory(false);
    }
  };

  // ======================================
  // NEW: DELETE SOLUTION FROM MONGODB
  // ======================================

  const deleteSolverHistory = async (id) => {
    if (!id || deletingHistoryId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this saved solution?"
    );

    if (!confirmed) return;

    try {
      setDeletingHistoryId(id);
      setHistoryError("");

      const response = await fetch(
        `${API_URL}/solutions/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      await readApiResponse(response);

      setSolverHistory((previous) =>
        previous.filter((entry) => entry._id !== id)
      );
    } catch (error) {
      setHistoryError(
        error.message || "Unable to delete solution."
      );
    } finally {
      setDeletingHistoryId(null);
    }
  };

  // ======================================
  // ERROR DETAILS MODAL
  // ======================================

  const openErrorDetails = (error) => {
    setSolution(readSolution(error._id));
    setSelectedError(error);
    setModalError("");
    setAnalysis(null);
    setAnalysisError("");
  };

  const closeErrorDetails = () => {
    if (updating || analyzing) return;

    setSelectedError(null);
    setModalError("");
    setAnalysis(null);
    setAnalysisError("");
  };

  useEffect(() => {
    if (!selectedError) return;

    const handleEscape = (event) => {
      if (
        event.key === "Escape" &&
        !updating &&
        !analyzing
      ) {
        closeErrorDetails();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [selectedError, updating, analyzing]);

  // ======================================
  // DETECTED ERROR CHECKLIST
  // ======================================

  const updateSolution = (changes) => {
    if (!selectedError) return;

    setSolution((previous) => {
      const updated = {
        ...previous,
        ...changes,
      };

      saveLocalJson(
        solutionStorageKey(selectedError._id),
        updated
      );

      return updated;
    });
  };

  const toggleSolutionStep = (index) => {
    const checked = solution.checked.includes(index)
      ? solution.checked.filter((value) => value !== index)
      : [...solution.checked, index];

    updateSolution({
      checked,
      verified: false,
    });
  };

  const suggestions = Array.isArray(analysis?.suggestions)
    ? analysis.suggestions
    : [];

  const completedCount = suggestions.filter(
    (_, index) => solution.checked.includes(index)
  ).length;

  const checklistComplete =
    suggestions.length > 0 &&
    completedCount === suggestions.length;

  const readyToResolve =
    checklistComplete &&
    solution.verified &&
    solution.notes.trim().length > 0;

  // ======================================
  // ANALYZE DETECTED ERROR
  // ======================================

  const handleAnalyzeError = async () => {
    if (!selectedError || analyzing) return;

    try {
      setAnalyzing(true);
      setAnalysis(null);
      setAnalysisError("");

      const response = await fetch(
        `${API_URL}/${selectedError._id}/analyze`,
        {
          method: "POST",
          headers: getAuthHeaders(true),
        }
      );

      const result = await readApiResponse(response);

      setAnalysis(result.data);

      updateSolution({
        verified: false,
      });
    } catch (error) {
      setAnalysisError(
        error.message || "Error analysis failed."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // ======================================
  // RESOLVE / REOPEN DETECTED ERROR
  // ======================================

  const handleUpdateStatus = async () => {
    if (!selectedError || updating) return;

    if (!selectedError.resolved && !readyToResolve) {
      setModalError(
        "Complete checklist, verification and notes first."
      );
      return;
    }

    const newResolvedStatus = !selectedError.resolved;

    try {
      setUpdating(true);
      setModalError("");

      const response = await fetch(
        `${API_URL}/${selectedError._id}/resolve`,
        {
          method: "PATCH",
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            resolved: newResolvedStatus,
          }),
        }
      );

      const result = await readApiResponse(response);

      const updatedError = result.data || {
        ...selectedError,
        resolved: newResolvedStatus,
      };

      setSelectedError(updatedError);

      if (newResolvedStatus) {
        const entry = {
          id: String(Date.now()),
          date: new Date().toISOString(),
          notes: solution.notes.trim(),
          stepsCompleted: completedCount,
          totalSteps: suggestions.length,
          verification: "Manually confirmed by user",
        };

        updateSolution({
          history: [entry, ...solution.history].slice(0, 30),
        });
      } else {
        updateSolution({
          verified: false,
        });
      }

      setErrors((previous) =>
        previous.map((item) =>
          item._id === selectedError._id
            ? updatedError
            : item
        )
      );

      setRefreshKey((previous) => previous + 1);
    } catch (error) {
      setModalError(
        error.message || "Failed to update error status."
      );
    } finally {
      setUpdating(false);
    }
  };

  // ======================================
  // PAGE UI
  // ======================================

  return (
    <div className="error-monitoring-page">

      {/* HEADER */}

      <div className="error-monitoring-header">
        <div>
          <span className="error-monitoring-eyebrow">
            TRACEX OBSERVABILITY
          </span>

          <h1>🐞 Error Monitoring</h1>

          <p>
            Monitor application errors, severity and
            resolution status.
          </p>
        </div>

        <button
          type="button"
          className="error-refresh-btn"
          onClick={handleRefresh}
          disabled={loading}
        >
          ↻ {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* LIVE MONITORING */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 20,
          fontSize: 13,
          fontWeight: 600,
          color: socketConnected
            ? "#15803d"
            : "#b45309",
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: socketConnected
              ? "#22c55e"
              : "#f59e0b",
          }}
        />

        {socketConnected
          ? "Live Monitoring Connected"
          : "Live Monitoring Disconnected"}
      </div>

      {/* STATISTICS */}

      <div className="error-stats-grid">
        <div className="error-stat-card">
          <div className="error-stat-icon purple">
            🐞
          </div>
          <div>
            <p>Total Errors</p>
            <h2>{stats.totalErrors}</h2>
          </div>
        </div>

        <div className="error-stat-card">
          <div className="error-stat-icon red">
            ⚠
          </div>
          <div>
            <p>Critical Errors</p>
            <h2>{stats.criticalErrors}</h2>
          </div>
        </div>

        <div className="error-stat-card">
          <div className="error-stat-icon orange">
            ◷
          </div>
          <div>
            <p>Unresolved</p>
            <h2>{stats.unresolvedErrors}</h2>
          </div>
        </div>

        <div className="error-stat-card">
          <div className="error-stat-icon green">
            ✓
          </div>
          <div>
            <p>Resolved</p>
            <h2>{stats.resolvedErrors}</h2>
          </div>
        </div>
      </div>

      {/* ======================================
          SMART PROBLEM SOLVER
      ====================================== */}

      <section
        className="error-table-card"
        style={{
          marginBottom: 24,
          padding: 24,
        }}
      >
        <span className="error-monitoring-eyebrow">
          RULE-BASED TROUBLESHOOTING
        </span>

        <h2 style={{ marginTop: 8 }}>
          🛠️ Smart Problem Solver
        </h2>

        <p
          style={{
            color: "#64748b",
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          Enter your coding error to get possible causes,
          step-by-step solutions, example code and
          verification instructions. No AI required.
        </p>

        <label
          htmlFor="tracex-problem-input"
          style={{
            display: "block",
            marginTop: 18,
            fontWeight: 600,
          }}
        >
          Describe Your Problem
        </label>

        <textarea
          id="tracex-problem-input"
          value={problemInput}
          onChange={(event) => {
            setProblemInput(event.target.value);
            setProblemResult(null);
            setSolveError("");
            setSolverChecked([]);
            setSolverVerified(false);
            setSolverNotes("");
            setSolverSaveMessage("");
            setSavedCurrentSolution(false);
          }}
          placeholder="Example: MongoDB connection failed: server selection timed out"
          rows={4}
          maxLength={10000}
          style={{
            ...textareaStyle,
            marginTop: 10,
          }}
        />

        <p
          style={{
            fontSize: 12,
            color: "#64748b",
          }}
        >
          Do not enter passwords, API keys, tokens
          or other secrets.
        </p>

        <button
          type="button"
          onClick={handleSolveProblem}
          disabled={solving || !problemInput.trim()}
          style={{
            ...primaryButtonStyle,
            marginTop: 12,
            opacity:
              solving || !problemInput.trim()
                ? 0.65
                : 1,
          }}
        >
          {solving
            ? "⏳ Finding Solution..."
            : "🔍 Find Solution"}
        </button>

        {solveError && (
          <div
            role="alert"
            className="error-api-message"
            style={{ marginTop: 16 }}
          >
            ⚠ {solveError}
          </div>
        )}

        {/* SMART SOLVER RESULT */}

        {problemResult && (
          <div style={panelStyle}>
            <h3 style={{ color: "#0f172a" }}>
              {problemResult.matched
                ? "✓ Matching Solution Found"
                : "ℹ More Information Required"}
            </h3>

            <h3
              style={{
                color: "#1e293b",
                fontSize: 18,
              }}
            >
              {problemResult.title}
            </h3>

            <p style={{ color: "#475569" }}>
              <strong>Category:</strong>{" "}
              {problemResult.category}
            </p>

            <p
              style={{
                color: "#64748b",
                fontSize: 13,
              }}
            >
              {problemResult.message}
            </p>

            {/* POSSIBLE ROOT CAUSES */}

            {Array.isArray(problemResult.possibleCauses) &&
              problemResult.possibleCauses.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h4>🧠 Possible Root Causes</h4>

                  <ul
                    style={{
                      paddingLeft: 24,
                      lineHeight: 1.8,
                      color: "#334155",
                    }}
                  >
                    {problemResult.possibleCauses.map(
                      (cause, index) => (
                        <li key={index}>{cause}</li>
                      )
                    )}
                  </ul>
                </div>
              )}

            {/* INTERACTIVE CHECKLIST */}

            <div style={{ marginTop: 20 }}>
              <h4>
                🛠️ Step-by-Step Solution Checklist
              </h4>

              <p
                style={{
                  fontSize: 13,
                  color: "#64748b",
                }}
              >
                Complete each step and tick its checkbox.
                These are suggested fixes, not guaranteed
                solutions.
              </p>

              <Checklist
                steps={solverSteps}
                checked={solverChecked}
                onToggle={toggleSolverStep}
              />

              <ProgressBar
                completed={solverCompleted}
                total={solverSteps.length}
              />
            </div>

            {/* EXAMPLE CODE */}

            {problemResult.codeExample && (
              <div style={{ marginTop: 20 }}>
                <h4>💻 Example Code</h4>

                <pre
                  style={{
                    padding: 16,
                    background: "#0f172a",
                    color: "#e2e8f0",
                    borderRadius: 10,
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  <code>
                    {problemResult.codeExample}
                  </code>
                </pre>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(problemResult.codeExample)
                      .catch(console.error);
                  }}
                  style={{
                    padding: "9px 14px",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    background: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  📋 Copy Code
                </button>

                <p
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                  }}
                >
                  Review and adapt this example before
                  using it in your project.
                </p>
              </div>
            )}

            {/* VERIFICATION INSTRUCTIONS */}

            {problemResult.verification && (
              <div
                style={{
                  marginTop: 22,
                  padding: 16,
                  background: "#eef2ff",
                  borderRadius: 10,
                }}
              >
                <h4 style={{ color: "#312e81" }}>
                  🧪 Verify the Fix
                </h4>

                <p
                  style={{
                    color: "#475569",
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  {problemResult.verification}
                </p>

                <small style={{ color: "#64748b" }}>
                  Verification must be performed manually.
                </small>
              </div>
            )}

            {/* MANUAL VERIFICATION AND SAVE */}

            {problemResult.matched && (
              <>
                <div
                  style={{
                    marginTop: 20,
                    padding: 16,
                    background: "#f0fdf4",
                    borderRadius: 10,
                  }}
                >
                  <h4>✅ Confirm Fix</h4>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={solverVerified}
                      disabled={
                        solverProgress !== 100 ||
                        savedCurrentSolution
                      }
                      onChange={(event) => {
                        setSolverVerified(
                          event.target.checked
                        );
                        setSolverSaveMessage("");
                      }}
                    />

                    I manually tested the affected feature
                    and confirmed that the problem is fixed.
                  </label>

                  {solverProgress !== 100 && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                      }}
                    >
                      Complete all checklist steps first.
                    </p>
                  )}
                </div>

                <div style={{ marginTop: 22 }}>
                  <label
                    htmlFor="tracex-solver-notes"
                    style={{
                      display: "block",
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    📝 Resolution Notes
                  </label>

                  <textarea
                    id="tracex-solver-notes"
                    value={solverNotes}
                    onChange={(event) => {
                      setSolverNotes(event.target.value);
                      setSolverVerified(false);
                      setSolverSaveMessage("");
                      setSavedCurrentSolution(false);
                    }}
                    placeholder="What caused the issue? What did you change? How did you test the fix?"
                    rows={4}
                    maxLength={2000}
                    style={textareaStyle}
                  />
                </div>

                <button
                  type="button"
                  onClick={saveSolverHistory}
                  disabled={
                    savingHistory ||
                    savedCurrentSolution ||
                    solverProgress !== 100 ||
                    !solverVerified ||
                    !solverNotes.trim()
                  }
                  style={{
                    ...primaryButtonStyle,
                    marginTop: 14,
                    background: "#059669",
                    opacity:
                      savingHistory ||
                      savedCurrentSolution ||
                      solverProgress !== 100 ||
                      !solverVerified ||
                      !solverNotes.trim()
                        ? 0.55
                        : 1,
                  }}
                >
                  {savingHistory
                    ? "⏳ Saving to MongoDB..."
                    : savedCurrentSolution
                      ? "✓ Saved in MongoDB"
                      : "💾 Save Solution History"}
                </button>

                {solverSaveMessage && (
                  <p
                    role="status"
                    style={{
                      marginTop: 12,
                      color: solverSaveMessage.startsWith("✓")
                        ? "#047857"
                        : "#b45309",
                      fontWeight: 600,
                    }}
                  >
                    {solverSaveMessage}
                  </p>
                )}
              </>
            )}

            <p
              style={{
                marginTop: 18,
                fontSize: 12,
                color: "#64748b",
              }}
            >
              Analysis type:{" "}
              <strong>
                {problemResult.analysisType || "rule-based"}
              </strong>
            </p>
          </div>
        )}

        {/* ======================================
            NEW: MONGODB SOLUTION HISTORY
        ====================================== */}

        <div style={{ marginTop: 28 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h3>📚 Saved Solution History</h3>

            <button
              type="button"
              onClick={() => fetchSolverHistory()}
              disabled={historyLoading}
              style={{
                padding: "8px 14px",
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                background: "#ffffff",
                cursor: "pointer",
              }}
            >
              ↻ Refresh History
            </button>
          </div>

          <p
            style={{
              fontSize: 13,
              color: "#64748b",
            }}
          >
            Completed solutions are stored in MongoDB
            and linked to your logged-in account.
          </p>

          {historyError && (
            <div
              className="error-api-message"
              role="alert"
              style={{ marginTop: 12 }}
            >
              ⚠ {historyError}
            </div>
          )}

          {historyLoading ? (
            <p style={{ color: "#64748b" }}>
              Loading saved solutions...
            </p>
          ) : solverHistory.length === 0 ? (
            <p style={{ color: "#64748b" }}>
              No solutions saved in MongoDB yet.
            </p>
          ) : (
            solverHistory.map((entry) => (
              <div
                key={entry._id}
                style={{
                  marginTop: 12,
                  padding: 16,
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong style={{ color: "#047857" }}>
                      ✓ {entry.title}
                    </strong>

                    <p
                      style={{
                        margin: "6px 0",
                        fontSize: 12,
                        color: "#64748b",
                      }}
                    >
                      {formatDate(entry.createdAt)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      deleteSolverHistory(entry._id)
                    }
                    disabled={
                      deletingHistoryId === entry._id
                    }
                    style={{
                      padding: "7px 12px",
                      border: "1px solid #fecaca",
                      borderRadius: 8,
                      background: "#fff1f2",
                      color: "#b91c1c",
                      cursor: "pointer",
                      opacity:
                        deletingHistoryId === entry._id
                          ? 0.6
                          : 1,
                    }}
                  >
                    {deletingHistoryId === entry._id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>

                <p
                  style={{
                    fontSize: 13,
                    color: "#334155",
                    overflowWrap: "anywhere",
                  }}
                >
                  <strong>Category:</strong>{" "}
                  {entry.category || "General"}
                </p>

                <p
                  style={{
                    fontSize: 13,
                    color: "#334155",
                    overflowWrap: "anywhere",
                  }}
                >
                  <strong>Problem:</strong>{" "}
                  {entry.problem}
                </p>

                <p
                  style={{
                    fontSize: 13,
                    color: "#334155",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  <strong>Resolution:</strong>{" "}
                  {entry.notes}
                </p>

                <small style={{ color: "#64748b" }}>
                  {entry.stepsCompleted}/{entry.totalSteps}{" "}
                  steps completed ·{" "}
                  {entry.verified
                    ? "Manually verified"
                    : "Not verified"}
                </small>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ======================================
          DETECTED ERRORS
      ====================================== */}

      <section className="error-table-card">
        <div className="error-table-heading">
          <div>
            <span className="error-monitoring-eyebrow">
              ERROR HISTORY
            </span>

            <h2>Detected Errors</h2>
          </div>

          <div className="error-filters">
            <select
              value={severity}
              onChange={handleSeverityChange}
              aria-label="Filter by severity"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={status}
              onChange={handleStatusChange}
              aria-label="Filter by status"
            >
              <option value="">All Status</option>
              <option value="false">Unresolved</option>
              <option value="true">Resolved</option>
            </select>
          </div>
        </div>

        {errorMessage && (
          <div
            className="error-api-message"
            role="alert"
          >
            ⚠ {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="error-empty-state">
            Loading error logs...
          </div>
        ) : errors.length === 0 ? (
          <div className="error-empty-state">
            <span>✓</span>
            <h3>No errors found</h3>
            <p>
              No error logs match your selected filters.
            </p>
          </div>
        ) : (
          <div className="error-table-wrapper">
            <table className="error-table">
              <thead>
                <tr>
                  <th>Error</th>
                  <th>Method / Route</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Detected At</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {errors.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div className="error-message-cell">
                        <strong>{item.message}</strong>
                        <span>
                          HTTP {item.statusCode}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="error-route-cell">
                        <span>{item.method}</span>
                        <code>{item.route}</code>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`error-severity-badge ${
                          item.severity || "medium"
                        }`}
                      >
                        {item.severity || "medium"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`error-status-badge ${
                          item.resolved
                            ? "resolved"
                            : "unresolved"
                        }`}
                      >
                        {item.resolved
                          ? "✓ Resolved"
                          : "● Unresolved"}
                      </span>
                    </td>

                    <td>
                      {formatDate(item.createdAt)}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="error-view-btn"
                        onClick={() =>
                          openErrorDetails(item)
                        }
                      >
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}

        <div className="error-pagination">
          <span>
            Page {page} of {totalPages}
          </span>

          <div>
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() =>
                setPage((previous) => previous - 1)
              }
            >
              Previous
            </button>

            <button
              type="button"
              disabled={
                loading || page >= totalPages
              }
              onClick={() =>
                setPage((previous) => previous + 1)
              }
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* ======================================
          ERROR DETAILS POPUP
      ====================================== */}

      {selectedError && (
        <div
          className="error-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeErrorDetails();
            }
          }}
        >
          <div
            className="error-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="error-modal-title"
            style={{
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* MODAL HEADER */}

            <div className="error-modal-header">
              <div>
                <span className="error-monitoring-eyebrow">
                  ERROR DETAILS
                </span>

                <h2 id="error-modal-title">
                  🐞 Detected Error
                </h2>
              </div>

              <button
                type="button"
                className="error-modal-close"
                onClick={closeErrorDetails}
                disabled={updating || analyzing}
                aria-label="Close error details"
              >
                ✕
              </button>
            </div>

            {/* MODAL BODY */}

            <div className="error-modal-body">
              <div className="error-modal-message">
                <span>Error Message</span>
                <p>{selectedError.message}</p>
              </div>

              {/* ERROR INFORMATION */}

              <div className="error-modal-info-grid">
                <div className="error-modal-info-box">
                  <span>Severity</span>
                  <strong>
                    {selectedError.severity || "Unknown"}
                  </strong>
                </div>

                <div className="error-modal-info-box">
                  <span>Status</span>
                  <strong>
                    {selectedError.resolved
                      ? "✓ Resolved"
                      : "● Unresolved"}
                  </strong>
                </div>

                <div className="error-modal-info-box">
                  <span>HTTP Status</span>
                  <strong>
                    {selectedError.statusCode || "N/A"}
                  </strong>
                </div>

                <div className="error-modal-info-box">
                  <span>Method</span>
                  <strong>
                    {selectedError.method || "N/A"}
                  </strong>
                </div>

                <div className="error-modal-info-box">
                  <span>API Route</span>
                  <strong className="error-modal-route">
                    {selectedError.route || "Unknown"}
                  </strong>
                </div>

                <div className="error-modal-info-box">
                  <span>Source</span>
                  <strong>
                    {selectedError.source || "Unknown"}
                  </strong>
                </div>

                <div className="error-modal-info-box">
                  <span>Detected At</span>
                  <strong>
                    {formatDate(selectedError.createdAt)}
                  </strong>
                </div>

                <div className="error-modal-info-box">
                  <span>Last Updated</span>
                  <strong>
                    {formatDate(selectedError.updatedAt)}
                  </strong>
                </div>
              </div>

              {modalError && (
                <div
                  className="error-api-message"
                  role="alert"
                >
                  ⚠ {modalError}
                </div>
              )}

              {/* ERROR ANALYSIS */}

              <div
                style={{
                  marginTop: 24,
                  paddingTop: 20,
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <h3>🔍 Error Analysis</h3>

                <p
                  style={{
                    fontSize: 13,
                    color: "#64748b",
                  }}
                >
                  Analyze this error to see possible
                  causes and suggested fixes.
                </p>

                <button
                  type="button"
                  onClick={handleAnalyzeError}
                  disabled={analyzing}
                  style={{
                    ...primaryButtonStyle,
                    width: "100%",
                    opacity: analyzing ? 0.65 : 1,
                  }}
                >
                  {analyzing
                    ? "⏳ Analyzing Error..."
                    : "🔍 Analyze Error"}
                </button>

                {analysisError && (
                  <div
                    role="alert"
                    className="error-api-message"
                    style={{ marginTop: 14 }}
                  >
                    ⚠ {analysisError}
                  </div>
                )}

                {/* ANALYSIS RESULT */}

                {analysis && (
                  <div style={panelStyle}>
                    <h3>Analysis Result</h3>

                    <div style={{ marginBottom: 16 }}>
                      <strong>ERROR CATEGORY</strong>
                      <p>
                        {analysis.category || "Unknown"}
                      </p>
                    </div>

                    <div style={{ marginBottom: 18 }}>
                      <strong>
                        🧠 Possible Root Cause
                      </strong>

                      <p
                        style={{
                          color: "#475569",
                          lineHeight: 1.7,
                        }}
                      >
                        {analysis.possibleCause ||
                          "Cause could not be determined."}
                      </p>
                    </div>

                    {/* DETECTED ERROR CHECKLIST */}

                    <div style={{ marginTop: 20 }}>
                      <h4>
                        🛠️ Step-by-Step Solution Checklist
                      </h4>

                      <p
                        style={{
                          fontSize: 13,
                          color: "#64748b",
                        }}
                      >
                        Follow the suggestions and tick
                        each completed step.
                      </p>

                      <Checklist
                        steps={suggestions}
                        checked={solution.checked}
                        onToggle={toggleSolutionStep}
                      />

                      <ProgressBar
                        completed={completedCount}
                        total={suggestions.length}
                      />
                    </div>

                    {/* VERIFY FIX */}

                    <div
                      style={{
                        marginTop: 22,
                        padding: 14,
                        background: "#eef2ff",
                        borderRadius: 10,
                      }}
                    >
                      <h4>🧪 Verify the Fix</h4>

                      <p
                        style={{
                          fontSize: 13,
                          color: "#475569",
                          lineHeight: 1.6,
                        }}
                      >
                        Manually retry the affected API
                        or workflow and confirm the original
                        problem no longer occurs.
                      </p>

                      <label
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start",
                          fontSize: 13,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={solution.verified}
                          disabled={!checklistComplete}
                          onChange={(event) =>
                            updateSolution({
                              verified: event.target.checked,
                            })
                          }
                        />

                        I retested the affected feature
                        and confirmed it works.
                      </label>
                    </div>

                    {/* RESOLUTION NOTES */}

                    <div style={{ marginTop: 20 }}>
                      <label
                        htmlFor="tracex-resolution-notes"
                        style={{
                          display: "block",
                          fontWeight: 700,
                          marginBottom: 8,
                        }}
                      >
                        📝 Resolution Notes
                      </label>

                      <textarea
                        id="tracex-resolution-notes"
                        value={solution.notes}
                        onChange={(event) =>
                          updateSolution({
                            notes: event.target.value,
                            verified: false,
                          })
                        }
                        placeholder="What caused the issue? What did you change? How did you retest it?"
                        rows={4}
                        maxLength={2000}
                        style={textareaStyle}
                      />

                      <p
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                        }}
                      >
                        Detected-error checklist progress
                        and notes remain saved locally
                        in this browser.
                      </p>
                    </div>

                    {/* DETECTED ERROR HISTORY */}

                    <div style={{ marginTop: 20 }}>
                      <h4>📚 Solution History</h4>

                      {solution.history.length === 0 ? (
                        <p
                          style={{
                            fontSize: 13,
                            color: "#64748b",
                          }}
                        >
                          No completed solution recorded yet.
                        </p>
                      ) : (
                        solution.history.map((entry) => (
                          <div
                            key={entry.id}
                            style={{
                              padding: 12,
                              marginBottom: 8,
                              background: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: 9,
                            }}
                          >
                            <strong
                              style={{
                                color: "#047857",
                              }}
                            >
                              ✓ Resolved ·{" "}
                              {formatDate(entry.date)}
                            </strong>

                            <p
                              style={{
                                fontSize: 13,
                                whiteSpace: "pre-wrap",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {entry.notes}
                            </p>

                            <small
                              style={{
                                color: "#64748b",
                              }}
                            >
                              {entry.stepsCompleted}/
                              {entry.totalSteps} steps ·{" "}
                              {entry.verification}
                            </small>
                          </div>
                        ))
                      )}
                    </div>

                    <p
                      style={{
                        marginTop: 18,
                        fontSize: 12,
                        color: "#64748b",
                      }}
                    >
                      Analysis type:{" "}
                      <strong>
                        {analysis.analysisType ||
                          "rule-based"}
                      </strong>
                      . These are possible causes,
                      not a confirmed diagnosis.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* MODAL FOOTER */}

            <div className="error-modal-footer">
              <button
                type="button"
                className="error-modal-cancel"
                onClick={closeErrorDetails}
                disabled={updating || analyzing}
              >
                Close
              </button>

              <button
                type="button"
                className={`error-modal-action ${
                  selectedError.resolved
                    ? "reopen"
                    : "resolve"
                }`}
                onClick={handleUpdateStatus}
                disabled={
                  updating ||
                  analyzing ||
                  (!selectedError.resolved &&
                    !readyToResolve)
                }
                title={
                  !selectedError.resolved &&
                  !readyToResolve
                    ? "Complete checklist, verification and notes first"
                    : undefined
                }
              >
                {updating
                  ? "Updating..."
                  : selectedError.resolved
                    ? "↻ Reopen Error"
                    : "✓ Mark as Resolved"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
