"use client";
import { useRouter } from "next/navigation";

// The three owner-finance pages share one switcher.
export function FinanceNav({ active }: { active: "invoices" | "expenses" | "payroll" }) {
  const router = useRouter();
  return (
    <div className="seg" role="group" aria-label="Finance pages" style={{ marginBottom: 20 }}>
      <button aria-pressed={active === "invoices"} onClick={() => router.push("/invoices")}>Invoices</button>
      <button aria-pressed={active === "expenses"} onClick={() => router.push("/expenses")}>Expenses</button>
      <button aria-pressed={active === "payroll"} onClick={() => router.push("/payroll")}>Payroll</button>
    </div>
  );
}
