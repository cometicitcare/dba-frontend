"use client"

import React, { useState } from 'react'
import Obections from '@/components/ojections/Obections'
import { FooterBar } from '@/components/FooterBar'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
export default function Page() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    
    return (
        <div className="w-full min-h-screen bg-gray-50">
            <TopBar onMenuClick={() => setSidebarOpen((v) => !v)} />
            <Sidebar isOpen={sidebarOpen} />
            <div className={`transition-all duration-300 pt-16 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
                <main className="p-6">
                    <div><Obections /></div>
                </main>
                <FooterBar />
            </div>
        </div>
    )
}
