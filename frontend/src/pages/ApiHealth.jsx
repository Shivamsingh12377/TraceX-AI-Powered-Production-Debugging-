
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// EXISTING SHARED SOCKET.IO CONNECTION
import { socket } from "../socket";

import "./ApiHealth.css";

// ==========================================
// API CONFIGURATION
// ==========================================

const API_URL =
  `${import.meta.env.VITE_API_URL}/api/api-health/analytics`;

// ==========================================
// DEFAULT SUMMARY
// ==========================================

const emptySummary = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  successRate: 0,
  failureRate: 0,
  averageResponseTime: 0,
  fastestResponseTime: 0,
  slowestResponseTime: 0,
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function ApiHealth() {
  // ========================================
  // STATE
  // ========================================

  const [days, setDays] = useState(7);

  const [summary, setSummary] = useState(emptySummary);

  const [endpointStats, setEndpointStats] = useState([]);

  const [dailyTrends, setDailyTrends] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [isConnected, setIsConnected] = useState(
    socket.connected
  );

  const [lastUpdated, setLastUpdated] = useState(null);

  // Used to ignore outdated API responses.
  const requestIdRef = useRef(0);

  // ========================================
  // FETCH ANALYTICS FROM MONGODB
  // ========================================

  const loadAnalytics = useCallback(
    async (showLoading = true) => {
      const requestId = ++requestIdRef.current;

      if (showLoading) {
        setLoading(true);
      }

      setError("");

      try {
        const response = await fetch(
          `${API_URL}?days=${days}`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load analytics (${response.status})`
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(
            result.message ||
              "Unable to load API analytics"
          );
        }

        // Ignore older responses.
        if (requestId !== requestIdRef.current) {
          return;
        }

        const data = result.data || {};

        setSummary({
          ...emptySummary,
          ...(data.summary || {}),
        });

        setEndpointStats(
          Array.isArray(data.endpointStats)
            ? data.endpointStats
            : []
        );

        setDailyTrends(
          Array.isArray(data.dailyTrends)
            ? data.dailyTrends
            : []
        );

        setLastUpdated(new Date());
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setError(
          err.message || "Unable to load API Health data"
        );
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [days]
  );

  // ========================================
  // INITIAL LOAD AND DATE FILTER CHANGES
  // ========================================

  useEffect(() => {
    loadAnalytics();

    return () => {
      // Invalidate pending responses on
      // filter change or component unmount.
      requestIdRef.current += 1;
    };
  }, [loadAnalytics]);

  // ========================================
  // SOCKET.IO LIVE MONITORING
  // ========================================

  useEffect(() => {
    let refreshTimer = null;

    const handleConnect = () => {
      setIsConnected(true);

      // Refresh after reconnecting to
      // retrieve any missed API requests.
      loadAnalytics(false);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleNewApiMetric = () => {
      // Multiple requests can arrive quickly.
      // Refresh once after a short delay
      // instead of making one fetch per event.

      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        loadAnalytics(false);
      }, 500);
    };

    // Register listeners on shared socket.
    socket.on("connect", handleConnect);

    socket.on("disconnect", handleDisconnect);

    socket.on("api:metric", handleNewApiMetric);

    // Handle an already connected socket.
    setIsConnected(socket.connected);

    // Existing shared socket may be connected
    // by another page or component.
    // Do not disconnect it during cleanup.

    return () => {
      socket.off("connect", handleConnect);

      socket.off("disconnect", handleDisconnect);

      socket.off("api:metric", handleNewApiMetric);

      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [loadAnalytics]);

  // ========================================
  // STATISTICS CARDS
  // ========================================

  const stats = [
    {
      label: "Total Requests",
      value: summary.totalRequests,
      icon: "📡",
    },
    {
      label: "Success Rate",
      value: `${summary.successRate}%`,
      icon: "✅",
    },
    {
      label: "Failed Requests",
      value: summary.failedRequests,
      icon: "❌",
    },
    {
      label: "Avg Response Time",
      value: `${summary.averageResponseTime} ms`,
      icon: "⏱️",
    },
  ];

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="api-health-page">
      {/* ==================================
          HEADER
      ================================== */}

      <div className="api-health-header">
        <div>
          <h2>API Health & Performance</h2>

          <p>
            Monitor TraceX backend requests,
            reliability, and response times.
          </p>

          {/* LIVE SOCKET STATUS */}

          <div
            className={`api-health-live-status ${
              isConnected
                ? "api-health-connected"
                : "api-health-disconnected"
            }`}
            role="status"
          >
            <span className="api-health-live-dot" />

            <span>
              {isConnected
                ? "Live Monitoring Connected"
                : "Live Monitoring Disconnected"}
            </span>
          </div>

          {/* LAST UPDATED */}

          {lastUpdated && (
            <p className="api-health-last-updated">
              Last updated:{" "}
              {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* FILTER AND REFRESH */}

        <div className="api-health-actions">
          <select
            value={days}
            onChange={(event) =>
              setDays(Number(event.target.value))
            }
            aria-label="Select analytics period"
          >
            <option value={1}>Last 24 Hours</option>

            <option value={7}>Last 7 Days</option>

            <option value={30}>Last 30 Days</option>
          </select>

          <button
            type="button"
            onClick={() => loadAnalytics()}
            disabled={loading}
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* ==================================
          ERROR MESSAGE
      ================================== */}

      {error && (
        <div
          className="api-health-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* ==================================
          STATISTICS CARDS
      ================================== */}

      <div className="api-health-stats">
        {stats.map((stat) => (
          <div
            className="api-health-stat-card"
            key={stat.label}
          >
            <span className="api-health-stat-icon">
              {stat.icon}
            </span>

            <p>{stat.label}</p>

            <h3>
              {loading ? "..." : stat.value}
            </h3>
          </div>
        ))}
      </div>

      {/* ==================================
          API REQUEST TRENDS CHART
      ================================== */}

      <div className="api-health-chart-card">
        <h3>API Request Trends</h3>

        {dailyTrends.length === 0 ? (
          <p>No request trend data available.</p>
        ) : (
          <div className="api-health-chart">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <AreaChart data={dailyTrends}>
                <defs>
                  <linearGradient
                    id="apiRequestsGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#6366f1"
                      stopOpacity={0.3}
                    />

                    <stop
                      offset="95%"
                      stopColor="#6366f1"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis dataKey="date" />

                <YAxis allowDecimals={false} />

                <Tooltip />

                <Area
                  type="monotone"
                  dataKey="requests"
                  name="Requests"
                  stroke="#6366f1"
                  fill="url(#apiRequestsGradient)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ==================================
          ENDPOINT PERFORMANCE TABLE
      ================================== */}

      <div className="api-health-table-card">
        <h3>Endpoint Performance</h3>

        <div className="api-health-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Method</th>

                <th>Endpoint</th>

                <th>Requests</th>

                <th>Failures</th>

                <th>Avg Time</th>

                <th>Max Time</th>
              </tr>
            </thead>

            <tbody>
              {endpointStats.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    No endpoint metrics available.
                  </td>
                </tr>
              ) : (
                endpointStats.map((endpoint) => (
                  <tr
                    key={`${endpoint.method}-${endpoint.route}`}
                  >
                    <td>
                      <span className="api-health-method">
                        {endpoint.method}
                      </span>
                    </td>

                    <td>{endpoint.route}</td>

                    <td>
                      {endpoint.totalRequests}
                    </td>

                    <td>
                      {endpoint.failedRequests}
                    </td>

                    <td>
                      {endpoint.averageResponseTime} ms
                    </td>

                    <td>
                      {endpoint.maxResponseTime} ms
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
