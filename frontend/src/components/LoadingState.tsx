export default function LoadingState() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "60px", color: "var(--text-secondary)", flexDirection: "column", gap: "12px" }}>
      <div style={{ fontSize: "24px", animation: "spin 1s linear infinite" }}>⟳</div>
      <p style={{ fontSize: "14px" }}>Loading data...</p>
    </div>
  );
}
