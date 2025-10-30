"use client";
import React, { useMemo, useState } from "react";

/** Compact radial dashboard (responsive, no overlap) */

/* ---------------- Icons (LOCAL, not exported) ---------------- */
const Svg = ({ children, className = "", strokeWidth = 2, ...rest }: any) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

const IconUsers = (p: any) => (
  <Svg {...p}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);
const IconHome = (p: any) => (
  <Svg {...p}>
    <path d="M3 9l9-7 9 7" />
    <path d="M9 22V12h6v10" />
  </Svg>
);
const IconBookOpen = (p: any) => (
  <Svg {...p}>
    <path d="M12 3a6 6 0 0 0-6 6v10a6 6 0 0 1 6-6" />
    <path d="M12 3a6 6 0 0 1 6 6v10a6 6 0 0 0-6-6" />
  </Svg>
);
const IconGraduationCap = (p: any) => (
  <Svg {...p}>
    <path d="M22 10L12 5 2 10l10 5 10-5z" />
    <path d="M6 12v5a6 6 0 0 0 12 0v-5" />
  </Svg>
);
const IconSettings = (p: any) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.04 2.4l.06.06c.5.5 1.22.65 1.82.33A1.65 1.65 0 0 0 10.42 1H11a2 2 0 1 1 4 0v.09c0 .66.39 1.26 1 1.51.6.32 1.32.17 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.5.5-.65 1.22-.33 1.82.25.61.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.66 0-1.26.39-1.51 1z" />
  </Svg>
);
const IconEye = (p: any) => (
  <Svg {...p}>
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
const IconPlus = (p: any) => (
  <Svg {...p}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Svg>
);
const IconSearch = (p: any) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-3.5-3.5" />
  </Svg>
);
const IconFileText = (p: any) => (
  <Svg {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
    <path d="M10 9H8" />
  </Svg>
);
const IconEdit = (p: any) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </Svg>
);
const IconTrash = (p: any) => (
  <Svg {...p}>
    <path d="M3 6h18" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </Svg>
);
const IconBarChart = (p: any) => (
  <Svg {...p}>
    <path d="M3 3v18h18" />
    <rect x="7" y="9" width="3" height="9" rx="1" />
    <rect x="12" y="5" width="3" height="13" rx="1" />
    <rect x="17" y="12" width="3" height="6" rx="1" />
  </Svg>
);

/* ---------------- Types (LOCAL) ---------------- */
type IconType = React.FC<any>;
interface SubItem {
  icon: IconType;
  label: string;
  action: string;
  route: string;
}
interface Service {
  id: string;
  name: string;
  icon: IconType;
  gradient: [string, string];
  subItems: SubItem[];
}
interface Position {
  x: number;
  y: number;
}

/* ---------------- Utils ---------------- */
const polar = (deg: number, r: number): Position => {
  const a = (deg * Math.PI) / 180;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
};

/* ---------------- Data ---------------- */
const DEFAULT_SERVICES: Service[] = [
  {
    id: "bhikku",
    name: "Bhikku & Sirimatha",
    icon: IconUsers,
    gradient: ["#fb923c", "#f59e0b"],
    subItems: [
      { icon: IconEye, label: "View", action: "view-bhikku", route: "/bhikku" },
      { icon: IconPlus, label: "Add", action: "add-bhikku", route: "/bhikku/add" },
      { icon: IconSearch, label: "Search", action: "search-bhikku", route: "/bhikku/search" },
      { icon: IconFileText, label: "Reports", action: "reports-bhikku", route: "/bhikku/reports" },
      { icon: IconEdit, label: "Update", action: "update-bhikku", route: "/bhikku/update" },
    ],
  },
  {
    id: "temple",
    name: "Temple & Devala",
    icon: IconHome,
    gradient: ["#c084fc", "#6366f1"],
    subItems: [
      { icon: IconEye, label: "View", action: "view-temple", route: "/temple/view" },
      { icon: IconPlus, label: "Add", action: "add-temple", route: "/temple/add" },
      { icon: IconSearch, label: "Search", action: "search-temple", route: "/temple/search" },
      { icon: IconFileText, label: "Reports", action: "reports-temple", route: "/temple/reports" },
      { icon: IconEdit, label: "Manage", action: "manage-temple", route: "/temple/manage" },
    ],
  },
  {
    id: "school",
    name: "Dhamma School",
    icon: IconBookOpen,
    gradient: ["#60a5fa", "#06b6d4"],
    subItems: [
      { icon: IconEye, label: "View", action: "view-school", route: "/school/view" },
      { icon: IconPlus, label: "Add", action: "add-school", route: "/school/add" },
      { icon: IconSearch, label: "Search", action: "search-school", route: "/school/search" },
      { icon: IconFileText, label: "Reports", action: "reports-school", route: "/school/reports" },
      { icon: IconUsers, label: "Students", action: "students-school", route: "/school/students" },
    ],
  },
  {
    id: "teachers",
    name: "Dhamma Teachers",
    icon: IconGraduationCap,
    gradient: ["#4ade80", "#10b981"],
    subItems: [
      { icon: IconEye, label: "View", action: "view-teachers", route: "/teachers/view" },
      { icon: IconPlus, label: "Add", action: "add-teachers", route: "/teachers/add" },
      { icon: IconSearch, label: "Search", action: "search-teachers", route: "/teachers/search" },
      { icon: IconFileText, label: "Reports", action: "reports-teachers", route: "/teachers/reports" },
      { icon: IconEdit, label: "Update", action: "update-teachers", route: "/teachers/update" },
    ],
  },
  {
    id: "admin",
    name: "System Admin",
    icon: IconSettings,
    gradient: ["#f87171", "#f43f5e"],
    subItems: [
      { icon: IconUsers, label: "Users", action: "users-admin", route: "/admin/users" },
      { icon: IconSettings, label: "Settings", action: "settings-admin", route: "/admin/settings" },
      { icon: IconFileText, label: "Logs", action: "logs-admin", route: "/admin/logs" },
      { icon: IconEdit, label: "Config", action: "config-admin", route: "/admin/config" },
      { icon: IconTrash, label: "Cleanup", action: "cleanup-admin", route: "/admin/cleanup" },
    ],
  },
  {
    id: "analytics",
    name: "Analytics",
    icon: IconBarChart,
    gradient: ["#14b8a6", "#22d3ee"],
    subItems: [{ icon: IconEye, label: "View analytics", action: "view-analytics", route: "/analytics" }],
  },
];

