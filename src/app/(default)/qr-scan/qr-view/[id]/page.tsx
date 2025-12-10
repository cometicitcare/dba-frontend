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
    <div>page</div>
  )
}
