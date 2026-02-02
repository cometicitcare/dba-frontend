// components/Tabs.tsx
"use client";

import React, { useState } from "react";

type TabItem = {
  id: string;
  label: string;
};

type TabsProps = {
  tabs: TabItem[];
  /** Optional controlled value */
  value?: string;
  /** Default selected tab for uncontrolled usage */
  defaultValue?: string;
  /** Called when tab changes */
  onChange?: (id: string) => void;
  /** Content renderer for the active tab */
  renderContent?: (activeId: string) => React.ReactNode;
  className?: string;
  /** Override styling for the content wrapper */
  contentClassName?: string;
  /** Optional classes for the tab label (use to control font size) */
  labelClassName?: string;
  haveAccess?: boolean;
};

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  value,
  defaultValue,
  onChange,
  renderContent,
  className = "",
  contentClassName = "pt-10 text-3xl text-slate-500",
  labelClassName = "text-base", // smaller default than text-lg
}) => {
  const [internalValue, setInternalValue] = useState<string>(
    defaultValue || tabs[0]?.id
  );

  const activeId = value ?? internalValue;

  const handleChange = (id: string) => {
    if (!value) {
      setInternalValue(id);
    }
    onChange?.(id);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Tab header */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-10">
          {tabs.map((tab) => {
            const isActive = tab.id === activeId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleChange(tab.id)}
                className={[
                  "relative pb-3 pt-6 font-medium", // removed hard-coded text-lg
                  labelClassName, // allows consumer control (e.g., text-sm, text-base)
                  "transition-colors",
                  isActive ? "text-slate-900" : "text-slate-500 hover:text-slate-700",
                ].join(" ")}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute left-0 -bottom-[1px] h-[3px] w-full bg-slate-900 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className={contentClassName}>
        {renderContent ? renderContent(activeId) : null}
      </div>
    </div>
  );
};
