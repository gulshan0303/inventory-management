export default function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="glass-panel" style={{ padding: "24px", border: "1px solid var(--danger)", textAlign: "center" }}>
      <p style={{ color: "var(--danger)", marginBottom: retry ? "16px" : 0 }}>⚠️ {message}</p>
      {retry && <button onClick={retry} className="btn-primary" style={{ backgroundColor: "var(--danger)" }}>Retry</button>}
    </div>
  );
}
