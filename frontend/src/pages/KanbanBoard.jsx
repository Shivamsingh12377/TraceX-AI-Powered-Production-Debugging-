
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { socket } from "../socket";
import "../styles/KanbanBoard.css";

const API = `${import.meta.env.VITE_API_URL}/api/tasks`;

const columns = [
  { id: "Pending", title: "To Do", icon: "📋" },
  { id: "In Progress", title: "In Progress", icon: "⏳" },
  { id: "Completed", title: "Completed", icon: "✅" },
];

// ===================================
// DATE HELPERS
// ===================================

function getTodayKey() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateKey(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function formatDueDate(value) {
  const dateKey = getDateKey(value);

  if (!dateKey) return "No due date";

  const date = new Date(`${dateKey}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return "Invalid due date";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getDeadlineInfo(task) {
  const dueDate = getDateKey(task.dueDate);

  if (!dueDate) {
    return { label: "No Deadline", type: "none" };
  }

  if (task.status === "Completed") {
    return { label: "Completed", type: "completed" };
  }

  const today = getTodayKey();

  if (dueDate < today) {
    return { label: "Overdue", type: "overdue" };
  }

  if (dueDate === today) {
    return { label: "Due Today", type: "today" };
  }

  const dueTime = Date.parse(`${dueDate}T00:00:00Z`);
  const todayTime = Date.parse(`${today}T00:00:00Z`);

  const daysLeft = Math.round(
    (dueTime - todayTime) / 86400000
  );

  if (daysLeft <= 3) {
    return { label: "Due Soon", type: "soon" };
  }

  return { label: "Upcoming", type: "upcoming" };
}

function getCategory(task) {
  return task.category || "General";
}

function getLabels(task) {
  if (!Array.isArray(task.labels)) return [];

  return task.labels.filter(
    (label) =>
      typeof label === "string" && label.trim()
  );
}

// ===================================
// MAIN COMPONENT
// ===================================

export default function KanbanBoard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // ===================================
  // NEW: SEARCH AND FILTERS
  // ===================================

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [deadlineFilter, setDeadlineFilter] = useState("All");
  const [compactView, setCompactView] = useState(false);

  const requestIdRef = useRef(0);

  // ===================================
  // FETCH TASKS
  // ===================================

  const loadTasks = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(API);
      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Failed to load tasks"
        );
      }

      if (requestId !== requestIdRef.current) return;

      setTasks(
        Array.isArray(result.data) ? result.data : []
      );
    } catch (err) {
      if (requestId !== requestIdRef.current) return;

      setError(
        err.message || "Backend connection failed"
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadTasks();

    return () => {
      requestIdRef.current += 1;
    };
  }, [loadTasks]);

  // ===================================
  // SOCKET.IO REAL-TIME UPDATES
  // ===================================

  useEffect(() => {
    function handleTaskCreated(task) {
      if (!task?._id) {
        loadTasks();
        return;
      }

      setTasks((current) => {
        if (
          current.some((item) => item._id === task._id)
        ) {
          return current;
        }

        return [task, ...current];
      });
    }

    function handleTaskUpdated(task) {
      if (!task?._id) {
        loadTasks();
        return;
      }

      setTasks((current) => {
        const exists = current.some(
          (item) => item._id === task._id
        );

        if (!exists) return [task, ...current];

        return current.map((item) =>
          item._id === task._id ? task : item
        );
      });
    }

    function handleTaskDeleted(data) {
      const taskId = data?.id;

      if (!taskId) {
        loadTasks();
        return;
      }

      setTasks((current) =>
        current.filter(
          (task) => task._id !== String(taskId)
        )
      );
    }

    function handleConnect() {
      loadTasks();
    }

    socket.on("task:created", handleTaskCreated);
    socket.on("task:updated", handleTaskUpdated);
    socket.on("task:deleted", handleTaskDeleted);
    socket.on("connect", handleConnect);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("task:created", handleTaskCreated);
      socket.off("task:updated", handleTaskUpdated);
      socket.off("task:deleted", handleTaskDeleted);
      socket.off("connect", handleConnect);
    };
  }, [loadTasks]);

  // ===================================
  // UPDATE TASK STATUS
  // ===================================

  async function updateStatus(taskId, newStatus) {
    const task = tasks.find((t) => t._id === taskId);

    if (
      !task ||
      task.status === newStatus ||
      updatingId
    ) {
      return;
    }

    const oldStatus = task.status;

    setTasks((current) =>
      current.map((t) =>
        t._id === taskId
          ? { ...t, status: newStatus }
          : t
      )
    );

    setUpdatingId(taskId);
    setError("");

    try {
      const response = await fetch(`${API}/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Failed to update task"
        );
      }
    } catch (err) {
      setTasks((current) =>
        current.map((t) =>
          t._id === taskId
            ? { ...t, status: oldStatus }
            : t
        )
      );

      setError(
        err.message || "Task update failed"
      );
    } finally {
      setUpdatingId(null);
    }
  }

  // ===================================
  // DRAG AND DROP
  // ===================================

  function handleDragStart(event, task) {
    if (updatingId) {
      event.preventDefault();
      return;
    }

    setDraggedTask(task);

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "text/plain",
      task._id
    );
  }

  function handleDragOver(event, columnId) {
    if (updatingId) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    setDragOverColumn((current) =>
      current === columnId ? current : columnId
    );
  }

  async function handleDrop(event, columnId) {
    event.preventDefault();

    const taskId =
      event.dataTransfer.getData("text/plain") ||
      draggedTask?._id;

    setDraggedTask(null);
    setDragOverColumn(null);

    if (!taskId || updatingId) return;

    await updateStatus(taskId, columnId);
  }

  function handleDragEnd() {
    setDraggedTask(null);
    setDragOverColumn(null);
  }

  // ===================================
  // NEW: PROGRESS ANALYTICS
  // ===================================

  const analytics = useMemo(() => {
    const total = tasks.length;

    const pending = tasks.filter(
      (task) => task.status === "Pending"
    ).length;

    const inProgress = tasks.filter(
      (task) => task.status === "In Progress"
    ).length;

    const completed = tasks.filter(
      (task) => task.status === "Completed"
    ).length;

    const overdue = tasks.filter(
      (task) =>
        getDeadlineInfo(task).type === "overdue"
    ).length;

    const dueSoon = tasks.filter((task) =>
      ["today", "soon"].includes(
        getDeadlineInfo(task).type
      )
    ).length;

    const completionRate = total
      ? Math.round((completed / total) * 100)
      : 0;

    return {
      total,
      pending,
      inProgress,
      completed,
      overdue,
      dueSoon,
      completionRate,
    };
  }, [tasks]);

  // ===================================
  // NEW: AVAILABLE CATEGORIES
  // ===================================

  const categories = useMemo(() => {
    return [
      "All",
      ...new Set(tasks.map(getCategory)),
    ].sort((a, b) => {
      if (a === "All") return -1;
      if (b === "All") return 1;
      return a.localeCompare(b);
    });
  }, [tasks]);

  // ===================================
  // NEW: FILTER TASKS
  // ===================================

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const searchableText = [
        task.title || "",
        task.description || "",
        getCategory(task),
        ...getLabels(task),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesPriority =
        priorityFilter === "All" ||
        (task.priority || "Medium") ===
          priorityFilter;

      const matchesCategory =
        categoryFilter === "All" ||
        getCategory(task) === categoryFilter;

      const deadlineType =
        getDeadlineInfo(task).type;

      const matchesDeadline =
        deadlineFilter === "All" ||
        deadlineType === deadlineFilter ||
        (deadlineFilter === "soon" &&
          deadlineType === "today");

      return (
        matchesSearch &&
        matchesPriority &&
        matchesCategory &&
        matchesDeadline
      );
    });
  }, [
    tasks,
    search,
    priorityFilter,
    categoryFilter,
    deadlineFilter,
  ]);

  const hasActiveFilters =
    search.trim() !== "" ||
    priorityFilter !== "All" ||
    categoryFilter !== "All" ||
    deadlineFilter !== "All";

  function clearFilters() {
    setSearch("");
    setPriorityFilter("All");
    setCategoryFilter("All");
    setDeadlineFilter("All");
  }

  // ===================================
  // JSX
  // ===================================

  return (
    <main
      className={`kanban-page ${
        compactView ? "kanban-compact-view" : ""
      }`}
    >
      {/* HEADER */}

      <header className="kanban-header">
        <div>
          <h1>Kanban Board</h1>
          <p>
            Organize, prioritize and track your
            development tasks visually.
          </p>
        </div>

        <button
          type="button"
          onClick={loadTasks}
          disabled={loading || Boolean(updatingId)}
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </header>

      {/* NEW: ANALYTICS SUMMARY */}

      <section
        className="kanban-advanced-summary"
        aria-label="Task progress summary"
      >
        <div className="kanban-advanced-stat">
          <span>📋 Total Tasks</span>
          <strong>{analytics.total}</strong>
        </div>

        <div className="kanban-advanced-stat">
          <span>📝 To Do</span>
          <strong>{analytics.pending}</strong>
        </div>

        <div className="kanban-advanced-stat">
          <span>⏳ In Progress</span>
          <strong>{analytics.inProgress}</strong>
        </div>

        <div className="kanban-advanced-stat">
          <span>✅ Completed</span>
          <strong>{analytics.completed}</strong>
        </div>

        <div className="kanban-advanced-stat">
          <span>🔴 Overdue</span>
          <strong>{analytics.overdue}</strong>
        </div>

        <div className="kanban-advanced-stat">
          <span>🟡 Due Soon</span>
          <strong>{analytics.dueSoon}</strong>
        </div>
      </section>

      {/* NEW: PROGRESS BAR */}

      <section className="kanban-progress-panel">
        <div className="kanban-progress-heading">
          <span>Overall Task Completion</span>
          <strong>
            {analytics.completionRate}%
          </strong>
        </div>

        <div
          className="kanban-progress-track"
          role="progressbar"
          aria-label="Task completion"
          aria-valuenow={analytics.completionRate}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="kanban-progress-fill"
            style={{
              width: `${analytics.completionRate}%`,
            }}
          />
        </div>

        <p>
          {analytics.completed} of {analytics.total} tasks
          completed
        </p>
      </section>

      {/* NEW: SEARCH AND FILTERS */}

      <section className="kanban-filter-panel">
        <div className="kanban-filter-heading">
          <div>
            <h2>Find Tasks</h2>
            <p>
              Showing {filteredTasks.length} of{" "}
              {tasks.length} tasks
            </p>
          </div>

          <button
            type="button"
            className="kanban-clear-filters"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            Clear Filters
          </button>
        </div>

        <div className="kanban-filter-grid">
          <label className="kanban-filter-field">
            <span>Search</span>
            <input
              type="search"
              placeholder="Search tasks or tags..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </label>

          <label className="kanban-filter-field">
            <span>Priority</span>
            <select
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(event.target.value)
              }
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </label>

          <label className="kanban-filter-field">
            <span>Category</span>
            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value)
              }
            >
              {categories.map((category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category === "All"
                    ? "All Categories"
                    : category}
                </option>
              ))}
            </select>
          </label>

          <label className="kanban-filter-field">
            <span>Deadline</span>
            <select
              value={deadlineFilter}
              onChange={(event) =>
                setDeadlineFilter(event.target.value)
              }
            >
              <option value="All">All Deadlines</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due Today</option>
              <option value="soon">Due Soon</option>
              <option value="upcoming">Upcoming</option>
              <option value="none">No Deadline</option>
            </select>
          </label>
        </div>

        <div className="kanban-view-options">
          <label>
            <input
              type="checkbox"
              checked={compactView}
              onChange={(event) =>
                setCompactView(event.target.checked)
              }
            />
            Compact Card View
          </label>
        </div>
      </section>

      {/* ERROR */}

      {error && (
        <div className="kanban-error" role="alert">
          <span>{error}</span>

          <button
            type="button"
            onClick={loadTasks}
          >
            Try Again
          </button>
        </div>
      )}

      {/* KANBAN COLUMNS */}

      <section className="kanban-board">
        {columns.map((column) => {
          const columnTasks = filteredTasks.filter(
            (task) => task.status === column.id
          );

          return (
            <div
              className={`kanban-column ${
                dragOverColumn === column.id
                  ? "kanban-column-over"
                  : ""
              }`}
              key={column.id}
              onDragOver={(event) =>
                handleDragOver(event, column.id)
              }
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget
                  )
                ) {
                  setDragOverColumn(null);
                }
              }}
              onDrop={(event) =>
                handleDrop(event, column.id)
              }
            >
              <div className="kanban-column-header">
                <h2>
                  {column.icon} {column.title}
                </h2>

                <span>{columnTasks.length}</span>
              </div>

              <div className="kanban-cards">
                {loading && (
                  <p>Loading tasks...</p>
                )}

                {!loading &&
                  columnTasks.length === 0 && (
                    <p className="kanban-empty">
                      {hasActiveFilters
                        ? "No matching tasks"
                        : "Drop tasks here"}
                    </p>
                  )}

                {!loading &&
                  columnTasks.map((task) => {
                    const deadline =
                      getDeadlineInfo(task);

                    const labels = getLabels(task);

                    return (
                      <article
                        key={task._id}
                        className={`kanban-card ${
                          draggedTask?._id === task._id
                            ? "kanban-card-dragging"
                            : ""
                        }`}
                        draggable={!Boolean(updatingId)}
                        onDragStart={(event) =>
                          handleDragStart(event, task)
                        }
                        onDragEnd={handleDragEnd}
                      >
                        <div className="kanban-card-top">
                          <h3>{task.title}</h3>

                          <span
                            className={`kanban-priority ${(
                              task.priority || "Medium"
                            ).toLowerCase()}`}
                          >
                            {task.priority || "Medium"}
                          </span>
                        </div>

                        {!compactView && (
                          <p>
                            {task.description ||
                              "No description"}
                          </p>
                        )}

                        <div className="kanban-category-info">
                          <span className="kanban-category-badge">
                            📁 {getCategory(task)}
                          </span>
                        </div>

                        {!compactView &&
                          labels.length > 0 && (
                            <div className="kanban-labels-list">
                              {labels.map(
                                (label, index) => (
                                  <span
                                    className="kanban-label-badge"
                                    key={`${label}-${index}`}
                                  >
                                    #{label}
                                  </span>
                                )
                              )}
                            </div>
                          )}

                        <div className="kanban-deadline">
                          <span className="kanban-date">
                            📅{" "}
                            {formatDueDate(task.dueDate)}
                          </span>

                          <span
                            className={`kanban-deadline-badge kanban-deadline-${deadline.type}`}
                          >
                            {deadline.label}
                          </span>
                        </div>

                        <div className="kanban-card-footer">
                          <label
                            htmlFor={`status-${task._id}`}
                          >
                            Status
                          </label>

                          <select
                            id={`status-${task._id}`}
                            value={task.status}
                            disabled={Boolean(updatingId)}
                            onChange={(event) =>
                              updateStatus(
                                task._id,
                                event.target.value
                              )
                            }
                          >
                            <option value="Pending">
                              Pending
                            </option>

                            <option value="In Progress">
                              In Progress
                            </option>

                            <option value="Completed">
                              Completed
                            </option>
                          </select>
                        </div>

                        {updatingId === task._id && (
                          <p className="kanban-saving">
                            Saving...
                          </p>
                        )}
                      </article>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
