"use client";
import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import EventStatusTracker from "./EventStatusTracker";

const SCENARIOS = [
  { id: "scenario-1", label: "Basic FIFO (Multi-batch)", desc: "Purchase 50 @ $100\nPurchase 30 @ $120\nSale 20", expectedValue: 2000, expectedType: "cost" },
  { id: "scenario-2", label: "Cross-batch FIFO", desc: "Purchase 50 @ $100\nPurchase 30 @ $120\nSale 60", expectedValue: 6200, expectedType: "cost" },
  { id: "scenario-3", label: "Multiple Products", desc: "Purchase 50 PRD001 @ $100\nPurchase 100 PRD002 @ $80\nSale 20 PRD001", expectedValue: 30, expectedType: "stock" },
  { id: "scenario-4", label: "Exact Batch Consumption", desc: "Purchase 50 @ $100\nSale 50", expectedValue: 5000, expectedType: "cost" },
  { id: "scenario-5", label: "Insufficient Inventory", desc: "Purchase 20 @ $100\nSale 50", expectedValue: "INSUFFICIENT_INVENTORY", expectedType: "error" },
];

export default function SimulatorPanel({ onSimulate }: { onSimulate: () => void }) {
  const [mode, setMode] = useState<"scenario" | "manual">("scenario");
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string>(SCENARIOS[0].id);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [trackedEventId, setTrackedEventId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [scenarioResult, setScenarioResult] = useState<{
    status: "running" | "completed" | "error";
    actual?: number | string;
    expected?: number | string;
    pass?: boolean;
    details?: string;
  } | null>(null);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    productId: "PRD001",
    eventType: "purchase",
    quantity: 10,
    unitPrice: 100
  });

  const activeScenario = SCENARIOS.find(s => s.id === selectedScenario);

  const runScenario = async () => {
    if (!activeScenario) return;
    
    setLoading("scenario");
    setMessage(null);
    setEventIds([]);
    setScenarioResult({ status: "running" });

    try {
      const res = await fetchApi("/simulate-scenario", {
        method: "POST",
        body: JSON.stringify({ scenario_id: activeScenario.id }),
      });
      if (res) {
        const publishedIds = res.data.event_ids || [];
        setEventIds(publishedIds);
        
        // Wait for the scenario to complete and check results
        checkScenarioResult(publishedIds, activeScenario);
      }
    } catch (err: unknown) {
      setScenarioResult({ status: "error", details: err instanceof Error ? err.message : "Simulation failed" });
      setLoading(null);
    }
  };

  const checkScenarioResult = async (ids: string[], scenario: any) => {
    if (ids.length === 0) return;
    const lastEventId = ids[ids.length - 1]; // The SALE event is usually last
    
    // Poll the last event status
    const interval = setInterval(async () => {
      try {
        const res = await fetchApi(`/events/${lastEventId}/status`);
        if (res && res.data) {
          const status = res.data.status;
          if (status === "SUCCESS" || status === "FAILED") {
            clearInterval(interval);
            
            // Allow some time for DB to commit and API to be ready
            setTimeout(async () => {
              let actualResult: number | string = "";
              let passed = false;

              if (scenario.expectedType === "error") {
                actualResult = status === "FAILED" ? "INSUFFICIENT_INVENTORY" : "SUCCESS";
                passed = actualResult === scenario.expectedValue;
              } else if (status === "SUCCESS") {
                if (scenario.expectedType === "cost") {
                  // Fetch the latest transaction to get the FIFO cost
                  const txRes = await fetchApi(`/transactions?limit=1`);
                  if (txRes && txRes.data && txRes.data.length > 0) {
                    actualResult = parseFloat(txRes.data[0].total_cost);
                    passed = actualResult === scenario.expectedValue;
                  }
                } else if (scenario.expectedType === "stock") {
                  // Fetch the inventory stock for PRD001
                  const invRes = await fetchApi(`/inventory/PRD001`);
                  if (invRes && invRes.data) {
                    actualResult = invRes.data.remaining_quantity;
                    passed = actualResult === scenario.expectedValue;
                  }
                }
              } else {
                actualResult = res.data.error_message || "FAILED";
                passed = false;
              }

              setScenarioResult({
                status: "completed",
                actual: actualResult,
                expected: scenario.expectedValue,
                pass: passed
              });
              setLoading(null);
              onSimulate(); // Refresh dashboard
            }, 1000);
          }
        }
      } catch (e) {
        // Continue polling if transient error
      }
    }, 2000);

    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(interval);
      if (loading === "scenario") {
        setScenarioResult({ status: "error", details: "Simulation timed out" });
        setLoading(null);
      }
    }, 30000);
  };

  const submitManualEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("manual");
    setMessage(null);
    setEventIds([]);
    setScenarioResult(null);

    try {
      const payload = {
        product_id: manualForm.productId,
        event_type: manualForm.eventType,
        quantity: manualForm.quantity,
        ...(manualForm.eventType === "purchase" ? { unit_price: manualForm.unitPrice } : {})
      };

      const res = await fetchApi("/transactions", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (res && res.data) {
        const newEventId = res.data.event_id;
        setEventIds([newEventId]);
        setTrackedEventId(newEventId);
        setMessage({ text: "✅ Event published to Kafka successfully!", type: "success" });
        // Automatically refresh the dashboard after a short delay so the user sees changes
        setTimeout(onSimulate, 1500); 
      }
    } catch (err: unknown) {
      setMessage({ text: `❌ ${err instanceof Error ? err.message : "Failed to publish event"}`, type: "error" });
    } finally {
      setLoading(null);
    }
  };

  const runBatch = async () => {
    setLoading("batch");
    setMessage(null);
    setEventIds([]);
    setScenarioResult(null);
    try {
      const res = await fetchApi("/simulate-batch", { method: "POST" });
      if (res) {
        setMessage({ text: "✅ Batch simulation started! 7 events publishing to Kafka (1 per second)...", type: "success" });
        setTimeout(() => { setLoading(null); onSimulate(); }, 8000);
      }
    } catch (err: unknown) {
      setMessage({ text: `❌ ${err instanceof Error ? err.message : "Batch failed"}`, type: "error" });
      setLoading(null);
    }
  };

  const resetDb = async () => {
    if (!confirm("Are you sure? This will clear ALL inventory data!")) return;
    setResetting(true);
    setScenarioResult(null);
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
          <button onClick={resetDb} disabled={resetting} className="btn-primary" style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "rgba(239,68,68,0.15)", color: "var(--danger)" }}>
            {resetting ? "Resetting..." : "🗑 Reset DB"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", background: "rgba(0,0,0,0.2)", padding: "4px", borderRadius: "8px" }}>
        <button 
          onClick={() => setMode("scenario")}
          style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "13px",
            background: mode === "scenario" ? "var(--accent-primary)" : "transparent",
            color: mode === "scenario" ? "#fff" : "var(--text-secondary)",
            transition: "var(--transition)"
          }}
        >Predefined Scenarios</button>
        <button 
          onClick={() => setMode("manual")}
          style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "13px",
            background: mode === "manual" ? "var(--accent-primary)" : "transparent",
            color: mode === "manual" ? "#fff" : "var(--text-secondary)",
            transition: "var(--transition)"
          }}
        >Manual Entry</button>
      </div>

      {mode === "scenario" ? (
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>Scenario:</label>
          <select 
            value={selectedScenario} 
            onChange={(e) => { setSelectedScenario(e.target.value); setScenarioResult(null); setEventIds([]); }}
            disabled={loading !== null}
            style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "rgba(15,23,42,0.8)", border: "1px solid var(--border-color)", color: "white", marginBottom: "12px" }}
          >
            {SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          
          {activeScenario && (
            <div style={{ background: "rgba(255,255,255,0.05)", padding: "12px", borderRadius: "6px", fontSize: "13px", marginBottom: "16px" }}>
              <p style={{ color: "var(--text-secondary)", marginBottom: "8px" }}><strong>Description:</strong></p>
              <pre style={{ fontFamily: "inherit", margin: "0 0 12px 0" }}>{activeScenario.desc}</pre>
              <p><strong>Expected {activeScenario.expectedType === "cost" ? "FIFO Cost" : activeScenario.expectedType === "stock" ? "Remaining Stock" : "Result"}:</strong> {activeScenario.expectedType === "cost" ? "$" : ""}{activeScenario.expectedValue}</p>
            </div>
          )}

          <button onClick={runScenario} disabled={loading !== null} className="btn-primary" style={{ width: "100%", padding: "12px", fontSize: "14px", fontWeight: 600 }}>
            {loading === "scenario" ? "Running Scenario..." : "Run Scenario"}
          </button>

          {scenarioResult && (
            <div style={{ padding: "16px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "rgba(15,23,42,0.5)", marginTop: "20px" }}>
              {scenarioResult.status === "running" && <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>⏳ Scenario running... waiting for Kafka pipeline.</p>}
              {scenarioResult.status === "error" && <p style={{ fontSize: "13px", color: "var(--danger)" }}>❌ {scenarioResult.details}</p>}
              {scenarioResult.status === "completed" && (
                <div>
                  <p style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", fontWeight: 600 }}>
                    ✓ Scenario completed
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px", marginBottom: "12px" }}>
                    <div><span style={{ color: "var(--text-secondary)" }}>Actual Result:</span> <br/> 
                      <strong>{activeScenario?.expectedType === "cost" && typeof scenarioResult.actual === "number" ? "$" : ""}{scenarioResult.actual}</strong>
                    </div>
                    <div><span style={{ color: "var(--text-secondary)" }}>Expected:</span> <br/> 
                      <strong>{activeScenario?.expectedType === "cost" ? "$" : ""}{scenarioResult.expected}</strong>
                    </div>
                  </div>
                  <div style={{ padding: "8px", borderRadius: "4px", textAlign: "center", fontWeight: 600, 
                    background: scenarioResult.pass ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                    color: scenarioResult.pass ? "var(--success)" : "var(--danger)"
                  }}>
                    Result: {scenarioResult.pass ? "PASS" : "FAIL"}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={submitManualEvent} style={{ marginBottom: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Event Type</label>
              <select 
                value={manualForm.eventType} 
                onChange={(e) => setManualForm({...manualForm, eventType: e.target.value})}
                style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "rgba(15,23,42,0.8)", border: "1px solid var(--border-color)", color: "white" }}
              >
                <option value="purchase">Purchase</option>
                <option value="sale">Sale</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Product ID</label>
              <input 
                type="text" 
                value={manualForm.productId}
                onChange={(e) => setManualForm({...manualForm, productId: e.target.value})}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "rgba(15,23,42,0.8)", border: "1px solid var(--border-color)", color: "white" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Quantity</label>
              <input 
                type="number" 
                min="1"
                value={manualForm.quantity}
                onChange={(e) => setManualForm({...manualForm, quantity: parseInt(e.target.value) || 1})}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "rgba(15,23,42,0.8)", border: "1px solid var(--border-color)", color: "white" }}
              />
            </div>
            {manualForm.eventType === "purchase" && (
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Unit Price ($)</label>
                <input 
                  type="number" 
                  min="0.01"
                  step="0.01"
                  value={manualForm.unitPrice}
                  onChange={(e) => setManualForm({...manualForm, unitPrice: parseFloat(e.target.value) || 0})}
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "rgba(15,23,42,0.8)", border: "1px solid var(--border-color)", color: "white" }}
                />
              </div>
            )}
          </div>
          
          <button type="submit" disabled={loading !== null} className="btn-primary" style={{ width: "100%", padding: "12px", fontSize: "14px", fontWeight: 600 }}>
            {loading === "manual" ? "Publishing Event..." : "Publish Event"}
          </button>
        </form>
      )}

      {message && !scenarioResult && (
        <div style={{ padding: "12px", borderRadius: "6px", marginBottom: "16px", fontSize: "13px",
          background: message.type === "success" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
          color: message.type === "success" ? "var(--success)" : "var(--danger)" }}>
          {message.text}
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px", marginTop: "16px" }}>
        <button onClick={runBatch} disabled={loading !== null} className="btn-primary" style={{ width: "100%", padding: "10px", fontSize: "13px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)" }}>
          {loading === "batch" ? "Publishing..." : "▶ Run Legacy Batch Simulator (7 events)"}
        </button>
      </div>

      {eventIds.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>Track Event Pipeline:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {eventIds.map((id, i) => (
              <button key={id} onClick={() => setTrackedEventId(id)}
                style={{ padding: "4px 8px", fontSize: "11px", background: "rgba(59,130,246,0.1)",
                  border: "1px solid rgba(59,130,246,0.3)", borderRadius: "4px", cursor: "pointer",
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
