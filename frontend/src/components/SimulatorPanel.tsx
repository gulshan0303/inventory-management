"use client";
import { useState } from "react";
import { fetchApi } from "@/lib/api";
import EventStatusTracker from "./EventStatusTracker";

const SCENARIOS = [
  { id: "scenario-1", label: "Basic FIFO (Multi-batch)", desc: "50 units @$100 + 30 units @$120 → sell 20" },
  { id: "scenario-2", label: "Cross-batch FIFO", desc: "50 units @$100 + 30 units @$120 → sell 60 (uses both batches)" },
  { id: "scenario-3", label: "Multi-product", desc: "PRD001 + PRD002 purchases → sell PRD001 20 units" },
  { id: "scenario-4", label: "Exact Batch", desc: "50 units @$100 → sell exactly 50 (clears batch)" },
  { id: "scenario-5", label: "Insufficient Stock", desc: "20 units @$100 → try sell 50 (should fail)" },
];

export default function SimulatorPanel({ onSimulate }: { onSimulate: () => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [trackedEventId, setTrackedEventId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const runScenario = async (scenarioId: string) => {
    setLoading(scenarioId);
    setMessage(null);
    setEventIds([]);
    try {
      const res = await fetchApi("/simulate-scenario", {
        method: "POST",
        body: JSON.stringify({ scenario_id: scenarioId }),
      });
      if (res) {
        setEventIds(res.data.event_ids || []);
        setMessage({ text: `✅ Scenario started! ${res.data.event_ids?.length} events published to Kafka.`, type: "success" });
        setTimeout(onSimulate, 3000);
      }
    } catch (err: unknown) {
      setMessage({ text: `❌ ${err instanceof Error ? err.message : "Simulation failed"}`, type: "error" });
    } finally {
      setLoading(null);
    }
  };

  const runBatch = async () => {
    setLoading("batch");
    setMessage(null);
    setEventIds([]);
    try {
      const res = await fetchApi("/simulate-batch", { method: "POST" });
      if (res) {
        setMessage({ text: "✅ Batch simulation started! 7 events publishing to Kafka (1 per second)...", type: "success" });
        setTimeout(onSimulate, 8000);
      }
    } catch (err: unknown) {
      setMessage({ text: `❌ ${err instanceof Error ? err.message : "Batch failed"}`, type: "error" });
    } finally {
      setLoading(null);
    }
  };

  const resetDb = async () => {
    if (!confirm("Are you sure? This will clear ALL inventory data!")) return;
    setResetting(true);
    try {
      await fetchApi("/reset", { method: "POST" });
      setMessage({ text: "🗑️ Database reset successfully.", type: "success" });
      setEventIds([]);
      onSimulate();
    } catch (err: unknown) {
      setMessage({ text: `❌ Reset failed`, type: "error" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: "24px", marginBottom: "32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 600 }}>🎮 Kafka Simulator</h3>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={runBatch} disabled={loading === "batch"} className="btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }}>
            {loading === "batch" ? "Publishing..." : "▶ Run Full Batch (7 events)"}
          </button>
          <button onClick={resetDb} disabled={resetting} className="btn-primary" style={{ padding: "8px 16px", fontSize: "13px", backgroundColor: "rgba(239,68,68,0.15)", color: "var(--danger)" }}>
            {resetting ? "Resetting..." : "🗑 Reset DB"}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "13px",
          background: message.type === "success" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
          color: message.type === "success" ? "var(--success)" : "var(--danger)",
          border: `1px solid ${message.type === "success" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}` }}>
          {message.text}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {SCENARIOS.map((s) => (
          <button key={s.id} onClick={() => runScenario(s.id)} disabled={loading === s.id}
            style={{ padding: "16px", background: "rgba(15,23,42,0.6)", border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)", textAlign: "left", cursor: "pointer", transition: "var(--transition)",
              opacity: loading === s.id ? 0.7 : 1 }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
              {loading === s.id ? "Running..." : s.label}
            </p>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{s.desc}</p>
          </button>
        ))}
      </div>

      {eventIds.length > 0 && (
        <div>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "10px" }}>
            📋 Track event status (click to monitor pipeline):
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {eventIds.map((id, i) => (
              <button key={id} onClick={() => setTrackedEventId(id)}
                style={{ padding: "4px 10px", fontSize: "11px", background: "rgba(59,130,246,0.1)",
                  border: "1px solid rgba(59,130,246,0.3)", borderRadius: "6px", cursor: "pointer",
                  color: "var(--accent-primary)" }}>
                Event {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {trackedEventId && (
        <EventStatusTracker eventId={trackedEventId} onClose={() => setTrackedEventId(null)} />
      )}
    </div>
  );
}
