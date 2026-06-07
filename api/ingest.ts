import type { VercelRequest, VercelResponse } from '@vercel/node'
import formidable from 'formidable'
import { readFileSync } from 'fs'
import { tmpdir } from 'os'
import { extractFromPdf, extractFromUrl, extractFromText } from './lib/ingest'
import { chunkText, buildVectorStore } from './lib/embeddings'
import { createSession } from './lib/sessionStore'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' })

  const form = formidable({
    uploadDir: tmpdir(),
    keepExtensions: true,
    maxFileSize: 20 * 1024 * 1024,
  })

  let rawText: string
  let docName: string

  try {
    const [fields, files] = await form.parse(req)
    const fileEntry = files.file?.[0]

    if (fileEntry) {
      const buffer = readFileSync(fileEntry.filepath)
      rawText = await extractFromPdf(buffer)
      docName = fileEntry.originalFilename ?? 'document.pdf'
    } else if (fields.url?.[0]) {
      rawText = await extractFromUrl(fields.url[0])
      docName = fields.url[0]
    } else if (fields.text?.[0]) {
      rawText = extractFromText(fields.text[0])
      docName = 'pasted text'
    } else {
      return res.status(422).json({ detail: 'Provide one of: file, url, or text.' })
    }
  } catch (err) {
    return res.status(422).json({ detail: err instanceof Error ? err.message : 'Extraction failed' })
  }

  try {
    const chunks      = await chunkText(rawText)
    const vectorStore = await buildVectorStore(chunks)
    const sessionId   = createSession({ docName, vectorStore, chatHistory: [], rollingSummary: '' })
    return res.status(200).json({
      session_id: sessionId,
      message: `I've analyzed ${docName}. What do you need to know?`,
    })
  } catch (err) {
    return res.status(500).json({
      detail: `Indexing failed: ${err instanceof Error ? err.message : String(err)}`,
    })
  }
}
