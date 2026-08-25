"use client";
import { useState, useEffect } from "react";
import { usePolling } from "@/hooks/usePolling";

interface HealthData {
  status: "healthy" | "degraded" | "unhealthy";
  services: {
    api: { status: string };
    database: { status: string };
    kafka: { status: string };
  };
  timestamp: string;
}

export default function SystemHealth() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const res = await fetch(`${API_BASE}/health`, { headers });
      const json = await res.json();
      if (json.data) {
        setData(json.data);
      }
    } catch (err) {
      setData({
        status: "unhealthy",
        services: {
          api: { status: "unhealthy" },
          database: { status: "unhealthy" },
          kafka: { status: "unhealthy" }
        },
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHealth(); }, []);
  usePolling(() => { fetchHealth(); }, 15000); // Check health every 15s

  if (loading && !data) {
    return (
      <div className="glass-panel" style={{ padding: "16px", marginBottom: "24px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>System Health</h3>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Checking health...</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    if (status === "healthy" || status === "CONNECTED") return "var(--success)";
    if (status === "degraded") return "var(--warning)";
    return "var(--danger)";
  };

  const getStatusDot = (status: string) => (
    <span style={{ 
      display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", 
      backgroundColor: getStatusColor(status), marginRight: "8px" 
    }}></span>
  );

  return (
    <div className="glass-panel" style={{ padding: "20px", marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600 }}>System Health</h3>
        {data && (
          <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            Last Checked: {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}>
          <span style={{ color: "var(--text-secondary)" }}>API</span>
          <div style={{ display: "flex", alignItems: "center", fontWeight: 500 }}>
            {getStatusDot(data?.services.api.status || "unhealthy")}
            {data?.services.api.status === "healthy" ? "Healthy" : "Unavailable"}
          </div>
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}>
          <span style={{ color: "var(--text-secondary)" }}>Database</span>
          <div style={{ display: "flex", alignItems: "center", fontWeight: 500 }}>
            {getStatusDot(data?.services.database.status || "unhealthy")}
            {data?.services.database.status === "healthy" ? "Connected" : "Unavailable"}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}>
          <span style={{ color: "var(--text-secondary)" }}>Kafka</span>
          <div style={{ display: "flex", alignItems: "center", fontWeight: 500 }}>
            {getStatusDot(data?.services.kafka.status || "unhealthy")}
            {data?.services.kafka.status === "healthy" ? "Connected" : "Unavailable"}
          </div>
        </div>
      </div>
    </div>
  );
}
