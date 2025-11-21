'use client'

import { FooterBar } from '@/components/FooterBar'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { useState } from 'react'
import { QrReader } from 'react-qr-reader'



export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [statusMessage, setStatusMessage] = useState('Click "Start Scan" to use your camera')
  const [scanError, setScanError] = useState('')
  const [isScanning, setIsScanning] = useState(false)

  const handleStartScan = () => {
    setScanError('')
    setStatusMessage('Requesting camera access...')
    setIsScanning(true)
  }

  const handleResult = (result: any, error: any) => {
    if (error) {
      // react-qr-reader throws frequently while polling; only show user-friendly message on first permission issues handled by component UI.
      return
    }

    const rawValue = result?.getText ? result.getText() : result?.text || result
    if (!rawValue) return

    const trimmed = String(rawValue).trim()
    try {
      const url = new URL(trimmed)
      setStatusMessage('Opening link...')
      setIsScanning(false)
      window.location.href = url.toString()
    } catch {
      setScanError(`Scanned value is not a valid URL: ${trimmed}`)
      setStatusMessage('Try scanning another QR code')
    }
  }
  
  return (
    <div className="w-full min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setSidebarOpen((v) => !v)} />
      <Sidebar isOpen={sidebarOpen} />
      <div className={`transition-all duration-300 pt-16 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        <main className="p-6">
          <div className="max-w-4xl">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Scan QR Code</h1>
            <p className="text-gray-600 mb-6">
              Point your camera at the QR code. When detected, you will be redirected to the link encoded in it.
            </p>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <button
                type="button"
                onClick={handleStartScan}
                className="mb-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white shadow-sm hover:bg-emerald-700 transition"
              >
                Start Scan
              </button>

              <div className="relative aspect-[3/4] max-w-xl w-full bg-gray-900 rounded-xl overflow-hidden shadow-lg">
                {isScanning ? (
                  <QrReader
                    constraints={{ facingMode: 'environment' }}
                    scanDelay={250}
                    onResult={handleResult}
                    containerStyle={{ width: '100%', height: '100%' }}
                    videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300 text-sm">
                    Camera preview will appear here after you start the scan.
                  </div>
                )}
                <div className="pointer-events-none absolute inset-5 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.35)] animate-pulse" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/40" />
              </div>

              <div className="mt-4 text-sm">
                {statusMessage && <p className="text-gray-700">{statusMessage}</p>}
                {scanError && <p className="text-red-600 mt-1">{scanError}</p>}
              </div>
            </div>
          </div>
        </main>
        <FooterBar />
      </div>
    </div>
  )
}
