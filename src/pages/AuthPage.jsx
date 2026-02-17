import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";

const authHighlights = [
  "Upload notes and PYQs in one dashboard",
  "AI pre-grade before final upload",
  "Subject-wise search + research references",
  "Personalized target-grade planner",
];

const branchOptions = ["CSE", "ECE", "EEE", "ME", "CE", "IT", "AIML"];

export default function AuthPage() {
  const navigate = useNavigate();
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [login, setLogin] = useState({
    email: "",
    password: "",
  });

  const [register, setRegister] = useState({
    name: "",
    email: "",
    password: "",
    college: "",
    branch: "",
    semester: "",
  });

  async function handleLogin(e) {
    e.preventDefault();
    try {
      setError("");
      setMessage("");
      setLoadingLogin(true);
      const res = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: login.email.trim(),
          password: login.password,
        }),
      });

      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
      setMessage("Login successful.");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoadingLogin(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    try {
      setError("");
      setMessage("");
      setLoadingRegister(true);
      const res = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: register.name.trim(),
          email: register.email.trim(),
          password: register.password,
          college: register.college.trim(),
          branch: register.branch.trim(),
          semester: Number(register.semester),
        }),
      });

      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
      setMessage("Registration successful.");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoadingRegister(false);
    }
  }

  return (
    <section className="auth-shell">
      <div className="auth-hero card glass-card">
        <h2 style={{ marginTop: 0 }}>Campus Resource Share</h2>
        <p className="muted">One place for notes, PYQs, research references, and AI-driven semester planning.</p>
        <ul className="notes-list">
          {authHighlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="auth-page card">
        <h2 style={{ marginTop: 0 }}>Login / Register</h2>
        <p className="muted" style={{ marginTop: "0.25rem" }}>Use your student details to track progress, attendance impact, and target-grade planning.</p>
        <div className="auth-grid">
          <form className="form card-light auth-card" onSubmit={handleLogin}>
            <h3>Login</h3>
            <input
              placeholder="Email"
              type="email"
              value={login.email}
              onChange={(e) => setLogin((p) => ({ ...p, email: e.target.value }))}
              required
            />
            <input
              placeholder="Password"
              type="password"
              value={login.password}
              onChange={(e) => setLogin((p) => ({ ...p, password: e.target.value }))}
              required
            />
            <button type="submit" disabled={loadingLogin}>
              {loadingLogin ? "Logging in..." : "Login"}
            </button>
          </form>

          <form className="form card-light auth-card" onSubmit={handleRegister}>
            <h3>Create Student Account</h3>
            <input
              placeholder="Name"
              value={register.name}
              onChange={(e) => setRegister((p) => ({ ...p, name: e.target.value }))}
              required
            />
            <input
              placeholder="Email"
              type="email"
              value={register.email}
              onChange={(e) => setRegister((p) => ({ ...p, email: e.target.value }))}
              required
            />
            <input
              placeholder="Password"
              type="password"
              value={register.password}
              onChange={(e) => setRegister((p) => ({ ...p, password: e.target.value }))}
              required
              minLength={6}
            />
            <input
              placeholder="College"
              value={register.college}
              onChange={(e) => setRegister((p) => ({ ...p, college: e.target.value }))}
              required
            />
            <select
              value={register.branch}
              onChange={(e) => setRegister((p) => ({ ...p, branch: e.target.value }))}
              required
            >
              <option value="">Select Branch</option>
              {branchOptions.map((branch) => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
            <input
              placeholder="Semester"
              type="number"
              min="1"
              max="12"
              value={register.semester}
              onChange={(e) => setRegister((p) => ({ ...p, semester: e.target.value }))}
              required
            />
            <button type="submit" disabled={loadingRegister}>
              {loadingRegister ? "Creating..." : "Create Account"}
            </button>
          </form>
        </div>
        {message && <p style={{ color: "#1f7a3b" }}>{message}</p>}
        {error && <p style={{ color: "#a62222" }}>{error}</p>}
      </div>
    </section>
  );
}
