import { useState } from 'react'
import client from '../api/client'
import type { IngestResponse } from '../types'

export function useIngest() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [greeting, setGreeting] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ingest(payload: FormData) {
    setLoading(true)
    setError(null)
    try {
      const { data } = await client.post<IngestResponse>('/ingest', payload)
      setSessionId(data.session_id)
      setGreeting(data.message)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ingest failed')
    } finally {
      setLoading(false)
    }
  }

  return { ingest, sessionId, greeting, loading, error }
}
