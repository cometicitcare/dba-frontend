"use client";
import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboardIcon } from "lucide-react";
import { getStoredUserData, UserData } from "@/utils/userData";
import { BHIKKU_MANAGEMENT_DEPARTMENT } from "@/utils/config";
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
    label: "Re Print",
    path: "/print-request",
  },
  {
    icon: MonkIcon,
    label: "QR Scan",
    path: "/qr-scan",
  },
];



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
    const primaryDepartment = user.departments?.[0];
    const primaryRoleLevel = user.roles?.[0]?.ro_level ?? user.roleLevel;

    if (primaryRoleLevel === "PUBLIC") {
      return BASE_SIDEBAR_ITEMS.filter((it) => it.path === "/qr-scan");
    }

    if (primaryDepartment === "Divisional Secretariat") {
      return BASE_SIDEBAR_ITEMS.filter((it) => it.path === "/print-request" || it.path === "/qr-scan");
    }

    if (primaryDepartment === BHIKKU_MANAGEMENT_DEPARTMENT) {
      return BASE_SIDEBAR_ITEMS;
    }

    return BASE_SIDEBAR_ITEMS;
  }, [user]);
  if (!isOpen) return null;

  return (
    <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-gray-50 border-r border-gray-200 z-40 flex flex-col">
      {/* Profile section */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex flex-col items-center">
          <div className="relative mb-3">
            <img
              src="/image.jpg"
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-orange-500"
            />
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">
            {user ? `${user.ua_first_name} ${user.ua_last_name}` : "Loading..."}
          </h3>
          {/* <p className="text-sm text-gray-500">
            {user?.role?.ro_role_name || "Loading..."}
          </p> */}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.path;
          return (
            <button
              key={it.path}
              onClick={() => router.push(it.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                active
                  ? "bg-orange-500 text-white"
                  : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{it.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
