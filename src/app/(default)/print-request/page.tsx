"use client"

import React, { useState } from 'react'
import ReprintRequest from '@/components/Reprint/ReprintRequest'
import { FooterBar } from '@/components/FooterBar'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
export default function page() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    
    return (
        <div className="w-full min-h-screen bg-gray-50">
            <TopBar onMenuClick={() => setSidebarOpen((v) => !v)} />
            <Sidebar isOpen={sidebarOpen} />
            <div className={`transition-all duration-300 pt-16 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
                <main className="p-6">
                    <div><ReprintRequest /></div>
                </main>
                <FooterBar />
            </div>
        </div>
    )
}


