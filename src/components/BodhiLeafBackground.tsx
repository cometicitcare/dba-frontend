// components/BodhiLeafBackground.tsx
"use client";

import React from "react";

// Single Bodhi Leaf Icon Component for individual use
export function BodhiLeafBackground() {
  return <BodhiLeafIcon />;
}

// SVG Bodhi Leaf Icon Component
function BodhiLeafIcon() {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className="w-full h-full drop-shadow-sm"
    >
      {/* Bodhi tree leaf shape */}
      <path d="M12 2C12 2 4 8 4 16C4 20 8 22 12 22C16 22 20 20 20 16C20 8 12 2 12 2Z" />
      {/* Leaf vein */}
      <path 
        d="M12 2L12 22" 
        stroke="currentColor" 
        strokeWidth="0.5" 
        fill="none" 
        opacity="0.7"
      />
      {/* Side veins */}
      <path 
        d="M12 8C10 10 8 12 8 14" 
        stroke="currentColor" 
        strokeWidth="0.3" 
        fill="none" 
        opacity="0.5"
      />
      <path 
        d="M12 8C14 10 16 12 16 14" 
        stroke="currentColor" 
        strokeWidth="0.3" 
        fill="none" 
        opacity="0.5"
      />
    </svg>
  );
}