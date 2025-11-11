// src/components/PetalMenu.tsx
"use client";

import * as React from "react";

export type PetalItem = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  action: string;
  route?: string;
};

function polar(deg: number, r: number) {
  const a = (deg * Math.PI) / 180;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

export function PetalMenu({
  isVisible,
  items = [],
  onAction,
  radius = 96,
  itemSize = 52,
  stagger = 35,
}: {
  isVisible: boolean;
  items?: PetalItem[];
  onAction: (action: string, route?: string) => void;
  radius?: number;
  itemSize?: number;
  stagger?: number;
}) {
  // Overlay is centered over the parent (which must be position:relative)
  const overlay = radius * 2 + itemSize;

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <div
        className="absolute"
        style={{
          left: "50%",
          top: "50%",
          width: overlay,
          height: overlay,
          transform: "translate(-50%, -50%)",
        }}
      >
        {items.map((it, i) => {
          const step = 360 / Math.max(items.length, 1);
          const start = -90; // start at top
          const { x, y } = polar(start + i * step, radius);

          return (
            <button
              key={`${it.action}-${i}`}
              type="button"
              onClick={() => onAction(it.action, it.route)}
              title={it.label}
              className="pointer-events-auto absolute grid place-items-center rounded-xl bg-white shadow-md border border-black/5 hover:shadow-lg transition-all duration-200"
              style={{
                width: itemSize,
                height: itemSize,
                left: overlay / 2 - itemSize / 2,
                top: overlay / 2 - itemSize / 2,
                transform: isVisible
                  ? `translate(${x}px, ${y}px) scale(1)`
                  : `translate(0px, 0px) scale(0.9)`,
                opacity: isVisible ? 1 : 0,
                transitionDelay: isVisible ? `${i * stagger}ms` : "0ms",
              }}
            >
              <it.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium text-gray-700 leading-none">
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PetalMenu;