/* ---------------- Dashboard (LOCAL component) ---------------- */
function DBADashboard({
  services = DEFAULT_SERVICES,
  radius,
  onNavigate,
  footerText = "© 2025 Department of Buddhist Affairs - All Rights Reserved",
}: {
  services?: Service[];
  /** Distance of sub-items from center (inside the 200px card). */
  radius?: number;
  onNavigate?: (route: string) => void;
  footerText?: string;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Gradient defs
  const gradients = useMemo(
    () => services.map((s) => ({ id: `g-${s.id}`, from: s.gradient[0], to: s.gradient[1] })),
    [services]
  );

  const handleNavigate = (route: string) => {
    if (onNavigate) onNavigate(route);
    else if (typeof window !== "undefined") window.location.assign(route);
  };

  // Sub-item sizing kept inside 200×200 card
  const itemSize = 52;
  const ringRadius = radius ?? 78; // stays well within the card

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-amber-50">
      {/* SVG Gradients */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          {gradients.map((g) => (
            <linearGradient key={g.id} id={g.id} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={g.from} stopOpacity={1} />
              <stop offset="100%" stopColor={g.to} stopOpacity={1} />
            </linearGradient>
          ))}
        </defs>
      </svg>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Auto-wrapping grid; each cell min 200px => no overlap */}
        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] gap-3 sm:gap-4 place-items-center">
          {services.map((service) => (
            <div key={service.id} className="relative">
              {/* Card 200×200 */}
              <div
                className="relative group"
                onMouseEnter={() => setHoveredId(service.id)}
                onMouseLeave={() =>
                  setTimeout(() => hoveredId === service.id && setHoveredId(null), 160)
                }
              >
                <button
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={hoveredId === service.id}
                  onFocus={() => setHoveredId(service.id)}
                  onBlur={(e) => {
                    if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node))
                      setHoveredId(null);
                  }}
                  className="relative rounded-3xl border border-white/70 bg-white/90 
                             shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400
                             transition-transform duration-200 will-change-transform
                             w-[200px] h-[200px] flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${service.gradient[0]}, ${service.gradient[1]})`,
                    transform:
                      hoveredId === service.id ? "translateZ(0) scale(1.04)" : "translateZ(0) scale(1)",
                  }}
                >
                  <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-30 blur-xl transition-opacity" />
                  <div className="flex flex-col items-center text-center px-3">
                    <service.icon className="w-12 h-12 sm:w-14 sm:h-14 text-white mb-2 drop-shadow" />
                    <span className="text-white font-semibold text-xs sm:text-sm leading-tight drop-shadow">
                      {service.name}
                    </span>
                  </div>
                </button>

                {/* Sub-items ring (inside the card) */}
                <div className="absolute inset-0 z-20 pointer-events-none" style={{ width: 200, height: 200 }}>
                  {service.subItems.map((subItem, index) => {
                    const step = 360 / service.subItems.length;
                    const start = -90; // top
                    const { x, y } = polar(start + index * step, ringRadius);
                    const visible = hoveredId === service.id;

                    return (
                      <div
                        key={index}
                        className="absolute top-1/2 left-1/2 transition-all duration-250 ease-out will-change-transform"
                        style={{
                          transform: visible
                            ? `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) scale(1)`
                            : "translate3d(-50%, -50%, 0) scale(0.9)",
                          opacity: visible ? 1 : 0,
                          transitionDelay: visible ? `${index * 35}ms` : "0ms",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleNavigate(subItem.route)}
                          className="pointer-events-auto grid place-items-center rounded-xl bg-white shadow-md hover:shadow-lg
                                     border border-amber-200/60 focus:outline-none focus:ring-2 focus:ring-amber-400
                                     transition-transform duration-150"
                          style={{ width: itemSize, height: itemSize }}
                          title={subItem.label}
                        >
                          <subItem.icon
                            className="w-5 h-5 mb-0.5"
                            strokeWidth={2.2}
                            style={{ color: `url(#g-${service.id})` as any }}
                          />
                          <span className="text-[10px] font-medium text-gray-700 leading-none">
                            {subItem.label}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer (not fixed on small to save space) */}
      <div className="lg:fixed lg:bottom-0 lg:left-0 lg:right-0 bg-white/80 backdrop-blur-md border-t border-yellow-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
          <p className="text-center text-gray-600 text-xs sm:text-sm">{footerText}</p>
        </div>
      </div>

      {/* Reduce motion preference */}
      <style jsx>{`
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ---------------- Page export (ONLY export) ---------------- */
export default function Page() {
  return <DBADashboard />;
}
