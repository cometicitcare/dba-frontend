'use client'

import { FooterBar } from '@/components/FooterBar'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { Tabs } from '@/components/ui/Tabs'
import React,{useState} from 'react'
import SubsectionsList from './SubsectionsList'
import RecordList from './RecordList'

const tabItems = [
    { id: 'records', label: 'Records' },
    { id: 'sub-sections', label: 'Sub Sections' },

  ];

export default function AramaList() {
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
              if (activeId === 'sub-sections') {
                return <SubsectionsList />
              }
              else{
                return <RecordList />
              }
            }}
          />
        </main>
      </div>
              <FooterBar />

    </div>
  )
}
