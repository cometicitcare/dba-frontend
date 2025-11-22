"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboardIcon, UsersIcon } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
}

interface UserData {
  ua_user_id: string;
  ua_username: string;
  ua_email: string;
  ua_first_name: string;
  ua_last_name: string;
  ua_phone: string;
  ua_status: string;
  ro_role_id: string;
  role_ids: string[];
  role: {
    ro_role_id: string;
    ro_role_name: string;
    ro_description: string;
  };
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

export function Sidebar({ isOpen }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserData | null>(null);

  // ✅ Load user data from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      const normalized: UserData | null =
        parsed && typeof parsed === "object"
          ? ("user" in parsed ? (parsed.user as UserData) : (parsed as UserData))
          : null;
      if (normalized) setUser(normalized);
    } catch (err) {
      console.error("Invalid user data in localStorage", err);
    }
  }, []);

  // ✅ Menu items with roles from config
  const allItems: Array<{
    icon: IconComponent;
    label: string;
    path: string;
  }> = [
    {
      icon: LayoutDashboardIcon,
      label: "Dashboard",
      path: "/",
    },
    {
      icon: MonkIcon, // ✅ use the custom SVG icon here
      label: "Bhikku",
      path: "/bhikkhu",
    },
    // If you still need the Lucide UsersIcon elsewhere, you can add it too:
    // { icon: UsersIcon, label: "Users", path: "/users", roles: [...] },
  ];

  const items = allItems;
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
