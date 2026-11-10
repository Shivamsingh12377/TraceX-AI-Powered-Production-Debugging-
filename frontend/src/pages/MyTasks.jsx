
import { useEffect, useState } from "react";
import "../styles/MyTasks.css";

const API = "http://localhost:5000/api/tasks";

const CATEGORIES = [
  "General",
  "Frontend",
  "Backend",
  "Bug Fix",
  "Design",
];

// =============================
// DATE HELPERS
// =============================

function getDateKey(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function todayKey() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDeadlineInfo(task) {
  const date = getDateKey(task.dueDate);

  if (!date) {
    return { label: "No deadline", type: "none" };
  }

  if (task.status === "Completed") {
    return { label: "Completed", type: "completed" };
  }

  const today = todayKey();

  if (date < today) {
    return { label: "Overdue", type: "overdue" };
  }

  if (date === today) {
    return { label: "Due Today", type: "today" };
  }

  const dueTime = Date.parse(`${date}T00:00:00Z`);
  const todayTime = Date.parse(`${today}T00:00:00Z`);

  const daysLeft = Math.round(
    (dueTime - todayTime) / 86400000
  );

  if (daysLeft <= 3) {
    return { label: "Due Soon", type: "soon" };
  }

  return { label: "Upcoming", type: "upcoming" };
}

function formatDueDate(value) {
  const date = getDateKey(value);

  if (!date) return "No due date";

  return new Date(
    `${date}T00:00:00Z`
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// =============================
// CATEGORY AND LABEL HELPERS
// =============================

function getCategory(task) {
  return task.category || "General";
}

function parseLabels(value) {
  return [
    ...new Set(
      value
        .split(",")
        .map((label) =>
          label
            .trim()
            .replace(/^#+/, "")
            .toLowerCase()
        )
        .filter(Boolean)
    ),
  ];
}

function getLabels(task) {
  if (!Array.isArray(task.labels)) {
    return [];
  }

  return task.labels.filter(
    (label) =>
      typeof label === "string" && label.trim()
  );
}

// =============================
// MAIN COMPONENT
// =============================

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);

  // Task form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("Pending");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("General");
  const [labelsInput, setLabelsInput] = useState("");

  // Search and filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [deadlineFilter, setDeadlineFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [labelFilter, setLabelFilter] = useState("All");

  // STEP 11: Sorting
  const [sortBy, setSortBy] = useState("newest");

  // Loading and editing
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);

  // =============================
  // API REQUEST
  // =============================

  async function apiRequest(url, options = {}) {
    let response;

    try {
      response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
    } catch {
      throw new Error(
        "Backend connection failed. Check server and CORS."
      );
    }

    let result;

    try {
      result = await response.json();
    } catch {
      throw new Error("Invalid response from server");
    }

    if (!response.ok || result.success === false) {
      throw new Error(
        result.message || "API request failed"
      );
    }

    return result;
  }

  // =============================
  // FETCH TASKS
  // =============================

  async function fetchTasks() {
    try {
      setLoading(true);
      setError("");

      const result = await apiRequest(API);

      setTasks(
        Array.isArray(result.data) ? result.data : []
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  // =============================
  // RESET FORM
  // =============================

  function resetForm() {
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setStatus("Pending");
    setDueDate("");
    setCategory("General");
    setLabelsInput("");
    setEditingId(null);
  }

  // =============================
  // CREATE / UPDATE TASK
  // =============================

  async function saveTask(e) {
    e.preventDefault();

    if (!title.trim()) return;

    try {
      setSaving(true);
      setError("");

      const payload = {
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        dueDate: dueDate || null,
        category,
        labels: parseLabels(labelsInput),
      };

      if (editingId) {
        await apiRequest(`${API}/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(API, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      resetForm();
      await fetchTasks();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // =============================
  // EDIT TASK
  // =============================

  function editTask(task) {
    setEditingId(task._id);
    setTitle(task.title || "");
    setDescription(task.description || "");
    setPriority(task.priority || "Medium");
    setStatus(task.status || "Pending");
    setDueDate(getDateKey(task.dueDate));
    setCategory(getCategory(task));
    setLabelsInput(getLabels(task).join(", "));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =============================
  // CHANGE STATUS
  // =============================

  async function changeStatus(task, newStatus) {
    try {
      setError("");

      await apiRequest(`${API}/${task._id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      await fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  // =============================
  // DELETE TASK
  // =============================

  async function deleteTask(id) {
    if (!window.confirm("Delete this task?")) {
      return;
    }

    try {
      setError("");

      await apiRequest(`${API}/${id}`, {
        method: "DELETE",
      });

      if (editingId === id) {
        resetForm();
      }

      await fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  // =============================
  // TASK STATISTICS
  // =============================

  const completed = tasks.filter(
    (task) => task.status === "Completed"
  ).length;

  const inProgress = tasks.filter(
    (task) => task.status === "In Progress"
  ).length;

  const pending = tasks.filter(
    (task) => task.status === "Pending"
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

  const progress = tasks.length
    ? Math.round(
        (completed / tasks.length) * 100
      )
    : 0;

  // =============================
  // AVAILABLE LABELS
  // =============================

  const availableLabels = [
    ...new Set(
      tasks.flatMap((task) =>
        getLabels(task).map((label) =>
          label.toLowerCase()
        )
      )
    ),
  ].sort();

  // =============================
  // FILTER TASKS
  // =============================

  const filteredTasks = tasks.filter((task) => {
    const searchText = search.trim().toLowerCase();

    const matchesSearch =
      (task.title || "")
        .toLowerCase()
        .includes(searchText) ||
      (task.description || "")
        .toLowerCase()
        .includes(searchText);

    const matchesStatus =
      statusFilter === "All" ||
      task.status === statusFilter;

    const matchesPriority =
      priorityFilter === "All" ||
      task.priority === priorityFilter;

    const deadlineType = getDeadlineInfo(task).type;

    const matchesDeadline =
      deadlineFilter === "All" ||
      (deadlineFilter === "Overdue" &&
        deadlineType === "overdue") ||
      (deadlineFilter === "Due Soon" &&
        ["today", "soon"].includes(deadlineType)) ||
      (deadlineFilter === "No Deadline" &&
        deadlineType === "none");

    const matchesCategory =
      categoryFilter === "All" ||
      getCategory(task) === categoryFilter;

    const matchesLabel =
      labelFilter === "All" ||
      getLabels(task).some(
        (label) =>
          label.toLowerCase() === labelFilter
      );

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority &&
      matchesDeadline &&
      matchesCategory &&
      matchesLabel
    );
  });

  // =============================
  // STEP 11: SORTING LOGIC
  // =============================

  const sortedTasks = [...filteredTasks].sort(
    (a, b) => {
      // Newest First
      if (sortBy === "newest") {
        return (
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
        );
      }

      // Oldest First
      if (sortBy === "oldest") {
        return (
          new Date(a.createdAt || 0) -
          new Date(b.createdAt || 0)
        );
      }

      // Due Date: Earliest First
      if (sortBy === "dueDate") {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;

        return (
          new Date(a.dueDate) -
          new Date(b.dueDate)
        );
      }

      // Priority: High to Low
      if (sortBy === "priority") {
        const priorityOrder = {
          High: 3,
          Medium: 2,
          Low: 1,
        };

        return (
          (priorityOrder[b.priority] || 0) -
          (priorityOrder[a.priority] || 0)
        );
      }

      // Title: A to Z
      if (sortBy === "title") {
        return (a.title || "").localeCompare(
          b.title || "",
          undefined,
          { sensitivity: "base" }
        );
      }

      return 0;
    }
  );

  // =============================
  // JSX
  // =============================

  return (
    <div className="tracex-tasks">

      {/* HEADING */}
      <div className="tasks-heading">
        <div>
          <h1>My Tasks</h1>
          <p>
            Manage, organize and track your work
          </p>
        </div>

        <button
          type="button"
          onClick={fetchTasks}
          disabled={loading || saving}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="task-error" role="alert">
          {error}

          <button
            type="button"
            onClick={fetchTasks}
          >
            Try Again
          </button>
        </div>
      )}

      {/* STATISTICS */}
      <div className="task-stats">
        <div className="stat-box">
          <span>Total Tasks</span>
          <h2>{tasks.length}</h2>
        </div>

        <div className="stat-box">
          <span>Completed</span>
          <h2>{completed}</h2>
        </div>

        <div className="stat-box">
          <span>In Progress</span>
          <h2>{inProgress}</h2>
        </div>

        <div className="stat-box">
          <span>Pending</span>
          <h2>{pending}</h2>
        </div>

        <div className="stat-box deadline-stat-overdue">
          <span>🔴 Overdue</span>
          <h2>{overdue}</h2>
        </div>

        <div className="stat-box deadline-stat-soon">
          <span>🟡 Due Soon</span>
          <h2>{dueSoon}</h2>
        </div>
      </div>

      {/* PROGRESS */}
      <div className="task-progress">
        <div className="progress-heading">
          <h2>Overall Task Progress</h2>
          <strong>{progress}%</strong>
        </div>

        <div
          className="progress-bar"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Task completion"
        >
          <div
            className="progress-fill"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <p>
          {completed} of {tasks.length} tasks completed
        </p>
      </div>

      {/* CREATE / EDIT FORM */}
      <form
        className="task-form"
        onSubmit={saveTask}
      >
        <h2>
          {editingId
            ? "Edit Task"
            : "Create New Task"}
        </h2>

        <input
          placeholder="Enter task title"
          value={title}
          onChange={(e) =>
            setTitle(e.target.value)
          }
          required
        />

        <textarea
          placeholder="Enter task description"
          value={description}
          onChange={(e) =>
            setDescription(e.target.value)
          }
        />

        <div className="task-form-row">
          <select
            aria-label="Task priority"
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value)
            }
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>

          <select
            aria-label="Task status"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value)
            }
          >
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>
        </div>

        {/* CATEGORY */}
        <div className="task-category-field">
          <label htmlFor="task-category">
            📁 Task Category
          </label>

          <select
            id="task-category"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value)
            }
          >
            {CATEGORIES.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>

          <small>
            Select a category to organize this task.
          </small>
        </div>

        {/* LABELS */}
        <div className="task-labels-field">
          <label htmlFor="task-labels">
            🏷️ Task Labels (Optional)
          </label>

          <input
            id="task-labels"
            type="text"
            placeholder="react, urgent, testing"
            value={labelsInput}
            onChange={(e) =>
              setLabelsInput(e.target.value)
            }
          />

          <small>
            Multiple labels ko comma (,) se separate karo.
          </small>

          {parseLabels(labelsInput).length > 0 && (
            <div className="task-labels-preview">
              {parseLabels(labelsInput).map(
                (label) => (
                  <span
                    className="task-label-badge"
                    key={label}
                  >
                    #{label}
                  </span>
                )
              )}
            </div>
          )}
        </div>

        {/* DUE DATE */}
        <div className="task-date-field">
          <label htmlFor="task-due-date">
            📅 Due Date (Optional)
          </label>

          <input
            id="task-due-date"
            type="date"
            value={dueDate}
            onChange={(e) =>
              setDueDate(e.target.value)
            }
          />

          <small>
            Leave empty if this task has no deadline.
          </small>
        </div>

        <div className="task-actions">
          <button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : editingId
              ? "Update Task"
              : "+ Create Task"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* =============================
          FILTERS AND SORTING
      ============================= */}

      <div className="task-filters">

        {/* SEARCH */}
        <input
          type="search"
          placeholder="🔍 Search tasks..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        {/* STATUS FILTER */}
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="All">
            All Status
          </option>

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

        {/* PRIORITY FILTER */}
        <select
          aria-label="Filter by priority"
          value={priorityFilter}
          onChange={(e) =>
            setPriorityFilter(e.target.value)
          }
        >
          <option value="All">
            All Priority
          </option>

          <option value="High">
            High
          </option>

          <option value="Medium">
            Medium
          </option>

          <option value="Low">
            Low
          </option>
        </select>

        {/* DEADLINE FILTER */}
        <select
          aria-label="Filter by deadline"
          value={deadlineFilter}
          onChange={(e) =>
            setDeadlineFilter(e.target.value)
          }
        >
          <option value="All">
            All Deadlines
          </option>

          <option value="Overdue">
            Overdue
          </option>

          <option value="Due Soon">
            Due Soon
          </option>

          <option value="No Deadline">
            No Deadline
          </option>
        </select>

        {/* CATEGORY FILTER */}
        <select
          aria-label="Filter by category"
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value)
          }
        >
          <option value="All">
            All Categories
          </option>

          {CATEGORIES.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}
        </select>

        {/* LABEL FILTER - FIXED */}
        <select
          aria-label="Filter by label"
          value={labelFilter}
          onChange={(e) =>
            setLabelFilter(e.target.value)
          }
        >
          <option value="All">
            All Labels
          </option>

          {availableLabels.map((label) => (
            <option
              key={label}
              value={label}
            >
              #{label}
            </option>
          ))}
        </select>

        {/* STEP 11: SORTING DROPDOWN */}
        <select
          aria-label="Sort tasks"
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value)
          }
        >
          <option value="newest">
            Newest First
          </option>

          <option value="oldest">
            Oldest First
          </option>

          <option value="dueDate">
            Due Date: Earliest First
          </option>

          <option value="priority">
            Priority: High to Low
          </option>

          <option value="title">
            Title: A to Z
          </option>
        </select>
      </div>

      {/* =============================
          TASK LIST
      ============================= */}

      <div className="task-list">
        <h2>
          All Tasks ({sortedTasks.length})
        </h2>

        {loading && (
          <p>Loading tasks...</p>
        )}

        {!loading &&
          sortedTasks.length === 0 && (
            <p className="empty-tasks">
              No matching tasks found.
            </p>
          )}

        {!loading &&
          sortedTasks.map((task) => {
            const deadline =
              getDeadlineInfo(task);

            const labels = getLabels(task);

            return (
              <div
                className="task-card"
                key={task._id}
              >
                {/* TITLE AND PRIORITY */}
                <div className="task-card-top">
                  <h3>{task.title}</h3>

                  <span
                    className={`priority priority-${(
                      task.priority || "Medium"
                    ).toLowerCase()}`}
                  >
                    {task.priority || "Medium"}
                  </span>
                </div>

                {/* DESCRIPTION */}
                <p>
                  {task.description ||
                    "No description"}
                </p>

                {/* CATEGORY */}
                <div className="task-category-info">
                  <span className="task-category-badge">
                    📁 {getCategory(task)}
                  </span>
                </div>

                {/* LABELS */}
                {labels.length > 0 && (
                  <div className="task-labels-list">
                    {labels.map(
                      (label, index) => (
                        <span
                          className="task-label-badge"
                          key={`${label}-${index}`}
                        >
                          #{label}
                        </span>
                      )
                    )}
                  </div>
                )}

                {/* DEADLINE */}
                <div className="task-deadline-info">
                  <span>
                    📅 {formatDueDate(task.dueDate)}
                  </span>

                  <span
                    className={`deadline-badge deadline-${deadline.type}`}
                  >
                    {deadline.label}
                  </span>
                </div>

                {/* STATUS / EDIT / DELETE */}
                <div className="task-card-bottom">
                  <select
                    aria-label={`Status for ${task.title}`}
                    value={task.status}
                    onChange={(e) =>
                      changeStatus(
                        task,
                        e.target.value
                      )
                    }
                  >
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>

                  <div className="task-actions">
                    <button
                      type="button"
                      onClick={() =>
                        editTask(task)
                      }
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() =>
                        deleteTask(task._id)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
