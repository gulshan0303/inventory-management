"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";
import FifoBreakdownModal from "./FifoBreakdownModal";

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
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
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

  const downloadCSV = async () => {
    try {
      const res = await fetchApi(`/transactions?page=1&limit=10000`);
      if (res && res.data) {
        const header = ["Date", "Type", "Product", "Quantity", "Unit Price", "Total Cost"];
        const rows = res.data.map((tx: Transaction) => [
          new Date(tx.timestamp).toLocaleString().replace(/,/g, ''), // Remove commas from date
          tx.transaction_type.toUpperCase(),
          tx.product_id,
          tx.quantity,
          tx.unit_price ? parseFloat(tx.unit_price).toFixed(2) : "",
          parseFloat(tx.total_cost).toFixed(2)
        ]);
        const csvContent = [header, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `transaction_ledger_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Failed to download CSV", err);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: "24px", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 600 }}>Transaction Ledger</h3>
        <button onClick={downloadCSV} className="btn-primary" style={{ padding: "8px 16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📥</span> Export CSV
        </button>
      </div>
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
              <th style={{ padding: "12px 16px", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>No transactions found. Run the Kafka simulator to add events.</td></tr>
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
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    {tx.transaction_type === "sale" && (
                      <button 
                        onClick={() => setSelectedTransactionId(tx.id)}
                        style={{
                          background: "var(--accent-primary)", color: "#fff", border: "none", 
                          padding: "6px 12px", borderRadius: "4px", fontSize: "12px", cursor: "pointer"
                        }}
                      >
                        View FIFO Breakdown
                      </button>
                    )}
                  </td>
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

      {selectedTransactionId && (
        <FifoBreakdownModal 
          transactionId={selectedTransactionId} 
          onClose={() => setSelectedTransactionId(null)} 
        />
      )}
    </div>
  );
}
