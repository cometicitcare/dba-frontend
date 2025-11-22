"use client";
import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function ImportantNotes({ children, className = "" }: Props) {
  return (
    <div className={`bg-amber-50 border-l-4 border-amber-400 p-4 my-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <span className="text-amber-400 text-xl">⚠️</span>
        </div>
        <div className="ml-3">
          <p className="text-sm text-amber-700">{children}</p>
        </div>
      </div>
    </div>
  );
}


