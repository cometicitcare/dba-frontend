'use client'

import BhikkhuList from '@/components/Bhikku/BhikkhuList/BhikkhuList'
import UpasampadaList from '@/components/Bhikku/UpasampadaList/UpasampadaList '
import { FooterBar } from '@/components/FooterBar'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { Tabs } from '@/components/ui/Tabs'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { getStoredUserData, type UserData } from '@/utils/userData'

const tabItems = [
    { id: 'bhikkhu', label: 'Bhikkhu List' },
    { id: 'upasampada', label: 'Upasampada List' },

  ];

const BHIKKU_MANAGEMENT_DEPARTMENT = 'Bhikku Management';
const ADMIN_ROLE_LEVEL = 'ADMIN';

export default function Page() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const stored = getStoredUserData();
    if (!stored || stored.department !== BHIKKU_MANAGEMENT_DEPARTMENT) {
      setAccessDenied(true);
      router.replace('/');
      return;
    }

    setUserData(stored);
    setAccessChecked(true);
  }, [router]);

  if (accessDenied) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm font-medium text-red-600">
          You do not have access to this section.
        </p>
      </div>
    );
  }

  if (!accessChecked) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Checking access...</p>
      </div>
    );
  }

  const canDelete = userData?.roleLevel === ADMIN_ROLE_LEVEL;

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setSidebarOpen((v) => !v)} />
      <Sidebar isOpen={sidebarOpen} />
      <div className={`transition-all duration-300 pt-16 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        <main className="p-6">
            <Tabs
              tabs={tabItems}
              contentClassName="pt-8"
              renderContent={(activeId) => {
                if (activeId === 'upasampada') {
                  return <UpasampadaList canDelete={canDelete} />
                }

                return <BhikkhuList canDelete={canDelete} />
              }}
            />
        </main>
        <FooterBar />
      </div>
    </div>
  )
}
