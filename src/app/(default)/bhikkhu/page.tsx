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
import { BHIKKU_MANAGEMENT_DEPARTMENT, ADMIN_ROLE_LEVEL } from '@/utils/config'

const tabItems = [
    { id: 'bhikkhu', label: 'Samanera List' },
    { id: 'upasampada', label: 'Upasampada List' },

  ];


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

  const isAdmin = userData?.roleLevel === ADMIN_ROLE_LEVEL;
  const canDelete = isAdmin;
  const canAdd = !isAdmin;

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
                  return (
                    <UpasampadaList canDelete={canDelete} canAdd={canAdd} />
                  )
                }

                return <BhikkhuList canDelete={canDelete} canAdd={canAdd} />
              }}
            />
        </main>
        <FooterBar />
      </div>
    </div>
  )
}
