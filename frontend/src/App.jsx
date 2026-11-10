
import { useCallback, useEffect, useState } from "react";

import Auth from "./Auth";
import Dashboard from "./pages/Dashboard";
import MyTasks from "./pages/MyTasks";
import KanbanBoard from "./pages/KanbanBoard";
import Calendar from "./Calendar";
import ErrorMonitoring from "./pages/ErrorMonitoring";
import ReportsAnalytics from "./pages/ReportsAnalytics";

// STEP 8.3: API HEALTH PAGE
import ApiHealth from "./pages/ApiHealth";

import "./App.css";

// ===================================
// SIDEBAR MENU ITEMS
// ===================================

const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "📊",
  },
  {
    id: "tasks",
    label: "My Tasks",
    icon: "📋",
  },
  {
    id: "kanban",
    label: "Kanban Board",
    icon: "🗂️",
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: "📅",
  },
  {
    id: "errors",
    label: "Error Monitoring",
    icon: "🐞",
  },
  {
    id: "reports",
    label: "Reports & Analytics",
    icon: "📈",
  },
  {
    id: "api-health",
    label: "API Health",
    icon: "💚",
  },
];

export default function App() {
  // ===================================
  // LOGGED-IN USER
  // ===================================

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("tracexUser");

      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error("User loading error:", error);
      return null;
    }
  });

  // ===================================
  // ACTIVE PAGE
  // ===================================

  const [page, setPage] = useState("dashboard");

  // ===================================
  // MOBILE SIDEBAR
  // ===================================

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ===================================
  // LOGIN
  // ===================================

  const handleLogin = (userData) => {
    localStorage.setItem(
      "tracexUser",
      JSON.stringify(userData)
    );

    setUser(userData);
    setPage("dashboard");
    setSidebarOpen(false);
  };

  // ===================================
  // LOGOUT
  // ===================================

  const handleLogout = useCallback(() => {
    localStorage.removeItem("tracexUser");
    localStorage.removeItem("tracexToken");

    setUser(null);
    setPage("dashboard");
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener(
      "tracex:auth-expired",
      handleLogout
    );

    return () => {
      window.removeEventListener(
        "tracex:auth-expired",
        handleLogout
      );
    };
  }, [handleLogout]);

  // ===================================
  // NAVIGATION
  // ===================================

  const handleNavigate = (nextPage) => {
    setPage(nextPage);
    setSidebarOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const activePage =
    menuItems.find((item) => item.id === page) ||
    menuItems[0];

  // ===================================
  // AUTH PAGE
  // ===================================

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="tracex-layout">
      {/* MOBILE SIDEBAR OVERLAY */}

      {sidebarOpen && (
        <button
          type="button"
          className="tracex-sidebar-overlay"
          aria-label="Close navigation menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* PROFESSIONAL SIDEBAR */}

      <aside
        className={`tracex-sidebar ${
          sidebarOpen ? "sidebar-open" : ""
        }`}
      >
        {/* LOGO */}

        <div className="tracex-sidebar-brand">
          <div className="tracex-brand-icon">✦</div>

          <div className="tracex-brand-text">
            <h2>TraceX</h2>
            <span>WORKSPACE</span>
          </div>

          <button
            type="button"
            className="tracex-sidebar-close"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* SIDEBAR NAVIGATION */}

        <div className="tracex-sidebar-content">
          <p className="tracex-menu-heading">
            MAIN MENU
          </p>

          <nav
            className="tracex-sidebar-nav"
            aria-label="Main navigation"
          >
            {menuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`tracex-nav-item ${
                  page === item.id ? "active" : ""
                }`}
                onClick={() =>
                  handleNavigate(item.id)
                }
                aria-current={
                  page === item.id
                    ? "page"
                    : undefined
                }
              >
                <span className="tracex-nav-icon">
                  {item.icon}
                </span>

                <span className="tracex-nav-label">
                  {item.label}
                </span>

                {page === item.id && (
                  <span className="tracex-active-indicator" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* SIDEBAR USER SECTION */}

        <div className="tracex-sidebar-bottom">
          <div className="tracex-user-card">
            <div className="tracex-user-avatar">
              {String(
                user?.name ||
                user?.username ||
                user?.email ||
                "U"
              )
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="tracex-user-info">
              <strong>
                {user?.name ||
                  user?.username ||
                  "TraceX User"}
              </strong>

              <span>
                {user?.email || "Signed in"}
              </span>
            </div>
          </div>

          {/* LOGOUT */}

          <button
            type="button"
            className="tracex-logout-btn"
            onClick={handleLogout}
          >
            <span>↪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}

      <div className="tracex-main">
        {/* TOP HEADER */}

        <header className="tracex-topbar">
          <div className="tracex-topbar-left">
            <button
              type="button"
              className="tracex-menu-toggle"
              aria-label="Open navigation menu"
              aria-expanded={sidebarOpen}
              onClick={() =>
                setSidebarOpen((previous) => !previous)
              }
            >
              ☰
            </button>

            <div>
              <span className="tracex-topbar-eyebrow">
                TRACEX WORKSPACE
              </span>

              <h1>{activePage.label}</h1>
            </div>
          </div>

          <div className="tracex-topbar-right">
            <span className="tracex-welcome">
              Welcome back
            </span>

            <div className="tracex-topbar-avatar">
              {String(
                user?.name ||
                user?.username ||
                user?.email ||
                "U"
              )
                .charAt(0)
                .toUpperCase()}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}

        <main className="tracex-page-content">
          {/* DASHBOARD */}

          {page === "dashboard" && (
            <Dashboard
              user={user}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
            />
          )}

          {/* MY TASKS */}

          {page === "tasks" && <MyTasks />}

          {/* KANBAN BOARD */}

          {page === "kanban" && <KanbanBoard />}

          {/* CALENDAR */}

          {page === "calendar" && (
            <Calendar onNavigate={handleNavigate} />
          )}

          {/* ERROR MONITORING */}

          {page === "errors" && <ErrorMonitoring />}

          {/* REPORTS & ANALYTICS */}

          {page === "reports" && <ReportsAnalytics />}

          {/* STEP 8.3: API HEALTH */}

          {page === "api-health" && <ApiHealth />}
        </main>
      </div>
    </div>
  );
}
