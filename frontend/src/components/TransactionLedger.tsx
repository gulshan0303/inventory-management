"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";

interface Transaction {
  id: string;
  product_id: string;
  transaction_type: "purchase" | "sale";
  quantity: number;
  unit_price: string | null;
  total_cost: string;
  timestamp: string;
}

export default function TransactionLedger() {
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetchApi(`/transactions?page=${page}&limit=${limit}`);
      if (res) { setData(res.data); setTotalPages(res.pagination?.totalPages || 1); setError(null); }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => { fetchData(); }, [fetchData]);
  usePolling(() => { if (page === 1) fetchData(true); }, 5000);

  if (loading && data.length === 0) return <LoadingState />;
  if (error && data.length === 0) return <ErrorState message={error} retry={() => fetchData()} />;

  return (
    <div className="glass-panel" style={{ padding: "24px" }}>
      <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "20px" }}>Transaction Ledger</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)", fontSize: "13px" }}>
              <th style={{ padding: "12px 16px" }}>Date & Time</th>
              <th style={{ padding: "12px 16px" }}>Type</th>
              <th style={{ padding: "12px 16px" }}>Product</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Qty</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Unit Price</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>No transactions found. Run the Kafka simulator to add events.</td></tr>
            ) : (
              data.map((tx, idx) => (
                <tr key={`${tx.id}-${idx}`} style={{ borderBottom: "1px solid rgba(30,41,59,0.5)" }}>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--text-secondary)" }}>{new Date(tx.timestamp).toLocaleString()}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600,
                      background: tx.transaction_type === "purchase" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                      color: tx.transaction_type === "purchase" ? "var(--success)" : "var(--danger)"
                    }}>
                      {tx.transaction_type.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px" }}>{tx.product_id}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontSize: "13px" }}>{tx.quantity}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontSize: "13px" }}>{tx.unit_price ? `$${parseFloat(tx.unit_price).toFixed(2)}` : "—"}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontSize: "13px", fontWeight: 600 }}>${parseFloat(tx.total_cost).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", marginTop: "24px" }}>
          <button className="btn-primary" style={{ padding: "8px 16px" }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Page {page} of {totalPages}</span>
          <button className="btn-primary" style={{ padding: "8px 16px" }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
