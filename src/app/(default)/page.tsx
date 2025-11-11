// app/(whatever)/Dashboard.tsx

"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { PetalMenu } from "@/components/PetalMenu";
import { FooterBar } from "@/components/FooterBar";
import { _getDashBoard } from "@/services/dashbord";
import {
  UsersIcon,
  BuildingIcon,
  GraduationCapIcon,
  BookOpenIcon,
  SettingsIcon,
  BarChartIcon,
  EyeIcon,
  PlusIcon,
  SearchIcon,
  FileTextIcon,
  EditIcon,
  TrashIcon,
} from "lucide-react";

// --- map old services -> each new module path ---
const SERVICE_MAP: Record<
  string,
  { icon: any; label: string; action: string; route: string }[]
> = {
  "/bhikkhu": [
    { icon: EyeIcon, label: "View", action: "view-bhikku", route: "/bhikkhu" },
    { icon: PlusIcon, label: "Add", action: "add-bhikku", route: "/bhikkhu/add" },
    { icon: SearchIcon, label: "Search", action: "search-bhikku", route: "/bhikkhu/search" },
    { icon: FileTextIcon, label: "Reports", action: "reports-bhikku", route: "/bhikkhu/reports" },
    { icon: EditIcon, label: "Update", action: "update-bhikku", route: "/bhikkhu/update" },
  ],
  "/temples": [
    { icon: EyeIcon, label: "View", action: "view-temple", route: "/temple/view" },
    { icon: PlusIcon, label: "Add", action: "add-temple", route: "/temple/add" },
    { icon: SearchIcon, label: "Search", action: "search-temple", route: "/temple/search" },
    { icon: FileTextIcon, label: "Reports", action: "reports-temple", route: "/temple/reports" },
    { icon: EditIcon, label: "Manage", action: "manage-temple", route: "/temple/manage" },
  ],
  "/dhamma-school": [
    { icon: EyeIcon, label: "View", action: "view-school", route: "/school/view" },
    { icon: PlusIcon, label: "Add", action: "add-school", route: "/school/add" },
    { icon: SearchIcon, label: "Search", action: "search-school", route: "/school/search" },
    { icon: FileTextIcon, label: "Reports", action: "reports-school", route: "/school/reports" },
    { icon: UsersIcon, label: "Students", action: "students-school", route: "/school/students" },
  ],
  "/teachers": [
    { icon: EyeIcon, label: "View", action: "view-teachers", route: "/teachers/view" },
    { icon: PlusIcon, label: "Add", action: "add-teachers", route: "/teachers/add" },
    { icon: SearchIcon, label: "Search", action: "search-teachers", route: "/teachers/search" },
    { icon: FileTextIcon, label: "Reports", action: "reports-teachers", route: "/teachers/reports" },
    { icon: EditIcon, label: "Update", action: "update-teachers", route: "/teachers/update" },
  ],
  "/admin": [
    { icon: UsersIcon, label: "Users", action: "users-admin", route: "/admin/users" },
    { icon: SettingsIcon, label: "Settings", action: "settings-admin", route: "/admin/settings" },
    { icon: FileTextIcon, label: "Logs", action: "logs-admin", route: "/admin/logs" },
    { icon: EditIcon, label: "Config", action: "config-admin", route: "/admin/config" },
    { icon: TrashIcon, label: "Cleanup", action: "cleanup-admin", route: "/admin/cleanup" },
  ],
  "/analytics": [{ icon: EyeIcon, label: "View", action: "view-analytics", route: "/analytics" }],
};

const modules = [
  { icon: UsersIcon, label: "Bhikku & Sirimatha", color: "from-orange-400 to-orange-500", path: "/bhikkhu" },
  { icon: BuildingIcon, label: "Temple & Devala", color: "from-purple-400 to-purple-500", path: "/temples" },
  { icon: GraduationCapIcon, label: "Dhamma School", color: "from-blue-400 to-blue-500", path: "/dhamma-school" },
  { icon: BookOpenIcon, label: "Dhamma Teachers", color: "from-green-400 to-green-500", path: "/teachers" },
  { icon: SettingsIcon, label: "System Admin", color: "from-red-400 to-red-500", path: "/admin" },
  { icon: BarChartIcon, label: "Analytics", color: "from-teal-400 to-teal-500", path: "/analytics" },
];

