import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { adminLogin } from "../services/authService";

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      await adminLogin(email, password);

      navigate("/admin");
    } catch (err) {
      console.error(err);

      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        setError("Invalid email or password.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many login attempts. Please try again later.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8F7F2",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          background: "#fff",
          borderRadius: "16px",
          padding: "36px",
          boxShadow: "0 10px 35px rgba(15, 23, 42, 0.10)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <img
            src="/logo.png"
            alt="Democratic News"
            style={{
              width: "72px",
              height: "72px",
              objectFit: "contain",
              marginBottom: "15px",
            }}
          />

          <h1
            style={{
              margin: 0,
              color: "#0b1f33",
              fontSize: "27px",
            }}
          >
            Admin Login
          </h1>

          <p
            style={{
              marginTop: "8px",
              color: "#687789",
            }}
          >
            Democratic News Administration
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#fff1f0",
              color: "#b42318",
              padding: "12px 14px",
              borderRadius: "8px",
              marginBottom: "18px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label
            style={{
              display: "block",
              marginBottom: "7px",
              fontWeight: "700",
              color: "#0b1f33",
            }}
          >
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@democraticnews.in"
            required
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px 14px",
              border: "1px solid #d6dce3",
              borderRadius: "8px",
              marginBottom: "18px",
              fontSize: "15px",
            }}
          />

          <label
            style={{
              display: "block",
              marginBottom: "7px",
              fontWeight: "700",
              color: "#0b1f33",
            }}
          >
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter admin password"
            required
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px 14px",
              border: "1px solid #d6dce3",
              borderRadius: "8px",
              marginBottom: "22px",
              fontSize: "15px",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "8px",
              background: "#0b1f33",
              color: "#fff",
              fontSize: "16px",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div
          style={{
            textAlign: "center",
            marginTop: "22px",
          }}
        >
          <Link
            to="/"
            style={{
              color: "#D4A72C",
              textDecoration: "none",
              fontWeight: "700",
            }}
          >
            ← Back to Democratic News
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;