"use client";
import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboardIcon } from "lucide-react";
import { getStoredUserData, UserData } from "@/utils/userData";
import { SIDEBAR_ACCESS_MAP } from "@/utils/config";
interface SidebarProps {
  isOpen: boolean;
}

/** ✅ Icon component type so both Lucide icons and our custom image work */
type IconComponent = React.ComponentType<{ className?: string }>;

/** ✅ Wrapper so the SVG in /public behaves like an icon component */
const MonkIcon: IconComponent = ({ className }) => (
  <img
    src="/SideBar/monk.svg"          // public/SideBar/monk.svg -> served at /SideBar/monk.svg
    alt="Monk"
    className={className ?? "w-8 h-8"}
    loading="lazy"
  />
);

type SidebarItem = {
  icon: IconComponent;
  label: string;
  path: string;
};

const BASE_SIDEBAR_ITEMS: SidebarItem[] = [
  {
    icon: LayoutDashboardIcon,
    label: "Dashboard",
    path: "/",
  },
  {
    icon: MonkIcon,
    label: "Bhikku",
    path: "/bhikkhu",
  },
  {
    icon: MonkIcon,
    label: "Silmatha",
    path: "/silmatha",
  },
  {
    icon: MonkIcon,
    label: "Vihara",
    path: "/temple/vihara",
  },
  {
    icon: MonkIcon,
    label: "Devala",
    path: "/temple/dewala",
  },
  {
    icon: MonkIcon,
    label: "Donations",
    path: "/teachers",
  },
  {
    icon: MonkIcon,
    label: "Arama",
    path: "/temple/arama",
  },
  {
    icon: MonkIcon,
    label: "S.A Balama..",
    path: "/sasanarakshaka",
  },
  {
    icon: MonkIcon,
    label: "Objections",
    path: "/objections",
  },
  {
    icon: MonkIcon,
    label: "Re Print",
    path: "/print-request",
  },
  {
    icon: MonkIcon,
    label: "QR Scan",
    path: "/qr-scan",
  }
  
];

const PUBLIC_ONLY_PATHS = ["/", "/objections", "/print-request", "/qr-scan"];

export function Sidebar({ isOpen }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserData | null>(null);

  // ✅ Load user data from localStorage
  useEffect(() => {
    const stored = getStoredUserData();
    if (stored) setUser(stored);
  }, []);

  const items = useMemo(() => {
    if (!user) return BASE_SIDEBAR_ITEMS;
    const primaryRoleLevel = user.roles?.[0]?.ro_level ?? user.roleLevel;
    if (primaryRoleLevel === "PUBLIC") {
      return BASE_SIDEBAR_ITEMS.filter((it) => PUBLIC_ONLY_PATHS.includes(it.path));
    }

    const dedupDepartments = Array.from(
      new Set([
        ...(user.departments ?? []),
        ...(user.department ? [user.department] : []),
      ].filter(Boolean) as string[])
    );

    if (!dedupDepartments.length) return BASE_SIDEBAR_ITEMS;

    return BASE_SIDEBAR_ITEMS.filter((it) => {
      const allowedDepartments = SIDEBAR_ACCESS_MAP[it.path];
      if (!allowedDepartments) return false;
      return dedupDepartments.some((dep) => allowedDepartments.includes(dep));
    });
  }, [user]);
  if (!isOpen) return null;

  return (
    <div className="fixed left-0 top-20 h-[calc(100vh-5rem)] w-56 bg-gray-50 border-r border-gray-200 z-40 flex flex-col">
      {/* Profile section */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex flex-col items-center">
          <div className="relative mb-2">
            <img
              src="/image.jpg"
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover border-2 border-orange-500"
            />
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">
            {user ? `${user.ua_first_name} ${user.ua_last_name}` : "Loading..."}
          </h3>
          {/* <p className="text-sm text-gray-500">
            {user?.role?.ro_role_name || "Loading..."}
          </p> */}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto overflow-x-auto">
        {items.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.path;
          return (
            <button
              key={it.path}
              onClick={() => router.push(it.path)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                active
                  ? "bg-orange-500 text-white"
                  : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">{it.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
