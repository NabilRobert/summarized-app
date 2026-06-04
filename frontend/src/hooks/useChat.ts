import { useState } from 'react'
import client from '../api/client'
import type { ChatMessage, ChatResponse } from '../types'

export function useChat(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(userMessage: string) {
    if (!sessionId) return
    setLoading(true)
    setError(null)
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    try {
      const { data } = await client.post<ChatResponse>('/chat', {
        session_id: sessionId,
        message: userMessage,
      })
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Chat failed')
    } finally {
      setLoading(false)
    }
  }

  return { send, messages, loading, error }
}
