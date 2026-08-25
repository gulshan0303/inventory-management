"use client";

import DashboardHeader from "@/components/DashboardHeader";
import InventoryOverview from "@/components/InventoryOverview";
import TransactionLedger from "@/components/TransactionLedger";
import SimulatorPanel from "@/components/SimulatorPanel";
import SystemHealth from "@/components/SystemHealth";

export default function DashboardPage() {
  return (
    <div style={{ minHeight: "100vh", padding: "32px 20px", maxWidth: "1400px", margin: "0 auto" }}>
      <DashboardHeader />
      
      {/* 2-Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "32px", alignItems: "start" }}>
        
        {/* Left Column: Inventory Status */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--text-primary)" }}>
              Inventory Status
            </h2>
          </div>
          <InventoryOverview />
        </section>

        {/* Right Column: Simulator & Health */}
        <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <SystemHealth />
            <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "20px" }}>
              Simulation Panel
            </h2>
            <SimulatorPanel onSimulate={() => {}} />
          </div>
        </section>
      </div>

      {/* Full Width Bottom: Transaction Ledger */}
      <section style={{ marginTop: "40px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "20px" }}>
          Transaction Ledger
        </h2>
        <TransactionLedger />
      </section>
    </div>
  );
}
