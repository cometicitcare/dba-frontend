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
  User,
} from "lucide-react";
import { useRouter } from 'next/navigation'
import { getStoredUserData, type UserData } from "@/utils/userData";
import {
  PUBLIC_MANAGEMENT_DEPARTMENT,
  SIDEBAR_ACCESS_MAP,
} from "@/utils/config";
import { useT } from "@/i18n/useT";
// --- map old services -> each new module path ---
const SERVICE_MAP: Record<
  string,
  { icon: any; label: string; action: string; route: string }[]
> = {
  "/bhikkhu": [
    { icon: EyeIcon, label: "View", action: "view-bhikku", route: "/bhikkhu" },
    { icon: PlusIcon, label: "Add", action: "add-bhikku", route: "/bhikkhu/add" },
    { icon: FileTextIcon, label: "Reports", action: "reports-bhikku", route: "/bhikkhu/reports" },
  ],
  "/temples": [
    { icon: EyeIcon, label: "View", action: "view-temple", route: "/temple/view" },
    { icon: PlusIcon, label: "Add", action: "add-temple", route: "/temple/add" },
    { icon: FileTextIcon, label: "Reports", action: "reports-temple", route: "/temple/reports" },
  ],
  "/dhamma-school": [
    { icon: EyeIcon, label: "View", action: "view-school", route: "/school/view" },
    { icon: PlusIcon, label: "Add", action: "add-school", route: "/school/add" },
    { icon: FileTextIcon, label: "Reports", action: "reports-school", route: "/school/reports" },
  ],
  "/silmatha": [
    { icon: EyeIcon, label: "View", action: "view-bhikku", route: "/silmatha" },
    { icon: PlusIcon, label: "Add", action: "add-bhikku", route: "/silmatha/add" },
  ],
  "/temple/vihara": [
    { icon: BuildingIcon, label: "View Viharas", action: "view-vihara", route: "/temple/vihara" },
    { icon: PlusIcon, label: "Add", action: "add-bhikku", route: "/temple/vihara/add" },
  ],
  "/temple/arama": [
    { icon: BuildingIcon, label: "View Arama", action: "view-arama", route: "/temple/arama" },
    { icon: PlusIcon, label: "Add", action: "add-bhikku", route: "/temple/arama/add" },
  ],
  "/teachers": [
    { icon: BuildingIcon, label: "View Donations", action: "view-Donations", route: "/teachers" },
  ],
  "/admin": [
    { icon: BuildingIcon, label: "View Sasana Arakshaka Balamandalaya", action: "view-Security-Councils", route: "/admin" },
  ],
  "/ojections": [
    { icon: EyeIcon, label: "View Ojections", action: "view-ojections", route: "/ojections" },
  ],
  "/print-request": [
    { icon: EyeIcon, label: "View Requests", action: "view-print", route: "/print-request" },
  ],
  "/qr-scan": [
    { icon: EyeIcon, label: "Scan Codes", action: "scan-qr", route: "/qr-scan" },
    { icon: SearchIcon, label: "History", action: "history-qr", route: "/qr-scan/history" },
  ]

};

const MODULE_CARD_DEFINITIONS: { path: string; label: string; icon: any; color: string }[] = [
  {
    path: "/bhikkhu",
    label: "Bhikku",
    icon: UsersIcon,
    color: "from-orange-400 to-orange-500",
  },
  {
    path: "/silmatha",
    label: "Silmatha",
    icon: GraduationCapIcon,
    color: "from-purple-500 to-indigo-600",
  },
  {
    path: "/temple/vihara",
    label: "Vihara",
    icon: BuildingIcon,
    color: "from-sky-400 to-blue-600",
  },
  {
    path: "/temple/arama",
    label: "Arama",
    icon: BuildingIcon,
    color: "from-rose-400 to-pink-600",
  },
  {
    path: "/temple/dewala",
    label: "Devala",
    icon: BuildingIcon,
    color: "from-rose-400 to-pink-600",
  },
  {
    path: "/teachers",
    label: "Donations",
    icon: BuildingIcon,
    color: "from-rose-400 to-pink-600",
  },
  {
    path: "/objections",
    label: "Objections",
    icon: EyeIcon,
    color: "from-emerald-400 to-emerald-600",
  },
  {
    path: "/print-request",
    label: "Re Print",
    icon: BookOpenIcon,
    color: "from-amber-400 to-yellow-500",
  },
  {
    path: "/qr-scan",
    label: "QR Scan",
    icon: SearchIcon,
    color: "from-cyan-400 to-blue-500",
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

export default function Dashboard() {
  const router = useRouter();
  const t = useT();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userData, setUserData] = useState<UserData | null | undefined>(undefined);

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
    const stored = getStoredUserData();
    setUserData(stored ?? null);
  }, []);

  

  const currentImage = useMemo(() => {
    if (!slides.length) return null;
    return slides[currentImageIndex % slides.length];
  }, [slides, currentImageIndex]);

  const handlePetalAction = (modulePath: string, action: string, route?: string) => {
    console.log(`Action ${action} on ${modulePath}`);
    if (route && typeof window !== "undefined") window.location.assign(route);
  };


  const modules = useMemo(() => {
    if (userData === undefined) return [];
    const departmentValues = Array.from(
      new Set([
        ...(userData?.departments ?? []),
        ...(userData?.department ? [userData.department] : []),
      ].filter(Boolean) as string[])
    );
    const effectiveDepartments =
      departmentValues.length > 0 ? departmentValues : [PUBLIC_MANAGEMENT_DEPARTMENT];

    return MODULE_CARD_DEFINITIONS.filter((m) => {
      const allowedDepartments = SIDEBAR_ACCESS_MAP[m.path];
      if (!allowedDepartments) return false;
      return effectiveDepartments.some((dep) => allowedDepartments.includes(dep));
    });
  }, [userData]);

  const welcomeLine = t("auth.welcome", {
    name: userData ? `${userData.ua_first_name} ${userData.ua_last_name}` : "Sahan",
  });


  return (
    <div className="w-full min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} />

      <div className={`transition-all duration-300 pt-20 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        <main className="p-6 pb-32">
          {/* hero */}
          <div className="bg-gradient-to-r from-blue-400 to-orange-500 rounded-2xl p-4 sm:p-6 md:p-8 mb-8 text-white relative overflow-hidden min-h-[200px] sm:min-h-[250px] md:min-h-[300px]">
            <div className="relative z-10 max-w-[55%] sm:max-w-[50%] md:max-w-[45%] lg:max-w-[40%] xl:max-w-[35%] pr-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">{getGreeting()}</h1>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3">{welcomeLine}</h2>
              <p className="text-base sm:text-lg md:text-xl opacity-90 leading-tight mb-2">
                {userData ? `${userData.ua_first_name} ${userData.ua_last_name}` : "Loading..."}
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
