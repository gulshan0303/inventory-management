"use client";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardHeader() {
  const { logout } = useAuth();
  return (
    <header className="glass-panel" style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px 24px", marginBottom: "32px", borderRadius: "var(--radius-md)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "24px" }}>📦</span>
        <h1 style={{ fontSize: "20px", fontWeight: 600 }}>Inventory Dashboard</h1>
        <span style={{ fontSize: "11px", padding: "3px 8px", background: "rgba(16,185,129,0.15)", color: "var(--success)", borderRadius: "12px" }}>● LIVE</span>
      </div>
      <div style={{ display: "flex", gap: "16px" }}>
        <a 
          href="http://52.65.223.73:3001/api-docs" 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn-secondary" 
          style={{ padding: "8px 16px", textDecoration: "none", backgroundColor: "rgba(59,130,246,0.15)", color: "var(--primary)", borderRadius: "var(--radius-sm)" }}
        >
          📄 API Docs
        </a>
        <button id="logout-btn" onClick={logout} className="btn-primary" style={{ padding: "8px 16px", backgroundColor: "rgba(239,68,68,0.15)", color: "var(--danger)" }}>
          Logout
        </button>
      </div>
    </header>
  );
}
