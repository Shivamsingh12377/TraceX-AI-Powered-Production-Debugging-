import { useState } from "react";
import "./Auth.css";
const API_URL = import.meta.env.VITE_API_URL;
export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isRegister = mode === "register";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/${mode}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isRegister
              ? { name, email, password }
              : { email, password }
          ),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      if (isRegister) {
        setSuccess("Account created! Please log in.");
        setMode("login");
        setName("");
        setPassword("");
      } else {
        localStorage.setItem("tracexToken", data.token);
        localStorage.setItem(
          "tracexUser",
          JSON.stringify(data.user)
        );
        onLogin(data.user);
      }
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Backend se connect nahi hua. Check port 5000."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
  }

  return (
    <main className="auth-page">
      <section className="auth-info">
        <div className="brand">
          <span className="brand-icon">⌁</span>
          <span>TraceX</span>
        </div>

        <div className="info-content">
          <span className="eyebrow">AI-POWERED PRODUCTION DEBUGGING</span>
          <h1>Find errors.<br />Fix faster.</h1>
          <p>
            Monitor your applications, understand root causes,
            and debug smarter with TraceX.
          </p>

          <div className="feature">
            <span>✓</span>
            <div>
              <strong>Smart error insights</strong>
              <p>Understand what went wrong.</p>
            </div>
          </div>

          <div className="feature">
            <span>✓</span>
            <div>
              <strong>One place to debug</strong>
              <p>Keep your projects organized.</p>
            </div>
          </div>
        </div>

        <p className="info-footer">Built for developers · TraceX</p>
      </section>

      <section className="auth-form-side">
        <div className="auth-card">
          <div className="mobile-brand">⌁ TraceX</div>

          <div className="form-heading">
            <span className="eyebrow">WELCOME TO TRACEX</span>
            <h2>{isRegister ? "Create your account" : "Welcome back"}</h2>
            <p>
              {isRegister
                ? "Get started with your developer workspace."
                : "Log in to continue to your workspace."}
            </p>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={!isRegister ? "active" : ""}
              onClick={() => switchMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={isRegister ? "active" : ""}
              onClick={() => switchMode("register")}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <label>
                Full name
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </label>
            )}

            <label>
              Email address
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegister ? "new-password" : "current-password"}
                minLength={8}
                required
              />
            </label>

            {error && <div className="auth-message error">{error}</div>}
            {success && <div className="auth-message success">{success}</div>}

            <button
              className="submit-btn"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isRegister
                  ? "Create Account →"
                  : "Login to TraceX →"}
            </button>
          </form>

          <p className="switch-text">
            {isRegister ? "Already have an account?" : "New to TraceX?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(isRegister ? "login" : "register")}
            >
              {isRegister ? "Login" : "Create account"}
            </button>
          </p>

          <p className="secure-note">🔒 Your account is protected</p>
        </div>
      </section>
    </main>
  );
}