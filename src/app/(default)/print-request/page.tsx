"use client"

import React, { useState } from 'react'
import ReprintRequest from '@/components/Reprint/ReprintRequest'
import { FooterBar } from '@/components/FooterBar'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import ShowPrinter from './ShowPrinter'
export default function Page() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [printerDialogOpen, setPrinterDialogOpen] = useState(false);

    return (
        <div className="w-full min-h-screen bg-gray-50">
            <TopBar onMenuClick={() => setSidebarOpen((v) => !v)} />
            <Sidebar isOpen={sidebarOpen} />
            <div className={`transition-all duration-300 pt-16 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
                <main className="p-6 space-y-8">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/90 p-4 shadow-sm">
                        <p className="text-sm font-semibold text-slate-700">
                            Pick a physical printer on the server before printing a test page.
                        </p>
                        <button
                            type="button"
                            onClick={() => setPrinterDialogOpen(true)}
                            className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
                        >
                            Open printer selector
                        </button>
                    </div>
                    <div><ReprintRequest /></div>
                </main>
                <FooterBar />
            </div>
            {/* <ShowPrinter open={printerDialogOpen} onClose={() => setPrinterDialogOpen(false)} /> */}
        </div>
    )
}

