"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "@/lib/api";

interface EventStep {
  name: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  error?: string;
}

interface EventStatus {
  eventId: string;
  status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";
  eventType: "purchase" | "sale";
  productId: string;
  quantity: number;
  unitPrice: string | null;
  steps: EventStep[];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

const STEP_LABELS: Record<string, string> = {
  PUBLISHED: "Published to Kafka",
  CONSUMED: "Consumed by Backend",
  VALIDATED: "Validated Schema",
  FIFO_PROCESSED: "FIFO Processed",
  DATABASE_COMMITTED: "Committed to DB",
};

const statusColor: Record<string, string> = {
  PENDING: "var(--text-muted)",
  SUCCESS: "var(--success)",
  FAILED: "var(--danger)",
  PROCESSING: "var(--warning)",
};

export default function EventStatusTracker({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const [data, setData] = useState<EventStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetchApi(`/events/${eventId}/status`);
      if (res) setData(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch event status");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      if (data?.status !== "SUCCESS" && data?.status !== "FAILED") {
        fetchStatus();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchStatus, data?.status]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", 
      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px"
    }}>
      <div className="glass-panel" style={{ 
        padding: "32px", width: "100%", maxWidth: "520px",
        background: "rgba(15, 23, 42, 0.95)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        border: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 600 }}>📡 Event Status Tracker</h3>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.05)", border: "none", color: "var(--text-secondary)",
            fontSize: "20px", cursor: "pointer", width: "32px", height: "32px", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center", transition: "var(--transition)"
          }} onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
            ✕
          </button>
        </div>

        {loading && <p style={{ color: "var(--text-secondary)", textAlign: "center" }}>Loading event status...</p>}
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

        {data && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px", fontSize: "13px" }}>
              <div><span style={{ color: "var(--text-secondary)" }}>Event ID: </span><span style={{ fontFamily: "monospace", fontSize: "11px" }}>{data.eventId?.slice(0, 20)}...</span></div>
              <div><span style={{ color: "var(--text-secondary)" }}>Type: </span>
                <span style={{
                  padding: "2px 8px", borderRadius: "4px", fontWeight: 600, fontSize: "11px",
                  background: data.eventType === "purchase" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                  color: data.eventType === "purchase" ? "var(--success)" : "var(--danger)"
                }}>{data.eventType?.toUpperCase()}</span>
              </div>
              <div><span style={{ color: "var(--text-secondary)" }}>Product: </span>{data.productId}</div>
              <div><span style={{ color: "var(--text-secondary)" }}>Qty: </span>{data.quantity}</div>
              {data.unitPrice && <div><span style={{ color: "var(--text-secondary)" }}>Unit Price: </span>${parseFloat(data.unitPrice).toFixed(2)}</div>}
              <div><span style={{ color: "var(--text-secondary)" }}>Status: </span>
                <span style={{ color: statusColor[data.status], fontWeight: 600 }}>{data.status}</span>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>Pipeline Progress</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {data.steps?.map((step, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: "14px", flexShrink: 0,
                      background: step.status === "SUCCESS" ? "rgba(16,185,129,0.2)" : step.status === "FAILED" ? "rgba(239,68,68,0.2)" : "rgba(100,116,139,0.2)",
                      color: statusColor[step.status]
                    }}>
                      {step.status === "SUCCESS" ? "✓" : step.status === "FAILED" ? "✗" : String(i + 1)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "13px", fontWeight: 500 }}>{STEP_LABELS[step.name] || step.name}</p>
                      {step.error && <p style={{ fontSize: "11px", color: "var(--danger)", marginTop: "2px" }}>{step.error}</p>}
                    </div>
                    <span style={{ fontSize: "11px", color: statusColor[step.status], fontWeight: 600 }}>{step.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {data.errorMessage && (
              <div style={{ marginTop: "16px", padding: "12px", background: "rgba(239,68,68,0.1)", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p style={{ color: "var(--danger)", fontSize: "13px" }}>⚠️ {data.errorMessage}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
