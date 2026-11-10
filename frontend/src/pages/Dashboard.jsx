
import { useCallback, useEffect, useState } from "react";
import { socket } from "../socket";
import "./Dashboard.css";

const API_URL = "http://localhost:5000/api/tasks";
const ACTIVITY_API_URL = "http://localhost:5000/api/activities";
const ACTIVITY_PAGE_SIZE = 10;

const CATEGORIES = [
  { name: "General", icon: "📁" },
  { name: "Frontend", icon: "💻" },
  { name: "Backend", icon: "⚙️" },
  { name: "Bug Fix", icon: "🐛" },
  { name: "Design", icon: "🎨" },
];

const ACTIVITY_FILTERS = [
  { value: "all", label: "All" },
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "status_changed", label: "Status Changed" },
  { value: "deleted", label: "Deleted" },
];

const ACTIVITY_DATE_FILTERS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "7days", label: "Last 7 Days" },
  { value: "30days", label: "Last 30 Days" },
];

const ACTIVITY_CONFIG = {
  created: {
    icon: "✨",
    label: "Task Created",
    color: "#16a34a",
    background: "#dcfce7",
  },
  updated: {
    icon: "✏️",
    label: "Task Updated",
    color: "#2563eb",
    background: "#dbeafe",
  },
  status_changed: {
    icon: "🔄",
    label: "Status Changed",
    color: "#7c3aed",
    background: "#ede9fe",
  },
  deleted: {
    icon: "🗑️",
    label: "Task Deleted",
    color: "#ea580c",
    background: "#ffedd5",
  },
};

