"use client";
import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";

interface Allocation {
  batchId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  remainingQuantity: number;
}

interface FifoBreakdown {
  id: string;
  productId: string;
  quantity: number;
  totalCost: number;
  soldAt: string;
  allocations: Allocation[];
}

export default function FifoBreakdownModal({ transactionId, onClose }: { transactionId: string, onClose: () => void }) {
  const [data, setData] = useState<FifoBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetchApi(`/transactions/${transactionId}`);
        if (res && res.data) {
          setData(res.data);
          setError(null);
        } else {
          setError(res.message || "Failed to fetch breakdown");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch breakdown");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [transactionId]);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
    }}>
      <div className="glass-panel" style={{
        width: "100%", maxWidth: "600px", padding: "32px",
        maxHeight: "90vh", overflowY: "auto", position: "relative",
        background: "rgba(15, 23, 42, 0.95)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        border: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.5px" }}>FIFO Cost Breakdown</h2>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.05)", border: "none", color: "var(--text-secondary)",
            fontSize: "20px", cursor: "pointer", width: "32px", height: "32px", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center", transition: "var(--transition)"
          }} onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
            ✕
          </button>
        </div>

        {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={() => {}} /> : data && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px", padding: "16px", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-md)" }}>
              <div><span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Sale ID</span><br/><span style={{ fontFamily: "monospace", fontSize: "12px" }}>{data.id.split("-")[0]}...</span></div>
              <div><span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Product</span><br/><strong>{data.productId}</strong></div>
              <div><span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Quantity Sold</span><br/><strong>{data.quantity} units</strong></div>
              <div><span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Sale Time</span><br/><span style={{ fontSize: "13px" }}>{new Date(data.soldAt).toLocaleString()}</span></div>
            </div>

            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "12px" }}>Batch Allocation Matrix</h3>
            <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "20px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.05)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)" }}>
                    <th style={{ padding: "12px 16px", fontWeight: 600 }}>Batch ID</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>Qty Used</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>Unit Cost</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.allocations.map((alloc, idx) => (
                    <tr key={idx} style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                      <td style={{ padding: "12px 16px", fontSize: "13px", fontFamily: "monospace" }}>{alloc.batchId.split("-")[0]}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontSize: "14px", fontWeight: 500 }}>{alloc.quantity}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontSize: "14px" }}>${alloc.unitCost.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontSize: "14px", fontWeight: 600, color: "var(--accent-primary)" }}>${alloc.totalCost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "28px" }}>
              <div style={{ background: "rgba(16,185,129,0.15)", padding: "12px 24px", borderRadius: "var(--radius-md)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", gap: "16px" }}>
                <span style={{ fontSize: "14px", color: "var(--success)" }}>Total FIFO Cost</span>
                <span style={{ fontSize: "20px", fontWeight: 700, color: "#fff" }}>${data.totalCost.toFixed(2)}</span>
              </div>
            </div>

            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "12px" }}>Post-Sale Batch Status</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {data.allocations.map((alloc, idx) => (
                <div key={idx} style={{ 
                  background: alloc.remainingQuantity === 0 ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)", 
                  border: `1px solid ${alloc.remainingQuantity === 0 ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.3)"}`,
                  padding: "8px 12px", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: "4px"
                }}>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase" }}>Batch {alloc.batchId.split("-")[0]}</span>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: alloc.remainingQuantity === 0 ? "var(--danger)" : "var(--accent-primary)" }}>
                    {alloc.remainingQuantity} left
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "32px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "20px", textAlign: "right" }}>
              <button className="btn-primary" onClick={onClose} style={{ padding: "10px 24px" }}>Close Breakdown</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
