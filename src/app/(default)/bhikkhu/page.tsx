'use client'

import BhikkhuList from '@/components/Bhikku/BhikkhuList/BhikkhuList'
import SilmathaList from '@/components/Bhikku/SilmathaList/SilmathaList'
import UpasampadaList from '@/components/Bhikku/UpasampadaList/UpasampadaList '
import { FooterBar } from '@/components/FooterBar'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { Tabs } from '@/components/ui/Tabs'
import React,{useState} from 'react'

const tabItems = [
    { id: 'bhikkhu', label: 'Bhikkhu list' },
    { id: 'upasampada', label: 'Upasampada list' },
    { id: 'silmatha', label: 'Silmatha list' },
  ];

export default function page() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
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
                return <UpasampadaList />
              }if (activeId === 'silmatha') {
                return <SilmathaList/>
              }else{
                return <BhikkhuList />
              }
            }}
          />
        </main>
        <FooterBar />
      </div>
    </div>
  )
}
