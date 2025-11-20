// app/(default)/billing/page.tsx
"use client";

import React from "react";
import { Tabs } from "@/components/ui/Tabs";

export default function BillingPage() {
  return (
    <main className="min-h-screen bg-white px-10 py-16">
      <Tabs
        tabs={[
          { id: "customer-info", label: "Customer info" },
          { id: "payment-history", label: "Payment history" },
          { id: "payment-methods", label: "Payment methods" },
        ]}
        defaultValue="customer-info"
        renderContent={(activeId) => {
          switch (activeId) {
            case "customer-info":
              return "We are showing customer info here";
            case "payment-history":
              return "We are showing payment history here";
            case "payment-methods":
              return "We are showing payment methods here";
            default:
              return null;
          }
        }}
      />
    </main>
  );
}
