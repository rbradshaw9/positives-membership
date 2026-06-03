"use client";

import { useState } from "react";

type PracticeTab = "daily" | "weekly" | "monthly";

interface PracticeTabsClientProps {
  initialTab: PracticeTab;
  daily: React.ReactNode;
  weekly: React.ReactNode;
  monthly: React.ReactNode;
}

export function PracticeTabsClient({
  initialTab,
  daily,
  weekly,
  monthly,
}: PracticeTabsClientProps) {
  const [activeTab, setActiveTab] = useState<PracticeTab>(initialTab);

  const tabs: { id: PracticeTab; label: string }[] = [
    { id: "daily", label: "Daily" },
    { id: "weekly", label: "Weekly" },
    { id: "monthly", label: "Monthly" },
  ];

  return (
    <>
      <nav aria-label="Practice sections" className="member-segmented-control">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className="member-segmented-control__item"
            data-active={activeTab === id}
            aria-current={activeTab === id ? "page" : undefined}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "daily" && daily}
      {activeTab === "weekly" && weekly}
      {activeTab === "monthly" && monthly}
    </>
  );
}
