import { useState } from 'react'
import axios from 'axios'
import client from '../api/client'
import type { IngestResponse, InputMode } from '../types'

export function useIngest() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ingest(mode: InputMode, data: File | string): Promise<IngestResponse> {
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      if (mode === 'file') formData.append('file', data as File)
      else if (mode === 'text') formData.append('text', data as string)
      else formData.append('url', data as string)

      const { data: response } = await client.post<IngestResponse>('/ingest', formData)
      return response
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.status === 502
          ? 'Cannot reach the backend. Run `vercel dev` from the project root.'
          : (err.response?.data?.detail ?? err.message)
        : err instanceof Error
          ? err.message
          : 'Ingest failed'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  return { ingest, loading, error }
}
