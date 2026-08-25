"use client";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchApi } from "@/lib/api";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (res?.data?.token) login(res.data.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: "40px", width: "100%", maxWidth: "400px" }}>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{ fontSize: "32px", marginBottom: "8px" }}>📦</div>
        <h1 style={{ fontSize: "22px", fontWeight: 700 }}>Inventory Dashboard</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>Sign in to continue</p>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && <div style={{ color: "var(--danger)", fontSize: "14px", padding: "10px", background: "rgba(239,68,68,0.1)", borderRadius: "6px" }}>{error}</div>}
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>Username</label>
          <input id="username" type="text" className="input-field" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>Password</label>
          <input id="password" type="password" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        <button id="login-btn" type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "8px", width: "100%" }}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
