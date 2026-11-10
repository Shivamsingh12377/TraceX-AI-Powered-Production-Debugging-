
import { useCallback, useEffect, useState } from "react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import "./ReportsAnalytics.css";

const API_URL =
  "http://localhost:5000/api/errors/analytics";

const SEVERITY_COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

const STATUS_COLORS = ["#10b981", "#ef4444"];
const DAY_OPTIONS = [7, 30, 90];

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

function formatFullDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatPeriodEnd(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setUTCDate(date.getUTCDate() - 1);

  return formatFullDate(date.toISOString());
}

function ChartEmptyState() {
  return (
    <div className="reports-chart-empty">
      <span>📭</span>
      <p>No error data available for this period.</p>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="reports-custom-tooltip">
      {label && <strong>{label}</strong>}

      {payload.map((entry, index) => (
        <p
          key={index}
          style={{
            color: entry.color || "#334155",
          }}
        >
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

function escapeCSV(value) {
  const text = String(value ?? "");

  // Prevent spreadsheet formula execution
  // when the CSV is opened in Excel.
  const safeText = /^[\s]*[=+\-@\t\r]/.test(text)
    ? `'${text}`
    : text;

  return `"${safeText.replace(/"/g, '""')}"`;
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ReportsAnalytics() {
  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [exportError, setExportError] = useState("");

  const fetchAnalytics = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setError("");
        setExportError("");
        setAnalytics(null);

        const token = localStorage.getItem("tracexToken");
        const headers = {};

        if (token) {
          headers.Authorization = `Bearer ${token.trim()}`;
        }

        const response = await fetch(
          `${API_URL}?days=${days}`,
          {
            method: "GET",
            headers,
            signal,
          }
        );

        const result = await response.json();

        if (!response.ok || result.success !== true) {
          throw new Error(
            result.message || "Failed to load analytics."
          );
        }

        if (!signal.aborted) {
          setAnalytics(result.data);
        }
      } catch (err) {
        if (err.name !== "AbortError" && !signal.aborted) {
          setError(
            err.message || "Unable to load analytics."
          );
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    },
    [days]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchAnalytics(controller.signal);

    return () => controller.abort();
  }, [fetchAnalytics, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((previous) => previous + 1);
  };

  const summary = analytics?.summary || {
    totalErrors: 0,
    criticalErrors: 0,
    resolvedErrors: 0,
    unresolvedErrors: 0,
    resolutionRate: 0,
  };

  const severityDistribution =
    analytics?.severityDistribution || {};

  const resolutionStatus =
    analytics?.resolutionStatus || {};

  const dailyTrends = Array.isArray(analytics?.dailyTrends)
    ? analytics.dailyTrends
    : [];

  const severityData = [
    {
      name: "Critical",
      count: severityDistribution.critical || 0,
      fill: SEVERITY_COLORS.critical,
    },
    {
      name: "High",
      count: severityDistribution.high || 0,
      fill: SEVERITY_COLORS.high,
    },
    {
      name: "Medium",
      count: severityDistribution.medium || 0,
      fill: SEVERITY_COLORS.medium,
    },
    {
      name: "Low",
      count: severityDistribution.low || 0,
      fill: SEVERITY_COLORS.low,
    },
  ];

  const resolutionData = [
    {
      name: "Resolved",
      value: resolutionStatus.resolved || 0,
    },
    {
      name: "Unresolved",
      value: resolutionStatus.unresolved || 0,
    },
  ];

  const trendData = dailyTrends.map((item) => ({
    date: formatDate(item.date),
    errors: item.count || 0,
  }));

  const hasErrors = summary.totalErrors > 0;

  const hasSeverityData = severityData.some(
    (item) => item.count > 0
  );

  const hasResolutionData = resolutionData.some(
    (item) => item.value > 0
  );

  // ===================================
  // CSV EXPORT
  // ===================================

  const handleExportCSV = () => {
    if (!analytics || loading) return;

    try {
      setExportError("");

      const rows = [
        ["TraceX Reports & Analytics"],
        ["Period (Days)", analytics.days],
        ["Start Date (UTC)", analytics.startDate],
        ["End Date (Exclusive, UTC)", analytics.endDate],
        [],
        ["SUMMARY", "Count"],
        ["Total Errors", summary.totalErrors],
        ["Critical Errors", summary.criticalErrors],
        ["Resolved Errors", summary.resolvedErrors],
        ["Unresolved Errors", summary.unresolvedErrors],
        ["Resolution Rate (%)", summary.resolutionRate],
        [],
        ["SEVERITY DISTRIBUTION", "Count"],
        ...severityData.map((item) => [
          item.name,
          item.count,
        ]),
        [],
        ["RESOLUTION STATUS", "Count"],
        ...resolutionData.map((item) => [
          item.name,
          item.value,
        ]),
        [],
        ["DAILY ERROR TRENDS (UTC)", "Count"],
        ...dailyTrends.map((item) => [
          item.date,
          item.count,
        ]),
      ];

      const csv = rows
        .map((row) => row.map(escapeCSV).join(","))
        .join("\r\n");

      const filename =
        `TraceX_Analytics_${days}_Days.csv`;

      downloadBlob(
        "\uFEFF" + csv,
        filename,
        "text/csv;charset=utf-8;"
      );
    } catch (err) {
      setExportError(
        err.message || "CSV export failed."
      );
    }
  };

  // ===================================
  // PDF EXPORT
  // ===================================

  const handleExportPDF = () => {
    if (!analytics || loading) return;

    try {
      setExportError("");

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, pageWidth, 38, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(21);
      doc.text("TraceX", 14, 18);

      doc.setFontSize(12);
      doc.text("Reports & Analytics", 14, 28);

      doc.setTextColor(51, 65, 85);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(
        `Reporting Period: Last ${analytics.days} Days`,
        14,
        48
      );

      doc.text(
        `From: ${formatFullDate(analytics.startDate)}`,
        14,
        55
      );

      doc.text(
        `To: ${formatPeriodEnd(analytics.endDate)}`,
        14,
        62
      );

      doc.text(
        `Generated: ${new Date().toLocaleString("en-IN")}`,
        14,
        69
      );

      autoTable(doc, {
        startY: 78,
        head: [["Summary Metric", "Value"]],
        body: [
          ["Total Errors", summary.totalErrors],
          ["Critical Errors", summary.criticalErrors],
          ["Resolved Errors", summary.resolvedErrors],
          ["Unresolved Errors", summary.unresolvedErrors],
          [
            "Resolution Rate",
            `${summary.resolutionRate}%`,
          ],
        ],
        theme: "grid",
        headStyles: {
          fillColor: [79, 70, 229],
        },
        styles: {
          fontSize: 10,
        },
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 12,
        head: [["Severity", "Error Count"]],
        body: severityData.map((item) => [
          item.name,
          item.count,
        ]),
        theme: "striped",
        headStyles: {
          fillColor: [79, 70, 229],
        },
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 12,
        head: [["Resolution Status", "Count"]],
        body: resolutionData.map((item) => [
          item.name,
          item.value,
        ]),
        theme: "striped",
        headStyles: {
          fillColor: [79, 70, 229],
        },
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 12,
        head: [["Date (UTC)", "Errors Detected"]],
        body: dailyTrends.map((item) => [
          item.date,
          item.count,
        ]),
        theme: "striped",
        headStyles: {
          fillColor: [79, 70, 229],
        },
      });

      const pageCount =
        doc.internal.getNumberOfPages();

      for (let page = 1; page <= pageCount; page++) {
        doc.setPage(page);
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);

        doc.text(
          `TraceX Analytics | Page ${page} of ${pageCount}`,
          14,
          doc.internal.pageSize.getHeight() - 10
        );
      }

      doc.save(
        `TraceX_Analytics_${days}_Days.pdf`
      );
    } catch (err) {
      setExportError(
        err.message || "PDF export failed."
      );
    }
  };

  return (
    <div className="reports-page">
      {/* HEADER */}

      <div className="reports-header">
        <div>
          <span className="reports-eyebrow">
            TRACEX INSIGHTS
          </span>

          <h1>📈 Reports & Analytics</h1>

          <p>
            Analyze application errors, monitor
            resolution performance, and track
            trends using real MongoDB data.
          </p>
        </div>

        <div className="reports-header-actions">
          <button
            type="button"
            className="reports-refresh-btn"
            onClick={handleRefresh}
            disabled={loading}
          >
            ↻ {loading
              ? "Refreshing..."
              : "Refresh Analytics"}
          </button>
        </div>
      </div>

      {/* FILTER BAR AND EXPORT BUTTONS */}

      <div className="reports-filter-bar">
        <div>
          <strong>📅 Time Period</strong>

          <p>
            Select a period to analyze error activity.
          </p>
        </div>

        <div className="reports-filter-buttons">
          {DAY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`reports-filter-btn ${
                days === option ? "active" : ""
              }`}
              onClick={() => setDays(option)}
              aria-pressed={days === option}
            >
              Last {option} Days
            </button>
          ))}
        </div>

        <div className="reports-export-actions">
          <button
            type="button"
            className="reports-export-btn csv"
            onClick={handleExportCSV}
            disabled={loading || !analytics}
          >
            📥 Export CSV
          </button>

          <button
            type="button"
            className="reports-export-btn pdf"
            onClick={handleExportPDF}
            disabled={loading || !analytics}
          >
            📄 Export PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="reports-error" role="alert">
          ⚠ {error}

          <button
            type="button"
            onClick={handleRefresh}
          >
            Retry
          </button>
        </div>
      )}

      {exportError && (
        <div className="reports-error" role="alert">
          ⚠ {exportError}
        </div>
      )}

      {loading && (
        <div className="reports-loading" role="status">
          <div className="reports-spinner" />

          <p>Loading analytics from MongoDB...</p>
        </div>
      )}

      {!loading && !error && analytics && (
        <>
          {/* PERIOD INFORMATION */}

          <div className="reports-period-info">
            <span>
              Showing analytics for the last{" "}
              <strong>{days} days</strong>
            </span>

            <span>
              {formatFullDate(analytics.startDate)}
              {" — "}
              {formatPeriodEnd(analytics.endDate)}
            </span>
          </div>

          {/* STATISTICS CARDS */}

          <div className="reports-stats-grid">
            <div className="reports-stat-card">
              <div className="reports-stat-icon purple">
                🐞
              </div>

              <div>
                <span>Total Errors</span>
                <strong>{summary.totalErrors}</strong>
                <small>In selected period</small>
              </div>
            </div>

            <div className="reports-stat-card">
              <div className="reports-stat-icon red">
                🚨
              </div>

              <div>
                <span>Critical Errors</span>
                <strong>{summary.criticalErrors}</strong>
                <small>Highest severity</small>
              </div>
            </div>

            <div className="reports-stat-card">
              <div className="reports-stat-icon orange">
                ⏳
              </div>

              <div>
                <span>Unresolved Errors</span>
                <strong>{summary.unresolvedErrors}</strong>
                <small>Need attention</small>
              </div>
            </div>

            <div className="reports-stat-card">
              <div className="reports-stat-icon green">
                ✅
              </div>

              <div>
                <span>Resolved Errors</span>
                <strong>{summary.resolvedErrors}</strong>
                <small>Marked as resolved</small>
              </div>
            </div>
          </div>

          {/* RESOLUTION OVERVIEW */}

          <div className="reports-section">
            <div className="reports-section-heading">
              <div>
                <h2>🎯 Resolution Overview</h2>
                <p>
                  Percentage of errors currently
                  marked as resolved.
                </p>
              </div>

              <strong className="reports-rate">
                {summary.resolutionRate}%
              </strong>
            </div>

            <div className="reports-progress">
              <div
                className="reports-progress-fill"
                style={{
                  width: `${summary.resolutionRate}%`,
                }}
              />
            </div>

            <div className="reports-progress-labels">
              <span>
                Resolved: {summary.resolvedErrors}
              </span>

              <span>
                Total: {summary.totalErrors}
              </span>
            </div>
          </div>

          {/* SEVERITY AND RESOLUTION CHARTS */}

          <div className="reports-charts-grid">
            <div className="reports-section">
              <div className="reports-section-heading">
                <div>
                  <h2>📊 Severity Distribution</h2>
                  <p>Errors grouped by severity.</p>
                </div>
              </div>

              {hasSeverityData ? (
                <div className="reports-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={severityData}
                      margin={{
                        top: 15,
                        right: 15,
                        left: -15,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />

                      <XAxis
                        dataKey="name"
                        tick={{
                          fontSize: 12,
                          fill: "#64748b",
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        allowDecimals={false}
                        tick={{
                          fontSize: 12,
                          fill: "#64748b",
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <Tooltip content={<CustomTooltip />} />

                      <Bar
                        dataKey="count"
                        name="Errors"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={55}
                      >
                        {severityData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={entry.fill}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <ChartEmptyState />
              )}
            </div>

            <div className="reports-section">
              <div className="reports-section-heading">
                <div>
                  <h2>🍩 Resolution Status</h2>
                  <p>Resolved versus unresolved errors.</p>
                </div>
              </div>

              {hasResolutionData ? (
                <div className="reports-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={resolutionData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={65}
                        outerRadius={105}
                        paddingAngle={3}
                        labelLine={false}
                      >
                        {resolutionData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={STATUS_COLORS[index]}
                          />
                        ))}
                      </Pie>

                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <ChartEmptyState />
              )}
            </div>
          </div>

          {/* DAILY TRENDS */}

          <div className="reports-section">
            <div className="reports-section-heading">
              <div>
                <h2>📈 Daily Error Trends</h2>
                <p>
                  Errors detected each day during
                  the selected period (UTC).
                </p>
              </div>
            </div>

            {hasErrors ? (
              <div className="reports-chart-container reports-chart-wide">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendData}
                    margin={{
                      top: 15,
                      right: 25,
                      left: -15,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />

                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 11,
                        fill: "#64748b",
                      }}
                      minTickGap={25}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      allowDecimals={false}
                      tick={{
                        fontSize: 12,
                        fill: "#64748b",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip content={<CustomTooltip />} />
                    <Legend />

                    <Line
                      type="monotone"
                      dataKey="errors"
                      name="Errors"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={
                        days === 7
                          ? { r: 4, fill: "#6366f1" }
                          : false
                      }
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <ChartEmptyState />
            )}
          </div>

          {/* SEVERITY BREAKDOWN */}

          <div className="reports-section">
            <div className="reports-section-heading">
              <div>
                <h2>📋 Severity Breakdown</h2>
                <p>Detailed counts by severity.</p>
              </div>
            </div>

            <div className="reports-severity-list">
              {severityData.map((item) => {
                const percentage =
                  summary.totalErrors > 0
                    ? (
                        (item.count / summary.totalErrors) *
                        100
                      ).toFixed(1)
                    : "0.0";

                return (
                  <div
                    className="reports-severity-row"
                    key={item.name}
                  >
                    <div className="reports-severity-label">
                      <span
                        className="reports-severity-dot"
                        style={{ background: item.fill }}
                      />
                      <strong>{item.name}</strong>
                    </div>

                    <div className="reports-severity-track">
                      <div
                        style={{
                          width: `${percentage}%`,
                          background: item.fill,
                        }}
                      />
                    </div>

                    <span className="reports-severity-value">
                      {item.count} ({percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
