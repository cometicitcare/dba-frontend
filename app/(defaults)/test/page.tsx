'use client';
import React, { useState, MouseEvent } from 'react';
import {
  Users,
  Home,
  BookOpen,
  GraduationCap,
  Settings,
  Eye,
  Plus,
  Search,
  FileText,
  Edit,
  Trash2,
  LucideIcon,
} from 'lucide-react';

// ---------- Interfaces ----------
interface SubItem {
  icon: LucideIcon;
  label: string;
  action: string;
}

interface Service {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  subItems: SubItem[];
}

interface Position {
  x: number;
  y: number;
}

// ---------- Component ----------
const DBADashboard: React.FC = () => {
  const [hoveredService, setHoveredService] = useState<string | null>(null);

  const services: Service[] = [
    {
      id: 'bhikku',
      name: 'Bhikku & Samatha',
      icon: Users,
      color: 'from-orange-400 to-amber-500',
      subItems: [
        { icon: Eye, label: 'View', action: 'view-bhikku' },
        { icon: Plus, label: 'Add', action: 'add-bhikku' },
        { icon: Search, label: 'Search', action: 'search-bhikku' },
        { icon: FileText, label: 'Reports', action: 'reports-bhikku' },
        { icon: Edit, label: 'Update', action: 'update-bhikku' },
      ],
    },
    {
      id: 'temple',
      name: 'Temple & Devala',
      icon: Home,
      color: 'from-purple-400 to-indigo-500',
      subItems: [
        { icon: Eye, label: 'View', action: 'view-temple' },
        { icon: Plus, label: 'Add', action: 'add-temple' },
        { icon: Search, label: 'Search', action: 'search-temple' },
        { icon: FileText, label: 'Reports', action: 'reports-temple' },
        { icon: Edit, label: 'Manage', action: 'manage-temple' },
      ],
    },
    {
      id: 'school',
      name: 'Dhamma School',
      icon: BookOpen,
      color: 'from-blue-400 to-cyan-500',
      subItems: [
        { icon: Eye, label: 'View', action: 'view-school' },
        { icon: Plus, label: 'Add', action: 'add-school' },
        { icon: Search, label: 'Search', action: 'search-school' },
        { icon: FileText, label: 'Reports', action: 'reports-school' },
        { icon: Users, label: 'Students', action: 'students-school' },
      ],
    },
    {
      id: 'teachers',
      name: 'Dhamma Teachers',
      icon: GraduationCap,
      color: 'from-green-400 to-emerald-500',
      subItems: [
        { icon: Eye, label: 'View', action: 'view-teachers' },
        { icon: Plus, label: 'Add', action: 'add-teachers' },
        { icon: Search, label: 'Search', action: 'search-teachers' },
        { icon: FileText, label: 'Reports', action: 'reports-teachers' },
        { icon: Edit, label: 'Update', action: 'update-teachers' },
      ],
    },
    {
      id: 'admin',
      name: 'System Admin',
      icon: Settings,
      color: 'from-red-400 to-rose-500',
      subItems: [
        { icon: Users, label: 'Users', action: 'users-admin' },
        { icon: Settings, label: 'Settings', action: 'settings-admin' },
        { icon: FileText, label: 'Logs', action: 'logs-admin' },
        { icon: Edit, label: 'Config', action: 'config-admin' },
        { icon: Trash2, label: 'Cleanup', action: 'cleanup-admin' },
      ],
    },
  ];

  // ---------- Utility Functions ----------
  const getSubItemPosition = (index: number, total: number): Position => {
    const radius = 180;
    const startAngle = -90;
    const angleStep = 360 / total;
    const angle = (startAngle + index * angleStep) * (Math.PI / 180);

    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  const handleSubItemClick = (action: string): void => {
    console.log('Navigating to:', action);
    alert(`Navigating to: ${action}`);
  };

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-amber-50">
      {/* Gradients for icons */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          {['bhikku', 'temple', 'school', 'teachers', 'admin'].map((id) => {
            const colors: Record<string, string[]> = {
              bhikku: ['#fb923c', '#f59e0b'],
              temple: ['#c084fc', '#6366f1'],
              school: ['#60a5fa', '#06b6d4'],
              teachers: ['#4ade80', '#10b981'],
              admin: ['#f87171', '#f43f5e'],
            };
            const [start, end] = colors[id];
            return (
              <linearGradient key={id} id={`gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: start, stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: end, stopOpacity: 1 }} />
              </linearGradient>
            );
          })}
        </defs>
      </svg>

     
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8 lg:gap-16">
          {services.map((service) => (
            <div
              key={service.id}
              className="relative flex items-center justify-center"
              style={{ minHeight: '400px', minWidth: '280px', flex: '0 0 auto' }}
            >
              {/* Main Card */}
              <div
                className="relative z-10"
                onMouseEnter={() => setHoveredService(service.id)}
                onMouseLeave={(e: MouseEvent<HTMLDivElement>) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const buffer = 200;
                  setTimeout(() => {
                    if (hoveredService === service.id) setHoveredService(null);
                  }, 300);
                }}
              >
                <div
                  className={`relative w-32 h-32 sm:w-36 sm:h-36 rounded-3xl cursor-pointer
                    bg-gradient-to-br ${service.color} shadow-lg hover:shadow-2xl
                    transform transition-all duration-300
                    ${hoveredService === service.id ? 'scale-110' : 'scale-100'}
                    border-2 border-white flex flex-col items-center justify-center
                    group backdrop-blur-sm bg-opacity-90`}
                >
                  <service.icon className="w-12 h-12 sm:w-14 sm:h-14 text-white mb-2 transition-transform duration-300 group-hover:scale-110 drop-shadow-lg" />
                  <span className="text-white font-semibold text-center px-2 text-xs sm:text-sm drop-shadow-md">
                    {service.name}
                  </span>
                  <div
                    className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${service.color} 
                      opacity-0 group-hover:opacity-40 blur-2xl transition-opacity duration-300`}
                  />
                </div>

                {/* Sub Items */}
                <div
                  className="absolute inset-0"
                  onMouseEnter={() => setHoveredService(service.id)}
                  style={{ pointerEvents: hoveredService === service.id ? 'auto' : 'none' }}
                >
                  {service.subItems.map((subItem, index) => {
                    const pos = getSubItemPosition(index, service.subItems.length);
                    const isHovered = hoveredService === service.id;

                    return (
                      <div
                        key={index}
                        className={`absolute top-1/2 left-1/2 transition-all duration-700 ease-out ${
                          isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                        style={{
                          transform: isHovered
                            ? `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(1)`
                            : 'translate(-50%, -50%) scale(0)',
                          transitionDelay: isHovered ? `${index * 80}ms` : '0ms',
                        }}
                      >
                        <button
                          onClick={() => handleSubItemClick(subItem.action)}
                          className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white shadow-lg hover:shadow-2xl
                            flex flex-col items-center justify-center transform hover:scale-125
                            transition-all duration-200 border-2 border-yellow-300 group/sub backdrop-blur-sm`}
                        >
                          <subItem.icon
                            className="w-6 h-6 sm:w-8 sm:h-8 mb-1 transition-transform duration-200 group-hover/sub:scale-110"
                            strokeWidth={2.5}
                            style={{ stroke: `url(#gradient-${service.id})`, fill: 'none' }}
                          />
                          <span className="text-gray-700 text-xs font-medium">{subItem.label}</span>
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

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white bg-opacity-80 backdrop-blur-md border-t border-yellow-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <p className="text-center text-gray-600 text-xs sm:text-sm">
            © 2025 Department of Buddhist Affairs - All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
};

export default DBADashboard;
