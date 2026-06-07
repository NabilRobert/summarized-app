import { useState } from 'react'
import axios from 'axios'
import client from '../api/client'
import type { Message, ChatResponse } from '../types'

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendMessage(sessionId: string, message: string): Promise<void> {
    setLoading(true)
    setError(null)
    setMessages(prev => [...prev, { role: 'user', content: message }])
    try {
      const { data } = await client.post<ChatResponse>('/chat', {
        session_id: sessionId,
        message,
      })
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.status === 502
          ? 'Cannot reach the backend. Run `vercel dev` from the project root.'
          : (err.response?.data?.detail ?? err.message)
        : err instanceof Error
          ? err.message
          : 'Chat failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return { sendMessage, messages, loading, error }
}