function getDateKey(value) {
  return value ? String(value).slice(0, 10) : "";
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDueDate(value) {
  if (!value) return "No due date";

  const date = new Date(`${getDateKey(value)}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getDeadlineInfo(task) {
  if (!task?.dueDate) {
    return { label: "No due date", type: "none" };
  }

  if (task.status === "Completed") {
    return { label: "Completed", type: "completed" };
  }

  const dueDate = getDateKey(task.dueDate);
  const today = getTodayKey();

  if (dueDate < today) {
    return { label: "Overdue", type: "overdue" };
  }

  if (dueDate === today) {
    return { label: "Due Today", type: "today" };
  }

  const days = Math.ceil(
    (new Date(`${dueDate}T00:00:00Z`).getTime() -
      new Date(`${today}T00:00:00Z`).getTime()) /
      86400000
  );

  if (days <= 7) {
    return { label: "Due Soon", type: "soon" };
  }

  return { label: "Upcoming", type: "upcoming" };
}

function getCategory(task) {
  return String(task?.category || "General").trim() || "General";
}

function getLabels(task) {
  if (!Array.isArray(task?.labels)) return [];

  return task.labels
    .map((label) =>
      String(label || "")
        .trim()
        .replace(/^#/, "")
        .toLowerCase()
    )
    .filter(Boolean);
}

function formatActivityTime(value) {
  if (!value) return "Unknown time";

  const date = new Date(value);
  const diff = Date.now() - date.getTime();

  if (Number.isNaN(diff)) return "Unknown time";
  if (diff < 60000) return "Just now";

  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getActivityDateRange(filter) {
  if (filter === "all") return {};

  const now = new Date();

  if (filter === "today") {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    return {
      startDate: start.toISOString(),
      endDate: now.toISOString(),
    };
  }

  if (filter === "7days" || filter === "30days") {
    const days = filter === "7days" ? 7 : 30;

    return {
      startDate: new Date(
        now.getTime() - days * 86400000
      ).toISOString(),
      endDate: now.toISOString(),
    };
  }

  return {};
}

function getAuthHeaders() {
  const token = localStorage.getItem("tracexToken");

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

function buildActivityParams({
  page,
  action,
  search,
  dateFilter,
}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(ACTIVITY_PAGE_SIZE),
    action,
  });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  const dateRange = getActivityDateRange(dateFilter);

  if (dateRange.startDate) {
    params.set("startDate", dateRange.startDate);
  }

  if (dateRange.endDate) {
    params.set("endDate", dateRange.endDate);
  }

  return params;
}

const sectionStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "24px",
  marginTop: "24px",
};

const smallButtonStyle = {
  padding: "9px 15px",
  border: "1px solid #c4b5fd",
  borderRadius: "10px",
  backgroundColor: "#f5f3ff",
  color: "#6d28d9",
  fontWeight: 600,
  cursor: "pointer",
};

export default function Dashboard({ user, onNavigate }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] =
    useState(true);
  const [activitiesError, setActivitiesError] = useState("");

  const [activityFilter, setActivityFilter] = useState("all");
  const [activitySearch, setActivitySearch] = useState("");
  const [activityDateFilter, setActivityDateFilter] =
    useState("all");

  const [activityPage, setActivityPage] = useState(1);
  const [totalActivities, setTotalActivities] = useState(0);
  const [hasMoreActivities, setHasMoreActivities] =
    useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activityRefreshKey, setActivityRefreshKey] =
    useState(0);

  // Step 12.11.2: Delete History states
  const [activityToDelete, setActivityToDelete] =
    useState(null);
  const [deletingActivityId, setDeletingActivityId] =
    useState(null);
  const [deleteActivityError, setDeleteActivityError] =
    useState("");

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL, {
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to load tasks."
        );
      }

      const taskList = Array.isArray(result)
        ? result
        : Array.isArray(result.data)
        ? result.data
        : [];

      setTasks(taskList);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // ===================================
  // STEP 16.5: REAL-TIME DASHBOARD
  // ===================================
  useEffect(() => {
    
function refreshFromTaskEvent() {
  console.log("✅ DASHBOARD RECEIVED TASK EVENT");

  loadTasks();
  setActivityRefreshKey((previous) => previous + 1);
}


    function handleConnect() {
      // Catch any changes missed while disconnected.
      refreshFromTaskEvent();
    }

    socket.on("task:created", refreshFromTaskEvent);
    socket.on("task:updated", refreshFromTaskEvent);
    socket.on("task:deleted", (data) => {
  console.log("🗑️ DASHBOARD DELETE EVENT RECEIVED:", data);
  refreshFromTaskEvent();
});
    socket.on("connect", handleConnect);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("task:created", refreshFromTaskEvent);
      socket.off("task:updated", refreshFromTaskEvent);
      socket.off("task:deleted", refreshFromTaskEvent);
      socket.off("connect", handleConnect);
      // Keep the shared socket connected for other pages.
    };
  }, [loadTasks]);

  // Backend pagination + filters
  useEffect(() => {
    const controller = new AbortController();

    async function loadFirstPage() {
      try {
        setActivitiesLoading(true);
        setActivitiesError("");
        setActivities([]);
        setActivityPage(1);
        setTotalActivities(0);
        setHasMoreActivities(false);

        const params = buildActivityParams({
          page: 1,
          action: activityFilter,
          search: activitySearch,
          dateFilter: activityDateFilter,
        });

        const response = await fetch(
          `${ACTIVITY_API_URL}?${params.toString()}`,
          {
            headers: getAuthHeaders(),
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Failed to load activities."
          );
        }

        if (controller.signal.aborted) return;

        setActivities(
          Array.isArray(result.data) ? result.data : []
        );
        setActivityPage(1);
        setTotalActivities(result.totalActivities ?? 0);
        setHasMoreActivities(Boolean(result.hasMore));
      } catch (err) {
        if (err.name !== "AbortError") {
          setActivitiesError(
            err.message || "Failed to load activities."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setActivitiesLoading(false);
        }
      }
    }

    loadFirstPage();

    return () => controller.abort();
  }, [
    activityFilter,
    activitySearch,
    activityDateFilter,
    activityRefreshKey,
  ]);

  const loadMoreActivities = async () => {
    if (
      loadingMore ||
      activitiesLoading ||
      !hasMoreActivities ||
      deletingActivityId
    ) {
      return;
    }

    try {
      setLoadingMore(true);
      setActivitiesError("");

      const nextPage = activityPage + 1;

      const params = buildActivityParams({
        page: nextPage,
        action: activityFilter,
        search: activitySearch,
        dateFilter: activityDateFilter,
      });

      const response = await fetch(
        `${ACTIVITY_API_URL}?${params.toString()}`,
        { headers: getAuthHeaders() }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to load more activities."
        );
      }

      const nextActivities = Array.isArray(result.data)
        ? result.data
        : [];

      setActivities((previous) => {
        const existingIds = new Set(
          previous.map((activity) => activity._id)
        );

        const uniqueActivities = nextActivities.filter(
          (activity) => !existingIds.has(activity._id)
        );

        return [...previous, ...uniqueActivities];
      });

      setActivityPage(nextPage);
      setTotalActivities(result.totalActivities ?? 0);
      setHasMoreActivities(Boolean(result.hasMore));
    } catch (err) {
      setActivitiesError(
        err.message || "Failed to load more activities."
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const refreshDashboard = () => {
    loadTasks();
    setActivityRefreshKey((previous) => previous + 1);
  };

  const refreshActivities = () => {
    setActivityRefreshKey((previous) => previous + 1);
  };

  const clearActivityFilters = () => {
    setActivityFilter("all");
    setActivitySearch("");
    setActivityDateFilter("all");
  };

  // Step 12.11.2: Open confirmation
  const openDeleteConfirmation = (activity) => {
    setDeleteActivityError("");
    setActivityToDelete(activity);
  };

  // Step 12.11.2: Cancel deletion
  const closeDeleteConfirmation = () => {
    if (deletingActivityId) return;

    setActivityToDelete(null);
    setDeleteActivityError("");
  };

  // Step 12.11.2: DELETE API
  const deleteActivity = async () => {
    if (!activityToDelete?._id || deletingActivityId) {
      return;
    }

    const activityId = activityToDelete._id;

    try {
      setDeletingActivityId(activityId);
      setDeleteActivityError("");

      const response = await fetch(
        `${ACTIVITY_API_URL}/${activityId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to delete activity."
        );
      }

      // Close popup after successful deletion
      setActivityToDelete(null);

      // Reload first page using current filters
      setActivityRefreshKey((previous) => previous + 1);
    } catch (err) {
      setDeleteActivityError(
        err.message || "Failed to delete activity."
      );
    } finally {
      setDeletingActivityId(null);
    }
  };

  const openTasks = () => {
    if (typeof onNavigate === "function") {
      onNavigate("tasks");
    }
  };

  // Task statistics
  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) => task.status === "Completed"
  ).length;

  const inProgressTasks = tasks.filter(
    (task) => task.status === "In Progress"
  ).length;

  const pendingTasks = tasks.filter(
    (task) => task.status === "Pending"
  ).length;

  const progress =
    totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

  const overdueTasks = tasks.filter(
    (task) => getDeadlineInfo(task).type === "overdue"
  );

  const dueSoonTasks = tasks.filter((task) =>
    ["today", "soon"].includes(getDeadlineInfo(task).type)
  );

  const upcomingTasks = tasks
    .filter(
      (task) =>
        task.dueDate && task.status !== "Completed"
    )
    .sort(
      (a, b) =>
        new Date(a.dueDate).getTime() -
        new Date(b.dueDate).getTime()
    )
    .slice(0, 5);

  const categoryStats = CATEGORIES.map((category) => ({
    ...category,
    count: tasks.filter(
      (task) => getCategory(task) === category.name
    ).length,
  }));

  const labelCounts = {};

  tasks.forEach((task) => {
    getLabels(task).forEach((label) => {
      labelCounts[label] = (labelCounts[label] || 0) + 1;
    });
  });

  const popularLabels = Object.entries(labelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const recentTasks = [...tasks]
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime()
    )
    .slice(0, 5);

  const hasActiveActivityFilters =
    activityFilter !== "all" ||
    activitySearch.trim() !== "" ||
    activityDateFilter !== "all";

  const statCards = [
    {
      label: "Total Tasks",
      value: totalTasks,
      icon: "📋",
      background: "#eff6ff",
      border: "#bfdbfe",
      color: "#1d4ed8",
    },
    {
      label: "Completed",
      value: completedTasks,
      icon: "✅",
      background: "#f0fdf4",
      border: "#bbf7d0",
      color: "#15803d",
    },
    {
      label: "In Progress",
      value: inProgressTasks,
      icon: "🔄",
      background: "#eff6ff",
      border: "#bfdbfe",
      color: "#2563eb",
    },
    {
      label: "Pending",
      value: pendingTasks,
      icon: "⏳",
      background: "#fffbeb",
      border: "#fde68a",
      color: "#b45309",
    },
    {
      label: "Overdue",
      value: overdueTasks.length,
      icon: "⚠️",
      background: "#f5f3ff",
      border: "#c4b5fd",
      color: "#6d28d9",
    },
    {
      label: "Due Soon",
      value: dueSoonTasks.length,
      icon: "📅",
      background: "#fff7ed",
      border: "#fed7aa",
      color: "#c2410c",
    },
  ];

  return (
    <div className="dashboard-page">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div>
          <h1>
            Welcome back
            {user?.name ? `, ${user.name}` : ""}! 👋
          </h1>
          <p>Here's what's happening with your tasks.</p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={refreshDashboard}
            style={smallButtonStyle}
          >
            🔄 Refresh
          </button>

          <button
            type="button"
            onClick={openTasks}
            style={{
              ...smallButtonStyle,
              backgroundColor: "#7c3aed",
              color: "#ffffff",
              borderColor: "#7c3aed",
            }}
          >
            + Create Task
          </button>
        </div>
      </div>

      {error && (
        <p style={{ color: "#dc2626" }}>{error}</p>
      )}

      {loading && <p>Loading dashboard...</p>}

      {/* Statistics */}
      <div
        className="dashboard-stats"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "16px",
          marginTop: "24px",
        }}
      >
        {statCards.map((card) => (
          <div
            key={card.label}
            style={{
              padding: "20px",
              borderRadius: "14px",
              backgroundColor: card.background,
              border: `1px solid ${card.border}`,
            }}
          >
            <div style={{ fontSize: "25px" }}>
              {card.icon}
            </div>

            <p
              style={{
                margin: "10px 0 6px",
                color: card.color,
                fontWeight: 600,
              }}
            >
              {card.label}
            </p>

            <h2
              style={{
                margin: 0,
                color: card.color,
                fontSize: "30px",
              }}
            >
              {card.value}
            </h2>
          </div>
        ))}
      </div>

      {/* Overdue Alert */}
      {overdueTasks.length > 0 && (
        <section
          style={{
            ...sectionStyle,
            backgroundColor: "#f5f3ff",
            borderColor: "#c4b5fd",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#6d28d9",
            }}
          >
            ⚠️ You have {overdueTasks.length} overdue{" "}
            {overdueTasks.length === 1
              ? "task"
              : "tasks"}
          </h3>

          <p style={{ color: "#64748b" }}>
            Some tasks have passed their due dates.
            Review them to stay on track.
          </p>

          <button
            type="button"
            onClick={openTasks}
            style={smallButtonStyle}
          >
            View Tasks
          </button>
        </section>
      )}

      {/* Progress and Quick Actions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
          marginTop: "24px",
        }}
      >
        <section
          style={{ ...sectionStyle, marginTop: 0 }}
        >
          <h3>📈 Task Progress</h3>

          <h2
            style={{
              fontSize: "32px",
              color: "#7c3aed",
            }}
          >
            {progress}%
          </h2>

          <div
            style={{
              height: "12px",
              backgroundColor: "#ede9fe",
              borderRadius: "20px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                backgroundColor: "#7c3aed",
                borderRadius: "20px",
              }}
            />
          </div>

          <p style={{ color: "#64748b" }}>
            {completedTasks} of {totalTasks} tasks completed
          </p>
        </section>

        <section
          style={{ ...sectionStyle, marginTop: 0 }}
        >
          <h3>⚡ Quick Actions</h3>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={openTasks}
              style={smallButtonStyle}
            >
              + Create Task
            </button>

            <button
              type="button"
              onClick={openTasks}
              style={smallButtonStyle}
            >
              📋 My Tasks
            </button>

            <button
              type="button"
              onClick={refreshDashboard}
              style={smallButtonStyle}
            >
              🔄 Refresh Dashboard
            </button>
          </div>
        </section>
      </div>

      {/* Categories */}
      <section style={sectionStyle}>
        <h3>📂 Tasks by Category</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "12px",
          }}
        >
          {categoryStats.map((category) => (
            <div
              key={category.name}
              style={{
                padding: "16px",
                borderRadius: "12px",
                backgroundColor: "#f8fafc",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "26px" }}>
                {category.icon}
              </div>

              <p style={{ fontWeight: 600 }}>
                {category.name}
              </p>

              <h3 style={{ color: "#7c3aed" }}>
                {category.count}
              </h3>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Labels */}
      <section style={sectionStyle}>
        <h3>🏷️ Popular Task Labels</h3>

        {popularLabels.length === 0 ? (
          <p style={{ color: "#64748b" }}>
            No labels added yet.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {popularLabels.map(([label, count]) => (
              <span
                key={label}
                style={{
                  padding: "9px 14px",
                  borderRadius: "20px",
                  backgroundColor: "#f5f3ff",
                  color: "#6d28d9",
                  fontWeight: 600,
                }}
              >
                #{label} ({count})
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Deadlines */}
      <section style={sectionStyle}>
        <h3>📅 Upcoming Deadlines</h3>

        {upcomingTasks.length === 0 ? (
          <p style={{ color: "#64748b" }}>
            No upcoming deadlines.
          </p>
        ) : (
          upcomingTasks.map((task) => {
            const deadline = getDeadlineInfo(task);

            return (
              <div
                key={task._id}
                style={{
                  padding: "14px 0",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong>{task.title}</strong>

                  <p
                    style={{
                      margin: "5px 0 0",
                      color: "#64748b",
                    }}
                  >
                    {formatDueDate(task.dueDate)}
                  </p>
                </div>

                <span
                  style={{
                    color:
                      deadline.type === "overdue"
                        ? "#6d28d9"
                        : "#2563eb",
                    fontWeight: 600,
                  }}
                >
                  {deadline.label}
                </span>
              </div>
            );
          })
        )}
      </section>

      {/* Recent Tasks */}
      <section style={sectionStyle}>
        <h3>📝 Recent Tasks</h3>

        {recentTasks.length === 0 ? (
          <p style={{ color: "#64748b" }}>
            No tasks found.
          </p>
        ) : (
          recentTasks.map((task) => (
            <div
              key={task._id}
              style={{
                padding: "14px 0",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong>{task.title}</strong>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#64748b",
                  }}
                >
                  {getCategory(task)} •{" "}
                  {task.priority || "No priority"}
                </p>
              </div>

              <span
                style={{
                  color: "#7c3aed",
                  fontWeight: 600,
                }}
              >
                {task.status}
              </span>
            </div>
          ))
        )}
      </section>

      {/* Recent Activity */}
      <section
        className="dashboard-activity-section"
        style={{
          ...sectionStyle,
          marginTop: "28px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 6px" }}>
              🕒 Recent Activity
            </h3>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              Track changes made to your tasks.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshActivities}
            style={smallButtonStyle}
          >
            🔄 Refresh Activity
          </button>
        </div>

        {/* Search and Date Filter */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginTop: "20px",
          }}
        >
          <input
            type="text"
            value={activitySearch}
            onChange={(event) =>
              setActivitySearch(event.target.value)
            }
            placeholder="Search activity by task title..."
            maxLength={100}
            style={{
              flex: "1 1 230px",
              padding: "11px 13px",
              border: "1px solid #d1d5db",
              borderRadius: "10px",
              fontSize: "14px",
            }}
          />

          <select
            value={activityDateFilter}
            onChange={(event) =>
              setActivityDateFilter(event.target.value)
            }
            style={{
              padding: "11px 13px",
              border: "1px solid #d1d5db",
              borderRadius: "10px",
              backgroundColor: "#ffffff",
            }}
          >
            {ACTIVITY_DATE_FILTERS.map((filter) => (
              <option
                key={filter.value}
                value={filter.value}
              >
                {filter.label}
              </option>
            ))}
          </select>

          {hasActiveActivityFilters && (
            <button
              type="button"
              onClick={clearActivityFilters}
              style={smallButtonStyle}
            >
              Clear All Filters
            </button>
          )}
        </div>

        {/* Activity Type Filters */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginTop: "16px",
          }}
        >
          {ACTIVITY_FILTERS.map((filter) => {
            const isActive =
              activityFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() =>
                  setActivityFilter(filter.value)
                }
                style={{
                  padding: "9px 14px",
                  borderRadius: "9px",
                  border: isActive
                    ? "1px solid #7c3aed"
                    : "1px solid #e5e7eb",
                  backgroundColor: isActive
                    ? "#7c3aed"
                    : "#ffffff",
                  color: isActive
                    ? "#ffffff"
                    : "#475569",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {activitiesLoading && (
          <p
            style={{
              marginTop: "20px",
              color: "#64748b",
            }}
          >
            Loading activities...
          </p>
        )}

        {/* Error */}
        {activitiesError && (
          <p
            style={{
              marginTop: "20px",
              color: "#dc2626",
            }}
          >
            {activitiesError}
          </p>
        )}

        {/* Empty State */}
        {!activitiesLoading &&
          !activitiesError &&
          activities.length === 0 && (
            <p
              style={{
                marginTop: "20px",
                color: "#64748b",
              }}
            >
              {activitySearch.trim()
                ? "No activities match your search."
                : activityDateFilter !== "all"
                ? "No activities found for this date range."
                : activityFilter === "all"
                ? "No activity recorded yet."
                : "No activities found for this filter."}
            </p>
          )}

        {/* Activity Timeline */}
        {!activitiesLoading &&
          activities.map((activity) => {
            const config =
              ACTIVITY_CONFIG[activity.action] || {
                icon: "📌",
                label: "Task Activity",
                color: "#475569",
                background: "#f1f5f9",
              };

            return (
              <div
                key={activity._id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "17px 0",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    flexShrink: 0,
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: config.background,
                    fontSize: "21px",
                  }}
                >
                  {config.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <strong style={{ color: "#1e293b" }}>
                      {activity.taskTitle}
                    </strong>

                    <span
                      style={{
                        color: "#94a3b8",
                        fontSize: "12px",
                      }}
                    >
                      {formatActivityTime(
                        activity.createdAt
                      )}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: "5px 0",
                      color: config.color,
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    {config.label}
                  </p>

                  {activity.details && (
                    <p
                      style={{
                        margin: 0,
                        color: "#64748b",
                        fontSize: "13px",
                      }}
                    >
                      {activity.details}
                    </p>
                  )}

                  {/* Step 12.11.2: Delete Button */}
                  <button
                    type="button"
                    onClick={() =>
                      openDeleteConfirmation(activity)
                    }
                    disabled={Boolean(deletingActivityId)}
                    style={{
                      marginTop: "12px",
                      padding: "7px 12px",
                      border: "1px solid #fecaca",
                      borderRadius: "8px",
                      backgroundColor: "#fef2f2",
                      color: "#b91c1c",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: deletingActivityId
                        ? "not-allowed"
                        : "pointer",
                    }}
                  >
                    🗑️ Delete History
                  </button>
                </div>
              </div>
            );
          })}

        {/* Backend Load More */}
        {!activitiesLoading &&
          activities.length > 0 && (
            <div
              style={{
                marginTop: "20px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  marginBottom: "12px",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                Showing {activities.length} of{" "}
                {totalActivities} activities
              </p>

              {hasMoreActivities && (
                <button
                  type="button"
                  onClick={loadMoreActivities}
                  disabled={
                    loadingMore ||
                    Boolean(deletingActivityId)
                  }
                  style={{
                    ...smallButtonStyle,
                    padding: "10px 22px",
                    opacity: loadingMore ? 0.6 : 1,
                  }}
                >
                  {loadingMore
                    ? "Loading..."
                    : "Load More ↓"}
                </button>
              )}
            </div>
          )}
      </section>

      {/* Step 12.11.2: Delete Confirmation Popup */}
      {activityToDelete && (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-activity-title"
            style={{
              width: "100%",
              maxWidth: "430px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "26px",
              boxShadow:
                "0 20px 50px rgba(0,0,0,0.2)",
            }}
          >
            <h3
              id="delete-activity-title"
              style={{
                marginTop: 0,
                color: "#1e293b",
              }}
            >
              🗑️ Delete Activity History?
            </h3>

            <p
              style={{
                color: "#64748b",
                lineHeight: 1.6,
              }}
            >
              Are you sure you want to delete the
              history record for{" "}
              <strong>
                {activityToDelete.taskTitle}
              </strong>
              ?
            </p>

            <p
              style={{
                color: "#b91c1c",
                fontSize: "13px",
              }}
            >
              This history record will be permanently
              deleted. Your actual task will not be
              deleted.
            </p>

            {deleteActivityError && (
              <p style={{ color: "#dc2626" }}>
                {deleteActivityError}
              </p>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "24px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={closeDeleteConfirmation}
                disabled={Boolean(deletingActivityId)}
                style={{
                  padding: "10px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: "9px",
                  backgroundColor: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={deleteActivity}
                disabled={Boolean(deletingActivityId)}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "9px",
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: deletingActivityId
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {deletingActivityId
                  ? "Deleting..."
                  : "Yes, Delete History"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
