import DashboardHeader from "@/components/DashboardHeader";
import InventoryOverview from "@/components/InventoryOverview";
import TransactionLedger from "@/components/TransactionLedger";

export default function DashboardPage() {
  return (
    <div style={{ minHeight: "100vh", padding: "32px 20px", maxWidth: "1280px", margin: "0 auto" }}>
      <DashboardHeader />
      <main>
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "20px", color: "var(--text-secondary)" }}>
            📊 Current Inventory
          </h2>
          <InventoryOverview />
        </section>
        <section>
          <TransactionLedger />
        </section>
      </main>
    </div>
  );
}
