
import { useEffect, useMemo, useState } from "react";
import "./Calendar.css";

const API_URL = "http://localhost:5000/api/tasks";

const WEEK_DAYS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

const STATUS_OPTIONS = [
  "Pending",
  "In Progress",
  "Completed",
];

const PRIORITY_OPTIONS = [
  "Low",
  "Medium",
  "High",
];

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTaskDateKey(value) {
  if (!value) return "";

  if (value instanceof Date) {
    return getLocalDateKey(value);
  }

  const text = String(value);

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : getLocalDateKey(date);
}

function getAuthHeaders(includeJson = false) {
  const token = localStorage.getItem("tracexToken");

  return {
    ...(includeJson
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token
      ? { Authorization: `Bearer ${token}` }
      : {}),
  };
}

function getPriorityClass(priority) {
  const value = String(priority || "").toLowerCase();

  if (value === "high") return "high";
  if (value === "medium") return "medium";
  if (value === "low") return "low";

  return "normal";
}

function getStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value === "completed") return "completed";
  if (value.includes("progress")) return "progress";

  return "pending";
}

function formatDate(dateKey) {
  if (!dateKey) return "No due date";

  const date = new Date(`${dateKey}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function createEditForm(task) {
  return {
    status: task.status || "Pending",
    priority: task.priority || "Medium",
    dueDate: getTaskDateKey(task.dueDate),
  };
}

export default function Calendar({ onNavigate }) {
  const [currentDate, setCurrentDate] = useState(
    () => new Date()
  );

  const [selectedDate, setSelectedDate] = useState(
    () => getLocalDateKey(new Date())
  );

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [editForm, setEditForm] = useState({
    status: "Pending",
    priority: "Medium",
    dueDate: "",
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ===================================
  // FETCH TASKS
  // ===================================

  useEffect(() => {
    const controller = new AbortController();

    async function fetchTasks() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(API_URL, {
          headers: getAuthHeaders(),
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok || result.success === false) {
          throw new Error(
            result.message || "Failed to fetch tasks."
          );
        }

        const taskList = Array.isArray(result)
          ? result
          : Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.tasks)
          ? result.tasks
          : [];

        setTasks(taskList);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(
            err.message || "Something went wrong."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchTasks();

    return () => controller.abort();
  }, []);

  // ===================================
  // MODAL ESCAPE KEY
  // ===================================

  useEffect(() => {
    if (!selectedTask) return;

    function handleEscape(event) {
      if (event.key === "Escape" && !saving) {
        setSelectedTask(null);
        setIsEditing(false);
        setSaveError("");
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [selectedTask, saving]);

  // ===================================
  // CALENDAR DATA
  // ===================================

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString(
    "en-IN",
    {
      month: "long",
      year: "numeric",
    }
  );

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();

    const daysInMonth = new Date(
      year,
      month + 1,
      0
    ).getDate();

    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }, [year, month]);

  const tasksByDate = useMemo(() => {
    const grouped = {};

    tasks.forEach((task) => {
      const dateKey = getTaskDateKey(task.dueDate);

      if (!dateKey) return;

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push(task);
    });

    return grouped;
  }, [tasks]);

  const getTasksForDate = (dateKey) => {
    return tasksByDate[dateKey] || [];
  };

  const todayKey = getLocalDateKey(new Date());

  const selectedTasks = getTasksForDate(selectedDate);

  const currentMonthTasks = tasks.filter((task) => {
    const dateKey = getTaskDateKey(task.dueDate);

    const monthPrefix = `${year}-${String(
      month + 1
    ).padStart(2, "0")}-`;

    return dateKey.startsWith(monthPrefix);
  });

  const completedMonthTasks = currentMonthTasks.filter(
    (task) =>
      String(task.status || "").toLowerCase() ===
      "completed"
  ).length;

  const pendingMonthTasks =
    currentMonthTasks.length - completedMonthTasks;

  // ===================================
  // CALENDAR NAVIGATION
  // ===================================

  function changeMonth(offset) {
    const nextDate = new Date(
      year,
      month + offset,
      1
    );

    setCurrentDate(nextDate);
    setSelectedDate(getLocalDateKey(nextDate));
    setSuccessMessage("");
  }

  function goToToday() {
    const today = new Date();

    setCurrentDate(today);
    setSelectedDate(getLocalDateKey(today));
    setSuccessMessage("");
  }

  function selectDay(day) {
    const date = new Date(year, month, day);

    setSelectedDate(getLocalDateKey(date));
    setSuccessMessage("");
  }

  // ===================================
  // TASK DETAILS
  // ===================================

  function openTaskDetails(task) {
    setSelectedTask(task);
    setEditForm(createEditForm(task));
    setIsEditing(false);
    setSaveError("");
    setSuccessMessage("");
  }

  function closeTaskDetails() {
    if (saving) return;

    setSelectedTask(null);
    setIsEditing(false);
    setSaveError("");
  }

  function startEditing() {
    if (!selectedTask) return;

    setEditForm(createEditForm(selectedTask));
    setIsEditing(true);
    setSaveError("");
  }

  function cancelEditing() {
    if (saving) return;

    setIsEditing(false);
    setSaveError("");
  }

  function updateEditField(field, value) {
    setEditForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSaveError("");
  }

  // ===================================
  // SAVE TASK TO MONGODB
  // ===================================

  async function saveTaskChanges(event) {
    event.preventDefault();

    if (!selectedTask || saving) return;

    const taskId = selectedTask._id;

    if (!taskId) {
      setSaveError("Task ID is missing.");
      return;
    }

    if (!STATUS_OPTIONS.includes(editForm.status)) {
      setSaveError("Please select a valid status.");
      return;
    }

    if (!PRIORITY_OPTIONS.includes(editForm.priority)) {
      setSaveError("Please select a valid priority.");
      return;
    }

    if (
      editForm.dueDate &&
      !/^\d{4}-\d{2}-\d{2}$/.test(editForm.dueDate)
    ) {
      setSaveError("Please select a valid due date.");
      return;
    }

    const updates = {
      status: editForm.status,
      priority: editForm.priority,
      dueDate: editForm.dueDate || null,
    };

    try {
      setSaving(true);
      setSaveError("");

      const response = await fetch(
        `${API_URL}/${taskId}`,
        {
          method: "PUT",
          headers: getAuthHeaders(true),
          body: JSON.stringify(updates),
        }
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Failed to update task."
        );
      }

      const updatedTask = result.data;

      if (!updatedTask) {
        throw new Error(
          "Server did not return the updated task."
        );
      }

      // Update the calendar immediately.
      setTasks((previousTasks) =>
        previousTasks.map((task) =>
          task._id === taskId ? updatedTask : task
        )
      );

      setSelectedTask(updatedTask);
      setEditForm(createEditForm(updatedTask));
      setIsEditing(false);

      setSuccessMessage(
        "Task updated successfully!"
      );
    } catch (err) {
      setSaveError(
        err.message || "Unable to save task."
      );
    } finally {
      setSaving(false);
    }
  }

  // ===================================
  // RENDER
  // ===================================

  return (
    <div className="calendar-page">
      {/* HEADER */}

      <div className="calendar-header">
        <div>
          <span className="calendar-eyebrow">
            TRACEX PLANNER
          </span>

          <h1>📅 Task Calendar</h1>

          <p>
            Plan your work, track deadlines and
            stay organized.
          </p>
        </div>

        <button
          type="button"
          className="calendar-today-btn"
          onClick={goToToday}
        >
          ◉ Today
        </button>
      </div>

      {/* STATISTICS */}

      <div className="calendar-stats">
        <div className="calendar-stat-card">
          <span className="calendar-stat-icon purple">
            📋
          </span>

          <div>
            <p>Tasks This Month</p>
            <h3>{currentMonthTasks.length}</h3>
          </div>
        </div>

        <div className="calendar-stat-card">
          <span className="calendar-stat-icon green">
            ✓
          </span>

          <div>
            <p>Completed</p>
            <h3>{completedMonthTasks}</h3>
          </div>
        </div>

        <div className="calendar-stat-card">
          <span className="calendar-stat-icon orange">
            ⏳
          </span>

          <div>
            <p>Not Completed</p>
            <h3>{pendingMonthTasks}</h3>
          </div>
        </div>
      </div>

      {error && (
        <div className="calendar-error">
          ⚠️ {error}
        </div>
      )}

      {successMessage && (
        <div
          className="calendar-success"
          role="status"
        >
          ✓ {successMessage}
        </div>
      )}

      {/* CALENDAR */}

      <div className="calendar-card">
        <div className="calendar-month-header">
          <div>
            <span className="calendar-section-label">
              MONTHLY OVERVIEW
            </span>

            <h2>{monthName}</h2>
          </div>

          <div className="calendar-navigation">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
            >
              ❮
            </button>

            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
            >
              ❯
            </button>
          </div>
        </div>

        <div className="calendar-grid">
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className="calendar-weekday"
            >
              {day}
            </div>
          ))}

          {calendarDays.map((day, index) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${index}`}
                  className="calendar-empty"
                />
              );
            }

            const dateKey = getLocalDateKey(
              new Date(year, month, day)
            );

            const dayTasks =
              getTasksForDate(dateKey);

            const isToday = dateKey === todayKey;

            const isSelected =
              dateKey === selectedDate;

            return (
              <div
                key={dateKey}
                className={[
                  "calendar-day",
                  isToday ? "today" : "",
                  isSelected ? "selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <button
                  type="button"
                  className="calendar-day-select"
                  onClick={() => selectDay(day)}
                  aria-label={`Select ${formatDate(dateKey)}`}
                  aria-pressed={isSelected}
                >
                  <span className="calendar-day-number">
                    {day}
                  </span>

                  {dayTasks.length > 0 && (
                    <span className="calendar-day-total">
                      {dayTasks.length}
                    </span>
                  )}
                </button>

                <div className="calendar-day-tasks">
                  {dayTasks.slice(0, 2).map((task) => (
                    <button
                      key={task._id}
                      type="button"
                      className={[
                        "calendar-task-chip",
                        getPriorityClass(task.priority),
                        getStatusClass(task.status) ===
                        "completed"
                          ? "is-completed"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() =>
                        openTaskDetails(task)
                      }
                      title={task.title}
                    >
                      <span className="calendar-chip-dot" />

                      <span className="calendar-chip-title">
                        {task.title}
                      </span>
                    </button>
                  ))}

                  {dayTasks.length > 2 && (
                    <button
                      type="button"
                      className="calendar-more-tasks"
                      onClick={() => selectDay(day)}
                    >
                      +{dayTasks.length - 2} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LEGEND */}

      <div className="calendar-legend">
        <span>Priority:</span>

        <span className="calendar-legend-item">
          <i className="legend-dot high" />
          High
        </span>

        <span className="calendar-legend-item">
          <i className="legend-dot medium" />
          Medium
        </span>

        <span className="calendar-legend-item">
          <i className="legend-dot low" />
          Low
        </span>

        <span className="calendar-legend-item">
          <i className="legend-dot completed" />
          Completed
        </span>
      </div>

      {/* DAILY TASKS */}

      <div className="calendar-selected-section">
        <div className="calendar-selected-heading">
          <div>
            <span className="calendar-section-label">
              DAILY TASKS
            </span>

            <h2>
              📝 {formatDate(selectedDate)}
            </h2>
          </div>

          <span className="calendar-selected-count">
            {selectedTasks.length}{" "}
            {selectedTasks.length === 1
              ? "Task"
              : "Tasks"}
          </span>
        </div>

        {loading ? (
          <div className="calendar-loading">
            Loading your tasks...
          </div>
        ) : selectedTasks.length === 0 ? (
          <div className="calendar-empty-message">
            <span>🗓️</span>

            <h3>No tasks scheduled</h3>

            <p>
              There are no tasks due on this date.
            </p>
          </div>
        ) : (
          <div className="calendar-task-list">
            {selectedTasks.map((task) => (
              <button
                key={task._id}
                type="button"
                className="calendar-task-item"
                onClick={() =>
                  openTaskDetails(task)
                }
              >
                <span
                  className={`calendar-task-priority ${getPriorityClass(
                    task.priority
                  )}`}
                />

                <div className="calendar-task-info">
                  <h3>{task.title}</h3>

                  <p>
                    {task.category || "General"} ·{" "}
                    {task.priority || "No priority"}{" "}
                    Priority
                  </p>
                </div>

                <span
                  className={`calendar-task-status ${getStatusClass(
                    task.status
                  )}`}
                >
                  {task.status || "Pending"}
                </span>

                <span className="calendar-task-arrow">
                  →
                </span>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          className="calendar-view-tasks-btn"
          onClick={() => onNavigate?.("tasks")}
        >
          View All Tasks →
        </button>
      </div>

      {/* TASK DETAILS / EDIT MODAL */}

      {selectedTask && (
        <div
          className="calendar-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              closeTaskDetails();
            }
          }}
        >
          <div
            className="calendar-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-modal-title"
          >
            <div className="calendar-modal-header">
              <div>
                <span className="calendar-section-label">
                  {isEditing
                    ? "EDIT TASK"
                    : "TASK DETAILS"}
                </span>

                <h2 id="calendar-modal-title">
                  {selectedTask.title}
                </h2>
              </div>

              <button
                type="button"
                className="calendar-modal-close"
                onClick={closeTaskDetails}
                disabled={saving}
                aria-label="Close task details"
              >
                ✕
              </button>
            </div>

            {isEditing ? (
              <form
                onSubmit={saveTaskChanges}
                className="calendar-edit-form"
              >
                <div className="calendar-modal-body">
                  <p className="calendar-edit-intro">
                    Update this task directly from
                    your calendar.
                  </p>

                  <div className="calendar-form-group">
                    <label htmlFor="calendar-edit-status">
                      Task Status
                    </label>

                    <select
                      id="calendar-edit-status"
                      value={editForm.status}
                      onChange={(event) =>
                        updateEditField(
                          "status",
                          event.target.value
                        )
                      }
                      disabled={saving}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="calendar-form-group">
                    <label htmlFor="calendar-edit-priority">
                      Priority
                    </label>

                    <select
                      id="calendar-edit-priority"
                      value={editForm.priority}
                      onChange={(event) =>
                        updateEditField(
                          "priority",
                          event.target.value
                        )
                      }
                      disabled={saving}
                    >
                      {PRIORITY_OPTIONS.map((priority) => (
                        <option
                          key={priority}
                          value={priority}
                        >
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="calendar-form-group">
                    <label htmlFor="calendar-edit-date">
                      Due Date
                    </label>

                    <input
                      id="calendar-edit-date"
                      type="date"
                      value={editForm.dueDate}
                      onChange={(event) =>
                        updateEditField(
                          "dueDate",
                          event.target.value
                        )
                      }
                      disabled={saving}
                    />

                    <small>
                      Leave empty to remove the due date.
                    </small>
                  </div>

                  {saveError && (
                    <div
                      className="calendar-form-error"
                      role="alert"
                    >
                      ⚠️ {saveError}
                    </div>
                  )}
                </div>

                <div className="calendar-modal-footer">
                  <button
                    type="button"
                    className="calendar-modal-secondary"
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="calendar-modal-save"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : "✓ Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="calendar-modal-body">
                  <div className="calendar-modal-description">
                    <h3>Description</h3>

                    <p>
                      {selectedTask.description ||
                        "No description added."}
                    </p>
                  </div>

                  <div className="calendar-detail-grid">
                    <div className="calendar-detail-box">
                      <span>Status</span>

                      <strong
                        className={`calendar-task-status ${getStatusClass(
                          selectedTask.status
                        )}`}
                      >
                        {selectedTask.status || "Pending"}
                      </strong>
                    </div>

                    <div className="calendar-detail-box">
                      <span>Priority</span>

                      <strong
                        className={`calendar-detail-priority ${getPriorityClass(
                          selectedTask.priority
                        )}`}
                      >
                        {selectedTask.priority || "Not Set"}
                      </strong>
                    </div>

                    <div className="calendar-detail-box">
                      <span>Category</span>

                      <strong>
                        {selectedTask.category || "General"}
                      </strong>
                    </div>

                    <div className="calendar-detail-box">
                      <span>Due Date</span>

                      <strong>
                        {formatDate(
                          getTaskDateKey(selectedTask.dueDate)
                        )}
                      </strong>
                    </div>
                  </div>

                  {Array.isArray(selectedTask.labels) &&
                    selectedTask.labels.length > 0 && (
                      <div className="calendar-modal-labels">
                        <h3>Labels</h3>

                        <div>
                          {selectedTask.labels.map(
                            (label, index) => (
                              <span
                                key={`${label}-${index}`}
                              >
                                {label}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>

                <div className="calendar-modal-footer">
                  <button
                    type="button"
                    className="calendar-modal-secondary"
                    onClick={closeTaskDetails}
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    className="calendar-modal-edit"
                    onClick={startEditing}
                  >
                    ✏️ Edit Task
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
