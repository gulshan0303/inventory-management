"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";

interface InventoryItem {
  product_id: string;
  name: string;
  current_quantity: number;
  total_inventory_cost: string;
  average_cost_per_unit: string;
}

export default function InventoryOverview() {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetchApi("/inventory");
      if (res) { setData(res.data); setError(null); }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  usePolling(() => fetchData(true), 5000);

  if (loading && data.length === 0) return <LoadingState />;
  if (error && data.length === 0) return <ErrorState message={error} retry={() => fetchData()} />;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px", marginBottom: "40px" }}>
      {data.map((item) => (
        <div key={item.product_id} className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "17px", fontWeight: 600 }}>{item.name}</h3>
            <span style={{ fontSize: "11px", padding: "3px 8px", background: "rgba(59,130,246,0.15)", color: "var(--accent-primary)", borderRadius: "12px" }}>
              {item.product_id}
            </span>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginBottom: "4px" }}>Current Stock</p>
            <p style={{ fontSize: "32px", fontWeight: 700, color: item.current_quantity > 0 ? "var(--success)" : "var(--danger)" }}>
              {item.current_quantity}
              <span style={{ fontSize: "14px", fontWeight: 400, color: "var(--text-muted)", marginLeft: "6px" }}>units</span>
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
            <div>
              <p style={{ color: "var(--text-secondary)", fontSize: "11px" }}>Total Cost</p>
              <p style={{ fontSize: "14px", fontWeight: 600 }}>${parseFloat(item.total_inventory_cost).toFixed(2)}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "11px" }}>Avg Unit Cost</p>
              <p style={{ fontSize: "14px", fontWeight: 600 }}>${parseFloat(item.average_cost_per_unit).toFixed(2)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