const bannerImages = [
  "/dashboardBanner/bhikku.jpg",
  "/dashboardBanner/dhamma-school.jpg",
  "/dashboardBanner/dhamma-school2.jpg",
  "/dashboardBanner/dhamma-school3.jpg",
  "/dashboardBanner/perehera.jpg",
  "/dashboardBanner/scenery-2.jpg",
  "/dashboardBanner/scenery-3.jpg",
  "/dashboardBanner/seanory.jpg", // ⚠️ verify filename on disk; 404 will be skipped
  "/dashboardBanner/thripitikaya.jpg",
];

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
  role: { ro_role_id: string; ro_role_name: string; ro_description: string };
}

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [user, setUser] = useState<UserData | null>(null);

  // Only rotate through images that actually load
  const [slides, setSlides] = useState<string[]>([]);

  const fetchProvinces = async () => {
    try {
      await _getDashBoard();
    } catch (err) {
      console.log(err);
    }
  };

  // Preload and keep only successful images.
  useEffect(() => {
    let isActive = true;
    const loadOne = (src: string) =>
      new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(src);
        img.onerror = () => reject(src);
        img.src = src;
      });

    (async () => {
      const successes: string[] = [];
      const failures: string[] = [];
      await Promise.allSettled(bannerImages.map(loadOne)).then((results) => {
        results.forEach((r) => {
          if (r.status === "fulfilled") successes.push(r.value);
          else failures.push(r.reason);
        });
      });
      if (failures.length) {
        // why: surfaces missing/typo filenames immediately
        console.warn("[Dashboard] Failed banner images:", failures);
      }
      if (isActive) setSlides(successes.length ? successes : []);
    })();

    return () => {
      isActive = false;
    };
  }, []);

  // Start the rotator only when we have slides
  useEffect(() => {
    if (slides.length <= 1) return; // nothing or single image: no rotation
    const id = setInterval(() => {
      setCurrentImageIndex((p) => (p + 1) % slides.length);
    }, 10000);
    return () => clearInterval(id);
  }, [slides.length]);

  useEffect(() => {
    fetchProvinces();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (err) {
        console.error("Invalid user data in localStorage", err);
      }
    }
  }, []);

  const currentImage = useMemo(() => {
    if (!slides.length) return null;
    return slides[currentImageIndex % slides.length];
  }, [slides, currentImageIndex]);

  const handlePetalAction = (modulePath: string, action: string, route?: string) => {
    console.log(`Action ${action} on ${modulePath}`);
    if (route && typeof window !== "undefined") window.location.assign(route);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} />

      <div className={`transition-all duration-300 pt-16 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        <main className="p-6">
          {/* hero */}
          <div className="bg-gradient-to-r from-blue-400 to-orange-500 rounded-2xl p-8 mb-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h1 className="text-4xl font-bold mb-2">Good Afternoon</h1>
              <h2 className="text-3xl font-bold mb-2">Welcome!</h2>
              <p className="text-xl opacity-90">
                {user ? `${user.ua_first_name} ${user.ua_last_name}` : "User"}
              </p>
            </div>

            <div className="absolute right-0 top-0 w-2/3 h-full opacity-65 transition-opacity duration-700">
              {currentImage ? (
                <img
                  key={currentImage} // why: ensure transition when src changes
                  src={currentImage}
                  alt="Background"
                  className="w-full h-full object-cover transition-all duration-1000 ease-in-out"
                  onError={() =>
                    setCurrentImageIndex((p) => ((p + 1) % Math.max(1, slides.length)))
                  } // why: skip broken at runtime
                />
              ) : null}
            </div>
          </div>

          {/* module grid */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((m) => {
                const Icon = m.icon;
                const isHovered = hoveredModule === m.path;
                const items = SERVICE_MAP[m.path] || [];

                return (
                  <div
                    key={m.path}
                    className="relative"
                    onMouseEnter={() => setHoveredModule(m.path)}
                    onMouseLeave={() => setHoveredModule(null)}
                  >
                    <a
                      href={m.path}
                      className="w-full block group relative overflow-hidden bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${m.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                      />
                      <div className="relative z-10">
                        <div
                          className={`w-20 h-20 bg-gradient-to-br ${m.color} rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300`}
                        >
                          <Icon className="w-10 h-10 text-white" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-800 group-hover:text-white transition-colors text-center">
                          {m.label}
                        </h4>
                      </div>
                    </a>

                    <PetalMenu
                      isVisible={isHovered}
                      items={items}
                      onAction={(action, route) => handlePetalAction(m.path, action, route)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <FooterBar />
        </main>
      </div>
    </div>
  );
}
