'use client'

import { FooterBar } from '@/components/FooterBar'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { Tabs } from '@/components/ui/Tabs'
import React,{useState} from 'react'
import RecordList from './RecordList'

const tabItems = [
    { id: 'dewalaList', label: 'Dewala List' },

  ];

export default function DewalaList() {
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
                return <RecordList />
            }}
          />
        </main>
      </div>
              <FooterBar />

    </div>
  )
}
