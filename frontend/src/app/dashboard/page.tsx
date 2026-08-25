import DashboardHeader from "@/components/DashboardHeader";
import InventoryOverview from "@/components/InventoryOverview";
import TransactionLedger from "@/components/TransactionLedger";
import SimulatorPanel from "@/components/SimulatorPanel";

export default function DashboardPage() {
  return (
    <div style={{ minHeight: "100vh", padding: "32px 20px", maxWidth: "1280px", margin: "0 auto" }}>
      <DashboardHeader />
      <main>
        {/* Simulator */}
        <SimulatorPanel onSimulate={() => {}} />

        {/* Inventory Overview */}
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "20px", color: "var(--text-secondary)" }}>
            📦 Current Inventory (FIFO Costing)
          </h2>
          <InventoryOverview />
        </section>

        {/* Transaction Ledger */}
        <section>
          <TransactionLedger />
        </section>
      </main>
    </div>
  );
}
