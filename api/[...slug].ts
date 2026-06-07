import type { VercelRequest, VercelResponse } from '@vercel/node'
import formidable from 'formidable'
import { readFileSync } from 'fs'
import { tmpdir } from 'os'
import { extractFromPdf, extractFromUrl, extractFromText } from './lib/ingest'
import { chunkText, buildVectorStore } from './lib/embeddings'
import { createSession, getSession, updateSession } from './lib/sessionStore'
import { getReply } from './lib/chat'

async function handleIngest(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.status(405).json({ detail: 'Method not allowed' }); return }

  const form = formidable({ uploadDir: tmpdir(), keepExtensions: true, maxFileSize: 20 * 1024 * 1024 })
  let rawText: string
  let docName: string

  try {
    const [fields, files] = await form.parse(req)
    const fileEntry = files.file?.[0]
    if (fileEntry) {
      rawText = await extractFromPdf(readFileSync(fileEntry.filepath))
      docName = fileEntry.originalFilename ?? 'document.pdf'
    } else if (fields.url?.[0]) {
      rawText = await extractFromUrl(fields.url[0])
      docName = fields.url[0]
    } else if (fields.text?.[0]) {
      rawText = extractFromText(fields.text[0])
      docName = 'pasted text'
    } else {
      res.status(422).json({ detail: 'Provide one of: file, url, or text.' }); return
    }
  } catch (err) {
    res.status(422).json({ detail: err instanceof Error ? err.message : 'Extraction failed' }); return
  }

  try {
    const chunks      = await chunkText(rawText)
    const vectorStore = await buildVectorStore(chunks)
    const sessionId   = await createSession({ docName, vectorStore, chatHistory: [], rollingSummary: '' })
    res.status(200).json({ session_id: sessionId, message: `I've analyzed ${docName}. What do you need to know?` })
  } catch (err) {
    res.status(500).json({ detail: `Indexing failed: ${err instanceof Error ? err.message : String(err)}` })
  }
}

async function handleChat(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.status(405).json({ detail: 'Method not allowed' }); return }

  const { session_id, message } = (req.body ?? {}) as { session_id?: string; message?: string }
  if (!session_id || !message) {
    res.status(422).json({ detail: 'session_id and message are required' }); return
  }

  const session = await getSession(session_id)
  if (!session) { res.status(404).json({ detail: 'Session not found or expired.' }); return }

  try {
    const reply = await getReply(session, message)
    await updateSession(session_id, session.chatHistory, session.rollingSummary)
    res.status(200).json({ reply })
  } catch (err) {
    res.status(500).json({ detail: err instanceof Error ? err.message : 'Chat failed' })
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = (req.url ?? '').split('?')[0].split('/').filter(Boolean).pop() ?? ''

  if (action === 'ingest') return handleIngest(req, res)
  if (action === 'chat')   return handleChat(req, res)
  return res.status(404).json({ detail: `Route not found: ${action}` })
}
