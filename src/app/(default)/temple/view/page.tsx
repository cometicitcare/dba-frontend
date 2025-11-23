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
  // -------------------------
  // 1. Vihara
  // -------------------------
  "/temple/vihara": [
    { icon: EyeIcon, label: "View", action: "view-vihara", route: "/temple/vihara" },
    { icon: PlusIcon, label: "Add", action: "add-vihara", route: "/bhikkhu/add" },
    { icon: SearchIcon, label: "Search", action: "search-vihara", route: "/bhikkhu/search" },
    { icon: FileTextIcon, label: "Reports", action: "reports-vihara", route: "/bhikkhu/reports" },
    { icon: EditIcon, label: "Update", action: "update-vihara", route: "/bhikkhu/update" },
  ],

  // -------------------------
  // 2. Arama
  // -------------------------
  "/temple/arama": [
    { icon: EyeIcon, label: "View", action: "view-arama", route: "/temple/arama" },
    { icon: PlusIcon, label: "Add", action: "add-arama", route: "/temple/add" },
    { icon: SearchIcon, label: "Search", action: "search-arama", route: "/temple/search" },
    { icon: FileTextIcon, label: "Reports", action: "reports-arama", route: "/temple/reports" },
    { icon: EditIcon, label: "Manage", action: "manage-arama", route: "/temple/manage" },
  ],

  // -------------------------
  // 3. Devala
  // -------------------------
  "/dhamma-school": [
    { icon: EyeIcon, label: "View", action: "view-devala", route: "/school/view" },
    { icon: PlusIcon, label: "Add", action: "add-devala", route: "/school/add" },
    { icon: SearchIcon, label: "Search", action: "search-devala", route: "/school/search" },
    { icon: FileTextIcon, label: "Reports", action: "reports-devala", route: "/school/reports" },
    { icon: UsersIcon, label: "Students", action: "students-devala", route: "/school/students" },
  ],

  // -------------------------
  // 4. Donations
  // -------------------------
  "/teachers": [
    { icon: EyeIcon, label: "View", action: "view-donations", route: "/teachers/view" },
    { icon: PlusIcon, label: "Add", action: "add-donation", route: "/teachers/add" },
    { icon: SearchIcon, label: "Search", action: "search-donations", route: "/teachers/search" },
    { icon: FileTextIcon, label: "Reports", action: "reports-donations", route: "/teachers/reports" },
    { icon: EditIcon, label: "Update", action: "update-donations", route: "/teachers/update" },
  ],

  // -------------------------
  // 5. Sasanarakshaka Bala Mandala (Security Councils)
  // -------------------------
  "/admin": [
    { icon: UsersIcon, label: "Users", action: "users-sbm", route: "/admin/users" },
    { icon: SettingsIcon, label: "Settings", action: "settings-sbm", route: "/admin/settings" },
    { icon: FileTextIcon, label: "Logs", action: "logs-sbm", route: "/admin/logs" },
    { icon: EditIcon, label: "Config", action: "config-sbm", route: "/admin/config" },
    { icon: TrashIcon, label: "Cleanup", action: "cleanup-sbm", route: "/admin/cleanup" },
  ],


};


const modules = [
  { 
    icon: UsersIcon, 
    label: "Vihara", 
    color: "from-orange-400 to-orange-500", 
    path: "/temple/vihara" 
  },
  { 
    icon: BuildingIcon, 
    label: "Arama", 
    color: "from-purple-400 to-purple-500", 
    path: "/temple/arama" 
  },
  { 
    icon: GraduationCapIcon, 
    label: "Devala", 
    color: "from-blue-400 to-blue-500", 
    path: "/dhamma-school" 
  },
  { 
    icon: BookOpenIcon, 
    label: "Donations", 
    color: "from-green-400 to-green-500", 
    path: "/teachers" 
  },
  { 
    icon: SettingsIcon, 
    label: "Sasanarakshaka Bala Mandala (Security Councils)", 
    color: "from-red-400 to-red-500", 
    path: "/admin" 
  },
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
  const [currentTime, setCurrentTime] = useState(new Date());

  // Only rotate through images that actually load
  const [slides, setSlides] = useState<string[]>([]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) {
      return "Good Morning";
    } else if (hour >= 12 && hour < 17) {
      return "Good Afternoon";
    } else if (hour >= 17 && hour < 21) {
      return "Good Evening";
    } else {
      return "Good Night";
    }
  };

  // Format date and time
  const formatDateTime = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    return currentTime.toLocaleDateString('en-US', options);
  };

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
          <div className="bg-gradient-to-r from-blue-400 to-orange-500 rounded-2xl p-4 sm:p-6 md:p-8 mb-8 text-white relative overflow-hidden min-h-[200px] sm:min-h-[250px] md:min-h-[300px]">
            <div className="relative z-10 max-w-[55%] sm:max-w-[50%] md:max-w-[45%] lg:max-w-[40%] xl:max-w-[35%] pr-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">{getGreeting()}</h1>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3">Welcome!</h2>
              <p className="text-base sm:text-lg md:text-xl opacity-90 leading-tight mb-2">
                {user ? `${user.ua_first_name} ${user.ua_last_name}` : "Loading..."}
              </p>
              <div className="text-sm sm:text-base md:text-lg opacity-80 leading-tight">
                <p className="text-white/90">{formatDateTime()}</p>
              </div>
            </div>

            <div className="absolute right-0 top-0 w-[40%] sm:w-[45%] md:w-[50%] lg:w-[55%] xl:w-[60%] h-full opacity-70 transition-opacity duration-700 overflow-hidden rounded-r-2xl">
              {currentImage ? (
                <div className="relative w-full h-full">
                  <img
                    key={currentImage}
                    src={currentImage}
                    alt="Background"
                    className="absolute inset-0 w-full h-full transition-all duration-1000 ease-in-out
                               object-cover object-center
                               sm:object-cover sm:object-center
                               md:object-contain md:object-center
                               lg:object-contain lg:object-center
                               xl:object-cover xl:object-center"
                    onError={() =>
                      setCurrentImageIndex((p) => ((p + 1) % Math.max(1, slides.length)))
                    }
                  />
                  {/* Gradient overlay to ensure text readability across all screen sizes */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 via-blue-400/15 to-transparent 
                                  sm:from-blue-500/25 sm:via-blue-400/10 
                                  md:from-blue-500/20 md:via-transparent
                                  lg:from-blue-500/15 lg:via-transparent"></div>
                </div>
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
