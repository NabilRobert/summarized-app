import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSession } from './lib/sessionStore'
import { getReply } from './lib/chat'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' })

  const { session_id, message } = (req.body ?? {}) as { session_id?: string; message?: string }

  if (!session_id || !message) {
    return res.status(422).json({ detail: 'session_id and message are required' })
  }

  const session = getSession(session_id)
  if (!session) return res.status(404).json({ detail: 'Session not found or expired.' })

  try {
    const reply = await getReply(session, message)
    return res.status(200).json({ reply })
  } catch (err) {
    return res.status(500).json({ detail: err instanceof Error ? err.message : 'Chat failed' })
  }
}
