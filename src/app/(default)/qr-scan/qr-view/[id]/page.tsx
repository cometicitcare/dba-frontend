'use client'

import { FooterBar } from '@/components/FooterBar'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { _getDetailsByQr } from '@/services/qrScan'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type DetailRow = {
  titel: string
  text: string
}

type PageProps = {
  params: {
    id: string
  }
}

type QrDetailsResponse = {
  data?: {
    data?: DetailRow[]
  }
}

export default function Page({ params }: PageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [details, setDetails] = useState<DetailRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const router = useRouter()
  const certificateId = params?.id ? decodeURIComponent(params.id) : ''

  useEffect(() => {
    let isCancelled = false

    if (!certificateId) {
      setDetails([])
      setErrorMessage('Certificate identifier is missing in the URL.')
      setInfoMessage('')
      setIsLoading(false)
      return
    }

    const fetchDetails = async () => {
      setIsLoading(true)
      setErrorMessage('')
      setInfoMessage('')

      try {
        const res = await _getDetailsByQr<QrDetailsResponse>({ id: certificateId })
        if (isCancelled) return

        const payload = Array.isArray(res?.data?.data) ? res.data.data : []
        setDetails(payload)

        if (!payload.length) {
          setInfoMessage('No information was returned for this certificate number.')
        }
      } catch (error) {
        if (isCancelled) return
        setDetails([])
        setErrorMessage('Unable to load certificate details. Please try again.')
      } finally {
        if (!isCancelled) setIsLoading(false)
      }
    }

    fetchDetails()

    return () => {
      isCancelled = true
    }
  }, [certificateId])

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setSidebarOpen((v) => !v)} />
      <Sidebar isOpen={sidebarOpen} />
      <div className={`transition-all duration-300 pt-16 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <main className="p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
                  Certificate ID
                </p>
                <h1 className="text-2xl font-semibold text-slate-900">{certificateId || 'Unknown'}</h1>
                
              </div>
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Back
              </button>
            </header>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {isLoading ? (
                <div className="text-sm font-medium text-slate-500">Loading certificate details…</div>
              ) : errorMessage ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {errorMessage}
                </div>
              ) : infoMessage ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {infoMessage}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {details.map((detail) => (
                    <article
                      key={`${detail.titel}-${detail.text}`}
                      className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-4 shadow-[0_5px_20px_rgba(15,23,42,0.08)]"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
                        {detail.titel}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">{detail.text}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
        <FooterBar />
      </div>
    </div>
  )
}
